import { describe, expect, it } from "vitest";
import { CapabilityBroker, EconomicLedger, SimulationGateway, type ActionProposal, type EconomicPolicy } from "../economic/index.js";

const policy: EconomicPolicy = {
  revision: "shadow-v1", maximumActionCostCents: 1_000,
  allowedActionTypes: ["deliver_work", "send_communication"],
  allowedDestinationClasses: ["test-customer"], maximumDataClassification: "internal",
  requireCreatorFor: ["send_communication"],
};

function proposal(overrides: Partial<ActionProposal> = {}): ActionProposal {
  const now = Date.now();
  return {
    proposalId: "proposal-1", agentId: "agent-1", releaseDigest: "sha256:release",
    inputProvenance: "agent", actionType: "deliver_work", purpose: "Produce a customer research brief",
    expectedValueCents: 2_000, maximumCostCents: 500, currency: "USD", destination: "customer-1",
    destinationClass: "test-customer", dataClassification: "internal", requestedScopes: ["artifact:write"],
    idempotencyKey: "idem-1", notBefore: new Date(now - 1_000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(), evidenceRequired: ["acceptance"], ...overrides,
  };
}

describe("governed economic loop", () => {
  it("reserves cost, issues a single-use grant and settles accepted value", () => {
    const ledger = new EconomicLedger(2_000);
    const broker = new CapabilityBroker(policy, ledger);
    const decision = broker.evaluate(proposal());
    expect(decision.action).toBe("grant");
    expect(ledger.balance("available_budget")).toBe(1_500);
    const receipt = new SimulationGateway(broker, ledger).execute(decision.grant!.grantId, 300, 2_000, ["acceptance:test"]);
    expect(receipt.status).toBe("simulated");
    expect(ledger.balance("available_budget")).toBe(1_700);
    expect(ledger.balance("delivery_expense")).toBe(300);
    expect(ledger.balance("accepted_value")).toBe(2_000);
    expect(() => broker.consume(decision.grant!.grantId)).toThrow("already consumed");
  });

  it("requires creator authority for communications", () => {
    const broker = new CapabilityBroker(policy, new EconomicLedger(2_000));
    const decision = broker.evaluate(proposal({ actionType: "send_communication" }));
    expect(decision.action).toBe("approval_required");
  });

  it("fails closed on destinations, data and budget", () => {
    expect(new CapabilityBroker(policy, new EconomicLedger(2_000)).evaluate(proposal({ destinationClass: "unknown" })).reasonCode).toBe("DESTINATION_CLASS_DENIED");
    expect(new CapabilityBroker(policy, new EconomicLedger(2_000)).evaluate(proposal({ dataClassification: "restricted" })).reasonCode).toBe("DATA_CLASSIFICATION_DENIED");
    expect(new CapabilityBroker(policy, new EconomicLedger(100)).evaluate(proposal()).reasonCode).toBe("BUDGET_RESERVATION_FAILED");
  });

  it("allocates only a governed share of collected revenue to compute", () => {
    const ledger = new EconomicLedger();
    expect(ledger.recordCollectedRevenue("invoice-1", 10_000, 2500)).toBe(2_500);
    expect(ledger.balance("cash")).toBe(10_000);
    expect(ledger.balance("available_budget")).toBe(2_500);
  });
});

