import Link from "next/link";
import type { ReactNode } from "react";

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="pill-primary">
      {children}
    </Link>
  );
}

export function OutlineButton({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls =
    "pill-outline";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function SectionHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-ink">{title}</h2>
        <div className="h-px flex-1 bg-line" />
      </div>
      {children ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{children}</p> : null}
    </div>
  );
}
