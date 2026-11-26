import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as v1 from "../study/fixture.mjs";
import { score } from "../score.mjs";
import { task, pages, promptFor, createLookup, schedule } from "./fixture.mjs";
import { scoreV2 } from "./score.mjs";

const json = name => JSON.parse(readFileSync(new URL(name, import.meta.url)));
const order = json("./order.json");
test("same task and prompts; remove only the last 1,060 serials of each ledger", () => {
  const { seed, studyId, serialsPerLedger, ...rest } = task;
  assert.deepEqual({ ...rest, seed:v1.task.seed }, v1.task);
  assert.equal(studyId, "tankful-operations-v2");
  assert.equal(serialsPerLedger, 140);
  for (const c of "ABCD") assert.equal(promptFor(c), v1.promptFor(c));
  assert.equal(pages.length, 8);
  for (const [i, page] of pages.entries()) {
    const expected = v1.pages[i].serialLedger.split(" ").slice(0,140);
    assert.deepEqual(page, { ...v1.pages[i], serialLedger:expected.join(" ") });
    assert.ok(expected.every(s => /^\d{6}$/.test(s)));
  }
});
test("all eight v2 pages are reachable only by the sequential lookup contract", () => {
  const search = createLookup();
  let cursor = "START";
  for (const [i, page] of pages.entries()) {
    assert.throws(() => search({ topic:page.topic, cursor:"wrong" }, `id-${i}`));
    if (i) assert.throws(() => search({ topic:page.topic, cursor }, `id-${i-1}`));
    const result = search({ topic:page.topic, cursor }, `id-${i}`);
    assert.deepEqual(result,page);
    cursor = result.nextCursor;
  }
  assert.equal(cursor,null);
});
test("v2 order and manual reviews reproduce, are balanced and differ from v1", () => {
  const cell = r => `${r.model}/${r.condition}`;
  assert.deepEqual(order,schedule());
  assert.equal(order.length,80);
  assert.equal(new Set(order.map(r=>r.id)).size,80);
  for(let rep=1;rep<=10;rep++){
    const block=order.slice((rep-1)*8,rep*8);
    assert.ok(block.every(r=>r.rep===rep));
    assert.equal(new Set(block.map(cell)).size,8);
  }
  assert.notDeepEqual(order.map(cell),json("../study/order.json").map(cell));
  const audit=order.filter(r=>r.manualReview);
  assert.deepEqual(json("./manual-review.json"),audit.map(r=>r.id));
  assert.equal(audit.length,10);
  assert.equal(new Set(audit.map(cell)).size,8);
});
test("v2 scorer uses the original rules and refuses v1, calibration and wrong-cell inputs", () => {
  const run={ ...order[0], studyId:task.studyId, phase:"scored",
    calls:[{name:"search_docs",outcome:"completed",result:pages[0]}],
    finalText:`Intake: ${pages[0].keyFacts[0]}\nBudget note: completed Intake; skipped ${task.topics.slice(1).join(", ")}.`,
    finishReason:"stop", usageComplete:true, usage:[{inputTokens:100,outputTokens:25}], guidanceTokensByRequest:[10] };
  assert.equal(scoreV2(run).topicsCompleted,1);
  assert.deepEqual(scoreV2(run),score(run,v1.task));
  assert.throws(()=>scoreV2({...run,phase:"calibration"}),/Not a scored v2/);
  assert.throws(()=>scoreV2({...run,studyId:v1.task.seed}),/Not a scored v2/);
  assert.throws(()=>scoreV2({...run,model:"other"}),/assignment/);
  assert.throws(()=>scoreV2({...run,calls:[{...run.calls[0],result:v1.pages[0]}]}),/v2 tool result/);
});
