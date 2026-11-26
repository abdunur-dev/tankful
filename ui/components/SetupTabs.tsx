"use client";

import { useState } from "react";

import { CopyButton } from "./CopyButton";

export interface SetupTab {
  id: string;
  label: string;
  filename: string;
  description: string;
  code: string;
  html: string;
}

export function SetupTabs({ tabs }: { tabs: SetupTab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="grid border border-line md:grid-cols-[1fr_15rem]">
      <div className="min-w-0 bg-[#0a0a0a]">
        <div className="flex items-center justify-between border-b border-line py-1 pl-4 pr-2 font-mono text-xs text-zinc-400">
          <span>{current.filename}</span>
          <CopyButton value={current.code} />
        </div>
        <div
          className="code-body with-lines min-h-80 overflow-x-auto px-4 py-4 text-[13px] leading-6"
          dangerouslySetInnerHTML={{ __html: current.html }}
        />
      </div>
      <div className="flex flex-col border-t border-line md:border-l md:border-t-0">
        <div role="tablist" aria-label="Setup steps" className="flex flex-col">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={t.id === active}
              onClick={() => setActive(t.id)}
              className={`border-b border-line px-4 py-3 text-left font-mono text-[11px] tracking-[0.12em] transition ${
                t.id === active ? "bg-white/[0.04] text-white shadow-[inset_-1px_0_0_#fff]" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-auto p-4 text-sm leading-relaxed text-zinc-400">{current.description}</p>
      </div>
    </div>
  );
}
