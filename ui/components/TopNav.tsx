"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { site } from "@/lib/site";

const ITEMS = [
  { label: "README", href: "/", external: false },
  { label: "DOCS", href: "/docs", external: false },
  { label: "GITHUB", href: site.github, external: true },
  { label: "NPM", href: site.npm, external: true },
];

export function TopNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav aria-label="Main" className={`flex h-12 border-b border-line font-mono text-[11px] tracking-[0.12em] ${className}`}>
      {ITEMS.map((item) => {
        const active = !item.external && isActive(item.href);
        const cls = `flex flex-1 items-center justify-center gap-1 border-r border-line transition ${
          active ? "bg-white/[0.04] text-white shadow-[inset_0_1px_0_#fff]" : "text-zinc-400 hover:text-white"
        }`;
        return item.external ? (
          <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={`${cls} hidden sm:flex`}>
            {item.label}
            <span aria-hidden>↗</span>
          </a>
        ) : (
          <Link key={item.label} href={item.href} className={cls} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/docs/installation"
        className="flex flex-1 items-center justify-center gap-1 bg-white text-black transition hover:bg-zinc-200"
      >
        GET STARTED <span aria-hidden>↗</span>
      </Link>
    </nav>
  );
}
