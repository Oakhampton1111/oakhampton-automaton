import { appendFileSync, mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CapabilityBroker, EconomicEvidenceStore, EconomicExperimentRunner, EconomicLedger, GovernedRevenueVerifier, calculateEconomicMetrics, evaluateGraduation } from "../economic/index.js";
import type { ActionProposal, EconomicPolicy } from "../economic/index.js";
const policy: EconomicPolicy = { revision: "shadow-v2", maximumActionCostCents: 500, allowedActionTypes: ["deliver_work"],
  allowedDestinationClasses: ["test-customer"], maximumDataClassification: "internal", requireCreatorFor: [] };
function setup() {
  const directory = mkdtempSync(join(tmpdir(), "economic-evidence-")); const filePath = join(directory, "evidence.jsonl");
  const ledger = new EconomicLedger(2_000); const broker = new CapabilityBroker(policy, ledger);
  const evidence = new EconomicEvidenceStore(filePath);
  return { filePath, evidence, runner: new EconomicExperimentRunner(broker, ledger, evidence) };
}
function proposal(): ActionProposal {
  const now = Date.now();
  return { proposalId: "proposal-1", agentId: "agent-1", releaseDigest: "sha256:test", inputProvenance: "system",
    actionType: "deliver_work", purpose: "Run a governed shadow delivery", expectedValueCents: 1_000, maximumCostCents: 300,
    currency: "AUD", destination: "sandbox-customer", destinationClass: "test-customer", dataClassification: "internal",
    requestedScopes: ["simulation:execute"], idempotencyKey: "test-1", notBefore: new Date(now - 1_000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(), evidenceRequired: ["acceptance-record"] };
}
describe("economic evidence and graduation controls", () => {
  it("records a verifiable simulated value and revenue flow", () => {
    const { evidence, runner } = setup(); const decision = runner.propose(proposal()); expect(decision.action).toBe("grant");
    runner.execute(decision.grant!.grantId, 200, 1_000, ["acceptance-record:test"]);
    expect(runner.recordVerifiedRevenue({ provider: "test-provider", environment: "live", eventId: "evt-1", reference: "proposal-1", amountCents: 1_000, currency: "AUD", signatureVerified: true, occurredAt: new Date().toISOString() }, new GovernedRevenueVerifier(["test-provider"], ["AUD"], true), 2_500).countTowardGraduation).toBe(true);
    expect(evidence.verify()).toEqual({ valid: true, count: 6 });
    const metrics = calculateEconomicMetrics(evidence.readAll()); expect(metrics.valueCostRatio).toBe(5); expect(metrics.collectedRevenueCents).toBe(1_000);
    expect(evaluateGraduation(metrics, { minimumSimulatedActions: 1, minimumAcceptedValueCents: 1_000, minimumValueCostRatio: 2,
      maximumIncidents: 0, requireCollectedRevenue: true })).toEqual({ passed: true, failures: [] });
  });
  it("detects tampering in the append-only chain", () => {
    const { filePath, evidence } = setup(); evidence.append("incident", "trace-1", { reason: "test" });
    const event = JSON.parse(readFileSync(filePath, "utf8").trim()) as Record<string, unknown>; event.payload = { reason: "altered" };
    appendFileSync(filePath, `${JSON.stringify(event)}\n`); expect(evidence.verify().valid).toBe(false);
  });
});
