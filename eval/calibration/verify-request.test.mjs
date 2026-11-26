import assert from "node:assert/strict";
import { test } from "node:test";
import { pages } from "../study/fixture.mjs";
import { verifyLookup, verifyUsage } from "./verify-request.mjs";

test("intact tool message accepted; shortened ledger or wrong call ID rejected", () => {
  const page = pages[0];
  const msg = { role: "tool", tool_call_id: "example", content: JSON.stringify(page) };
  assert.equal(verifyLookup([msg], "example", page.topic).topic, page.topic);
  assert.throws(() => verifyLookup([msg], "unrelated", page.topic), /missing or duplicated/);
  const shortened = { ...page, serialLedger: page.serialLedger.slice(0, -1) };
  assert.throws(() => verifyLookup([{ ...msg, content: JSON.stringify(shortened) }], "example", page.topic),
    /differs from frozen/);
});

test("matching totals cannot hide mismatched usage categories or missing evidence", () => {
  const provider = { prompt_tokens: 20, completion_tokens: 3 };
  const eve = { inputTokens: 20, outputTokens: 3 };
  assert.deepEqual(verifyUsage(provider, eve), eve);
  assert.throws(() => verifyUsage(provider, { inputTokens: 19, outputTokens: 4 }), /usage mismatch/);
  assert.throws(() => verifyUsage(null, eve), /missing usage/);
});
