import {afterEach,describe,expect,it,vi} from "vitest";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DurableCommerceStore} from "../commerce/durable-store.js";
import {createCommerceHttpServer} from "../commerce/health-server.js";
import {AgentMailCommerceAdapter} from "../commerce/agentmail-adapter.js";
import {PlatformRegistry} from "../commerce/platform-registry.js";
import {DEFAULT_LIVE_COMMERCE_POLICY} from "../commerce/live-policy.js";

const supervisor:any={health:async()=>({running:true,lastSuccessAt:new Date().toISOString(),channels:[],queue:{},mode:"draft",killSwitch:false})};
const posts:Array<{url:string;body:string}>=[];
const nativeFetch=globalThis.fetch;

async function withServer(run:(base:string,store:DurableCommerceStore)=>Promise<void>){
  const store=new DurableCommerceStore(new Database(":memory:")),api=createCommerceHttpServer({supervisor,store,policy:{...DEFAULT_LIVE_COMMERCE_POLICY,mode:"draft"},port:0,intakeToken:"secret"});
  await api.start();const address:any=api.server.address();try{await run(`http://127.0.0.1:${address.port}`,store);}finally{await api.stop();}
}

afterEach(()=>{vi.restoreAllMocks();posts.length=0;delete process.env.STRIPE_SECRET_KEY;delete process.env.STRIPE_WEBHOOK_SECRET;});

describe("delivery and subscriptions",()=>{
  it("creates a monthly card checkout and refuses recurring USDC",async()=>{
    process.env.STRIPE_SECRET_KEY="sk_test_example";
    vi.stubGlobal("fetch",vi.fn(async(input:any,init:any)=>{if(String(input).startsWith("http://127.0.0.1:"))return nativeFetch(input,init);posts.push({url:String(input),body:String(init?.body??"")});return new Response(JSON.stringify({id:"cs_test_1",url:"https://checkout.stripe.test/session"}),{status:200,headers:{"content-type":"application/json"}});}) as any);
    await withServer(async(base)=>{
      const card=await fetch(base+"/v1/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({offerId:"support-monitor",email:"test@example.com",method:"card",acceptTerms:true})});
      expect(card.status).toBe(201);expect(posts[0].body).toContain("mode=subscription");expect(posts[0].body).toContain("recurring%5D%5Binterval%5D=month");
      const usdc=await fetch(base+"/v1/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({offerId:"support-monitor",email:"test@example.com",method:"usdc",acceptTerms:true})});
      expect(usdc.status).toBe(400);expect(await usdc.json()).toMatchObject({error:"RECURRING_CARD_ONLY"});
    });
  });
  it("activates and cancels a subscription from signed Stripe events",async()=>{
    process.env.STRIPE_WEBHOOK_SECRET="whsec_test";
    await withServer(async(base,store)=>{
      const ref="01ARZ3NDEKTSV4RRFFQ69G5FAV";
      const send=async(event:any)=>{const raw=JSON.stringify(event),t=Math.floor(Date.now()/1000),v1=crypto.createHmac("sha256",process.env.STRIPE_WEBHOOK_SECRET!).update(`${t}.${raw}`).digest("hex");return fetch(base+"/v1/stripe/webhook",{method:"POST",headers:{"stripe-signature":`t=${t},v1=${v1}`,"content-type":"application/json"},body:raw});};
      expect((await send({id:"evt_start",type:"checkout.session.completed",data:{object:{id:"cs_1",mode:"subscription",payment_status:"paid",subscription:"sub_1",amount_total:19900,currency:"aud",metadata:{reference:ref,offerId:"support-monitor",email:"test@example.com"},customer_details:{email:"test@example.com"}}}})).status).toBe(200);
      expect(store.getState<any>("subscription:sub_1")).toMatchObject({status:"active",offerId:"support-monitor"});
      expect((await send({id:"evt_cancel",type:"customer.subscription.deleted",data:{object:{id:"sub_1"}}})).status).toBe(200);
      expect(store.getState<any>("subscription:sub_1")).toMatchObject({status:"cancelled"});
    });
  });
  it("serves only manifest-allowlisted delivery files",async()=>{
    await withServer(async(base,store)=>{const ref="01ARZ3NDEKTSV4RRFFQ69G5FAV",dir=fs.mkdtempSync(path.join(os.tmpdir(),"delivery-"));fs.writeFileSync(path.join(dir,"result.txt"),"ready");fs.writeFileSync(path.join(dir,"private.txt"),"secret");store.setState(`access:${ref}`,{paid:true});store.setState(`order:${ref}`,{stage:"delivery_ready",workspacePath:dir,manifest:{files:[{name:"result.txt",bytes:5}]},updatedAt:new Date().toISOString()});const status:any=await (await fetch(base+`/v1/access/${ref}`)).json();expect(status.delivery.files[0].name).toBe("result.txt");expect(await (await fetch(base+`/v1/access/${ref}/file/result.txt`)).text()).toBe("ready");expect((await fetch(base+`/v1/access/${ref}/file/private.txt`)).status).toBe(404);fs.rmSync(dir,{recursive:true,force:true});});
  });
  it("sends customer delivery only through the explicit AgentMail action",async()=>{const platform=new PlatformRegistry().get("agentmail-commerce"),adapter=new AgentMailCommerceAdapter(platform,{AUTOMATON_AGENTMAIL_API_KEY:"am_test",AUTOMATON_AGENTMAIL_INBOX_ID:"customer@example.agentmail.to",AUTOMATON_ALLOW_CUSTOMER_DELIVERY:"1"});vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({message_id:"msg_1",thread_id:"thr_1"}),{status:200,headers:{"content-type":"application/json"}})) as any);await expect(adapter.submitApprovedAction({type:"deliver",payload:{to:"buyer@example.com",subject:"Delivery",text:"Ready"},idempotencyKey:"delivery-1"})).resolves.toMatchObject({status:"sent"});await expect(adapter.submitApprovedAction({type:"submit_proposal",payload:{},idempotencyKey:"x"})).rejects.toThrow("AGENTMAIL_ACTION_NOT_ALLOWED");});
});
