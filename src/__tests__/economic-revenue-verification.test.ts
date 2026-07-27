import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CapabilityBroker, EconomicEvidenceStore, EconomicExperimentRunner, EconomicLedger, GovernedRevenueVerifier, calculateEconomicMetrics } from "../economic/index.js";
import type { EconomicPolicy, RevenueReceipt } from "../economic/index.js";

function setup() {
  const ledger = new EconomicLedger();
  const policy: EconomicPolicy = { revision: "test", maximumActionCostCents: 0, allowedActionTypes: [],
    allowedDestinationClasses: [], maximumDataClassification: "public", requireCreatorFor: [] };
  const evidence = new EconomicEvidenceStore(join(mkdtempSync(join(tmpdir(), "revenue-verification-")), "evidence.jsonl"));
  return { ledger, evidence, runner: new EconomicExperimentRunner(new CapabilityBroker(policy, ledger), ledger, evidence) };
}
function receipt(environment: "sandbox" | "live", signatureVerified = true): RevenueReceipt {
  return { provider: "stripe", environment, eventId: "evt_unique", reference: "order-1", amountCents: 1_000,
    currency: "AUD", signatureVerified, occurredAt: new Date().toISOString() };
}
describe("governed revenue verification", () => {
  it("accepts sandbox receipts but never counts them toward graduation", () => {
    const { evidence, runner } = setup();
    const result = runner.recordVerifiedRevenue(receipt("sandbox"), new GovernedRevenueVerifier(["stripe"], ["AUD"]));
    expect(result).toMatchObject({ accepted: true, countTowardGraduation: false });
    expect(calculateEconomicMetrics(evidence.readAll()).collectedRevenueCents).toBe(0);
  });
  it("rejects unsigned and live receipts while live revenue is disabled", () => {
    const { runner } = setup(); const verifier = new GovernedRevenueVerifier(["stripe"], ["AUD"]);
    expect(runner.recordVerifiedRevenue(receipt("sandbox", false), verifier).accepted).toBe(false);
    expect(runner.recordVerifiedRevenue(receipt("live"), verifier).reasonCode).toBe("LIVE_REVENUE_DISABLED");
  });
  it("counts independently verified live revenue only when explicitly enabled", () => {
    const { evidence, runner } = setup();
    const result = runner.recordVerifiedRevenue(receipt("live"), new GovernedRevenueVerifier(["stripe"], ["AUD"], true));
    expect(result.countTowardGraduation).toBe(true);
    expect(calculateEconomicMetrics(evidence.readAll()).collectedRevenueCents).toBe(1_000);
    expect(runner.recordVerifiedRevenue(receipt("live"), new GovernedRevenueVerifier(["stripe"], ["AUD"], true)).reasonCode).toBe("DUPLICATE_REVENUE_EVENT");
  });
});
