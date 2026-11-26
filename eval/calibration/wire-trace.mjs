import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { task } from "../study/fixture.mjs";
import { verifyLookup } from "./verify-request.mjs";
import { groqReplayBody } from "./groq-replay.mjs";

// Use as the provider's custom fetch. Never serialize Request/Response objects,
// HTTP headers, process.env, URLs with query params, or thrown provider errors.
export function calibrationFetch({ directory, model, condition, key, send = fetch }) {
  if (!task.models.includes(model) || !["A", "B"].includes(condition) || !key?.trim())
    throw new Error("Expected one authorized calibration cell and a configured key");
  let n = 0;
  const scrub = text => text.replaceAll(key, "[REDACTED]")
    .replace(/gsk_[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/Bearer\s+[\w./+=-]+/gi, "Bearer [REDACTED]");
  return async (input, init) => {
    const request = new Request(input, init);
    if (request.url !== "https://api.groq.com/openai/v1/chat/completions" || request.method !== "POST")
      throw new Error("Unexpected calibration destination or method");
    const original = await request.clone().text();
    const body = groqReplayBody(original);
    const payload = JSON.parse(body);
    if (payload.model !== model) throw new Error("Unexpected calibration model");
    const basename = `${model.split("/")[1]}-${condition}-${String(++n).padStart(3,"0")}`;
    const save = (suffix, text) => writeFile(join(directory, `${basename}.${suffix}`), scrub(text),
      { flag:"wx", mode:0o600 });
    await save("request.json", body);
    // Detect altered returns before sending the provider another request.
    for (const m of payload.messages.filter(m => m.role === "tool")) {
      const fn = payload.messages.flatMap(m => m.tool_calls ?? []).find(c => c.id === m.tool_call_id)?.function;
      if (fn?.name === "search_docs") {
        const result = typeof m.content === "string" ? m.content : m.content.map(p => p.text).join("");
        // Rejected lookups do not produce a fixture page. The post-run join to
        // eve's settled call records must independently require every success.
        if (result.includes('"serialLedger"') || result.includes('"keyFacts"'))
          verifyLookup(payload.messages, m.tool_call_id, JSON.parse(fn.arguments).topic);
      }
    }
    const response = await send(body === original ? request : new Request(request, { body }), { redirect:"error" });
    // Buffer this calibration response only. Preserve SSE event order and payloads;
    // do not use the resulting traces for latency measurements.
    const bytes = await response.arrayBuffer();
    await save("response.txt", new TextDecoder().decode(bytes));
    await save("status.json", JSON.stringify({status:response.status}));
    return new Response(bytes, { status: response.status, headers: response.headers });
  };
}
