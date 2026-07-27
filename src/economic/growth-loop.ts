export type DemandChannel = "reddit" | "forum" | "search" | "marketplace" | "customer_interview";
export type AcquisitionChannel = "organic" | "marketplace" | "paid_ads" | "direct_outreach";
export interface PainSignal { id:string; channel:DemandChannel; sourceUrl:string; capturedAt:string; text:string; audience:string; frequency:number; urgencyBps:number; willingnessToPayBps:number; evidenceQualityBps:number; termsPermitCommercialAnalysis:boolean; containsPersonalData:boolean; }
export interface OfferHypothesis { id:string; title:string; targetAudience:string; promisedOutcome:string; priceCents:number; deliveryCostCents:number; modelCostCents:number; supportReserveCents:number; refundReserveBps:number; evidenceSignalIds:string[]; }
export interface WebsiteExperiment { id:string; offerId:string; host:"here.now"|"custom"; acquisitionChannel:AcquisitionChannel; trafficBudgetCents:number; visitors:number; qualifiedLeads:number; paidOrders:number; settledRevenueCents:number; refundsCents:number; chargebacksCents:number; deploymentApproved:boolean; advertisingApproved:boolean; }
export interface GrowthPolicy { minimumEvidenceQualityBps:number; minimumIndependentSignals:number; minimumContributionMarginBps:number; minimumPaidOrdersBeforeScale:number; maximumCustomerAcquisitionCostCents:number; maximumExperimentLossCents:number; minimumSettledProfitCentsToSpawn:number; minimumQueueDepthToSpawn:number; }
export interface OfferAssessment { eligible:boolean; reasons:string[]; contributionMarginCents:number; contributionMarginBps:number; evidenceScoreBps:number; }
export interface ExperimentAssessment { decision:"stop"|"iterate"|"scale"; reasons:string[]; netProfitCents:number; customerAcquisitionCostCents:number; conversionRateBps:number; maySpawnWorker:boolean; }
const bps=(v:number)=>Math.max(0,Math.min(10_000,Math.floor(v)));
export function assessOffer(offer:OfferHypothesis,signals:PainSignal[],policy:GrowthPolicy):OfferAssessment {
 const matching=signals.filter(s=>offer.evidenceSignalIds.includes(s.id)); const permitted=matching.filter(s=>s.termsPermitCommercialAnalysis&&!s.containsPersonalData);
 const evidenceScoreBps=permitted.length===0?0:Math.floor(permitted.reduce((n,s)=>n+bps((s.urgencyBps+s.willingnessToPayBps+s.evidenceQualityBps)/3),0)/permitted.length);
 const reserve=Math.ceil(offer.priceCents*bps(offer.refundReserveBps)/10_000); const contributionMarginCents=offer.priceCents-offer.deliveryCostCents-offer.modelCostCents-offer.supportReserveCents-reserve;
 const contributionMarginBps=offer.priceCents<=0?-10_000:Math.floor(contributionMarginCents*10_000/offer.priceCents); const reasons:string[]=[];
 if(matching.length<policy.minimumIndependentSignals) reasons.push("INSUFFICIENT_INDEPENDENT_SIGNALS"); if(permitted.length!==matching.length) reasons.push("DATA_USE_NOT_PERMITTED");
 if(evidenceScoreBps<policy.minimumEvidenceQualityBps) reasons.push("EVIDENCE_QUALITY_BELOW_GATE"); if(contributionMarginBps<policy.minimumContributionMarginBps) reasons.push("CONTRIBUTION_MARGIN_BELOW_GATE");
 return {eligible:reasons.length===0,reasons,contributionMarginCents,contributionMarginBps,evidenceScoreBps};
}
export function assessWebsiteExperiment(e:WebsiteExperiment,o:OfferHypothesis,p:GrowthPolicy,queueDepth=0):ExperimentAssessment {
 const variableCost=e.paidOrders*(o.deliveryCostCents+o.modelCostCents+o.supportReserveCents); const netProfitCents=e.settledRevenueCents-e.refundsCents-e.chargebacksCents-e.trafficBudgetCents-variableCost;
 const customerAcquisitionCostCents=e.paidOrders===0?(e.trafficBudgetCents>0?Number.POSITIVE_INFINITY:0):Math.ceil(e.trafficBudgetCents/e.paidOrders); const conversionRateBps=e.visitors===0?0:Math.floor(e.paidOrders*10_000/e.visitors); const reasons:string[]=[];
 if(!e.deploymentApproved) reasons.push("DEPLOYMENT_APPROVAL_REQUIRED"); if(e.acquisitionChannel==="paid_ads"&&!e.advertisingApproved) reasons.push("ADVERTISING_APPROVAL_REQUIRED");
 if(netProfitCents < -p.maximumExperimentLossCents) reasons.push("LOSS_LIMIT_EXCEEDED"); if(customerAcquisitionCostCents>p.maximumCustomerAcquisitionCostCents) reasons.push("CAC_ABOVE_GATE");
 if(e.refundsCents+e.chargebacksCents>e.settledRevenueCents) reasons.push("REVENUE_QUALITY_FAILURE"); const scalable=reasons.length===0&&e.paidOrders>=p.minimumPaidOrdersBeforeScale&&netProfitCents>0;
 const decision:ExperimentAssessment["decision"]=reasons.some(r=>["LOSS_LIMIT_EXCEEDED","REVENUE_QUALITY_FAILURE"].includes(r))?"stop":scalable?"scale":"iterate";
 return {decision,reasons,netProfitCents,customerAcquisitionCostCents,conversionRateBps,maySpawnWorker:decision==="scale"&&netProfitCents>=p.minimumSettledProfitCentsToSpawn&&queueDepth>=p.minimumQueueDepthToSpawn};
}
export function buildHereNowDeploymentManifest(_offer:OfferHypothesis){ return {provider:"here.now" as const,externalEffect:true as const,requiresApproval:true as const,files:["index.html","privacy.html","terms.html"],secrets:[] as string[]}; }
