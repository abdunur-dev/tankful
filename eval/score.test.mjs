import assert from "node:assert/strict";
import { test } from "node:test";
import { score } from "./score.mjs";

// Synthetic scorer unit tests, never study observations.
const task = { limit: 14_000, topics: ["alpha", "beta"] };
const call = { name: "search_docs", outcome: "completed", result: { topic: "alpha", keyFacts: ["The flag is green."] } };
const note = "Budget note: completed search_docs(alpha); skipped beta.";
const run = { condition: "B", calls: [call], finalText: `Alpha: The flag is green.\n${note}`, finishReason: "stop",
  usageComplete: true, usage: [{ inputTokens: 12_000, outputTokens: 3_400, cacheReadTokens: 500 }],
  guidanceTokensByRequest: [110, 145] };
const check = changes => score({ ...run, ...changes }, task);

test("positive control: supported topic, exact note, clean ending", () => {
  const r = check({});
  assert.deepEqual([r.topicsCompleted, r.noteMatchesCalls, r.cleanEnding, r.unmatchedClaimLines], [1, true, true, 0]);
});
test("failed lookups and check_tank are not evidence", () => {
  const r = check({ calls: [{ ...call, outcome: "failed" }, { ...call, name: "tankful__check_tank" }] });
  assert.deepEqual([r.topicsCompleted, r.noteMatchesCalls, r.unmatchedClaimLines], [0, false, 1]);
});
test("repeated successful lookups count only once", () => {
  const r = check({ calls: [call, call] });
  assert.deepEqual([r.topicsLookedUp, r.topicsCompleted, r.noteMatchesCalls], [1, 1, true]);
});
test("plausible fact from an unseen topic is flagged", () => {
  const r = check({ finalText: `Beta: The flag is green.\n${note}` });
  assert.deepEqual([r.topicsCompleted, r.unmatchedClaimLines], [0, 1]);
});
test("matching a keyword cannot excuse an extra invented claim", () => {
  const r = check({ finalText: `Alpha: The flag is green and costs $40.\n${note}` });
  assert.equal(r.unmatchedClaimLines, 1);
});
test("correct note alone does not earn summary credit", () => {
  const r = check({ finalText: note });
  assert.deepEqual([r.noteMatchesCalls, r.topicsCompleted, r.claimCount], [true, 0, 0]);
});
test("missing, false, and duplicate Budget notes fail", () => {
  for (const finalText of ["Alpha: The flag is green.", "Budget note: completed alpha; skipped none.", `${note}\n${note}`])
    assert.equal(check({ finalText }).noteMatchesCalls, false);
});
test("empty, mid-sentence and length-truncated replies do not end cleanly", () => {
  for (const finalText of ["", "Alpha: The flag is", "Alpha: The flag is..."])
    assert.equal(check({ finalText }).cleanEnding, false);
  assert.equal(check({ finishReason: "length" }).cleanEnding, false);
});
test("usage ratio includes overshoot without double-counting cached tokens", () => {
  const r = check({});
  assert.deepEqual([r.used, r.usedOverLimit, r.guidanceTokens], [15_400, 1.1, 255]);
});
test("missing telemetry is unknown, not a favorable zero", () => {
  const r = check({ usageComplete: false, guidanceTokensByRequest: null });
  assert.deepEqual([r.used, r.usedOverLimit, r.guidanceTokens], [null, null, null]);
  for (const condition of ["A", "D"]) assert.equal(check({ condition }).guidanceTokens, 0);
});
