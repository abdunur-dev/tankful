import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OnThisPage } from "@/components/docs/OnThisPage";
import { site } from "@/lib/site";

import { allPages, getNeighbors, getPage } from "../content";

export function generateStaticParams() {
  return allPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(slug);
  return page ? { title: page.title, description: page.description } : {};
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) notFound();
  const { prev, next } = getNeighbors(slug);
  const { Body } = page;

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:px-12">
      <article className="min-w-0 max-w-3xl flex-1">
        <header className="mb-8 border-b border-line pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{page.title}</h1>
          <p className="mt-2 text-base text-zinc-400">{page.description}</p>
        </header>
        <div className="docs-prose">
          <Body />
        </div>
        <nav aria-label="Pagination" className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={`/docs/${prev.slug}`} className="border border-line p-4 transition hover:border-white/30">
              <span className="block font-mono text-[11px] tracking-[0.12em] text-zinc-500">← PREVIOUS</span>
              <span className="mt-1 block text-sm text-white">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/docs/${next.slug}`} className="border border-line p-4 text-right transition hover:border-white/30">
              <span className="block font-mono text-[11px] tracking-[0.12em] text-zinc-500">NEXT →</span>
              <span className="mt-1 block text-sm text-white">{next.title}</span>
            </Link>
          ) : null}
        </nav>
        <p className="mt-8 font-mono text-[11px] text-zinc-600">
          Found a mistake?{" "}
          <a href={`${site.github}/issues`} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white">
            Open an issue ↗
          </a>
        </p>
      </article>
      <aside className="hidden w-52 shrink-0 xl:block">
        <div className="sticky top-20">
          <OnThisPage items={page.toc} />
        </div>
      </aside>
    </div>
  );
}
