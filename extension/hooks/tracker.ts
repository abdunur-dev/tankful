import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { call } from "eve/events";
import { defineHook } from "eve/hooks";

import extension from "../extension.js";
import { tankState } from "../lib/state.js";
import {
  createTankReport,
  createTankState,
  estimateTokensFromText,
  formatCallLabel,
  formatTankReport,
  getAvgCallTokens,
  recordEstimatedText,
  recordRealUsage,
  recordStep,
} from "../lib/tank.js";

export default defineHook({
  events: {
    "turn.started"() {
      tankState.update((prev) => ({
        ...createTankState(extension.config, prev.lastReport),
        pendingEstimatedByRunId: {},
        settledUsageRunIds: [],
        activeRunId: null,
        unsettledEstimated: false,
        sessionUsageCount: prev.sessionUsageCount,
        sessionTotalTokens: prev.sessionTotalTokens,
      }));
    },

    "model.started"(event) {
      const runId = event.data.runId;
      tankState.update((prev) => {
        if (prev.settledUsageRunIds.includes(runId)) {
          return prev;
        }
        const textEst = prev.pendingEstimatedByRunId[runId] ?? 0;
        const inFlightEstimated = Math.max(0, prev.lastCallTokens - textEst);
        return {
          ...prev,
          activeRunId: runId,
          inFlightEstimated,
        };
      });
    },

    "content.completed"(event) {
      if (typeof event.data.value !== "string" || event.data.value.length === 0) {
        return;
      }

      const text = event.data.value;
      const runId = event.data.runId ?? event.scope?.runId;

      tankState.update((prev) => {
        const added = estimateTokensFromText(text);
        const next = recordEstimatedText(prev, text);
        if (!runId) {
          return {
            ...next,
            pendingEstimatedByRunId: prev.pendingEstimatedByRunId,
            settledUsageRunIds: prev.settledUsageRunIds,
            activeRunId: prev.activeRunId,
            unsettledEstimated: true,
            sessionUsageCount: prev.sessionUsageCount,
            sessionTotalTokens: prev.sessionTotalTokens,
          };
        }

        const newRunEst = (prev.pendingEstimatedByRunId[runId] ?? 0) + added;
        const inFlightEstimated =
          prev.activeRunId === runId && !prev.settledUsageRunIds.includes(runId)
            ? Math.max(0, prev.lastCallTokens - newRunEst)
            : prev.inFlightEstimated;

        return {
          ...next,
          inFlightEstimated,
          pendingEstimatedByRunId: {
            ...prev.pendingEstimatedByRunId,
            [runId]: newRunEst,
          },
          settledUsageRunIds: prev.settledUsageRunIds,
          activeRunId: prev.activeRunId,
          unsettledEstimated: prev.unsettledEstimated,
          sessionUsageCount: prev.sessionUsageCount,
          sessionTotalTokens: prev.sessionTotalTokens,
        };
      });
    },

    "model.settled"(event) {
      const runId = event.data.runId;
      tankState.update((prev) => {
        if (prev.settledUsageRunIds.includes(runId)) {
          return {
            ...prev,
            activeRunId: prev.activeRunId === runId ? null : prev.activeRunId,
            inFlightEstimated: 0,
          };
        }

        // usage.recorded has not fired yet for this settled call; lock in
        // at least lastCallTokens so the next dynamic instruction doesn't undercount.
        const currentEst = prev.pendingEstimatedByRunId[runId] ?? 0;
        const targetEst = Math.max(currentEst, prev.lastCallTokens);
        const delta = targetEst - currentEst;
        const pending = { ...prev.pendingEstimatedByRunId };
        if (targetEst > 0) {
          pending[runId] = targetEst;
        }

        return {
          ...prev,
          used: prev.used + delta,
          estimated: prev.estimated || targetEst > 0,
          inFlightEstimated: 0,
          activeRunId: prev.activeRunId === runId ? null : prev.activeRunId,
          pendingEstimatedByRunId: pending,
        };
      });
    },

    "usage.recorded"(event) {
      const owner = event.data.owner;
      const runId = owner && "runId" in owner ? owner.runId : undefined;
      const callTokens =
        Math.max(0, event.data.usage.inputTokens) +
        Math.max(0, event.data.usage.outputTokens);

      tankState.update((prev) => {
        const pending = { ...prev.pendingEstimatedByRunId };
        let baseUsed = prev.used;
        if (runId && runId in pending) {
          baseUsed = Math.max(0, baseUsed - pending[runId]);
          delete pending[runId];
        }

        const settledUsageRunIds =
          runId && !prev.settledUsageRunIds.includes(runId)
            ? [...prev.settledUsageRunIds, runId]
            : prev.settledUsageRunIds;

        const next = recordRealUsage(
          {
            ...prev,
            used: baseUsed,
            estimated:
              prev.unsettledEstimated || Object.keys(pending).length > 0,
          },
          {
            inputTokens: event.data.usage.inputTokens,
            outputTokens: event.data.usage.outputTokens,
          },
        );

        return {
          ...next,
          pendingEstimatedByRunId: pending,
          settledUsageRunIds,
          activeRunId: prev.activeRunId === runId ? null : prev.activeRunId,
          unsettledEstimated: prev.unsettledEstimated,
          sessionUsageCount: prev.sessionUsageCount + 1,
          sessionTotalTokens: prev.sessionTotalTokens + callTokens,
        };
      });
    },

    "call.settled"(event, ctx) {
      const observed = call(ctx.view, event.data.callId);
      const name = observed?.name ?? event.data.callId;
      const inputJson =
        observed?.input !== undefined ? JSON.stringify(observed.input) : "";
      const stepKey = `${name}:${inputJson}`;
      const callLabel = formatCallLabel(name, observed?.input);

      tankState.update((prev) => ({
        ...recordStep(prev, stepKey, extension.config, callLabel),
        pendingEstimatedByRunId: prev.pendingEstimatedByRunId,
        settledUsageRunIds: prev.settledUsageRunIds,
        activeRunId: prev.activeRunId,
        unsettledEstimated: prev.unsettledEstimated,
        sessionUsageCount: prev.sessionUsageCount,
        sessionTotalTokens: prev.sessionTotalTokens,
      }));
    },

    "turn.settled"() {
      let reportSummary = "";
      let settledReport: ReturnType<typeof createTankReport> | null = null;
      tankState.update((prev) => {
        const settledState = {
          ...prev,
          inFlightEstimated: 0,
          activeRunId: null,
        };
        const avgCallTokens = getAvgCallTokens(
          prev.sessionUsageCount,
          prev.sessionTotalTokens,
        );
        const report = createTankReport(
          settledState,
          extension.config,
          avgCallTokens,
        );
        settledReport = report;
        reportSummary = formatTankReport(report);
        return {
          ...settledState,
          lastReport: report,
        };
      });
      if (settledReport) {
        try {
          const dir = join(process.cwd(), ".eve");
          mkdirSync(dir, { recursive: true });
          writeFileSync(
            join(dir, "tankful-last-report.json"),
            JSON.stringify(settledReport, null, 2) + "\n",
            "utf8",
          );
        } catch {
          // Ignore write errors in read-only or serverless environments.
        }
      }
      if (reportSummary) {
        console.info(reportSummary);
      }
    },
  },
});
