import type {CommerceChannelAdapter,ChannelHealth,ChannelOpportunity} from "./channel-adapters.js";
import type {PlatformDefinition} from "./platform-registry.js";

const ENDPOINTS:Record<string,string>={
 remoteok:"https://remoteok.com/api",
 remotive:"https://remotive.com/api/remote-jobs",
 arbeitnow:"https://www.arbeitnow.com/api/job-board-api",
};
const clean=(v:unknown,max=12000)=>String(v??"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,max);
const annualBudget=(row:any):number=>{
 const direct=[row.salary_min,row.salary_min_value,row.min_salary].find(Number.isFinite);
 if(Number.isFinite(direct)&&direct>0)return Math.round(direct*100);
 const text=String(row.salary??row.compensation??"").replace(/,/g,"");
 const match=text.match(/(?:USD|\$)\s*(\d{2,6})/i);return match?Number(match[1])*100:0;
};
export class PublicJobsApiAdapter implements CommerceChannelAdapter{
 constructor(readonly platform:PlatformDefinition,private readonly fetcher:typeof fetch=fetch){}
 async health():Promise<ChannelHealth>{return{platformId:this.platform.id,ready:Boolean(ENDPOINTS[this.platform.id]),mode:"api",reason:ENDPOINTS[this.platform.id]?undefined:"unsupported public API"};}
 async discover():Promise<{opportunities:ChannelOpportunity[]}>{
  const endpoint=ENDPOINTS[this.platform.id];if(!endpoint)return{opportunities:[]};
  const response=await this.fetcher(endpoint,{headers:{accept:"application/json","user-agent":"OakhamptonAutomaton/0.3 (+https://www.oakhampton.ai/automation-services/)"},signal:AbortSignal.timeout(15000)});
  if(response.status===429)throw new Error(`${this.platform.id.toUpperCase()}_RATE_LIMITED`);if(!response.ok)throw new Error(`${this.platform.id.toUpperCase()}_API_ERROR:${response.status}`);
  const payload:any=await response.json();const rows=this.platform.id==="remoteok"?(Array.isArray(payload)?payload.slice(1):[]):this.platform.id==="remotive"?(payload.jobs??[]):(payload.data??[]);
  const opportunities=rows.slice(0,150).map((row:any):ChannelOpportunity|null=>{
   const sourceId=clean(row.id??row.slug,160),title=clean(row.position??row.title,240),url=clean(row.url??row.apply_url,1000);if(!sourceId||!title||!/^https:\/\//.test(url))return null;
   return{platformId:this.platform.id,sourceId,url,language:"en",title,body:clean(row.description,12000),budgetCents:annualBudget(row),currency:clean(row.currency??"USD",8)||"USD",metadata:{attributionRequired:true,attributionText:this.platform.id,company:clean(row.company_name??row.company,240),location:clean(row.candidate_required_location??row.location,240),remote:row.remote??true,tags:row.tags??[row.category,row.job_type].filter(Boolean),employmentType:row.job_type,discoveredVia:"official_public_api"}};
  }).filter((row:ChannelOpportunity|null):row is ChannelOpportunity=>Boolean(row));
  return{opportunities};
 }
 async fetchMessages(){return{messages:[]};}
 async submitApprovedAction():Promise<{externalId:string;status:string}>{throw new Error(`${this.platform.id.toUpperCase()}_SUBMISSION_REQUIRES_PLATFORM_FLOW`);}
}
