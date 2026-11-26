import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { pages } from "../study/fixture.mjs";

// Compare the actual OpenAI-compatible outbound message, not eve's saved copy
// of the tool return. Record a result only for a request actually transmitted.
export function verifyLookup(messages, toolCallId, topic) {
  const expected = pages.find(p => p.topic === topic);
  assert.ok(expected, "lookup is not in frozen fixture");
  assert.ok(toolCallId, "missing provider tool call ID");
  const matches = messages.filter(m => m.role === "tool" && m.tool_call_id === toolCallId);
  assert.equal(matches.length, 1, "tool result missing or duplicated in outbound request");
  const content = matches[0].content;
  const text = Array.isArray(content) ? content.map(part => {
    assert.equal(part.type, "text", "unexpected non-text tool result");
    return part.text;
  }).join("") : content;
  assert.equal(typeof text, "string", "outbound tool content is not text");
  assert.deepEqual(JSON.parse(text), expected, "outbound lookup differs from frozen result");
  return { toolCallId, topic, contentSha256: createHash("sha256").update(text).digest("hex") };
}

// Caller pairs the wire response with eve's record for the same attempt.
// Check input and output independently; a matching total is not sufficient.
export function verifyUsage(provider, eve) {
  assert.ok(provider && eve, "missing usage evidence");
  for (const [providerField, eveField] of [
    ["prompt_tokens", "inputTokens"], ["completion_tokens", "outputTokens"],
  ]) {
    assert.ok(Number.isSafeInteger(provider[providerField]) && provider[providerField] >= 0,
      `missing or invalid provider ${providerField}`);
    assert.equal(eve[eveField], provider[providerField], `usage mismatch: ${eveField}`);
  }
  return { inputTokens: eve.inputTokens, outputTokens: eve.outputTokens };
}
