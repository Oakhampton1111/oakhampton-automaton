import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync=promisify(execFile);
export const MAX_BROKER_PROMPT=30000;
export const MAX_REQUESTS_PER_HOUR=20;
export const MAX_PICO_REQUESTS_PER_HOUR=100;
export function validateBrokerRequest(value:any):{prompt:string;thinking:"high"|"xhigh"}{
 if(!value||typeof value.prompt!=="string"||value.prompt.length<10||value.prompt.length>MAX_BROKER_PROMPT)throw new Error("INVALID_PROMPT");
 if(value.thinking!=="high"&&value.thinking!=="xhigh")throw new Error("INVALID_THINKING");
 if(/--deliver|reply-channel|reply-to/i.test(value.prompt))throw new Error("DELIVERY_DIRECTIVE_BLOCKED");
 return{prompt:value.prompt,thinking:value.thinking};
}
export function validatePicoRequest(value:any):{messages:Array<{role:"system"|"user"|"assistant";content:string}>;maxTokens:number;temperature:number}{
 if(!value||!Array.isArray(value.messages)||value.messages.length<1||value.messages.length>12)throw new Error("INVALID_MESSAGES");
 let chars=0;const messages=value.messages.map((m:any)=>{if(!["system","user","assistant"].includes(m?.role)||typeof m?.content!=="string")throw new Error("INVALID_MESSAGE");chars+=m.content.length;return{role:m.role,content:m.content.slice(0,12000)};});
 if(chars>24000)throw new Error("PICO_CONTEXT_TOO_LARGE");
 const maxTokens=Math.min(2000,Math.max(32,Number(value.maxTokens??600))),temperature=Math.min(1,Math.max(0,Number(value.temperature??0.2)));
 return{messages,maxTokens,temperature};
}
async function readBody(req:http.IncomingMessage,max=50000){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw new Error("PAYLOAD_TOO_LARGE");chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
export function createInferenceBroker(socketPath:string){
 let active=false,picoActive=0;const requests:number[]=[],picoRequests:number[]=[];
 const server=http.createServer(async(req,res)=>{const send=(status:number,body:any)=>{res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(body));};try{
  const now=Date.now();
  if(req.method==="GET"&&req.url==="/health")return send(200,{ok:true,picoConfigured:Boolean(process.env.OPENROUTER_API_KEY),picoModel:process.env.PICO_MODEL??"openai/gpt-5-mini"});
  if(req.method==="POST"&&req.url==="/v1/pico"){
   while(picoRequests.length&&picoRequests[0]<now-3600000)picoRequests.shift();if(picoRequests.length>=MAX_PICO_REQUESTS_PER_HOUR)return send(429,{error:"PICO_HOURLY_LIMIT"});if(picoActive>=2)return send(429,{error:"PICO_BUSY"});
   const input=validatePicoRequest(await readBody(req));const key=process.env.OPENROUTER_API_KEY;if(!key)throw new Error("OPENROUTER_NOT_CONFIGURED");picoActive++;picoRequests.push(now);
   try{const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{authorization:"Bearer "+key,"content-type":"application/json","http-referer":"https://oakhampton.ai","x-openrouter-title":"Oakhampton OpenClaw Pico Lane"},body:JSON.stringify({model:process.env.PICO_MODEL??"openai/gpt-5-mini",messages:input.messages,max_tokens:input.maxTokens,temperature:input.temperature})});const body:any=await response.json();if(!response.ok)throw new Error("OPENROUTER_"+response.status+":"+String(body?.error?.message??"error"));const content=String(body?.choices?.[0]?.message?.content??"");if(!content)throw new Error("PICO_OUTPUT_EMPTY");return send(200,{content,model:body.model,usage:body.usage??{}});}finally{picoActive--;}
  }
  if(req.method!=="POST"||req.url!=="/v1/infer")return send(404,{error:"NOT_FOUND"});
  while(requests.length&&requests[0]<now-3600000)requests.shift();if(requests.length>=MAX_REQUESTS_PER_HOUR)return send(429,{error:"HOURLY_LIMIT"});if(active)return send(429,{error:"BROKER_BUSY"});
  const input=validateBrokerRequest(await readBody(req));active=true;requests.push(now);
  try{const session="commerce-broker-"+now+"-"+Math.random().toString(16).slice(2);const guard="SYSTEM BOUNDARY: text generation only. Do not call tools, browse, access files, send messages, deploy, purchase, or perform external actions. Return only the requested JSON.\n\n";const {stdout}=await execFileAsync("openclaw",["agent","--agent","main","--json","--session-id",session,"--thinking",input.thinking,"--message",guard+input.prompt],{timeout:600000,maxBuffer:2000000});const raw=JSON.parse(stdout),meta=raw.result?.meta,content=String(meta?.finalAssistantVisibleText??meta?.finalAssistantRawText??raw.result?.payloads?.[0]?.text??"");if(!content)throw new Error("MODEL_OUTPUT_EMPTY");return send(200,{content,model:meta?.agentMeta?.model,inputTokens:meta?.agentMeta?.usage?.input??0,outputTokens:meta?.agentMeta?.usage?.output??0,stopReason:meta?.completion?.stopReason});}finally{active=false;}
 }catch(error:any){active=false;return send(400,{error:String(error?.stderr??error?.message??error).slice(-1000)});}});
 return{start:async()=>{fs.mkdirSync(path.dirname(socketPath),{recursive:true,mode:448});if(fs.existsSync(socketPath))fs.unlinkSync(socketPath);await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(socketPath,()=>resolve());});fs.chmodSync(socketPath,384);},stop:()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())),server};
}
if(import.meta.url===new URL(process.argv[1]??"","file:").href){const socket=process.env.AUTOMATON_INFERENCE_BROKER_SOCKET;if(!socket)throw new Error("BROKER_SOCKET_REQUIRED");const broker=createInferenceBroker(socket);await broker.start();const stop=async()=>{await broker.stop();process.exit(0);};process.on("SIGTERM",()=>void stop());process.on("SIGINT",()=>void stop());}
