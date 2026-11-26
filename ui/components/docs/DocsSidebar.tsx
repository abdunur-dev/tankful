"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { NavSection } from "@/app/docs/content";

const ICONS: Record<NavSection["icon"], React.ReactNode> = {
  start: <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" />,
  concepts: (
    <>
      <path d="M4 5h7v14H4zM13 5h7v14h-7z" />
      <path d="M6.5 9h2M15.5 9h2" />
    </>
  ),
  guides: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 10h8M8 14h8M8 18h5" />
    </>
  ),
  reference: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 9h8M8 13h8M8 17h4" />
    </>
  ),
};

export function DocsSidebar({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();

  const filtered = sections
    .map((s) => ({
      ...s,
      pages: q ? s.pages.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(q)) : s.pages,
    }))
    .filter((s) => s.pages.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-4 py-3">
        <label htmlFor="docs-search" className="sr-only">Search docs</label>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.5-4.5" />
          </svg>
          <input
            id="docs-search"
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>
      <nav aria-label="Docs" className="min-h-0 flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? <p className="px-4 py-3 text-sm text-zinc-500">No results for “{query}”.</p> : null}
        {filtered.map((s) => {
          const isClosed = !q && closed[s.title];
          return (
            <div key={s.title}>
              <button
                type="button"
                aria-expanded={!isClosed}
                onClick={() => setClosed((c) => ({ ...c, [s.title]: !c[s.title] }))}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-zinc-200 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  {ICONS[s.icon]}
                </svg>
                <span className="flex-1">{s.title}</span>
                <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 text-zinc-500 transition ${isClosed ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isClosed ? null : (
                <ul className="mb-2">
                  {s.pages.map((p) => {
                    const href = `/docs/${p.slug}`;
                    const active = pathname === href;
                    return (
                      <li key={p.slug}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={`block py-1.5 pl-[2.6rem] pr-4 text-[13px] transition ${
                            active ? "bg-white/[0.06] text-white shadow-[inset_2px_0_0_#fff]" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {p.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
