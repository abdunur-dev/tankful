// One authorized calibration per invocation. Only the local transport holds the
// provider credential; the agent process sees a loopback URL and a dummy key.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, writeFile, readFile, symlink, readdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { calibrationFetch } from "./wire-trace.mjs";
import { task, pages, createLookup, promptFor } from "../study/fixture.mjs";

const here = dirname(fileURLToPath(import.meta.url)), root = join(here,"../..");
const [model, condition] = process.argv.slice(2);
if (!task.models.includes(model) || !["A","B"].includes(condition)) throw Error("Only calibration A/B supported");
const key = parseEnv(await readFile(join(root,".env.local"),"utf8")).GROQ_API_KEY?.trim();
if (!key) throw Error("Missing credential");
const cell = `${model.split("/")[1]}-${condition}`;
const work = join(here,".eve",`host-${cell}-${randomUUID()}`);
const out = join(work,"evidence");
await mkdir(out,{recursive:true});
const trace = calibrationFetch({directory:out,model,condition,key});
const ticket = randomUUID();
let blocked = false;
const scrub = text => text.replaceAll(key,"[REDACTED]").replaceAll(ticket,"[REDACTED]").replace(/gsk_[\w-]+/g,"[REDACTED]");
const server = createServer(async (req,res) => {
  try {
    if (blocked || req.method !== "POST" || req.url !== "/v1/chat/completions" ||
        req.headers.authorization !== `Bearer ${ticket}`) throw Error("Calibration transport unavailable");
    const chunks=[]; for await (const c of req) chunks.push(c);
    const body=Buffer.concat(chunks).toString();
    const response = await trace("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`}, body });
    if (!response.ok) blocked = true;
    res.writeHead(response.status,{"Content-Type":response.headers.get("content-type")||"application/json"});
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    blocked = true;
    await writeFile(join(out,"transport-failure.txt"),scrub(String(e.message)));
    res.writeHead(422); res.end('{"error":{"message":"Calibration transport stopped"}}');
  }
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try {
  const put = async (file, text) => {await mkdir(dirname(join(work,file)),{recursive:true});await writeFile(join(work,file),text);};
  await put("package.json",JSON.stringify({name:"tankful-calibration",private:true,type:"module",dependencies:{
    eve:"1.5.0","@ai-sdk/openai-compatible":"3.0.96",zod:"4.6.7",...(condition==="B"?{tankful:"file:../../../.."}:{})}}));
  await mkdir(join(work,"node_modules"),{recursive:true});
  for(const [name,dir] of [["eve",join(root,"node_modules/eve")],["tankful",root],["zod",join(root,"node_modules/zod")],
    ["@ai-sdk/openai-compatible",join(here,".eve/node_modules/@ai-sdk/openai-compatible")]]) {
    const dest=join(work,"node_modules",name);
    await mkdir(dirname(dest),{recursive:true}); await symlink(dir,dest,"junction");
  }
  await put("agent/agent.ts",`import {defineAgent} from "eve";
import {createOpenAICompatible} from "@ai-sdk/openai-compatible";
const provider=createOpenAICompatible({name:"groq",baseURL:"http://127.0.0.1:${server.address().port}/v1",apiKey:process.env.CAL_LOCAL_TOKEN,includeUsage:true});
export default defineAgent({defaultTools:false,model:provider(${JSON.stringify(model)}), modelContextWindowTokens:131072,
limits:{sessionUsage:({window})=>window.inputTokens+window.outputTokens>=14000}});`);
  await put("agent/instructions.md","\n");
  if(condition==="B") await put("agent/extensions/tankful.ts",`import tankful from "tankful";export default tankful({limit:14000});`);
  await put("agent/lib/lookup.ts",`export const pages=${JSON.stringify(pages)};\n${createLookup.toString().replace("function createLookup","export function createLookup")}`);
  await put("agent/tools/search_docs.ts",`import {defineTool} from "eve/tools"; import {z} from "zod";
import {readFileSync,appendFileSync} from "node:fs";import {join} from "node:path";
import {createLookup} from "../lib/lookup";${condition==="B"?'import {whenBudgetAllows} from "tankful/guard";':""}
const tool=defineTool({description:"Return the next archive document by topic and cursor.",inputSchema:z.object({topic:z.string(),cursor:z.string()}),
async execute(input,ctx){const dir=process.env.CAL_EVIDENCE!; const events=readFileSync(join(dir,"events.jsonl"),"utf8").trim().split("\\n").map(s=>JSON.parse(s));
const requested=events.find(e=>e.type==="call.requested"&&e.data.callId===ctx.callId);
const runId=requested?.data.owner?.runId??requested?.scope?.runId;if(!runId)throw Error("No trusted model run ID");
const f=join(dir,"lookup.jsonl");let saved=[];try{saved=readFileSync(f,"utf8").trim().split("\\n").map(s=>JSON.parse(s));}catch(e){if(e.code!=="ENOENT")throw e;}
const lookup=createLookup();for(const item of saved)lookup(item.input,item.runId);
const result=lookup(input,runId);appendFileSync(f,JSON.stringify({input,runId,callId:ctx.callId,result})+"\\n");return result;}});
export default ${condition==="B"?"whenBudgetAllows(tool)":"tool"};`);
  await put("agent/hooks/evidence.ts",`import {defineHook} from "eve/hooks";import {appendFileSync} from "node:fs";import {join} from "node:path";
export default defineHook({events:{"*"(e){appendFileSync(join(process.env.CAL_EVIDENCE!,"events.jsonl"),JSON.stringify(e)+"\\n");}}});`);
  await put("evals/evals.config.ts",`import {defineEvalConfig} from "eve/evals";export default defineEvalConfig({maxConcurrency:1});`);
  await put("evals/calibration.eval.ts",`import {defineEval} from "eve/evals";import {writeFileSync} from "node:fs";import {join} from "node:path";
export default defineEval({async test(t){const turn=await t.send(${JSON.stringify(promptFor(condition))});
writeFileSync(join(process.env.CAL_EVIDENCE!,"turn.json"),JSON.stringify({reply:turn.reply,status:turn.status,events:turn.events,interactions:turn.interactions},null,2));}});`);
  const env={CAL_EVIDENCE:out,CAL_LOCAL_TOKEN:ticket,TANKFUL_DEBUG:"1",EVE_TELEMETRY_DISABLED:"1"};
  for(const k of Object.keys(process.env)) if (/^(PATH|PATHEXT|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|TEMP|TMP|SYSTEMROOT|COMSPEC|HOMEDRIVE|HOMEPATH|PROGRAMFILES.*|WINDIR|NUMBER_OF_PROCESSORS)$/i.test(k))env[k]=process.env[k];
  console.log(`Calibration evidence: ${out}`);
  const child=spawn(process.execPath,[join(root,"node_modules/eve/bin/eve.js"),"eval","calibration","--max-concurrency","1","--repeat","1","--skip-report","--timeout","120000","--json"],{cwd:work,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout.on("data",b=>log+=b);child.stderr.on("data",b=>log+=b);
  const code=await new Promise((resolve,reject)=>{child.once("exit",resolve);child.once("error",reject);});
  await writeFile(join(out,"runner.txt"),scrub(log));
  console.log(`eve exit=${code}; provider requests=${(await readdir(out)).filter(f=>f.endsWith(".request.json")).length}`);
  if(code!==0||blocked)process.exitCode=1;
} finally {server.close();}
