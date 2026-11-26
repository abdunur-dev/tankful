import Link from "next/link";
import type { ReactNode } from "react";

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="group scroll-mt-20">
      <a href={`#${id}`} className="!no-underline !text-ink">
        {children}
        <span aria-hidden className="ml-2 text-muted opacity-0 transition group-hover:opacity-100">#</span>
      </a>
    </h2>
  );
}

export function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-20">
      {children}
    </h3>
  );
}

export function Callout({ title, children, tone = "info" }: { title?: string; children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={`border-l-2 bg-mist px-4 py-3 text-sm ${tone === "warn" ? "border-amber-400" : "border-sage"}`}>
      {title ? <p className="!mt-0 mb-1 font-medium text-ink">{title}</p> : null}
      <div className="text-muted [&>*+*]:mt-2">{children}</div>
    </div>
  );
}

export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href}>{children}</Link>;
}

export function Cards({ items }: { items: { title: string; body: string; href: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="group block border border-line bg-mist p-4 !no-underline transition hover:border-sage hover:bg-mist"
        >
          <span className="block font-medium text-ink">{c.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted">{c.body}</span>
        </Link>
      ))}
    </div>
  );
}

export function PropTable({ rows }: { rows: { name: string; type: string; def?: string; desc: ReactNode }[] }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td><code>{r.name}</code></td>
              <td className="whitespace-nowrap font-mono text-xs text-muted">{r.type}</td>
              <td className="whitespace-nowrap font-mono text-xs text-muted">{r.def ?? "required"}</td>
              <td>{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
