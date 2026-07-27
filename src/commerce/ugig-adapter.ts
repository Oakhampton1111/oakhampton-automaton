import type {CommerceChannelAdapter,ChannelHealth,ChannelOpportunity} from "./channel-adapters.js";
import type {PlatformDefinition} from "./platform-registry.js";

const API="https://ugig.net/api";
const clean=(value:unknown,max=12000)=>String(value??"").replace(/<[^>]+>/g," ").replace(/[\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim().slice(0,max);
const currency=(coin:unknown)=>{const value=clean(coin,24).toUpperCase();if(value.startsWith("USDC"))return "USDC";if(value==="SOL")return "SOL";if(value==="ETH")return "ETH";if(value==="BTC")return "BTC";return value||"USD";};

export class UgigAdapter implements CommerceChannelAdapter {
 constructor(readonly platform:PlatformDefinition,private readonly env:NodeJS.ProcessEnv=process.env,private readonly fetcher:typeof fetch=fetch){}
 async health():Promise<ChannelHealth>{return{platformId:this.platform.id,ready:true,mode:"api",reason:this.env.AUTOMATON_UGIG_API_KEY?undefined:"public discovery only; missing AUTOMATON_UGIG_API_KEY"};}
 async discover():Promise<{opportunities:ChannelOpportunity[]}>{
  const response=await this.fetcher(`${API}/gigs?status=active&page=1&limit=100`,{headers:{accept:"application/json","user-agent":"OakhamptonAutomaton/0.3 (+https://www.oakhampton.ai/automation-services/)"},signal:AbortSignal.timeout(15000)});
  if(response.status===429)throw new Error("UGIG_RATE_LIMITED");if(!response.ok)throw new Error(`UGIG_API_ERROR:${response.status}`);
  const payload:any=await response.json(),rawRows=Array.isArray(payload?.gigs)?payload.gigs:[];let selfId="",selfUsername="";if(this.env.AUTOMATON_UGIG_API_KEY){const profileResponse=await this.fetcher(`${API}/profile`,{headers:{accept:"application/json","x-api-key":this.env.AUTOMATON_UGIG_API_KEY},signal:AbortSignal.timeout(15000)});if(profileResponse.ok){const profile:any=await profileResponse.json();selfId=String(profile?.id??profile?.user?.id??"");selfUsername=String(profile?.username??profile?.user?.username??"").toLowerCase();}}const rows=rawRows.filter((row:any)=>{const posterId=String(row?.poster?.id??row?.poster_id??"");const posterUsername=String(row?.poster?.username??"").toLowerCase();return!(selfId&&posterId===selfId)&&!(selfUsername&&posterUsername===selfUsername);});
  const opportunities=rows.map((row:any):ChannelOpportunity|null=>{
   const sourceId=clean(row.id,160),title=clean(row.title,240);if(!sourceId||!title||row.status!=="active")return null;
   const budget=Number(row.budget_max??row.budget_min??0),listingType=clean(row.listing_type,40);
   return{platformId:"ugig",sourceId,url:`https://ugig.net/gigs/${encodeURIComponent(sourceId)}`,language:"en",title,body:clean(row.description),budgetCents:Number.isFinite(budget)?Math.max(0,Math.round(budget*100)):0,currency:currency(row.payment_coin),metadata:{category:clean(row.category,120),skills:Array.isArray(row.skills_required)?row.skills_required:[],duration:clean(row.duration,120),budgetType:clean(row.budget_type,40),budgetMin:row.budget_min,budgetMax:row.budget_max,paymentCoin:clean(row.payment_coin,24),listingType,applicationsCount:Number(row.applications_count??0),posterType:clean(row.poster?.account_type,40),company:clean(row.poster?.full_name??row.poster?.username,240),remote:row.location_type==="remote",discoveredVia:"official_public_api"}};
  }).filter((row:ChannelOpportunity|null):row is ChannelOpportunity=>Boolean(row));
  return{opportunities};
 }
 async fetchMessages(cursor?:string){
  const apiKey=this.env.AUTOMATON_UGIG_API_KEY;if(!apiKey)return{messages:[],cursor};
  const response=await this.fetcher(`${API}/notifications?limit=100`,{headers:{accept:"application/json","x-api-key":apiKey},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`UGIG_NOTIFICATIONS_ERROR:${response.status}`);
  const payload:any=await response.json(),rows=Array.isArray(payload?.notifications)?payload.notifications:[];
  const newer=cursor?rows.filter((row:any)=>String(row.created_at??"")>cursor):rows;
  const messages=newer.map((row:any)=>({id:String(row.id),customerId:String(row.data?.user_id??row.data?.sender_id??"ugig"),subject:clean(row.title??row.type,180),body:clean(row.body??JSON.stringify(row.data??{}),12000),from:"notifications@ugig.net",to:[this.env.AUTOMATON_UGIG_EMAIL??"customerservice@oakhampton.ai"],threadId:String(row.data?.gig_id??row.data?.application_id??row.id),receivedAt:String(row.created_at??""),attachments:[]}));
  const next=messages.reduce((latest:any,message:any)=>message.receivedAt>latest?message.receivedAt:latest,cursor??"");return{messages,cursor:next||cursor};
 }
 async submitApprovedAction(input:{type:string;payload:Record<string,unknown>;idempotencyKey:string}):Promise<{externalId:string;status:string}>{
  if(input.type!=="submit_proposal")throw new Error(`UGIG_ACTION_UNSUPPORTED:${input.type}`);const apiKey=this.env.AUTOMATON_UGIG_API_KEY;if(!apiKey)throw new Error("UGIG_API_KEY_MISSING");
  const payload:any=input.payload,proposal:any=payload.proposal??{},gigId=String(proposal.sourceId??payload.sourceId??"");if(!gigId)throw new Error("UGIG_GIG_ID_MISSING");
  const response=await this.fetcher(`${API}/applications`,{method:"POST",headers:{accept:"application/json","content-type":"application/json","x-api-key":apiKey,"idempotency-key":input.idempotencyKey},body:JSON.stringify({gig_id:gigId,cover_letter:String(proposal.body??""),proposed_rate:Number(proposal.priceCents??payload.amountCents??0)/100,proposed_timeline:"Confirm after scope and acceptance checks",portfolio_items:["https://www.oakhampton.ai/automation-services/"],ai_tools_to_use:["OpenClaw","Codex"]}),signal:AbortSignal.timeout(15000)});
  if(response.status===409)return{externalId:`ugig:${gigId}`,status:"duplicate"};if(!response.ok){const failure:any=await response.json().catch(()=>({}));throw new Error(`UGIG_SUBMISSION_ERROR:${response.status}:${clean(failure?.message??failure?.error,240)}`);}const result:any=await response.json();return{externalId:String(result.id??result.application?.id??`ugig:${gigId}`),status:String(result.status??result.application?.status??"submitted")};
 }
}
