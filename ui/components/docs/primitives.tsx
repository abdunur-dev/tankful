import Link from "next/link";
import type { ReactNode } from "react";

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="group scroll-mt-20">
      <a href={`#${id}`} className="!no-underline !text-white">
        {children}
        <span aria-hidden className="ml-2 text-zinc-600 opacity-0 transition group-hover:opacity-100">#</span>
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
    <div className={`border-l-2 bg-white/[0.03] px-4 py-3 text-sm ${tone === "warn" ? "border-amber-400" : "border-white/60"}`}>
      {title ? <p className="!mt-0 mb-1 font-medium text-white">{title}</p> : null}
      <div className="text-zinc-300 [&>*+*]:mt-2">{children}</div>
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
          className="group block border border-line bg-white/[0.02] p-4 !no-underline transition hover:border-white/30 hover:bg-white/[0.04]"
        >
          <span className="block font-medium text-white">{c.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{c.body}</span>
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
              <td className="whitespace-nowrap font-mono text-xs text-zinc-400">{r.type}</td>
              <td className="whitespace-nowrap font-mono text-xs text-zinc-400">{r.def ?? "required"}</td>
              <td>{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
