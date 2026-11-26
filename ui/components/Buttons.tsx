import Link from "next/link";
import type { ReactNode } from "react";

function Corners() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -right-1.5 -top-2 text-[10px] leading-none text-zinc-500">+</span>
      <span aria-hidden className="pointer-events-none absolute -bottom-2 -left-1.5 text-[10px] leading-none text-zinc-500">+</span>
    </>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-9 items-center bg-white px-5 text-sm font-medium text-black transition hover:bg-zinc-200">
      {children}
    </Link>
  );
}

export function OutlineButton({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls =
    "relative inline-flex h-9 items-center border border-white/25 px-5 text-sm font-medium text-white transition hover:border-white/60";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
      <Corners />
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
      <Corners />
    </Link>
  );
}

export function SectionHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-white">{title}</h2>
        <div className="h-px flex-1 bg-line" />
      </div>
      {children ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{children}</p> : null}
    </div>
  );
}
