/**
 * Pure TypeScript core for Tankful: token accounting, estimation fallback,
 * budget level thresholds, consecutive-step loop detection, dynamic guidance,
 * and end-of-run reporting.
 *
 * Intentionally has zero `eve` imports and avoids TS-only runtime syntax
 * (enums, parameter properties) so Node's native type stripping can test it directly.
 */

export type TankLevel = "ok" | "low" | "critical" | "empty";

export interface TankConfig {
  limit: number;
  lowAt?: number;
  criticalAt?: number;
  loopRepeats?: number;
}

export interface ResolvedTankConfig {
  limit: number;
  lowAt: number;
  criticalAt: number;
  loopRepeats: number;
}

export interface TankReport {
  limit: number;
  used: number;
  remaining: number;
  percentLeft: number;
  level: TankLevel;
  steps: number;
  estimated: boolean;
  loopDetected: boolean;
}

export interface TankState {
  limit: number;
  used: number;
  steps: number;
  completedCalls: string[];
  estimated: boolean;
  lastCallTokens: number;
  inFlightEstimated: number;
  lastStepKey: string | null;
  consecutiveRepeats: number;
  loopDetected: boolean;
  lastReport: TankReport | null;
}

export interface TankStatus extends TankReport {
  completedCalls?: readonly string[];
}

export interface RealTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

const DEFAULT_LOW_AT = 0.3;
const DEFAULT_CRITICAL_AT = 0.1;
const DEFAULT_LOOP_REPEATS = 3;
const CHARS_PER_TOKEN = 4;
export const DEFAULT_AVG_CALL_TOKENS = 3000;

/** Validates user configuration and applies defaults. */
export function resolveTankConfig(config: TankConfig): ResolvedTankConfig {
  if (
    typeof config.limit !== "number" ||
    !Number.isFinite(config.limit) ||
    config.limit <= 0
  ) {
    throw new Error("Tankful limit must be a finite number greater than 0.");
  }

  const lowAt = config.lowAt ?? DEFAULT_LOW_AT;
  if (typeof lowAt !== "number" || !Number.isFinite(lowAt) || lowAt <= 0 || lowAt >= 1) {
    throw new Error("Tankful lowAt must be a finite number between 0 and 1 (exclusive).");
  }

  const criticalAt = config.criticalAt ?? DEFAULT_CRITICAL_AT;
  if (
    typeof criticalAt !== "number" ||
    !Number.isFinite(criticalAt) ||
    criticalAt < 0 ||
    criticalAt >= lowAt
  ) {
    throw new Error("Tankful criticalAt must be >= 0 and less than lowAt.");
  }

  const loopRepeats = config.loopRepeats ?? DEFAULT_LOOP_REPEATS;
  if (
    typeof loopRepeats !== "number" ||
    !Number.isInteger(loopRepeats) ||
    loopRepeats < 2
  ) {
    throw new Error("Tankful loopRepeats must be an integer >= 2.");
  }

  return {
    limit: config.limit,
    lowAt,
    criticalAt,
    loopRepeats,
  };
}

/** Creates a fresh full-tank state for a run. */
export function createTankState(
  config: TankConfig,
  lastReport: TankReport | null = null,
): TankState {
  const resolved = resolveTankConfig(config);
  return {
    limit: resolved.limit,
    used: 0,
    steps: 0,
    completedCalls: [],
    estimated: false,
    lastCallTokens: 0,
    inFlightEstimated: 0,
    lastStepKey: null,
    consecutiveRepeats: 0,
    loopDetected: false,
    lastReport,
  };
}

/** Estimates token count from text at ~4 characters per token. */
export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Returns true for Tankful's own tools (e.g. `check_tank` or `<mount>__check_tank`)
 * so checking the fuel tank never triggers or masks loop detection.
 */
export function isTankfulTool(stepKey: string): boolean {
  const toolName = stepKey.split(":")[0] ?? stepKey;
  return (
    toolName === "check_tank" ||
    toolName.endsWith("__check_tank") ||
    toolName.startsWith("tankful__")
  );
}

/**
 * Records real provider-reported token usage.
 *
 * Sums `inputTokens + outputTokens`. In eve's `Usage` record, `inputTokens`
 * already includes `cacheReadTokens` and `cacheWriteTokens`, so cached tokens
 * are included in `used` to reflect total context volume processed per turn.
 */
export function recordRealUsage(state: TankState, usage: RealTokenUsage): TankState {
  const input = Number.isFinite(usage.inputTokens) ? Math.max(0, usage.inputTokens) : 0;
  const output = Number.isFinite(usage.outputTokens) ? Math.max(0, usage.outputTokens) : 0;
  const total = input + output;
  return {
    ...state,
    used: state.used + total,
    lastCallTokens: total > 0 ? total : state.lastCallTokens,
    inFlightEstimated: 0,
  };
}

/** Records estimated tokens from raw text when real usage is unavailable. */
export function recordEstimatedText(state: TankState, text: string): TankState {
  const tokens = estimateTokensFromText(text);
  return {
    ...state,
    used: state.used + tokens,
    estimated: true,
  };
}

/** Formats a tool call as `name(arg)` for grounded budget-note instructions. */
export function formatCallLabel(name: string, input?: unknown): string {
  if (input === undefined || input === null) return name;
  if (typeof input === "object" && !Array.isArray(input)) {
    const entries = Object.entries(input as Record<string, unknown>);
    if (entries.length === 0) return name;
    if (entries.length === 1) {
      const val = entries[0][1];
      const str =
        typeof val === "string" ? val : JSON.stringify(val) ?? "";
      return `${name}(${str.slice(0, 60)})`;
    }
    const summary = entries
      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join(", ");
    return `${name}(${summary.slice(0, 60)})`;
  }
  return `${name}(${String(input).slice(0, 60)})`;
}

/** Records a step/tool invocation and updates consecutive-repeat loop detection. */
export function recordStep(
  state: TankState,
  stepKey?: string,
  config?: TankConfig,
  callLabel?: string,
): TankState {
  const resolved = resolveTankConfig(config ?? { limit: state.limit });
  const steps = state.steps + 1;
  const completedCalls =
    callLabel && !isTankfulTool(stepKey ?? callLabel)
      ? [...state.completedCalls, callLabel]
      : state.completedCalls;

  if (!stepKey) {
    return {
      ...state,
      steps,
      completedCalls,
      lastStepKey: null,
      consecutiveRepeats: 0,
    };
  }

  if (isTankfulTool(stepKey)) {
    return {
      ...state,
      steps,
      completedCalls,
    };
  }

  const consecutiveRepeats =
    state.lastStepKey === stepKey ? state.consecutiveRepeats + 1 : 1;
  const loopDetected =
    state.loopDetected || consecutiveRepeats >= resolved.loopRepeats;

  return {
    ...state,
    steps,
    completedCalls,
    lastStepKey: stepKey,
    consecutiveRepeats,
    loopDetected,
  };
}

/** Computes current remaining tokens, percentage left, and fuel level. */
export function getTankStatus(state: TankState, config?: TankConfig): TankStatus {
  const resolved = resolveTankConfig(config ?? { limit: state.limit });
  const effectiveUsed = state.used + state.inFlightEstimated;
  const remaining = Math.max(0, resolved.limit - effectiveUsed);
  const ratio = remaining / resolved.limit;
  const percentLeft = Math.round(ratio * 10000) / 100;

  let level: TankLevel;
  if (remaining === 0) {
    level = "empty";
  } else if (ratio <= resolved.criticalAt) {
    level = "critical";
  } else if (ratio <= resolved.lowAt) {
    level = "low";
  } else {
    level = "ok";
  }

  return {
    limit: resolved.limit,
    used: effectiveUsed,
    remaining,
    percentLeft,
    level,
    steps: state.steps,
    completedCalls: state.completedCalls,
    estimated: state.estimated || state.inFlightEstimated > 0,
    loopDetected: state.loopDetected,
  };
}

/** Computes average tokens per model call from session history, defaulting to 3000. */
export function getAvgCallTokens(
  sessionUsageCount: number,
  sessionTotalTokens: number,
): number {
  if (
    !Number.isFinite(sessionUsageCount) ||
    !Number.isFinite(sessionTotalTokens) ||
    sessionUsageCount <= 0 ||
    sessionTotalTokens <= 0
  ) {
    return DEFAULT_AVG_CALL_TOKENS;
  }
  return Math.max(1, Math.round(sessionTotalTokens / sessionUsageCount));
}

/** Builds level-appropriate system instructions, planning hint, rules, and optional loop warning. */
export function buildTankInstructions(
  status: TankStatus,
  avgCallTokens: number = DEFAULT_AVG_CALL_TOKENS,
): string {
  const estTag = status.estimated ? ", estimated" : "";
  const header = `[Tankful: ${status.remaining}/${status.limit} tokens remaining (${status.percentLeft}%), level=${status.level}${estTag}]`;

  const avg =
    Number.isFinite(avgCallTokens) && avgCallTokens > 0
      ? Math.round(avgCallTokens)
      : DEFAULT_AVG_CALL_TOKENS;
  const reserve = getDefaultReserve(avg);
  const reserveReached = status.used > 0 && status.remaining < reserve;

  let guidance: string;
  if (status.level === "empty") {
    guidance = "Budget is empty (0 remaining). Do not start new work or call tools.";
  } else if (status.level === "critical") {
    guidance =
      "Budget is critical. Stop gathering new info, do not call tools, and write your final answer now.";
  } else if (reserveReached) {
    guidance =
      "Budget reserve reached for final answer (tools are disabled). Do NOT call any tools; write your final answer now.";
  } else if (status.level === "low") {
    guidance = "Budget is low. Keep answers short and skip optional work.";
  } else {
    guidance = "Budget is healthy. Work thoroughly and use tools as needed.";
  }

  const callsFit = Math.floor(status.limit / avg);
  const planHint =
    status.used === 0 || status.steps === 0
      ? ` Plan within your ${status.limit}-token budget (~${avg} tokens/call, ~${callsFit} calls fit): decide up front what you can finish, do the most important first, and say in one line what you plan to skip.`
      : "";

  const completedList =
    status.level !== "ok" || reserveReached
      ? ` Tool calls completed this turn: ${
          status.completedCalls && status.completedCalls.length > 0
            ? status.completedCalls.join(", ")
            : "none"
        }.`
      : "";

  const rules =
    ' Use only what tool results actually say. Don\'t add facts that aren\'t in them. If you stop before finishing everything the user asked for, for any reason, end your final message with a line: "Budget note: completed <list>; skipped <list>." In your Budget note, list as completed ONLY work backed by a tool call above or by what the user gave you. Anything the user asked for that has no completed tool call is skipped. Never write \'skipped none\' unless every requested item has a completed tool call.';

  const loopWarning = status.loopDetected
    ? " WARNING: Loop detected — the same step was repeated multiple times in a row. Change your approach immediately."
    : "";

  return `${header} ${guidance}${planHint}${completedList}${rules}${loopWarning}`;
}

/** Produces the end-of-run report snapshot. */
export function createTankReport(state: TankState, config?: TankConfig): TankReport {
  const status = getTankStatus(state, config);
  return {
    limit: status.limit,
    used: status.used,
    remaining: status.remaining,
    percentLeft: status.percentLeft,
    level: status.level,
    steps: status.steps,
    estimated: status.estimated,
    loopDetected: status.loopDetected,
  };
}

const LEVEL_RANK: Record<TankLevel, number> = {
  empty: 0,
  critical: 1,
  low: 2,
  ok: 3,
};

export interface ToolGateOptions {
  /** Minimum tokens to reserve for the final answer (defaults to `1.5 * avgCallTokens`). */
  reserve?: number;
  /** Level at or below which the tool is hidden (alternative or additional gate). */
  disableAt?: TankLevel;
}

/** Computes default token reserve (`1.5 * avgCallTokens`, 4500 before any call). */
export function getDefaultReserve(
  avgCallTokens: number = DEFAULT_AVG_CALL_TOKENS,
): number {
  const avg =
    Number.isFinite(avgCallTokens) && avgCallTokens > 0
      ? avgCallTokens
      : DEFAULT_AVG_CALL_TOKENS;
  return Math.round(avg * 1.5);
}

/**
 * Returns true if a tool should remain available.
 * Hides the tool when `remaining < reserve` (unless only `disableAt` is specified)
 * or when `level` is at or below `disableAt`.
 */
export function shouldAllowTool(
  levelOrStatus: TankLevel | Pick<TankStatus, "level" | "remaining">,
  disableAtOrOptions?: TankLevel | ToolGateOptions,
  avgCallTokens: number = DEFAULT_AVG_CALL_TOKENS,
): boolean {
  if (typeof levelOrStatus === "string") {
    const disableAt =
      typeof disableAtOrOptions === "string"
        ? disableAtOrOptions
        : disableAtOrOptions?.disableAt ?? "critical";
    return LEVEL_RANK[levelOrStatus] > LEVEL_RANK[disableAt];
  }

  const opts: ToolGateOptions =
    typeof disableAtOrOptions === "string"
      ? { disableAt: disableAtOrOptions }
      : disableAtOrOptions ?? {};

  if (opts.disableAt !== undefined && LEVEL_RANK[levelOrStatus.level] <= LEVEL_RANK[opts.disableAt]) {
    return false;
  }

  if (opts.disableAt === undefined || opts.reserve !== undefined) {
    const reserve = opts.reserve ?? getDefaultReserve(avgCallTokens);
    if (levelOrStatus.remaining < reserve) {
      return false;
    }
  }

  return true;
}

/** Formats an end-of-run report as a concise single-line summary. */
export function formatTankReport(report: TankReport): string {
  return (
    `Tankful Report | limit=${report.limit} used=${report.used} ` +
    `remaining=${report.remaining} (${report.percentLeft}%, ${report.level}) ` +
    `steps=${report.steps} estimated=${report.estimated} loopDetected=${report.loopDetected}`
  );
}
