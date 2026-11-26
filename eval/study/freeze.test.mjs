import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createLookup, pages, promptFor, schedule, task } from "./fixture.mjs";

test("one serial lookup per distinct model response; no skips or parallel advance", () => {
  const lookup = createLookup();
  let cursor = "START";
  for (const [i, topic] of task.topics.entries()) {
    assert.throws(() => lookup({ topic, cursor: "bad" }, `run-${i}`));
    if (i) assert.throws(() => lookup({ topic, cursor }, `run-${i-1}`));
    const result = lookup({ topic, cursor }, `run-${i}`);
    assert.equal(result, pages[i]);
    assert.equal(result.serialLedger.split(" ").length, 1200);
    cursor = result.nextCursor;
  }
  assert.equal(cursor, null);
});
test("D differs from A/B/C by exactly the static line", () => {
  for (const c of "ABC") assert.equal(promptFor(c), task.prompt);
  assert.equal(promptFor("D"), `${task.prompt}\n${task.D_extra_line}`);
});
test("stored order has ten balanced blocks and ten preselected manual reviews", () => {
  const rows = JSON.parse(readFileSync(new URL("./order.json", import.meta.url)));
  assert.deepEqual(rows, schedule());
  assert.equal(rows.length, 80);
  assert.equal(new Set(rows.map(r => r.id)).size, 80);
  const cells = rows => new Set(rows.map(r => `${r.model}:${r.condition}`));
  for (let i = 0; i < 80; i += 8) assert.equal(cells(rows.slice(i, i+8)).size, 8);
  assert.equal(rows.filter(r => r.manualReview).length, 10);
  assert.equal(cells(rows.filter(r => r.manualReview)).size, 8);
});
