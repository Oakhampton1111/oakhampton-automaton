import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { AutonomousEconomicShadowLoop, CapabilityBroker, EconomicEvidenceStore, EconomicExperimentRunner, EconomicLedger } from "../economic/index.js";
import { GovernedIntegrationEconomicCycle, mapCandidateToEconomicOpportunity } from "../integrations/index.js";
const candidate: any = { source: "github", sourceId: "o/r#1", immutableReference: "https://github.com/o/r/issues/1",
  title: "Approved work", body: "untrusted", labels: ["human-approved"], humanApproved: true, currency: "AUD",
  acceptanceCriteria: ["tests pass"], evidenceRequired: ["test-report"], receivedAt: new Date().toISOString() };
const assessment: any = { recommendation: "accept", estimatedRevenueCents: 1000, maximumCostCents: 200,
  confidenceBps: 9000, risks: [], requiredEvidence: ["customer-acceptance"], reason: "positive" };
describe("integration economic bridge", () => {
  it("maps approved candidates with stable provenance and evidence", () => {
    const first = mapCandidateToEconomicOpportunity(candidate, assessment, 10000);
    const second = mapCandidateToEconomicOpportunity(candidate, assessment, 10000);
    expect(first.opportunityId).toBe(second.opportunityId);
    expect(first.proposal).toMatchObject({ inputProvenance: "external", destinationClass: "approved-opportunity", maximumCostCents: 200 });
    expect(first.evidenceReferences).toContain("source:https://github.com/o/r/issues/1");
  });
  it("rejects candidates without explicit human approval", () => {
    expect(() => mapCandidateToEconomicOpportunity({ ...candidate, humanApproved: false }, assessment)).toThrow("HUMAN_APPROVAL_REQUIRED");
  });
  it("executes only through the governed shadow broker and ledger", () => {
    const evidence = new EconomicEvidenceStore(join(mkdtempSync(join(tmpdir(), "integration-economic-")), "evidence.jsonl"));
    const ledger = new EconomicLedger(500);
    const broker = new CapabilityBroker({ revision: "integration-test", maximumActionCostCents: 300, allowedActionTypes: ["deliver_work"],
      allowedDestinationClasses: ["approved-opportunity"], maximumDataClassification: "internal", requireCreatorFor: [] }, ledger);
    const loop = new AutonomousEconomicShadowLoop(new EconomicExperimentRunner(broker, ledger, evidence), evidence);
    const result = new GovernedIntegrationEconomicCycle(loop, { minimumExpectedProfitCents: 100, minimumReturnOnCost: 2,
      maximumCycleCostCents: 300, maximumActionsPerCycle: 1 }).run({ mode: "staging", externalEffectsEnabled: false,
      fetched: 1, quarantined: 0, evaluated: 1, approved: 1, rejected: 0, candidates: [{ candidate, assessment }] });
    expect(result).toMatchObject({ mode: "shadow", externalEffectsEnabled: false, selected: 1, executed: 1 });
    expect(ledger.balance("delivery_expense")).toBe(200); expect(evidence.verify().valid).toBe(true);
  });
});
