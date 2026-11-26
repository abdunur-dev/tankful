import {
  buildTankInstructions,
  createTankReport,
  createTankState,
  formatCallLabel,
  formatTankReport,
  recordRealUsage,
  recordStep,
  type TankStatus,
} from "../../../../extension/lib/tank";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout, DocLink, H2 } from "@/components/docs/primitives";

import type { DocPage } from "./types";

const wrap = "[&_pre]:whitespace-pre-wrap";

function status(partial: Partial<TankStatus>): TankStatus {
  return {
    limit: 14_000,
    used: 0,
    remaining: 14_000,
    percentLeft: 100,
    level: "ok",
    steps: 0,
    completedCalls: [],
    estimated: false,
    loopDetected: false,
    ...partial,
  };
}

export const howItWorks: DocPage = {
  slug: "how-it-works",
  title: "How it works",
  description: "The eve events Tankful listens to, and what it does with each one.",
  toc: [
    { id: "pieces", title: "The pieces" },
    { id: "lifecycle", title: "A turn, step by step" },
    { id: "state", title: "State and scope" },
  ],
  Body: () => (
    <>
      <p>
        Tankful is a hook, a dynamic instruction, a tool, and an optional tool wrapper. All the budget math lives in one
        pure TypeScript file with no eve imports, so it is easy to test.
      </p>
      <H2 id="pieces">The pieces</H2>
      <div className="overflow-x-auto border border-line">
        <table>
          <thead>
            <tr><th>Piece</th><th>What it does</th></tr>
          </thead>
          <tbody>
            <tr><td><code>hooks/tracker.ts</code></td><td>Listens to eve events and keeps the tank up to date.</td></tr>
            <tr><td><code>instructions/tankful.ts</code></td><td>Adds budget guidance before every model call.</td></tr>
            <tr><td><code>tools/check_tank.ts</code></td><td>Lets the agent read its tank.</td></tr>
            <tr><td><code>tankful/guard</code></td><td><code>whenBudgetAllows</code> hides a wrapped tool when the budget is low.</td></tr>
            <tr><td><code>lib/tank.ts</code></td><td>The core: accounting, levels, loop detection, instruction text, and reports.</td></tr>
          </tbody>
        </table>
      </div>
      <H2 id="lifecycle">A turn, step by step</H2>
      <ol>
        <li><strong><code>turn.started</code></strong>: refill the tank. Keep the previous turn’s report and the session’s average call size.</li>
        <li><strong>Before each model call</strong>: compute the level and inject the matching instruction. At the start of a turn, add a planning hint with how many calls fit.</li>
        <li><strong><code>model.started</code></strong>: count the size of the previous call as an estimate while this one runs.</li>
        <li><strong><code>content.completed</code></strong>: if text arrives without usage data, estimate about 4 characters per token.</li>
        <li><strong><code>model.settled</code></strong>: if usage hasn’t arrived yet, keep at least the previous call’s size so the next instruction doesn’t undercount.</li>
        <li><strong><code>usage.recorded</code></strong>: replace estimates for that call with the real input plus output tokens.</li>
        <li><strong><code>call.settled</code></strong>: record the tool call as a step, add it to the completed list, and check for a loop.</li>
        <li><strong><code>turn.settled</code></strong>: build the report, log it, and write <code>.eve/tankful-last-report.json</code>.</li>
      </ol>
      <H2 id="state">State and scope</H2>
      <p>
        State lives in eve’s <code>defineState</code>, keyed by the mount. Each session has its own tank, and so does each
        subagent. The tank resets every turn, so Tankful never enforces a limit across turns; that is what eve’s{" "}
        <DocLink href="/docs/eve-limits">session limits</DocLink> are for.
      </p>
    </>
  ),
};

export const levels: DocPage = {
  slug: "levels",
  title: "Levels and instructions",
  description: "How Tankful picks a level and what it tells the model at each one.",
  toc: [
    { id: "thresholds", title: "Thresholds" },
    { id: "reserve", title: "The final-answer reserve" },
    { id: "examples", title: "What the model sees" },
    { id: "budget-note", title: "The Budget note" },
  ],
  Body: async () => {
    const start = buildTankInstructions(status({}));
    const low = buildTankInstructions(
      status({ used: 10_000, remaining: 4_000, percentLeft: 28.57, level: "low", steps: 2, completedCalls: ["search_docs(usage tracking)", "search_docs(loop detection)"] }),
      2_500,
    );
    const critical = buildTankInstructions(
      status({ used: 13_000, remaining: 1_000, percentLeft: 7.14, level: "critical", steps: 3, completedCalls: ["search_docs(usage tracking)", "search_docs(loop detection)", "search_docs(dynamic instructions)"] }),
      3_500,
    );
    return (
      <>
        <p>
          Before every model call, Tankful computes how much of the tank is left and picks one of four levels. Each level
          comes with guidance for the model.
        </p>
        <H2 id="thresholds">Thresholds</H2>
        <div className="overflow-x-auto border border-line">
          <table>
            <thead>
              <tr><th>Level</th><th>When</th><th>Guidance</th><th>Role</th></tr>
            </thead>
            <tbody>
              <tr><td><code>ok</code></td><td>more than <code>lowAt</code> left (default 30%)</td><td>Work thoroughly and use tools as needed.</td><td>system</td></tr>
              <tr><td><code>low</code></td><td>at or below <code>lowAt</code></td><td>Keep answers short and skip optional work.</td><td>system</td></tr>
              <tr><td><code>critical</code></td><td>at or below <code>criticalAt</code> (default 10%)</td><td>Stop gathering info, don’t call tools, write the final answer now.</td><td>user</td></tr>
              <tr><td><code>empty</code></td><td>0 tokens left</td><td>Don’t start new work or call tools.</td><td>user</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          At <code>critical</code> and <code>empty</code>, the instruction is sent as a <strong>user</strong> message
          instead of a system message, because models are less likely to ignore it.
        </p>
        <H2 id="reserve">The final-answer reserve</H2>
        <p>
          The reserve is the room the agent needs to write its final answer: 1.5 times the session’s average call size, or
          4,500 tokens before any call has finished. Once the remaining tokens drop below it, Tankful treats the turn like{" "}
          <code>critical</code> even if the level is still <code>ok</code> or <code>low</code>: it tells the model that
          tools are off and sends the instruction as a user message.
        </p>
        <H2 id="examples">What the model sees</H2>
        <p>These are generated by Tankful’s own code with a 14,000-token limit.</p>
        <p><strong>Start of a turn</strong>, with the planning hint:</p>
        <CodeBlock lang="bash" lineNumbers={false} code={start} className={wrap} />
        <p><strong>Low</strong>, with the completed calls so far:</p>
        <CodeBlock lang="bash" lineNumbers={false} code={low} className={wrap} />
        <p><strong>Critical</strong>, with the Budget note pre-filled at the front:</p>
        <CodeBlock lang="bash" lineNumbers={false} code={critical} className={wrap} />
        <H2 id="budget-note">The Budget note</H2>
        <p>
          Tankful asks the agent to end with a line saying what it completed and what it skipped. Once tools are off, it
          pre-fills the completed part from the real tool calls and puts that line first. In early versions the note was
          missing or wrong in 2 of 3 runs; with the pre-filled note, both test runs got it right.
        </p>
        <Callout tone="warn">
          <p>
            Tankful manages budget, not accuracy. A model that skips tool calls can still write ungrounded text or leave the
            note out.
          </p>
        </Callout>
      </>
    );
  },
};

export const tokenAccounting: DocPage = {
  slug: "token-accounting",
  title: "Token accounting",
  description: "What Tankful counts, and how it estimates when usage hasn’t arrived yet.",
  toc: [
    { id: "real-usage", title: "Real usage" },
    { id: "estimates", title: "Estimates" },
    { id: "average", title: "Average call size" },
    { id: "overshoot", title: "Why turns can overshoot" },
  ],
  Body: () => (
    <>
      <H2 id="real-usage">Real usage</H2>
      <p>
        For each <code>usage.recorded</code> event, Tankful adds <code>inputTokens + outputTokens</code> to the tank. eve’s{" "}
        <code>inputTokens</code> already includes <code>cacheReadTokens</code> and <code>cacheWriteTokens</code>, so cached
        tokens count. That reflects the full context the model processed on each call.
      </p>
      <H2 id="estimates">Estimates</H2>
      <p>Usage arrives after a call finishes. Until then, Tankful estimates so it doesn’t undercount:</p>
      <ul>
        <li>While a call runs, it counts the size of the previous call.</li>
        <li>For text that arrives without usage data, it counts about 1 token per 4 characters.</li>
        <li>When real usage arrives for that call, the estimate is replaced.</li>
      </ul>
      <p>
        Whenever estimates are part of the count, <code>estimated</code> is <code>true</code> in{" "}
        <DocLink href="/docs/check-tank">check_tank</DocLink>, the instruction header, and the report.
      </p>
      <CodeBlock
        lang="bash"
        lineNumbers={false}
        code={`limit 8,000
call 1 settles:  2,991 in + 124 out  → used 3,115   ok
call 2 running:  + ~3,115 estimate   → used 6,230   low (estimated)
call 2 settles:  3,171 in + 56 out   → used 6,342   low`}
      />
      <H2 id="average">Average call size</H2>
      <p>
        Tankful tracks the average tokens per call across the whole session, not just the current turn. It starts at
        3,000. The average sets the reserve (1.5 times the average) and the “calls fit” number in the planning hint.
      </p>
      <H2 id="overshoot">Why turns can overshoot</H2>
      <p>
        Tankful can only react between calls. One large call can push the turn past <code>limit</code> before the next step
        sees <code>empty</code>. In testing, turns ended 6% to 9% over. Set <code>limit</code> about 10% below your real cap.
      </p>
    </>
  ),
};

export const loopDetection: DocPage = {
  slug: "loop-detection",
  title: "Loop detection",
  description: "How Tankful notices an agent repeating itself.",
  toc: [
    { id: "rule", title: "The rule" },
    { id: "excluded", title: "What doesn’t count" },
    { id: "warning", title: "The warning" },
  ],
  Body: () => (
    <>
      <H2 id="rule">The rule</H2>
      <p>
        Each tool call is keyed by its name and its JSON input. When the same key appears <code>loopRepeats</code> times in a
        row (3 by default), Tankful sets <code>loopDetected</code>. The same call with other calls in between does not
        count.
      </p>
      <CodeBlock
        lang="bash"
        lineNumbers={false}
        code={`read_file({"path":"a.md"})   1
read_file({"path":"a.md"})   2
read_file({"path":"a.md"})   3  → loopDetected = true`}
      />
      <p>The flag stays on for the rest of the turn and resets on the next <code>turn.started</code>.</p>
      <H2 id="excluded">What doesn’t count</H2>
      <p>
        Tankful’s own tools are excluded: <code>check_tank</code>, any <code>*__check_tank</code>, and anything starting with{" "}
        <code>tankful__</code>. Checking the tank never triggers or hides a loop, and never shows up in the completed calls.
      </p>
      <H2 id="warning">The warning</H2>
      <p>Once a loop is detected, every instruction for the rest of the turn ends with:</p>
      <CodeBlock
        lang="bash"
        lineNumbers={false}
        code="WARNING: Loop detected — the same step was repeated multiple times in a row. Change your approach immediately."
        className={wrap}
      />
    </>
  ),
};

export const report: DocPage = {
  slug: "report",
  title: "End-of-turn report",
  description: "The summary Tankful logs and writes when a turn ends.",
  toc: [
    { id: "log-line", title: "Log line" },
    { id: "file", title: "Report file" },
    { id: "fields", title: "Fields" },
  ],
  Body: () => {
    const config = { limit: 14_000 };
    let state = createTankState(config);
    state = recordRealUsage(state, { inputTokens: 3_520, outputTokens: 130 });
    state = recordStep(state, 'search_docs:{"query":"usage tracking"}', config, formatCallLabel("search_docs", { query: "usage tracking" }));
    state = recordRealUsage(state, { inputTokens: 4_190, outputTokens: 130 });
    state = recordStep(state, 'search_docs:{"query":"loop detection"}', config, formatCallLabel("search_docs", { query: "loop detection" }));
    state = recordRealUsage(state, { inputTokens: 4_780, outputTokens: 120 });
    state = recordStep(state, 'search_docs:{"query":"dynamic instructions"}', config, formatCallLabel("search_docs", { query: "dynamic instructions" }));
    state = recordRealUsage(state, { inputTokens: 2_190, outputTokens: 209 });
    const r = createTankReport(state, config, 3_817);
    return (
      <>
        <p>On <code>turn.settled</code>, Tankful builds a report for the turn, logs it, and writes it to a file.</p>
        <H2 id="log-line">Log line</H2>
        <CodeBlock lang="bash" lineNumbers={false} code={formatTankReport(r)} className={wrap} />
        <H2 id="file">Report file</H2>
        <p>
          The same report is written to <code>.eve/tankful-last-report.json</code> in the agent’s working directory and
          overwritten every turn. This one is from README run E, where the agent covered 3 of 5 topics:
        </p>
        <CodeBlock lang="json" filename=".eve/tankful-last-report.json" code={JSON.stringify(r, null, 2)} />
        <p>
          The file can’t be turned off. If the directory is read-only, as on some serverless hosts, the write is skipped
          silently.
        </p>
        <H2 id="fields">Fields</H2>
        <div className="overflow-x-auto border border-line">
          <table>
            <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>limit</code>, <code>used</code>, <code>remaining</code></td><td>Tokens. <code>remaining</code> never goes below 0.</td></tr>
              <tr><td><code>percentLeft</code>, <code>level</code></td><td>Where the tank ended.</td></tr>
              <tr><td><code>steps</code></td><td>Tool calls this turn, including <code>check_tank</code>.</td></tr>
              <tr><td><code>completedCalls</code></td><td>Tool calls as <code>name(arg)</code>, without Tankful’s own tools.</td></tr>
              <tr><td><code>toolsHidden</code></td><td>Whether the turn ended below the reserve or at <code>critical</code>/<code>empty</code>.</td></tr>
              <tr><td><code>estimated</code></td><td>Whether any estimate is still part of <code>used</code>.</td></tr>
              <tr><td><code>loopDetected</code></td><td>Whether a loop was detected this turn.</td></tr>
            </tbody>
          </table>
        </div>
      </>
    );
  },
};
