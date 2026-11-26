import { highlight, type CodeLang } from "@/lib/highlight";

import { CopyButton } from "./CopyButton";

export async function CodeBlock({
  code,
  lang = "ts",
  filename,
  lineNumbers = true,
  className = "",
}: {
  code: string;
  lang?: CodeLang;
  filename?: string;
  lineNumbers?: boolean;
  className?: string;
}) {
  const html = await highlight(code, lang);
  return (
    <div className={`relative border border-line bg-[#0a0a0a] ${className}`}>
      {filename ? (
        <div className="flex items-center justify-between border-b border-line py-1 pl-4 pr-2 font-mono text-xs text-zinc-400">
          <span>{filename}</span>
          <CopyButton value={code} />
        </div>
      ) : (
        <CopyButton value={code} className="absolute right-2 top-2" />
      )}
      <div
        className={`code-body overflow-x-auto px-4 py-4 text-[13px] leading-6 ${lineNumbers ? "with-lines" : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
