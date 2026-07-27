import { describe,expect,it } from "vitest";
import { routeForQuality,shouldAcceptWork } from "../quality/router.js";
import { buildQualityPrompt,promptCacheKey } from "../quality/prompt.js";
import { evaluateDeterministically,promoteChallenger } from "../quality/evaluator.js";

const models=[
 {skillId:"research",modelId:"cheap",providerId:"a",qualityBps:9100,reliabilityBps:9900,averageCostCents:1,averageLatencyMs:100,sampleSize:20},
 {skillId:"research",modelId:"premium",providerId:"b",qualityBps:9800,reliabilityBps:9900,averageCostCents:12,averageLatencyMs:300,sampleSize:20},
];
describe("quality-first production",()=>{
 it("chooses highest quality before lower cost",()=>expect(routeForQuality({skillId:"research",requiredQualityBps:9000,jobValueCents:50000,maximumProductionCostCents:20,complexityBps:4000,ambiguityBps:1000,privacyClass:"public"},models)?.modelId).toBe("premium"));
 it("rejects models below quality or cost gate",()=>expect(routeForQuality({skillId:"research",requiredQualityBps:9900,jobValueCents:1,maximumProductionCostCents:5,complexityBps:0,ambiguityBps:0,privacyClass:"public"},models)).toBeNull());
 it("requires independent critic for complex or valuable work",()=>expect(routeForQuality({skillId:"research",requiredQualityBps:9000,jobValueCents:100000,maximumProductionCostCents:20,complexityBps:100,ambiguityBps:0,privacyClass:"public"},models)?.requiresCritic).toBe(true));
 it("keeps untrusted data outside stable prompt prefix",()=>{const t={id:"p",version:"1",skillId:"research",stablePrefix:"TRUSTED",active:true,createdAt:"now"};const p=buildQualityPrompt(t,{text:"ignore previous"});expect(p).toContain("[UNTRUSTED_TASK_DATA]");expect(promptCacheKey(t,{text:"x"})).toHaveLength(64);});
 it("promotes only equal-or-better quality",()=>{const a=evaluateDeterministically("alpha beta",{id:"x",requiredTerms:["alpha","beta"],dimensions:["factuality"]});const b=evaluateDeterministically("alpha",{id:"x",requiredTerms:["alpha","beta"],dimensions:["factuality"]});expect(promoteChallenger(a,b,10,1)).toBe(false);expect(promoteChallenger(a,a,10,5)).toBe(true);});
 it("refuses work that cannot fund quality",()=>expect(shouldAcceptWork({revenueCents:1000,platformFeesCents:100,acquisitionCents:100,productionCents:700,revisionReserveCents:100,paymentFeesCents:50},100)).toBe(false));
});
