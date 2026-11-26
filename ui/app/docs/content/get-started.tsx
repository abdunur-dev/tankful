import { CodeBlock } from "@/components/CodeBlock";
import { Callout, Cards, DocLink, H2 } from "@/components/docs/primitives";
import { InstallCommand } from "@/components/InstallCommand";

import type { DocPage } from "./types";

export const introduction: DocPage = {
  slug: "introduction",
  title: "Introduction",
  description: "What Tankful is and why an agent needs to see its budget.",
  toc: [
    { id: "why", title: "Why Tankful" },
    { id: "features", title: "Features" },
    { id: "next-steps", title: "Next steps" },
  ],
  Body: () => (
    <>
      <p>
        Tankful is an <a href="https://eve.dev/docs/extensions" target="_blank" rel="noopener noreferrer">eve extension</a> that
        gives an agent a token fuel tank. eve can cut an agent off at a limit. Tankful lets the agent see its tank and plan
        around it, so it finishes the most important work and says what it skipped instead of stopping mid-sentence.
      </p>
      <H2 id="why">Why Tankful</H2>
      <p>
        eve’s built-in <code>limits.sessionUsage</code> is a hard circuit breaker. When the session crosses a token or cost
        threshold, eve stops starting model calls. The model gets no warning first, so the user gets a half-finished answer.
      </p>
      <p>
        Tankful adds a soft layer inside that limit. Every turn gets its own budget. Before each model call, Tankful tells
        the model how many tokens are left and what to do about it. As the tank drains, the guidance gets stricter, until
        the agent stops calling tools and writes its final answer with a <strong>Budget note</strong>:
      </p>
      <CodeBlock
        lang="bash"
        lineNumbers={false}
        code="Budget note: completed search_docs(usage tracking), search_docs(loop detection), search_docs(dynamic instructions); skipped reports and debug logging."
        className="[&_pre]:whitespace-pre-wrap"
      />
      <H2 id="features">Features</H2>
      <ul>
        <li><strong>Per-turn budget.</strong> The tank refills on every <code>turn.started</code>.</li>
        <li><strong>Real token counts.</strong> Input plus output tokens from <code>usage.recorded</code>, with estimates while a call is still running.</li>
        <li><strong>Four levels.</strong> <code>ok</code>, <code>low</code>, <code>critical</code>, and <code>empty</code>, with thresholds you set.</li>
        <li><strong>Adaptive instructions.</strong> Guidance before every model call, escalated to a user message near the end.</li>
        <li><strong>A <code>check_tank</code> tool.</strong> The agent can read its tank whenever it wants.</li>
        <li><strong>Tool gating.</strong> <code>whenBudgetAllows</code> hides a tool once the final-answer reserve is reached.</li>
        <li><strong>Loop detection.</strong> A warning when the same call repeats several times in a row.</li>
        <li><strong>End-of-turn report.</strong> Logged, and written to <code>.eve/tankful-last-report.json</code>.</li>
      </ul>
      <Callout title="The budget is soft">
        <p>
          A model call can’t be stopped midway, so a turn can end a little over the limit. In testing, usage ran 6% to 9%
          over. Set <code>limit</code> about 10% below your real cap, and keep eve’s <code>limits.sessionUsage</code> as
          the hard stop.
        </p>
      </Callout>
      <H2 id="next-steps">Next steps</H2>
      <Cards
        items={[
          { title: "Installation", body: "Install the package and mount it in your agent.", href: "/docs/installation" },
          { title: "How it works", body: "The eve events Tankful listens to, and what it does with each.", href: "/docs/how-it-works" },
          { title: "Guard your tools", body: "Hide tools when the budget runs low, not just ask the model to stop.", href: "/docs/guard-tools" },
          { title: "Configuration", body: "Every option and its default.", href: "/docs/configuration" },
        ]}
      />
    </>
  ),
};

export const installation: DocPage = {
  slug: "installation",
  title: "Installation",
  description: "Install Tankful and mount it in an eve agent.",
  toc: [
    { id: "install", title: "Install the package" },
    { id: "mount", title: "Mount the extension" },
    { id: "choose-a-limit", title: "Choose a limit" },
    { id: "guard", title: "Guard your tools (optional)" },
    { id: "verify", title: "Check that it works" },
  ],
  Body: () => (
    <>
      <p>
        Tankful needs an eve agent and Node.js 24 or later. eve is a peer dependency, so Tankful runs on the eve version your
        agent already uses.
      </p>
      <H2 id="install">Install the package</H2>
      <InstallCommand />
      <H2 id="mount">Mount the extension</H2>
      <p>
        Create <code>agent/extensions/tankful.ts</code>. The filename becomes the mount name, so the tool appears to the
        model as <code>tankful__check_tank</code>.
      </p>
      <CodeBlock
        filename="agent/extensions/tankful.ts"
        code={`import tankful from "tankful";

export default tankful({
  limit: 50_000,
  // Optional defaults:
  // lowAt: 0.3,       // <= 30% remaining -> "low"
  // criticalAt: 0.1,  // <= 10% remaining -> "critical"
  // loopRepeats: 3,   // same step repeated N times in a row -> loop warning
});`}
      />
      <H2 id="choose-a-limit">Choose a limit</H2>
      <p>
        <code>limit</code> is the number of tokens one turn may use. Use <strong>at least 10,000</strong>, or two to three
        times your average call cost, so the agent can take several steps before it reaches the default 4,500-token
        final-answer reserve.
      </p>
      <p>
        Tankful counts cached input tokens too, because eve includes them in <code>inputTokens</code>. Long conversations
        with a big context use the tank faster than the visible output suggests.
      </p>
      <H2 id="guard">Guard your tools (optional)</H2>
      <p>
        Instructions alone don’t stop a model that ignores them. To actually hide a tool when the budget runs out, wrap it
        with <code>whenBudgetAllows</code>. The guard reads state from the mounted extension, so mount Tankful first.
      </p>
      <CodeBlock
        filename="agent/tools/search_docs.ts"
        code={`import { defineTool } from "eve/tools";
import { whenBudgetAllows } from "tankful/guard";

export default whenBudgetAllows(defineTool({ /* ... */ }));`}
      />
      <p>
        See <DocLink href="/docs/guard-tools">Guard your tools</DocLink> for wrapping eve’s built-in tools such as{" "}
        <code>bash</code>.
      </p>
      <H2 id="verify">Check that it works</H2>
      <p>Run your agent, send a message, and read the report Tankful writes when the turn ends:</p>
      <CodeBlock lang="bash" lineNumbers={false} code="cat .eve/tankful-last-report.json" />
      <CodeBlock lang="powershell" lineNumbers={false} code="Get-Content .eve\tankful-last-report.json" />
      <p>
        To watch every injected instruction as it happens, set <code>TANKFUL_DEBUG=1</code>. See{" "}
        <DocLink href="/docs/debugging">Debugging</DocLink>.
      </p>
    </>
  ),
};
