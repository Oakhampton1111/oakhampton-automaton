import { createHash, randomUUID } from "crypto";
import { ulid } from "ulid";
import type { ActionProposal, BrokerDecision, CapabilityGrant, DataClassification, EconomicPolicy } from "./types.js";
import { EconomicLedger } from "./ledger.js";

const CLASSIFICATION_ORDER: DataClassification[] = ["public", "internal", "confidential", "restricted"];

export class CapabilityBroker {
  private readonly grants = new Map<string, { grant: CapabilityGrant; consumed: boolean }>();
  private readonly idempotency = new Map<string, BrokerDecision>();

  constructor(private readonly policy: EconomicPolicy, private readonly ledger: EconomicLedger) {}

  evaluate(proposal: ActionProposal, now = new Date()): BrokerDecision {
    const prior = this.idempotency.get(proposal.idempotencyKey);
    if (prior) return prior;
    const validation = this.validate(proposal, now);
    if (validation) return this.remember(proposal, validation);
    if (!this.policy.allowedActionTypes.includes(proposal.actionType)) {
      return this.remember(proposal, this.deny("ACTION_TYPE_DENIED", "Action type is not enabled in shadow policy"));
    }
    if (!this.policy.allowedDestinationClasses.includes(proposal.destinationClass)) {
      return this.remember(proposal, this.deny("DESTINATION_CLASS_DENIED", "Destination class is not allowlisted"));
    }
    if (CLASSIFICATION_ORDER.indexOf(proposal.dataClassification) > CLASSIFICATION_ORDER.indexOf(this.policy.maximumDataClassification)) {
      return this.remember(proposal, this.deny("DATA_CLASSIFICATION_DENIED", "Data classification exceeds the policy ceiling"));
    }
    if (proposal.maximumCostCents > this.policy.maximumActionCostCents) {
      return this.remember(proposal, this.deny("ACTION_COST_EXCEEDED", "Requested maximum cost exceeds policy"));
    }
    if (this.policy.requireCreatorFor.includes(proposal.actionType) && proposal.inputProvenance !== "creator") {
      return this.remember(proposal, { action: "approval_required", reasonCode: "CREATOR_APPROVAL_REQUIRED", message: "Creator authority is required" });
    }
    try {
      this.ledger.reserve(proposal.proposalId, proposal.maximumCostCents);
    } catch (error) {
      return this.remember(proposal, this.deny("BUDGET_RESERVATION_FAILED", error instanceof Error ? error.message : "Budget reservation failed"));
    }
    const grant = this.issueGrant(proposal);
    this.grants.set(grant.grantId, { grant, consumed: false });
    return this.remember(proposal, { action: "grant", reasonCode: "SHADOW_GRANT_ISSUED", message: "Single-use shadow capability issued", grant });
  }

  consume(grantId: string, now = new Date()): CapabilityGrant {
    const record = this.grants.get(grantId);
    if (!record) throw new Error("unknown capability grant");
    if (record.consumed) throw new Error("capability grant already consumed");
    if (new Date(record.grant.expiresAt).getTime() <= now.getTime()) throw new Error("capability grant expired");
    record.consumed = true;
    return { ...record.grant, scopes: [...record.grant.scopes] };
  }

  private validate(proposal: ActionProposal, now: Date): BrokerDecision | null {
    if (!proposal.proposalId || !proposal.agentId || !proposal.releaseDigest || !proposal.idempotencyKey) return this.deny("INVALID_PROPOSAL", "Required identifiers are missing");
    if (!proposal.purpose.trim() || !proposal.destination.trim()) return this.deny("INVALID_PROPOSAL", "Purpose and destination are required");
    if (!Number.isInteger(proposal.maximumCostCents) || proposal.maximumCostCents < 0) return this.deny("INVALID_COST", "Maximum cost must be non-negative integer cents");
    const notBefore = new Date(proposal.notBefore).getTime();
    const expiresAt = new Date(proposal.expiresAt).getTime();
    if (!Number.isFinite(notBefore) || !Number.isFinite(expiresAt) || expiresAt <= notBefore) return this.deny("INVALID_TIME_WINDOW", "Proposal time window is invalid");
    if (now.getTime() < notBefore || now.getTime() >= expiresAt) return this.deny("OUTSIDE_TIME_WINDOW", "Proposal is not currently valid");
    return null;
  }

  private issueGrant(proposal: ActionProposal): CapabilityGrant {
    const gateway = proposal.actionType === "send_communication" ? "communication"
      : proposal.actionType === "procure_compute" ? "compute"
      : proposal.actionType === "make_payment" ? "payment"
      : proposal.actionType === "spawn_child" ? "provisioner" : "simulation";
    return {
      grantId: ulid(), proposalId: proposal.proposalId, proposalDigest: createHash("sha256").update(JSON.stringify(proposal)).digest("hex"),
      actionType: proposal.actionType, destination: proposal.destination, maximumCostCents: proposal.maximumCostCents,
      currency: proposal.currency, permittedDataClassification: proposal.dataClassification, scopes: [...proposal.requestedScopes],
      gateway, policyRevision: this.policy.revision, nonce: randomUUID(), expiresAt: proposal.expiresAt, mode: "shadow",
    };
  }

  private remember(proposal: ActionProposal, decision: BrokerDecision): BrokerDecision {
    this.idempotency.set(proposal.idempotencyKey, decision);
    return decision;
  }

  private deny(reasonCode: string, message: string): BrokerDecision {
    return { action: "deny", reasonCode, message };
  }
}

