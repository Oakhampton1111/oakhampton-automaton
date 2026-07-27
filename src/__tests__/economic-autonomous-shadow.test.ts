import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { AutonomousEconomicShadowLoop, CapabilityBroker, EconomicEvidenceStore, EconomicExperimentRunner, EconomicLedger } from "../economic/index.js";
import type { ActionProposal, EconomicOpportunity, EconomicPolicy } from "../economic/index.js";

function proposal(id: string, cost: number): ActionProposal {
  const now = Date.now();
  return { proposalId: id, agentId: "shadow-agent", releaseDigest: "test", inputProvenance: "system", actionType: "deliver_work",
    purpose: "synthetic work", expectedValueCents: 1_000, maximumCostCents: cost, currency: "AUD", destination: "simulation",
    destinationClass: "synthetic-test", dataClassification: "internal", requestedScopes: ["simulation:execute"], idempotencyKey: id,
    notBefore: new Date(now - 1_000).toISOString(), expiresAt: new Date(now + 60_000).toISOString(), evidenceRequired: ["synthetic"] };
}
function opportunity(id: string, cost: number, revenue: number, probability: number): EconomicOpportunity {
  return { opportunityId: id, proposal: proposal(id, cost), estimatedRevenueCents: revenue, successProbabilityBps: probability,
    syntheticActualCostCents: cost, syntheticAcceptedValueCents: revenue, evidenceReferences: ["shadow:synthetic"] };
}
describe("autonomous economic shadow loop", () => {
  it("selects positive unit economics within cycle limits without external effects", () => {
    const path = join(mkdtempSync(join(tmpdir(), "autonomous-shadow-")), "evidence.jsonl");
    const evidence = new EconomicEvidenceStore(path); const ledger = new EconomicLedger(1_000);
    const policy: EconomicPolicy = { revision: "test", maximumActionCostCents: 500, allowedActionTypes: ["deliver_work"],
      allowedDestinationClasses: ["synthetic-test"], maximumDataClassification: "internal", requireCreatorFor: [] };
    const runner = new EconomicExperimentRunner(new CapabilityBroker(policy, ledger), ledger, evidence);
    const result = new AutonomousEconomicShadowLoop(runner, evidence).run([
      opportunity("best", 200, 1_000, 8_000), opportunity("bad", 300, 200, 5_000), opportunity("second", 250, 700, 8_000),
    ], { minimumExpectedProfitCents: 100, minimumReturnOnCost: 2, maximumCycleCostCents: 300, maximumActionsPerCycle: 2 });
    expect(result).toMatchObject({ mode: "shadow", externalEffectsEnabled: false, assessed: 3, selected: 1, executed: 1 });
    expect(evidence.verify().valid).toBe(true);
    expect(ledger.balance("delivery_expense")).toBe(200);
  });
});
