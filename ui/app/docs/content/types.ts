import type { ReactNode } from "react";

export interface TocItem {
  id: string;
  title: string;
}

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  toc: TocItem[];
  Body: () => ReactNode | Promise<ReactNode>;
}

export interface DocSection {
  title: string;
  icon: "start" | "concepts" | "guides" | "reference";
  pages: DocPage[];
}
