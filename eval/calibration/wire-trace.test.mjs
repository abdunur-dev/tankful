import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { calibrationFetch } from "./wire-trace.mjs";
import { pages } from "../study/fixture.mjs";
import { groqReplayBody } from "./groq-replay.mjs";

test("all four cells strip only assistant replay reasoning; tool result, system/user guidance and streamed usage are unchanged", async () => {
  const messages = [{role:"system",content:"[Tankful: 14000/14000 tokens remaining, level=ok]"},
    {role:"assistant",content:null,tool_calls:[{id:"call1",type:"function",function:{name:"search_docs",arguments:'{"topic":"Intake","cursor":"START"}'}}]},
    {role:"tool",tool_call_id:"call1",content:JSON.stringify(pages[0])},
    {role:"user",content:"[Tankful: 1200/14000 tokens remaining, level=critical]"}];
  const sse = 'data: {"choices":[],"usage":{"prompt_tokens":4000,"completion_tokens":17,"completion_tokens_details":{"reasoning_tokens":9}}}\n\ndata: [DONE]\n\n';
  for (const model of ["openai/gpt-oss-20b","openai/gpt-oss-120b"]) for (const condition of ["A","B"]) {
    const dir = await mkdtemp(join(tmpdir(),"groq-replay-test-"));
    try {
      const expected = {model, messages,stream:true,stream_options:{include_usage:true}};
      const raw = JSON.stringify(expected,null,2);
      assert.equal(groqReplayBody(raw),raw);
      const original=structuredClone(expected);
      original.messages[1].reasoning_content="omitted on replay only";
      const capture=calibrationFetch({directory:dir,model,condition,key:"test-only",send:async req=>{
        assert.deepEqual(await req.json(),expected);
        return new Response(sse);
      }});
      const response=await capture("https://api.groq.com/openai/v1/chat/completions",{method:"POST",body:JSON.stringify(original)});
      assert.equal(await response.text(),sse);
      assert.equal(await readFile(join(dir,`${model.split("/")[1]}-${condition}-001.response.txt`),"utf8"),sse);
    } finally {await rm(dir,{recursive:true,force:true});}
  }
});

test("wire instrumentation excludes credentials, preserves stream body, refuses other destinations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tankful-wire-test-"));
  try {
    const key = "dummy-test-only"; const model = "openai/gpt-oss-20b";
    let calls = 0;
    const capture = calibrationFetch({ directory:dir, model, key, condition:"A",
      send:async () => { calls++; return new Response(`data: ${key}\n\ndata: [DONE]\n\n`); } });
    const init = { method:"POST", headers:{authorization:`Bearer ${key}`}, body:JSON.stringify({model,messages:[]}) };
    await assert.rejects(capture("https://example.test",init), /destination/);
    const res = await capture("https://api.groq.com/openai/v1/chat/completions",init);
    assert.equal(calls,1);
    assert.equal(await res.text(),`data: ${key}\n\ndata: [DONE]\n\n`);
    const saved = await readFile(join(dir,"gpt-oss-20b-A-001.response.txt"),"utf8");
    assert.equal(saved,"data: [REDACTED]\n\ndata: [DONE]\n\n");
    assert.equal(await readFile(join(dir,"gpt-oss-20b-A-001.request.json"),"utf8"),init.body);
  } finally { await rm(dir,{ recursive:true,force:true }); }
});
