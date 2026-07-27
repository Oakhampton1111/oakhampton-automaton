import type { ActionProposal, ActionReceipt, BrokerDecision } from "./types.js";
import { CapabilityBroker } from "./broker.js";
import { EconomicLedger } from "./ledger.js";
import { SimulationGateway } from "./simulation-gateway.js";
import { EconomicEvidenceStore } from "./evidence-store.js";
import type { RevenueReceipt, RevenueVerification, RevenueVerifier } from "./revenue-verification.js";

export class EconomicExperimentRunner {
  private readonly gateway: SimulationGateway;
  private readonly processedRevenueEvents = new Set<string>();
  constructor(private readonly broker: CapabilityBroker, private readonly ledger: EconomicLedger, private readonly evidence: EconomicEvidenceStore) {
    this.gateway = new SimulationGateway(broker, ledger);
  }
  propose(proposal: ActionProposal): BrokerDecision {
    this.evidence.append("proposal_received", proposal.proposalId, { proposal });
    const decision = this.broker.evaluate(proposal);
    const eventType = decision.action === "grant" ? "capability_granted" : decision.action === "deny" ? "proposal_denied" : "approval_required";
    this.evidence.append(eventType, proposal.proposalId, { decision }); return decision;
  }
  execute(grantId: string, actualCostCents: number, acceptedValueCents: number, evidenceReferences: string[]): ActionReceipt {
    const receipt = this.gateway.execute(grantId, actualCostCents, acceptedValueCents, evidenceReferences);
    this.evidence.append("action_simulated", receipt.proposalId, { receiptId: receipt.receiptId, actualCostCents, evidence: evidenceReferences });
    if (acceptedValueCents > 0) this.evidence.append("value_accepted", receipt.proposalId, { receiptId: receipt.receiptId, acceptedValueCents });
    return receipt;
  }
  recordVerifiedRevenue(receipt: RevenueReceipt, verifier: RevenueVerifier, computeAllocationBps = 3000): RevenueVerification {
    if (this.processedRevenueEvents.has(receipt.eventId) || this.evidence.readAll().some((event) => event.type === "revenue_collected" && event.payload.eventId === receipt.eventId)) return { accepted: false, countTowardGraduation: false, reasonCode: "DUPLICATE_REVENUE_EVENT" };
    const verification = verifier.verify(receipt);
    this.evidence.append("revenue_observed", receipt.reference, {
      provider: receipt.provider, environment: receipt.environment, eventId: receipt.eventId,
      amountCents: receipt.amountCents, currency: receipt.currency, ...verification,
    });
    if (!verification.accepted) return verification;
    this.processedRevenueEvents.add(receipt.eventId);
    const allocationCents = this.ledger.recordCollectedRevenue(receipt.reference, receipt.amountCents, computeAllocationBps);
    this.evidence.append("revenue_collected", receipt.reference, {
      provider: receipt.provider, environment: receipt.environment, eventId: receipt.eventId,
      revenueCents: receipt.amountCents, currency: receipt.currency, allocationCents,
      computeAllocationBps, verified: true, countTowardGraduation: verification.countTowardGraduation,
    });
    return verification;
  }
}
