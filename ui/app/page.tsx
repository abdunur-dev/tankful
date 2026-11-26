import Link from "next/link";
import { BudgetHero } from "@/components/BudgetHero";

import {
  createTankState,
  formatCallLabel,
  getTankStatus,
  recordRealUsage,
  recordStep,
} from "../../extension/lib/tank";
import { OutlineButton, PrimaryButton, SectionHeading } from "@/components/Buttons";
import { CodeBlock } from "@/components/CodeBlock";
import { Features } from "@/components/Features";
import { HookMarquee } from "@/components/HookMarquee";
import { InstallCommand } from "@/components/InstallCommand";
import { Levels } from "@/components/Levels";
import { SetupTabs, type SetupTab } from "@/components/SetupTabs";
import { highlight } from "@/lib/highlight";
import { site } from "@/lib/site";

const MOUNT = `import tankful from "tankful";

export default tankful({
  limit: 50_000,
  // Optional defaults:
  // lowAt: 0.3,       // <= 30% remaining -> "low"
  // criticalAt: 0.1,  // <= 10% remaining -> "critical"
  // loopRepeats: 3,   // same step repeated N times in a row -> loop warning
});`;

const GUARD = `import { bash } from "eve/tools/bash";
import { whenBudgetAllows } from "tankful/guard";

// Hidden once remaining < reserve
// (1.5 × average call cost, 4,500 tokens before any call).
export default whenBudgetAllows(bash);`;

const REPORT = `{
  "limit": 14000,
  "used": 15269,
  "remaining": 0,
  "percentLeft": 0,
  "level": "empty",
  "steps": 3,
  "completedCalls": [
    "search_docs(usage tracking)",
    "search_docs(loop detection)",
    "search_docs(dynamic instructions)"
  ],
  "toolsHidden": true,
  "estimated": false,
  "loopDetected": false
}`;

const PAIRING = `// agent/extensions/tankful.ts: soft, per turn
export default tankful({ limit: 50_000 });

// agent/agent.ts: hard, per session
export default defineAgent({
  limits: {
    sessionUsage: ({ window }) =>
      window.inputTokens + window.outputTokens >= 200_000,
  },
});`;

/** check_tank output from Tankful's core: two searches done, third call still running. */
function checkTankExample(): string {
  const config = { limit: 14_000 };
  let state = createTankState(config);
  state = recordRealUsage(state, { inputTokens: 3_520, outputTokens: 130 });
  state = recordStep(state, 'search_docs:{"query":"usage tracking"}', config, formatCallLabel("search_docs", { query: "usage tracking" }));
  state = recordRealUsage(state, { inputTokens: 4_190, outputTokens: 130 });
  state = recordStep(state, 'search_docs:{"query":"loop detection"}', config, formatCallLabel("search_docs", { query: "loop detection" }));
  state = { ...state, inFlightEstimated: state.lastCallTokens };
  return JSON.stringify(getTankStatus(state, config), null, 2);
}

const RESULTS = [
  { run: "D", model: "gpt-oss-120b", searches: "3 of 5", note: "Yes", used: "about 14.8K / 14,000" },
  { run: "E", model: "gpt-oss-20b", searches: "3 of 5", note: "Yes", used: "15,269 / 14,000 (+9.1%)" },
];

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`border-b border-line px-6 py-14 lg:px-10 ${className}`}>
      {children}
    </section>
  );
}

export default async function Home() {
  const checkTank = checkTankExample();
  const tabSources = [
    {
      id: "mount",
      label: "MOUNT THE EXTENSION",
      filename: "agent/extensions/tankful.ts",
      lang: "ts" as const,
      code: MOUNT,
      description: "One file. The filename is the mount name, so the tool shows up as tankful__check_tank.",
    },
    {
      id: "guard",
      label: "GUARD YOUR TOOLS",
      filename: "agent/tools/bash.ts",
      lang: "ts" as const,
      code: GUARD,
      description: "Instructions are advice. Wrap a tool with whenBudgetAllows to actually hide it when the budget runs out.",
    },
    {
      id: "check",
      label: "CHECK THE TANK",
      filename: "tankful__check_tank → result",
      lang: "json" as const,
      code: checkTank,
      description: "While a call is still running, Tankful counts the previous call’s size and marks the numbers as estimated.",
    },
    {
      id: "report",
      label: "READ THE REPORT",
      filename: ".eve/tankful-last-report.json",
      lang: "json" as const,
      code: REPORT,
      description: "Written on turn.settled. This one is from a real run: the agent covered 3 of 5 topics and said so.",
    },
  ];
  const tabs: SetupTab[] = await Promise.all(
    tabSources.map(async ({ lang, ...t }) => ({ ...t, html: await highlight(t.code, lang) })),
  );

  return (
    <div>
      <main className="home-content">
        <BudgetHero />

        <Section id="readme">
          <p className="mb-4 font-mono text-[11px] tracking-[0.12em] text-muted">README</p>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
            eve can cut an agent off at a limit. Tankful lets the agent see its tank and plan around it. It counts tokens
            every turn, tells the model how much is left, gets stricter as the tank drains, and makes the agent end with a
            Budget note that says what it finished and what it skipped.
          </p>
          <InstallCommand className="mt-8 max-w-2xl" />
          <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-muted">
            AN{" "}
            <a href={site.eve} target="_blank" rel="noopener noreferrer" className="text-muted underline decoration-zinc-600 underline-offset-4 hover:text-ink">
              EVE EXTENSION
            </a>{" "}
            · NODE ≥ 24 · MIT
          </p>
        </Section>

        <Section id="features">
          <SectionHeading title="Features" />
          <Features />
        </Section>

        <Section id="setup">
          <SectionHeading title="Setup">Mount it once. Every turn after that starts with a full tank.</SectionHeading>
          <SetupTabs tabs={tabs} />
        </Section>

        <section className="border-b border-line py-10">
          <div className="mb-4 flex items-center justify-between px-6 lg:px-10">
            <p className="font-mono text-[11px] tracking-[0.12em] text-muted">HOOKS INTO EVE</p>
            <Link href="/docs/how-it-works" className="font-mono text-[11px] tracking-[0.12em] text-muted hover:text-ink">
              HOW IT WORKS →
            </Link>
          </div>
          <HookMarquee />
        </section>

        <Section id="levels">
          <SectionHeading title="Levels">
            Before every model call, Tankful adds guidance for the current level. At critical and empty it switches to a
            user message, which models are less likely to ignore.
          </SectionHeading>
          <Levels />
        </Section>

        <Section id="limits">
          <SectionHeading title="Soft and hard limits">
            eve’s limits.sessionUsage is a hard stop with no warning. Tankful is the soft layer inside it. Use both.
          </SectionHeading>
          <div className="grid border-l border-t border-line md:grid-cols-2">
            {[
              {
                name: "TANKFUL",
                tag: "SOFT · PER TURN",
                items: ["Agent sees its budget", "Guidance gets stricter as it drains", "Hides guarded tools near the end", "Ends with a Budget note"],
              },
              {
                name: "EVE LIMITS.SESSIONUSAGE",
                tag: "HARD · PER SESSION",
                items: ["Stops new model calls past a threshold", "No warning to the model first", "Covers the whole session", "Runtime safety net"],
              },
            ].map((c) => (
              <div key={c.name} className="border-b border-r border-line p-5">
                <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.12em]">
                  <span className="text-ink">{c.name}</span>
                  <span className="text-muted">{c.tag}</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-muted">
                  {c.items.map((i) => (
                    <li key={i}>
                      <span className="mr-2 text-muted">+</span>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <CodeBlock code={PAIRING} filename="both together" className="mt-6" />
        </Section>

        <Section id="results">
          <SectionHeading title="Results">
            A smoke test, not a benchmark: one 5-topic lookup task with a 14,000-token limit, one run per model on Groq.
            Both runs stopped after 3 topics and named the 2 they skipped.
          </SectionHeading>
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-normal">Run</th>
                  <th className="px-4 py-3 font-normal">Model</th>
                  <th className="px-4 py-3 font-normal">Searches</th>
                  <th className="px-4 py-3 font-normal">Budget note correct?</th>
                  <th className="px-4 py-3 font-normal">Used / limit</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                {RESULTS.map((r) => (
                  <tr key={r.run} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono">{r.run}</td>
                    <td className="px-4 py-3 font-mono">{r.model}</td>
                    <td className="px-4 py-3">{r.searches}</td>
                    <td className="px-4 py-3">{r.note}</td>
                    <td className="px-4 py-3 font-mono">{r.used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted">
            The budget is soft, since a call can’t be stopped midway, so usage ran 6% to 9% over. Set the limit about 10% below
            your real cap.
          </p>
        </Section>

        <section className="relative overflow-hidden px-6 py-24 text-center lg:px-10">
          <div className="bg-hairlines absolute inset-y-0 right-0 w-1/3 [mask-image:linear-gradient(270deg,#000,transparent)]" />
          <div className="relative">
            <p className="text-2xl tracking-tight text-ink">Let your agent plan around its budget.</p>
            <p className="mt-3 font-mono text-xs text-muted">npm install tankful</p>
            <div className="mt-8 flex justify-center gap-3">
              <PrimaryButton href="/docs">Get Started</PrimaryButton>
              <OutlineButton href={site.github} external>
                GitHub
              </OutlineButton>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-line px-6 py-6 font-mono text-[11px] text-muted sm:flex-row sm:justify-between lg:px-10">
          <span>© Tankful · MIT License</span>
          <span>Built for eve</span>
        </footer>
      </main>
    </div>
  );
}
