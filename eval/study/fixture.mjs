import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const task = JSON.parse(readFileSync(new URL("./task.json", import.meta.url)));
const hash = s => createHash("sha256").update(s).digest("hex");
export const promptFor = condition => task.prompt + (condition === "D" ? "\n" + task.D_extra_line : "");

// Synthetic archive: actual tool payload, not token charges injected into accounting.
export const pages = task.topics.map((topic, i) => ({
  topic, keyFacts: [task.facts[i]],
  serialLedger: Array.from({ length: 1200 }, (_, j) => String(100000 + i * 1200 + j)).join(" "),
  nextCursor: i + 1 === task.topics.length ? null : hash(`cursor:${topic}`).slice(0, 16),
}));

// One instance per turn. runId is the trusted eve model run ID, never model-supplied.
export function createLookup() {
  let index = 0;
  const served = new Set();
  return ({ topic, cursor }, runId) => {
    if (!runId || served.has(runId) || topic !== pages[index]?.topic ||
        cursor !== (index === 0 ? "START" : pages[index - 1].nextCursor))
      throw new Error("Use one lookup per model response, in order, with the returned cursor.");
    served.add(runId);
    return pages[index++];
  };
}

export function schedule() {
  const rows = [];
  for (let rep = 1; rep <= task.repetitionsPerCell; rep++) {
    const block = task.models.flatMap(model => ["A", "B", "C", "D"].map(condition =>
      ({ id: `${model.split("/")[1]}-${condition}-${rep}`, model, condition, rep })));
    const rank = (r, purpose) => hash(`${task.seed}:${purpose}:${r.id}`);
    block.sort((a,b) => rank(a,"order").localeCompare(rank(b,"order"), "en"));
    rows.push(...block);
  }
  const ranked = [...rows].sort((a,b) => hash(`${task.seed}:audit:${a.id}`).localeCompare(hash(`${task.seed}:audit:${b.id}`), "en"));
  const audit = new Set();
  for (const model of task.models) for (const c of "ABCD")
    audit.add(ranked.find(r => r.model === model && r.condition === c).id);
  for (const r of ranked) if (audit.size < 10) audit.add(r.id);
  return rows.map((r,i) => ({ order:i+1, ...r, manualReview:audit.has(r.id) }));
}
