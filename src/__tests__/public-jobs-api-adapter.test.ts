import {describe,expect,it,vi} from "vitest";
import {PublicJobsApiAdapter} from "../commerce/public-jobs-api-adapter.js";
const platform=(id:string)=>({id,regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"] as const,discovery:["api"] as const,aiAssistance:"disclosed" as const,automatedSubmission:"approval_required" as const,offPlatformContact:true,identityVerification:false,feeBps:0,minimumFeeCents:0});
describe("public jobs API adapters",()=>{
 it("normalizes RemoteOK and preserves attribution",async()=>{const fetcher=vi.fn(async()=>new Response(JSON.stringify([{legal:"x"},{id:7,position:"AI Engineer",url:"https://remoteok.com/jobs/7",description:"Build agents",salary_min:120000,tags:["ai"]}]),{status:200}));const r=await new PublicJobsApiAdapter(platform("remoteok") as any,fetcher as any).discover();expect(r.opportunities[0].budgetCents).toBe(12000000);expect(r.opportunities[0].metadata.attributionRequired).toBe(true);});
 it("does not invent budgets when an API omits compensation",async()=>{const fetcher=vi.fn(async()=>new Response(JSON.stringify({jobs:[{id:1,title:"Automation Engineer",url:"https://remotive.com/jobs/1",description:"n8n"}]}),{status:200}));const r=await new PublicJobsApiAdapter(platform("remotive") as any,fetcher as any).discover();expect(r.opportunities[0].budgetCents).toBe(0);});
});
