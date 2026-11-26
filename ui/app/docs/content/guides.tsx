import { CodeBlock } from "@/components/CodeBlock";
import { Callout, DocLink, H2 } from "@/components/docs/primitives";

import type { DocPage } from "./types";

export const guardTools: DocPage = {
  slug: "guard-tools",
  title: "Guard your tools",
  description: "Hide tools from the model when the budget runs low.",
  toc: [
    { id: "why", title: "Why guard tools" },
    { id: "your-tools", title: "Your own tools" },
    { id: "built-in", title: "eve’s built-in tools" },
    { id: "options", title: "Reserve and disableAt" },
  ],
  Body: () => (
    <>
      <H2 id="why">Why guard tools</H2>
      <p>
        Instructions are advice. Some models keep calling tools at <code>critical</code> or even <code>empty</code>.{" "}
        <code>whenBudgetAllows</code> removes the tool from the model’s tool list when the budget is too low, so it can’t be
        called at all.
      </p>
      <Callout>
        <p>
          The guard reads state from the mounted <code>tankful</code> extension. Mount{" "}
          <code>agent/extensions/tankful.ts</code> first.
        </p>
      </Callout>
      <H2 id="your-tools">Your own tools</H2>
      <CodeBlock
        filename="agent/tools/search_docs.ts"
        code={`import { defineTool } from "eve/tools";
import { whenBudgetAllows } from "tankful/guard";

export default whenBudgetAllows(defineTool({ /* ... */ }));`}
      />
      <H2 id="built-in">eve’s built-in tools</H2>
      <p>
        Only wrapped tools are hidden. eve’s built-in tools (<code>bash</code>, <code>read_file</code>,{" "}
        <code>write_file</code>, <code>edit_file</code>, <code>web_fetch</code>, <code>glob</code>, <code>grep</code>) stay
        available unless you override them in <code>agent/tools/&lt;name&gt;.ts</code>:
      </p>
      <CodeBlock
        filename="agent/tools/bash.ts"
        code={`import { bash } from "eve/tools/bash";
import { whenBudgetAllows } from "tankful/guard";

export default whenBudgetAllows(bash);`}
      />
      <H2 id="options">Reserve and disableAt</H2>
      <p>
        By default, a guarded tool is hidden once the remaining tokens drop below the reserve: 1.5 times the average call
        size, or 4,500 tokens before any call. You can change that per tool:
      </p>
      <CodeBlock
        code={`// Hide below a fixed reserve
export default whenBudgetAllows(webFetch, { reserve: 8_000 });

// Hide at "critical" or "empty" only, ignoring the reserve
export default whenBudgetAllows(grep, { disableAt: "critical" });

// Both: hidden when either one applies
export default whenBudgetAllows(bash, { reserve: 6_000, disableAt: "low" });`}
      />
      <p>
        Passing only <code>disableAt</code> turns the reserve check off for that tool. See{" "}
        <DocLink href="/docs/when-budget-allows">whenBudgetAllows</DocLink> for the exact rules.
      </p>
    </>
  ),
};

export const eveLimits: DocPage = {
  slug: "eve-limits",
  title: "Pair with eve limits",
  description: "Use Tankful as the soft layer inside eve’s hard session limit.",
  toc: [
    { id: "difference", title: "Soft and hard limits" },
    { id: "together", title: "Use both" },
  ],
  Body: () => (
    <>
      <H2 id="difference">Soft and hard limits</H2>
      <div className="overflow-x-auto border border-line">
        <table>
          <thead><tr><th></th><th>Tankful</th><th>eve <code>limits.sessionUsage</code></th></tr></thead>
          <tbody>
            <tr><td>Scope</td><td>One turn</td><td>The whole session</td></tr>
            <tr><td>Kind</td><td>Soft: guidance and hidden tools</td><td>Hard: stops starting model calls</td></tr>
            <tr><td>Model sees it</td><td>Yes, before every call</td><td>No</td></tr>
            <tr><td>Ending</td><td>Final answer with a Budget note</td><td>Cut off</td></tr>
          </tbody>
        </table>
      </div>
      <H2 id="together">Use both</H2>
      <p>
        Tankful refills every turn. eve checks its session policy between model calls. Its policy can count
        tokens, cost, or both; it does not expose a single remaining-token allowance to Tankful. If your
        policy counts input plus output, you can choose to share a constant, without sharing state:
      </p>
      <CodeBlock filename="agent/lib/budget.ts" code="export const CAP_TOKENS = 20_000;" />
      <CodeBlock
        filename="agent/extensions/tankful.ts"
        code={`import tankful from "tankful";
import { CAP_TOKENS } from "../lib/budget";

export default tankful({ turnCapTokens: CAP_TOKENS, headroom: 0.2 }); // 16,000 per turn`}
      />
      <CodeBlock
        filename="agent/agent.ts"
        code={`import { defineAgent } from "eve";
import { CAP_TOKENS } from "./lib/budget";

export default defineAgent({
  limits: {
    sessionUsage: ({ window }) =>
      window.inputTokens + window.outputTokens >= CAP_TOKENS,
  },
});`}
      />
      <p>
        If earlier turns spent 17,000 tokens in the current eve window, the session threshold is only
        3,000 tokens away. Tankful still starts this turn with 16,000. eve may pause first, and an
        in-flight call can overshoot. Disabling the eve limit changes neither the refill nor the 16,000 figure.
      </p>
    </>
  ),
};

export const debugging: DocPage = {
  slug: "debugging",
  title: "Debugging",
  description: "See what Tankful injects before every model call.",
  toc: [
    { id: "debug-logging", title: "Debug logging" },
    { id: "report", title: "Read the last report" },
  ],
  Body: () => (
    <>
      <H2 id="debug-logging">Debug logging</H2>
      <p>
        Set <code>TANKFUL_DEBUG=1</code> to log the tank and the exact instruction before every model call:
      </p>
      <CodeBlock lang="bash" lineNumbers={false} code="TANKFUL_DEBUG=1 eve dev" />
      <CodeBlock lang="powershell" lineNumbers={false} code={`$env:TANKFUL_DEBUG = "1"; eve dev`} />
      <CodeBlock
        lang="bash"
        lineNumbers={false}
        code={`[tankful:debug] used=6230 remaining=1770 percentLeft=22.13% level=low instruction="[Tankful: 1770/8000 tokens remaining (22.13%), level=low, estimated] ..."`}
        className="[&_pre]:whitespace-pre-wrap"
      />
      <H2 id="report">Read the last report</H2>
      <p>
        After each turn, the report is in <code>.eve/tankful-last-report.json</code>. See{" "}
        <DocLink href="/docs/report">End-of-turn report</DocLink>.
      </p>
    </>
  ),
};
