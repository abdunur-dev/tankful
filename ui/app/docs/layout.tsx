import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { MobileDocsNav } from "@/components/docs/MobileDocsNav";
import { Logo } from "@/components/Logo";
import { TopNav } from "@/components/TopNav";
import { site } from "@/lib/site";

import { navSections } from "./content";

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <div>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-black lg:flex">
        <div className="flex h-12 items-center border-b border-line px-4">
          <Logo />
        </div>
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-medium text-white">Latest Version</p>
          <p className="font-mono text-xs text-zinc-500">{site.version}</p>
        </div>
        <DocsSidebar sections={navSections} />
        <div className="flex items-center justify-between border-t border-line px-4 py-3 font-mono text-[11px] text-zinc-500">
          <a href={site.github} target="_blank" rel="noopener noreferrer" className="hover:text-white">GitHub ↗</a>
          <a href={site.npm} target="_blank" rel="noopener noreferrer" className="hover:text-white">npm ↗</a>
        </div>
      </aside>
      <div className="lg:pl-64">
        <div className="sticky top-0 z-20 bg-black/90 backdrop-blur">
          <div className="flex h-12 items-center border-b border-line px-5 lg:hidden">
            <Logo />
          </div>
          <TopNav />
        </div>
        <MobileDocsNav sections={navSections} />
        {children}
      </div>
    </div>
  );
}
