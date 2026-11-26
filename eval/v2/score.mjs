import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { score } from "../score.mjs";
import { pages, task } from "./fixture.mjs";

const order = JSON.parse(readFileSync(new URL("./order.json", import.meta.url)));
export function scoreV2(run) {
  if (run.studyId !== task.studyId || run.phase !== "scored")
    throw new Error("Not a scored v2 artifact");
  const row = order.find(r => r.id === run.id);
  if (!row || row.model !== run.model || row.condition !== run.condition)
    throw new Error("Run does not match its frozen assignment");
  for (const call of run.calls) {
    if (call.name !== "search_docs" || call.outcome !== "completed") continue;
    const expected = pages.find(p => p.topic === call.result?.topic);
    if (!expected || !isDeepStrictEqual(call.result, expected))
      throw new Error("Saved lookup is not the frozen v2 tool result");
  }
  return score(run, task);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error("Supply one or more saved v2 scored run records");
  const seen = new Set();
  for (const path of paths) {
    const run = JSON.parse(readFileSync(path));
    if (seen.has(run.id)) throw new Error(`Duplicate scored run: ${run.id}`);
    seen.add(run.id);
    console.log(JSON.stringify({ id:run.id, ...scoreV2(run) }));
  }
}
