export type EconomicActionType =
  | "deliver_work"
  | "send_communication"
  | "procure_compute"
  | "make_payment"
  | "spawn_child";

export type DataClassification = "public" | "internal" | "confidential" | "restricted";

export interface ActionProposal {
  proposalId: string;
  agentId: string;
  releaseDigest: string;
  inputProvenance: "creator" | "system" | "agent" | "external";
  actionType: EconomicActionType;
  purpose: string;
  expectedValueCents: number;
  maximumCostCents: number;
  currency: "USD" | "AUD" | "USDC";
  destination: string;
  destinationClass: string;
  dataClassification: DataClassification;
  requestedScopes: string[];
  idempotencyKey: string;
  notBefore: string;
  expiresAt: string;
  evidenceRequired: string[];
}

export interface CapabilityGrant {
  grantId: string;
  proposalId: string;
  proposalDigest: string;
  actionType: EconomicActionType;
  destination: string;
  maximumCostCents: number;
  currency: ActionProposal["currency"];
  permittedDataClassification: DataClassification;
  scopes: string[];
  gateway: "simulation" | "communication" | "compute" | "payment" | "provisioner";
  policyRevision: string;
  nonce: string;
  expiresAt: string;
  mode: "shadow";
}

export interface BrokerDecision {
  action: "grant" | "deny" | "approval_required";
  reasonCode: string;
  message: string;
  grant?: CapabilityGrant;
}

export interface EconomicPolicy {
  revision: string;
  maximumActionCostCents: number;
  allowedActionTypes: EconomicActionType[];
  allowedDestinationClasses: string[];
  maximumDataClassification: DataClassification;
  requireCreatorFor: EconomicActionType[];
}

export interface ActionReceipt {
  receiptId: string;
  grantId: string;
  proposalId: string;
  status: "simulated" | "accepted" | "rejected";
  actualCostCents: number;
  acceptedValueCents: number;
  evidence: string[];
  createdAt: string;
}

