import type { ModelBenchmark,QualityRoutingDecision,QualityRoutingInput } from "./types.js";
export function routeForQuality(input:QualityRoutingInput,benchmarks:ModelBenchmark[]):QualityRoutingDecision|null {
 const eligible=benchmarks.filter(b=>b.skillId===input.skillId&&b.sampleSize>=5).filter(b=>Math.min(b.qualityBps,b.reliabilityBps)>=input.requiredQualityBps).filter(b=>b.averageCostCents<=input.maximumProductionCostCents).sort((a,b)=>b.qualityBps-a.qualityBps||b.reliabilityBps-a.reliabilityBps||a.averageCostCents-b.averageCostCents||a.averageLatencyMs-b.averageLatencyMs);
 const best=eligible[0]; if(!best)return null; const highRisk=input.complexityBps>=6500||input.ambiguityBps>=5000||input.jobValueCents>=100000;
 return {providerId:best.providerId,modelId:best.modelId,estimatedQualityBps:best.qualityBps,estimatedCostCents:best.averageCostCents,requiresCritic:highRisk,rationale:["QUALITY_GATE_PASSED",highRisk?"INDEPENDENT_CRITIC_REQUIRED":"STANDARD_QA_REQUIRED","COST_USED_AFTER_QUALITY"]};
}
export function shouldAcceptWork(e:{revenueCents:number;platformFeesCents:number;acquisitionCents:number;productionCents:number;revisionReserveCents:number;paymentFeesCents:number},minimumMarginCents:number):boolean { return e.revenueCents-e.platformFeesCents-e.acquisitionCents-e.productionCents-e.revisionReserveCents-e.paymentFeesCents>=minimumMarginCents; }
