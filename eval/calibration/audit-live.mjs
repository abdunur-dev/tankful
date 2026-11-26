// Offline audit of a single saved calibration. Never issues a provider request.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { verifyLookup, verifyUsage } from "./verify-request.mjs";
import { promptFor, task } from "../study/fixture.mjs";
import { score } from "../score.mjs";

const [dir,condition] = process.argv.slice(2);
const read = n=>readFileSync(join(dir,n),"utf8");
const names = readdirSync(dir);
const key = parseEnv(readFileSync(new URL("../../.env.local",import.meta.url),"utf8")).GROQ_API_KEY;
assert.ok(key && names.every(n=>!read(n).includes(key)&&!/\bgsk_[\w-]+/.test(read(n))),"Trace contains credential or scanner has no key");
const events = read("events.jsonl").trim().split("\n").map(JSON.parse);
const usage = events.filter(e=>e.type==="usage.recorded").map(e=>e.data.usage);
const starts = events.filter(e=>e.type==="model.started");
assert.ok(!events.some(e=>e.type.startsWith("context.")&&e.data.kind==="compaction"),"Observed compaction");
const lookups=names.includes("lookup.jsonl")?read("lookup.jsonl").trim().split("\n").map(JSON.parse):[];
const files=names.filter(n=>n.endsWith(".request.json")).sort();
const turns=names.includes("turn.json")?JSON.parse(read("turn.json")):null;
const checks=[], levels=[], checked=new Set(), accepted=new Set();
let used=0, nextUsage=0;
for (const [i,file] of files.entries()) {
  const stem=file.slice(0,-"request.json".length);
  const {messages}=JSON.parse(read(file));
  assert.ok(messages.some(m=>m.content===promptFor(condition)),"Frozen prompt absent");
  assert.ok(!messages.some(m=>m.role==="assistant" && Object.hasOwn(m,"reasoning_content")));
  const status=JSON.parse(read(stem+"status.json")).status;
  for (const l of lookups) {
    const previous=starts.slice(0,i).some(e=>e.data.runId===l.runId);
    if(previous || messages.some(m=>m.role==="tool"&&m.tool_call_id===l.callId)) {
      verifyLookup(messages,l.callId,l.result.topic);
      checked.add(l.callId); if(status===200)accepted.add(l.callId);
    }
  }
  const marks=messages.filter(m=>["user","system"].includes(m.role)&&typeof m.content==="string")
    .flatMap(m=>[...m.content.matchAll(/\[Tankful:[^\]]*?level=(ok|low|critical|empty)/gi)].map(match=>({role:m.role,level:match[1]})));
  levels.push(marks);
  if(status!==200){checks.push({status,code:JSON.parse(read(stem+"response.txt")).error?.code});continue;}
  const frames=read(stem+"response.txt").split(/\r?\n/).filter(s=>s.startsWith("data: {")).map(s=>JSON.parse(s.slice(6)));
  const u=frames.findLast(s=>s.usage)?.usage;
  const pair=verifyUsage(u,usage[nextUsage++]);
  checks.push({status,...pair});used+=pair.inputTokens+pair.outputTokens;
}
assert.equal(nextUsage,usage.length);
const s=score({condition,calls:lookups.map(l=>({name:"search_docs",outcome:"completed",result:l.result})),
  finalText:turns?.reply??"",finishReason:events.filter(e=>e.type==="model.settled").at(-1)?.data.finishReason,
  usageComplete:true,usage},task);
console.log(JSON.stringify({checks,used,lookupTopics:lookups.map(l=>l.result.topic),checked:checked.size,
  accepted:accepted.size,levels,topicsCompleted:s.topicsCompleted,finalChars:turns?.reply?.length??null,
  note:s.noteMatchesCalls,paused:events.some(e=>e.type==="turn.paused"),turnStatus:turns?.status??null,
  reportPresent:existsSync(join(dir,"../.eve/tankful-last-report.json"))}));
