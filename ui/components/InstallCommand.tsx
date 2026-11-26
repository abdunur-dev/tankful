"use client";

import { useState } from "react";

import { CopyButton } from "./CopyButton";

const MANAGERS = [
  { id: "npm", command: "npm install tankful" },
  { id: "pnpm", command: "pnpm add tankful" },
  { id: "yarn", command: "yarn add tankful" },
  { id: "bun", command: "bun add tankful" },
];

export function InstallCommand({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(MANAGERS[0].id);
  const current = MANAGERS.find((m) => m.id === active) ?? MANAGERS[0];
  const [tool, ...rest] = current.command.split(" ");

  return (
    <div className={`border border-line bg-mist rounded-xl ${className}`}>
      <div role="tablist" aria-label="Package manager" className="flex border-b border-line">
        {MANAGERS.map((m) => (
          <button
            key={m.id}
            role="tab"
            type="button"
            aria-selected={m.id === active}
            onClick={() => setActive(m.id)}
            className={`px-4 py-2 font-mono text-xs transition ${
              m.id === active ? "text-ink shadow-[inset_0_-1px_0_#779782]" : "text-muted hover:text-muted"
            }`}
          >
            {m.id}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between py-2.5 pl-4 pr-2 font-mono text-sm">
        <code>
          <span className="text-accent">{tool}</span> <span className="text-ink">{rest.join(" ")}</span>
        </code>
        <CopyButton value={current.command} />
      </div>
    </div>
  );
}
