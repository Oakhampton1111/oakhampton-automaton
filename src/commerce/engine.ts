import type { PlatformDefinition } from "./platform-registry.js";

export interface RawOpportunity { platformId:string; sourceId:string; url:string; language:string; title:string; body:string; budgetCents:number; currency:string; deadline?:string; clientPaymentVerified:boolean; clientRatingBps?:number; proposalCount?:number; requiredSkills:string[]; acceptanceCriteria:string[]; }
export interface NormalizedOpportunity extends RawOpportunity { canonicalId:string; translatedTitle:string; translatedBody:string; translationConfidenceBps:number; }
export interface CapabilityProfile { skills:string[]; supportedLanguages:string[]; maximumDeliveryCostCents:number; }
export interface EconomicEstimate { grossRevenueCents:number; platformFeeCents:number; acquisitionCostCents:number; deliveryCostCents:number; modelCostCents:number; revisionReserveCents:number; refundReserveCents:number; expectedNetProfitCents:number; expectedValueCents:number; }
export interface OpportunityDecision { decision:"reject"|"review"|"propose"; reasons:string[]; economics:EconomicEstimate; fitBps:number; }
export interface CommercePolicy { minimumFitBps:number; minimumExpectedProfitCents:number; minimumExpectedValueCents:number; maximumProposalCompetition:number; requirePaymentVerification:boolean; minimumTranslationConfidenceBps:number; }

export function normalizeOpportunity(raw:RawOpportunity, translated:{title:string;body:string;confidenceBps:number}):NormalizedOpportunity {
  if(!raw.url.startsWith("https://")) throw new Error("opportunity URL must use HTTPS");
  if(raw.budgetCents<0||!Number.isInteger(raw.budgetCents)) throw new Error("invalid budget");
  return {...raw,canonicalId:`${raw.platformId}:${raw.sourceId}`,translatedTitle:translated.title,translatedBody:translated.body,translationConfidenceBps:translated.confidenceBps};
}
export function estimateEconomics(o:NormalizedOpportunity,p:PlatformDefinition,costs:{acquisition:number;delivery:number;model:number;revisionBps:number;refundBps:number},successProbabilityBps:number):EconomicEstimate {
  for(const [name,value] of Object.entries(costs)) if(!Number.isFinite(value)||value<0||!Number.isInteger(value)) throw new Error(`invalid ${name}`);
  if(!Number.isInteger(successProbabilityBps)||successProbabilityBps<0||successProbabilityBps>10000) throw new Error("invalid success probability");
  const gross=o.budgetCents; const platformFee=Math.max(p.minimumFeeCents,Math.ceil(gross*p.feeBps/10000));
  const revision=Math.ceil(gross*costs.revisionBps/10000); const refund=Math.ceil(gross*costs.refundBps/10000);
  const net=gross-platformFee-costs.acquisition-costs.delivery-costs.model-revision-refund;
  return {grossRevenueCents:gross,platformFeeCents:platformFee,acquisitionCostCents:costs.acquisition,deliveryCostCents:costs.delivery,modelCostCents:costs.model,revisionReserveCents:revision,refundReserveCents:refund,expectedNetProfitCents:net,expectedValueCents:Math.floor(net*successProbabilityBps/10000)};
}
export function evaluateOpportunity(o:NormalizedOpportunity,platform:PlatformDefinition,profile:CapabilityProfile,e:EconomicEstimate,policy:CommercePolicy):OpportunityDecision {
  const matched=o.requiredSkills.filter(s=>profile.skills.includes(s)).length; const fitBps=o.requiredSkills.length===0?0:Math.floor(matched*10000/o.requiredSkills.length); const reasons:string[]=[];
  if(fitBps<policy.minimumFitBps) reasons.push("CAPABILITY_FIT_LOW"); if(policy.requirePaymentVerification&&!o.clientPaymentVerified) reasons.push("PAYMENT_NOT_VERIFIED");
  if(!platform.currencies.includes(o.currency)) reasons.push("CURRENCY_UNSUPPORTED"); if(!(platform.languages.includes(o.language)||platform.languages.includes("multi"))) reasons.push("LANGUAGE_UNSUPPORTED");
  if(o.deadline&&!Number.isNaN(Date.parse(o.deadline))&&Date.parse(o.deadline)<Date.now()) reasons.push("DEADLINE_EXPIRED");
  if((o.proposalCount??0)>policy.maximumProposalCompetition) reasons.push("COMPETITION_TOO_HIGH"); if(o.translationConfidenceBps<policy.minimumTranslationConfidenceBps) reasons.push("TRANSLATION_REVIEW_REQUIRED");
  if(o.acceptanceCriteria.length===0) reasons.push("ACCEPTANCE_CRITERIA_MISSING"); if(e.deliveryCostCents>profile.maximumDeliveryCostCents) reasons.push("DELIVERY_COST_CAP");
  if(e.expectedNetProfitCents<policy.minimumExpectedProfitCents) reasons.push("PROFIT_BELOW_GATE"); if(e.expectedValueCents<policy.minimumExpectedValueCents) reasons.push("EXPECTED_VALUE_BELOW_GATE");
  const reviewOnly=reasons.length===1&&reasons[0]==="TRANSLATION_REVIEW_REQUIRED"; return {decision:reasons.length===0?"propose":reviewOnly?"review":"reject",reasons,economics:e,fitBps};
}

export function selectModelTier(input:{languageSupported:boolean;complexityBps:number;ambiguityBps:number;customerValueCents:number}):"cheap"|"fast"|"reasoning" {
  if(!input.languageSupported||input.complexityBps>=6500||input.ambiguityBps>=5000||input.customerValueCents>=100000) return "reasoning";
  if(input.complexityBps>=2000||input.ambiguityBps>=1500||input.customerValueCents>=10000) return "fast"; return "cheap";
}
