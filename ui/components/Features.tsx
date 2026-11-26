import type { ReactNode } from "react";

const mono = "font-mono text-[11px]";
const chip = `border border-line px-1.5 py-0.5 ${mono} text-muted`;

const FEATURES: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: "A tank per turn.",
    body: "Refills on every turn.started, so each task starts with a full budget.",
    visual: (
      <div className="space-y-1.5">
        <div className="h-1.5 w-full bg-sage" />
        <div className={`${mono} text-muted`}>turn.started → 100%</div>
      </div>
    ),
  },
  {
    title: "Real token counts.",
    body: "Sums input and output tokens from usage.recorded, cached tokens included.",
    visual: <div className={`${mono} text-muted`}>3,171 in + 56 out = <span className="text-ink">3,227</span></div>,
  },
  {
    title: "Estimates in flight.",
    body: "Counts the previous call’s size until usage arrives, and flags it as estimated.",
    visual: (
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 w-32">
          <div className="w-2/3 bg-sage" />
          <div className="w-1/3 bg-[repeating-linear-gradient(45deg,#85a78e_0_2px,transparent_2px_5px)] opacity-60" />
        </div>
        <span className={chip}>estimated</span>
      </div>
    ),
  },
  {
    title: "Four levels.",
    body: "ok, low, critical, and empty, with thresholds you set.",
    visual: (
      <div className="flex flex-wrap gap-1.5">
        {[
          ["ok", "bg-emerald-400"],
          ["low", "bg-amber-400"],
          ["critical", "bg-orange-500"],
          ["empty", "bg-rose-500"],
        ].map(([l, c]) => (
          <span key={l} className={`${chip} inline-flex items-center gap-1.5`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c}`} />
            {l}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: "Adaptive instructions.",
    body: "Injects budget guidance before every model call, and escalates to a user message near the end.",
    visual: (
      <div className="flex items-center gap-2">
        <span className={chip}>role: system</span>
        <span className="text-muted">→</span>
        <span className={`${chip} text-ink`}>role: user</span>
      </div>
    ),
  },
  {
    title: "check_tank tool.",
    body: "The agent can read its own tank at any time.",
    visual: (
      <div className={`${mono} text-muted`}>
        tankful__check_tank() → <span className="text-ink">&#123; level: “low” &#125;</span>
      </div>
    ),
  },
  {
    title: "Tool gating.",
    body: "whenBudgetAllows hides a tool once the final-answer reserve is reached.",
    visual: (
      <div className="flex items-center gap-2">
        <span className={chip}>whenBudgetAllows(bash)</span>
        <span className={`${chip} line-through decoration-zinc-500`}>bash</span>
      </div>
    ),
  },
  {
    title: "Loop detection.",
    body: "Warns when the same tool call repeats loopRepeats times in a row.",
    visual: (
      <div className="flex flex-wrap items-center gap-1.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={chip}>read_file(a.md)</span>
        ))}
        <span className={`${mono} text-amber-800`}>⚠ loop</span>
      </div>
    ),
  },
  {
    title: "End-of-turn report.",
    body: "Logs a summary and writes it to a JSON file on turn.settled.",
    visual: <span className={chip}>.eve/tankful-last-report.json</span>,
  },
];

export function Features() {
  return (
    <div className="grid border-l border-t border-line sm:grid-cols-2 xl:grid-cols-3">
      {FEATURES.map((f, i) => (
        <div key={f.title} className="flex min-h-48 flex-col border-b border-r border-line p-5">
          <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-2 text-sm font-medium text-ink">{f.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
          <div className="mt-auto pt-5">{f.visual}</div>
        </div>
      ))}
    </div>
  );
}
