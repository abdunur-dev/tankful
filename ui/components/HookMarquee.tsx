const EVENTS = [
  ["turn.started", "refill the tank"],
  ["model.started", "estimate the call in flight"],
  ["content.completed", "estimate from text"],
  ["model.settled", "lock in the estimate"],
  ["usage.recorded", "count real tokens"],
  ["call.settled", "record the step, check for loops"],
  ["turn.settled", "write the report"],
];

export function HookMarquee() {
  const row = [...EVENTS, ...EVENTS];
  return (
    <div className="overflow-hidden border-y border-line [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div className="animate-marquee flex w-max">
        {row.map(([event, what], i) => (
          <div key={i} className="flex items-baseline gap-2 border-r border-line px-5 py-3" aria-hidden={i >= EVENTS.length}>
            <span className="font-mono text-sm text-white">{event}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">{what}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
