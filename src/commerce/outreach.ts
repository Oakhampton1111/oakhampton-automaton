export type OutreachChannel="email"|"community_reply"|"marketplace_proposal"|"partner"|"paid_search"|"organic_page";
export interface Lead { id:string; domain:string; country:string; language:string; publicBusinessContact:boolean; observedProblem:string; relevanceBps:number; sourceUrl:string; }
export interface OutreachPolicy { dailyLimits:Record<OutreachChannel,number>; maximumFollowUps:number; minimumRelevanceBps:number; requireApproval:OutreachChannel[]; allowedCountries:string[]; }
export interface OutreachAttempt { leadId:string; channel:OutreachChannel; campaignId:string; timestamp:string; followUpNumber:number; approved:boolean; }
export class SuppressionRegistry { private readonly entries=new Map<string,string>(); suppress(key:string,reason:string){this.entries.set(key.toLowerCase(),reason);} isSuppressed(key:string){return this.entries.has(key.toLowerCase());} reason(key:string){return this.entries.get(key.toLowerCase());} }
export class OutreachThrottle {
  constructor(private readonly policy:OutreachPolicy,private readonly suppression:SuppressionRegistry,private readonly history:OutreachAttempt[]=[]){ }
  assess(lead:Lead,attempt:OutreachAttempt):{allowed:boolean;reasons:string[]} {
    const reasons:string[]=[]; if(this.suppression.isSuppressed(lead.id)||this.suppression.isSuppressed(lead.domain)) reasons.push("SUPPRESSED");
    if(!lead.publicBusinessContact&&attempt.channel==="email") reasons.push("NO_PUBLIC_BUSINESS_CONTACT"); if(lead.relevanceBps<this.policy.minimumRelevanceBps) reasons.push("RELEVANCE_LOW");
    if(!lead.sourceUrl.startsWith("https://")) reasons.push("SOURCE_REQUIRED"); if(this.policy.allowedCountries.length&&!this.policy.allowedCountries.includes(lead.country)) reasons.push("COUNTRY_NOT_ALLOWED");
    if(attempt.followUpNumber>this.policy.maximumFollowUps) reasons.push("FOLLOW_UP_LIMIT"); if(this.policy.requireApproval.includes(attempt.channel)&&!attempt.approved) reasons.push("APPROVAL_REQUIRED");
    const day=attempt.timestamp.slice(0,10); const used=this.history.filter(x=>x.channel===attempt.channel&&x.timestamp.startsWith(day)).length; if(used>=this.policy.dailyLimits[attempt.channel]) reasons.push("DAILY_LIMIT");
    if(this.history.some(x=>x.leadId===lead.id&&x.channel===attempt.channel&&x.followUpNumber===attempt.followUpNumber)) reasons.push("DUPLICATE_ATTEMPT"); return {allowed:reasons.length===0,reasons};
  }
  record(attempt:OutreachAttempt){this.history.push({...attempt});}
}
export interface AttributionEvent { campaignId:string; leadId?:string; type:"impression"|"visit"|"enquiry"|"proposal"|"contract"|"settled_revenue"|"refund"|"complaint"; amountCents?:number; costCents?:number; timestamp:string; }
export function summarizeAttribution(events:AttributionEvent[]){let revenue=0,cost=0,complaints=0,contracts=0;for(const e of events){revenue+=e.type==="settled_revenue"?(e.amountCents??0):0;revenue-=e.type==="refund"?(e.amountCents??0):0;cost+=e.costCents??0;complaints+=e.type==="complaint"?1:0;contracts+=e.type==="contract"?1:0;}return {revenueCents:revenue,costCents:cost,netCents:revenue-cost,complaints,contracts};}
