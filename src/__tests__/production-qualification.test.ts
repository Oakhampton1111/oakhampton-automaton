import {describe,expect,it} from "vitest";
import {qualifyForProduction,classifyProductionSkill,DEFAULT_QUALITY_BENCHMARKS} from "../quality/production.js";
const platform={id:"test",regions:["global"],languages:["en"],currencies:["USD"],modes:["bid"] as const,discovery:["api"] as const,aiAssistance:"allowed" as const,automatedSubmission:"approval_required" as const,offPlatformContact:true,identityVerification:false,feeBps:1000,minimumFeeCents:0};
const opportunity=(patch:any={})=>({platformId:"test",sourceId:"1",url:"https://example.com",language:"en",title:"API integration",body:"Build and test a TypeScript API. Deliverable and requirements are listed.",budgetCents:100000,currency:"USD",metadata:{acceptanceCriteria:["tests pass"],...patch.metadata},...patch});
describe("production qualification",()=>{
 it("classifies tested work",()=>expect(classifyProductionSkill(opportunity())).toBe("software"));
 it("qualifies funded, testable work with premium routing",()=>{const r=qualifyForProduction(opportunity(),platform as any);expect(r.eligible).toBe(true);expect(r.routing?.modelId).toBe("gpt-5.6-sol");});
 it("retains unknown-budget and vague work for review",()=>{const r=qualifyForProduction(opportunity({budgetCents:0,body:"help me",metadata:{acceptanceCriteria:[]}}),platform as any);expect(r.reasons).toContain("BUDGET_UNKNOWN");expect(r.reasons).toContain("ACCEPTANCE_NOT_TESTABLE");expect(r.reviewRecommended).toBe(true);});
 it("reviews cheap work that cannot fund maximum quality",()=>{const r=qualifyForProduction(opportunity({budgetCents:1000}),platform as any);expect(r.reasons).toContain("QUALITY_WORKFLOW_UNPROFITABLE");expect(r.reviewRecommended).toBe(true);});
 it("reviews unbenchmarked skills rather than silently lowering quality",()=>{const r=qualifyForProduction(opportunity(),platform as any,DEFAULT_QUALITY_BENCHMARKS.filter(x=>x.skillId!=="software"));expect(r.reasons).toContain("QUALITY_ROUTE_UNAVAILABLE");expect(r.reviewRecommended).toBe(true);});
 it("retains geographically restricted or adjacent roles for human/OpenClaw review",()=>{const r=qualifyForProduction(opportunity({body:"Candidates must be based in Germany. Customer success automation and API deliverable."}),platform as any);expect(r.eligible).toBe(false);expect(r.reviewRecommended).toBe(true);});
});
