export interface SubredditWatch { subreddit:string; tier:1|2; capabilities:string[]; reviewCadence:"daily"|"twice_weekly"|"weekly"; promotionPolicy:"observe_only"|"helpful_replies_only"|"offers_allowed"; searchTerms:string[]; }
export interface ThreadObservation { id:string; subreddit:string; url:string; capturedAt:string; problem:string; audience:string; urgencyBps:number; repeatabilityBps:number; buyerIntentBps:number; capabilityFitBps:number; boundedDeliveryBps:number; independentMentions:number; promotionalOrSynthetic:boolean; }
export interface ReconPolicy { minimumScoreBps:number; minimumIndependentMentions:number; rejectPromotionalSignals:boolean; }
export interface ReconAssessment { observation:ThreadObservation; scoreBps:number; decision:"ignore"|"watch"|"offer_test"; reasons:string[]; }
export const DEFAULT_SUBREDDIT_WATCHLIST:SubredditWatch[]=[
{subreddit:"excel",tier:1,capabilities:["spreadsheet-cleanup","report-automation","csv-normalization"],reviewCadence:"daily",promotionPolicy:"helpful_replies_only",searchTerms:["manual","hours","every day","cleanup","report","csv"]},
{subreddit:"openclaw",tier:1,capabilities:["openclaw-install","docker-vps","monitoring","model-routing"],reviewCadence:"daily",promotionPolicy:"helpful_replies_only",searchTerms:["broken","install","docker","vps","connector","upgrade"]},
{subreddit:"Bookkeeping",tier:1,capabilities:["reconciliation-prep","exception-report","data-cleanup"],reviewCadence:"twice_weekly",promotionPolicy:"observe_only",searchTerms:["cleanup","reconciliation","missing transactions","catch up"]},
{subreddit:"smallbusiness",tier:1,capabilities:["workflow-automation","proposal-invoice","email-ops"],reviewCadence:"twice_weekly",promotionPolicy:"observe_only",searchTerms:["manual","admin","follow up","invoice","proposal"]},
{subreddit:"SaaS",tier:2,capabilities:["email-ops","support-triage","reporting"],reviewCadence:"weekly",promotionPolicy:"helpful_replies_only",searchTerms:["time consuming","manual","support","inbox"]},
{subreddit:"selfhosted",tier:2,capabilities:["docker-vps","monitoring","deployment"],reviewCadence:"weekly",promotionPolicy:"helpful_replies_only",searchTerms:["setup","keeps breaking","monitoring","docker"]}];
const clamp=(n:number)=>Math.max(0,Math.min(10000,Math.floor(n)));
export function assessObservation(o:ThreadObservation,p:ReconPolicy):ReconAssessment {
 const scoreBps=clamp(o.urgencyBps*.22+o.repeatabilityBps*.20+o.buyerIntentBps*.20+o.capabilityFitBps*.23+o.boundedDeliveryBps*.15); const reasons:string[]=[];
 if(o.independentMentions<p.minimumIndependentMentions) reasons.push("NEEDS_CORROBORATION"); if(p.rejectPromotionalSignals&&o.promotionalOrSynthetic) reasons.push("PROMOTIONAL_SIGNAL");
 if(o.capabilityFitBps<6000) reasons.push("CAPABILITY_FIT_LOW"); if(scoreBps<p.minimumScoreBps) reasons.push("SCORE_BELOW_GATE");
 const blocking=reasons.some(r=>r!=="NEEDS_CORROBORATION");
 return {observation:o,scoreBps,decision:blocking?"ignore":reasons.includes("NEEDS_CORROBORATION")?"watch":"offer_test",reasons};
}
export function dueWatchlist(list:SubredditWatch[],cadence:SubredditWatch["reviewCadence"]){return list.filter(x=>x.reviewCadence===cadence);}
