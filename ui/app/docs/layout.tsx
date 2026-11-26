import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { MobileDocsNav } from "@/components/docs/MobileDocsNav";
import { site } from "@/lib/site";
import { navSections } from "./content";

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return <div className="docs-shell">
    <aside className="docs-rail">
      <p className="rail-heading">Field guide <span>v{site.version}</span></p>
      <DocsSidebar sections={navSections} />
    </aside>
    <main className="min-w-0"><MobileDocsNav sections={navSections} />{children}</main>
  </div>;
}
