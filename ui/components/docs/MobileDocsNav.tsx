"use client";

import { useState } from "react";

import type { NavSection } from "@/app/docs/content";

import { DocsSidebar } from "./DocsSidebar";

export function MobileDocsNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 font-mono text-[11px] tracking-[0.12em] text-muted"
      >
        MENU
        <span aria-hidden>{open ? "×" : "+"}</span>
      </button>
      {open ? (
        <div className="flex max-h-[70vh] flex-col border-t border-line">
          <DocsSidebar sections={sections} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
