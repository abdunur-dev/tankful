import { CodeBlock } from "@/components/CodeBlock";
import { Callout, DocLink, H2, PropTable } from "@/components/docs/primitives";

import type { DocPage } from "./types";

export const configuration: DocPage = {
  slug: "configuration",
  title: "Configuration",
  description: "Every option you can pass to tankful().",
  toc: [
    { id: "options", title: "Options" },
    { id: "validation", title: "Validation" },
  ],
  Body: () => (
    <>
      <CodeBlock
        filename="agent/extensions/tankful.ts"
        code={`import tankful from "tankful";

export default tankful({
  limit: 50_000,
  lowAt: 0.3,
  criticalAt: 0.1,
  loopRepeats: 3,
});`}
      />
      <H2 id="options">Options</H2>
      <PropTable
        rows={[
          { name: "limit", type: "number", def: "derived if cap supplied", desc: "Explicit soft limit per turn. With both options set, limit wins unchanged: no headroom deduction or clamp to turnCapTokens." },
          { name: "turnCapTokens", type: "integer", def: "not set", desc: "Reference cap for a single turn, not the remaining eve session allowance." },
          { name: "headroom", type: "number", def: "0.1", desc: "Fraction to leave unused when deriving the soft limit. The result is floor(turnCapTokens × (1 − headroom)). Zero disables the deduction." },
          { name: "lowAt", type: "number", def: "0.3", desc: <>Fraction left at or below which the level is <code>low</code>.</> },
          { name: "criticalAt", type: "number", def: "0.1", desc: <>Fraction left at or below which the level is <code>critical</code>. Must be less than <code>lowAt</code>.</> },
          { name: "loopRepeats", type: "integer", def: "3", desc: "Identical tool calls in a row that count as a loop." },
        ]}
      />
      <H2 id="validation">Validation</H2>
      <ul>
        <li>Supply <code>limit</code> or <code>turnCapTokens</code>, even without an eve hard limit. Tankful does not discover a cap.</li>
        <li>If supplied, <code>limit</code> must be positive and finite, and <code>turnCapTokens</code> must be a safe integer of at least 2.</li>
        <li><code>headroom</code> must be finite and in [0, 1). If deriving a limit, at least one token must remain. With explicit <code>limit</code>, the other options are validated but unused.</li>
        <li><code>lowAt</code> must be between 0 and 1, exclusive.</li>
        <li><code>criticalAt</code> must be at least 0 and less than <code>lowAt</code>.</li>
        <li><code>loopRepeats</code> must be an integer of at least 2.</li>
      </ul>
      <p>Invalid config fails when eve loads the extension, not halfway through a turn.</p>
      <p>Every turn refills to the same soft limit, regardless of earlier spend. See <DocLink href="/docs/eve-limits">Pair with eve limits</DocLink> for a multi-turn example.</p>
    </>
  ),
};

export const checkTank: DocPage = {
  slug: "check-tank",
  title: "check_tank",
  description: "The tool the agent calls to read its tank.",
  toc: [
    { id: "name", title: "Name" },
    { id: "result", title: "Result" },
  ],
  Body: () => (
    <>
      <H2 id="name">Name</H2>
      <p>
        The tool is <code>check_tank</code> inside the extension. With the mount at <code>agent/extensions/tankful.ts</code>,
        the model sees it as <code>tankful__check_tank</code>. It takes no input.
      </p>
      <p>Calls to it count as steps, but never as loops or completed calls.</p>
      <H2 id="result">Result</H2>
      <CodeBlock
        lang="json"
        filename="tankful__check_tank → result"
        code={`{
  "limit": 8000,
  "used": 6230,
  "remaining": 1770,
  "percentLeft": 22.13,
  "level": "low",
  "steps": 0,
  "completedCalls": [],
  "estimated": true,
  "loopDetected": false
}`}
      />
      <p>
        <code>used</code> includes the estimate for a call that is still running. See{" "}
        <DocLink href="/docs/token-accounting">Token accounting</DocLink>.
      </p>
    </>
  ),
};

export const whenBudgetAllows: DocPage = {
  slug: "when-budget-allows",
  title: "whenBudgetAllows",
  description: "Wrap a tool so it disappears when the budget is too low.",
  toc: [
    { id: "signature", title: "Signature" },
    { id: "options", title: "Options" },
    { id: "rules", title: "When a tool is hidden" },
  ],
  Body: () => (
    <>
      <H2 id="signature">Signature</H2>
      <CodeBlock
        code={`import { whenBudgetAllows } from "tankful/guard";

whenBudgetAllows(tool, options?)`}
      />
      <p>
        It wraps the tool in eve’s <code>defineDynamic</code>, which returns the tool while the budget allows it and{" "}
        <code>null</code> otherwise, so the model doesn’t see it.
      </p>
      <H2 id="options">Options</H2>
      <PropTable
        rows={[
          { name: "reserve", type: "number", def: "1.5 × avg", desc: "Hide the tool when remaining tokens are below this. 4,500 before any call has finished." },
          { name: "disableAt", type: `"low" | "critical" | "empty"`, def: "not set", desc: "Hide the tool at this level or a lower one." },
        ]}
      />
      <H2 id="rules">When a tool is hidden</H2>
      <ul>
        <li>No options: hidden when <code>remaining &lt; reserve</code>.</li>
        <li>Only <code>disableAt</code>: hidden at that level or below. The reserve is not checked.</li>
        <li>Only <code>reserve</code>: hidden when <code>remaining &lt; reserve</code>.</li>
        <li>Both: hidden when either applies.</li>
      </ul>
      <Callout>
        <p>
          Mount <code>agent/extensions/tankful.ts</code> before using the guard. It reads the mounted extension’s state.
        </p>
      </Callout>
    </>
  ),
};

export const knownLimits: DocPage = {
  slug: "known-limits",
  title: "Known limits",
  description: "What Tankful doesn’t do.",
  toc: [{ id: "limits", title: "Limits" }],
  Body: () => (
    <>
      <H2 id="limits">Limits</H2>
      <ul>
        <li><strong>Budget, not accuracy.</strong> A model that skips tool calls can still write ungrounded text or leave out the Budget note.</li>
        <li><strong>Instructions are advice.</strong> Some models keep calling tools at <code>critical</code> or <code>empty</code> unless you <DocLink href="/docs/guard-tools">guard them</DocLink>.</li>
        <li><strong>Only wrapped tools are hidden.</strong> eve’s built-in tools stay available unless you override them with <code>whenBudgetAllows</code>.</li>
        <li><strong>Per turn only.</strong> Tankful resets every turn and doesn’t cap a session. Use eve’s <code>limits.sessionUsage</code> for that.</li>
        <li><strong>Counted after each call.</strong> Usage arrives when a call finishes, so one large call can overshoot <code>limit</code>.</li>
        <li><strong>Subagents are separate.</strong> Each subagent gets its own tank.</li>
      </ul>
    </>
  ),
};
