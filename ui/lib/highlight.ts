import { getSingletonHighlighter } from "shiki";

const LANGS = ["ts", "json", "bash", "powershell"] as const;
export type CodeLang = (typeof LANGS)[number];

export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const themes = { light: "github-light", dark: "github-dark" } as const;
  const highlighter = await getSingletonHighlighter({ themes: Object.values(themes), langs: [...LANGS] });
  return highlighter.codeToHtml(code.trimEnd(), { lang, themes });
}
