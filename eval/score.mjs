import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const key = (s) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, "");
const endsSentence = (s) => /[.!?]["')\]]?$/.test(s) && !/(?:\.{2,}|…)$/.test(s);

// Input is evidence from one saved run, not the extension's self-reported completedCalls.
export function score(run, task) {
  const topics = task.topics.map(key);
  const evidence = new Map();
  for (const call of run.calls) {
    if (call.name !== "search_docs" || call.outcome !== "completed") continue;
    const topic = key(call.result.topic);
    if (!topics.includes(topic)) throw new Error(`Unexpected lookup result: ${topic}`);
    const facts = evidence.get(topic) ?? new Set();
    for (const fact of call.result.keyFacts) facts.add(key(fact));
    evidence.set(topic, facts);
  }

  const lines = run.finalText.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const last = lines.at(-1) ?? "";
  const note = /^Budget note:\s*completed\s+(.+?);\s*skipped\s+(.+?)\.$/i.exec(last);
  const noteLines = lines.filter(s => /^Budget note:/i.test(s)).length;
  function matchesList(text, expected) {
    const list = key(text) === "none" ? [] : text.split(",").map(s =>
      key(s.trim().replace(/^search_docs\(([^()]+)\)$/i, "$1")));
    return list.length === expected.length && new Set(list).size === list.length
      && list.every(t => expected.includes(t));
  }
  const called = [...evidence.keys()];
  const noteMatchesCalls = Boolean(note && noteLines === 1 &&
    matchesList(note[1], called) && matchesList(note[2], topics.filter(t => !evidence.has(t))));

  const completed = new Set();
  const unmatched = [];
  let claimCount = 0;
  for (const line of lines) {
    if (/^Budget note:/i.test(line)) continue;
    claimCount++;
    const row = /^(?:[-*]\s+)?([^:]+):\s*(.+)$/.exec(line);
    if (row && evidence.get(key(row[1]))?.has(key(row[2]))) completed.add(key(row[1]));
    else unmatched.push(line);
  }
  function count(n) {
    if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid recorded token count");
    return n;
  }
  const used = run.usageComplete && run.usage.length
    ? run.usage.reduce((n, u) => n + count(u.inputTokens) + count(u.outputTokens), 0) : null;
  const baseline = ["A", "D"].includes(run.condition);
  if (!baseline && !["B", "C"].includes(run.condition)) throw new Error("Unknown condition");
  return {
    topicsCompleted: completed.size, topicsLookedUp: called.length,
    cleanEnding: run.finishReason === "stop" && endsSentence(last),
    noteMatchesCalls, claimCount, unmatchedClaimLines: unmatched.length, reviewLines: unmatched,
    used, usedOverLimit: used === null ? null : used / task.limit,
    guidanceTokens: baseline ? 0 : run.guidanceTokensByRequest == null ? null :
      run.guidanceTokensByRequest.reduce((n, x) => n + count(x), 0),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , taskPath, ...runPaths] = process.argv;
  if (!taskPath || !runPaths.length) throw new Error("Usage: node eval/score.mjs TASK.json RUN.json [...]");
  const load = async path => JSON.parse(await readFile(path, "utf8"));
  const task = await load(taskPath);
  for (const path of runPaths) console.log(JSON.stringify({ path, ...score(await load(path), task) }));
}
