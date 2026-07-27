import {describe,expect,it} from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {buildSquad,circuitAllows,evaluateEconomics,nextPhase,recordCircuitFailure,sealConsensus,verifyConsensus} from "../commerce/business-cycle.js";
import {DurableCommerceStore} from "../commerce/durable-store.js";

describe("autonomous business cycle",()=>{
  it("approves positive high-margin economics",()=>{
    const d=evaluateEconomics({expectedRevenueCents:100000,conversionProbability:.8,acquisitionCostCents:2000,fulfilmentCostCents:15000,platformFeeCents:5000,inferenceCostCents:1000,infrastructureCostCents:500,uncertaintyBps:1000});
    expect(d.execute).toBe(true); expect(d.disposition).toBe("auto_execute"); expect(d.expectedContributionCents).toBe(60600); expect(d.predictedMarginBps).toBeGreaterThan(5000);
  });
  it("routes low-probability but profitable work to specialist review",()=>{
    const d=evaluateEconomics({expectedRevenueCents:1000000,conversionProbability:.01,acquisitionCostCents:10000,fulfilmentCostCents:30000,platformFeeCents:0,inferenceCostCents:1000,infrastructureCostCents:500});
    expect(d.execute).toBe(false); expect(d.disposition).toBe("specialist_review"); expect(d.reasons).toContain("LOW_PROBABILITY_REQUIRES_REVIEW");
  });
  it("rejects only genuinely negative unit economics",()=>{
    const d=evaluateEconomics({expectedRevenueCents:10000,conversionProbability:.9,acquisitionCostCents:1000,fulfilmentCostCents:9000,platformFeeCents:1500,inferenceCostCents:500,infrastructureCostCents:0});
    expect(d.disposition).toBe("reject"); expect(d.reasons).toContain("NEGATIVE_UNIT_ECONOMICS");
  });
  it("creates bounded squads without losing budget",()=>{
    const p=buildSquad({opportunityId:"job-1",complexity:"complex",budgetCents:101,acceptanceTests:["valid"]});
    expect(p.roles).toHaveLength(5); expect(p.roles.reduce((n,r)=>n+r.budgetCents,0)).toBe(101); expect(p.maximumWorkers).toBe(5);
  });
  it("seals consensus and enforces convergence",()=>{
    const base={version:1 as const,revision:1,mission:"Earn honestly",objective:"Win one profitable job",cycleId:"c1",phase:"execute" as const,rankedOpportunityIds:[],evidence:[],assumptions:[],budgetCents:0,predictedContributionCents:0,realisedContributionCents:0,blockers:[],decisions:[],nextAction:"Submit proposal",researchOnlyCycles:2,updatedAt:new Date().toISOString()};
    expect(verifyConsensus(sealConsensus(base))).toBe(true);
    expect(()=>sealConsensus({...base,phase:"discover",researchOnlyCycles:3})).toThrow("FORCED_CONVERGENCE_REQUIRED");
    expect(nextPhase("validate","progress")).toBe("execute");
  });
  it("opens and probes a circuit after repeated failures",()=>{
    let s={key:"adapter:x",status:"closed" as const,failures:0};
    s=recordCircuitFailure(s,"adapter:x","one",2,100,new Date(0)); expect(s.status).toBe("closed");
    s=recordCircuitFailure(s,"adapter:x","two",2,100,new Date(0)); expect(s.status).toBe("open");
    expect(circuitAllows(s,new Date(99))).toBe(false); expect(circuitAllows(s,new Date(100))).toBe(true);
  });
  it("persists versioned consensus and writes an atomic readable projection",()=>{
    const db=new Database(":memory:"),store=new DurableCommerceStore(db),dir=fs.mkdtempSync(path.join(os.tmpdir(),"consensus-")),projection=path.join(dir,"consensus.md");
    const value=store.saveConsensus({version:1,revision:1,mission:"Earn honestly",objective:"Complete work",cycleId:"c1",phase:"execute",rankedOpportunityIds:[],evidence:["verified"],assumptions:[],budgetCents:100,predictedContributionCents:50,realisedContributionCents:0,blockers:[],decisions:[],nextAction:"Deliver",researchOnlyCycles:0,updatedAt:new Date().toISOString()},projection);
    expect(store.latestConsensus()?.checksum).toBe(value.checksum); expect(fs.readFileSync(projection,"utf8")).toContain("## Next Action");
    expect(()=>store.saveConsensus({...value,revision:3},projection)).toThrow("CONSENSUS_REVISION_CONFLICT");
    db.close(); fs.rmSync(dir,{recursive:true,force:true});
  });
});
