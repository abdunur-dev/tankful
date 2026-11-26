import { checkTank, configuration, knownLimits, whenBudgetAllows } from "./reference";
import { debugging, eveLimits, guardTools } from "./guides";
import { howItWorks, levels, loopDetection, report, tokenAccounting } from "./concepts";
import { installation, introduction } from "./get-started";
import type { DocPage, DocSection } from "./types";

export const sections: DocSection[] = [
  { title: "Get Started", icon: "start", pages: [introduction, installation] },
  { title: "Concepts", icon: "concepts", pages: [howItWorks, levels, tokenAccounting, loopDetection, report] },
  { title: "Guides", icon: "guides", pages: [guardTools, eveLimits, debugging] },
  { title: "Reference", icon: "reference", pages: [configuration, checkTank, whenBudgetAllows, knownLimits] },
];

export const allPages: DocPage[] = sections.flatMap((s) => s.pages);

export function getPage(slug: string): DocPage | undefined {
  return allPages.find((p) => p.slug === slug);
}

export function getNeighbors(slug: string) {
  const i = allPages.findIndex((p) => p.slug === slug);
  return { prev: i > 0 ? allPages[i - 1] : undefined, next: i >= 0 && i < allPages.length - 1 ? allPages[i + 1] : undefined };
}

/** Serializable nav data for client components. */
export const navSections = sections.map((s) => ({
  title: s.title,
  icon: s.icon,
  pages: s.pages.map((p) => ({ slug: p.slug, title: p.title, description: p.description })),
}));
export type NavSection = (typeof navSections)[number];
