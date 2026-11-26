import { getSingletonHighlighter } from "shiki";

const LANGS = ["ts", "json", "bash", "powershell"] as const;
export type CodeLang = (typeof LANGS)[number];

export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const highlighter = await getSingletonHighlighter({ themes: ["vesper"], langs: [...LANGS] });
  return highlighter.codeToHtml(code.trimEnd(), { lang, theme: "vesper" });
}
