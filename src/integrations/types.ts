export type OpportunitySourceKind = "github" | "gmail";
export interface OpportunityCandidate {
  source: OpportunitySourceKind;
  sourceId: string;
  immutableReference: string;
  title: string;
  body: string;
  sender?: string;
  labels: string[];
  humanApproved: boolean;
  estimatedRevenueCents?: number;
  maximumCostCents?: number;
  currency?: "AUD" | "USD";
  deadline?: string;
  acceptanceCriteria: string[];
  evidenceRequired: string[];
  receivedAt: string;
}
export interface OpportunityBatch { candidates: OpportunityCandidate[]; cursor?: string; quarantined: Array<{ sourceId: string; reason: string }>; }
export interface OpportunitySource { fetch(cursor?: string): Promise<OpportunityBatch>; }
export interface ValidatedOpportunityAssessment {
  recommendation: "accept" | "reject" | "review";
  estimatedRevenueCents: number;
  maximumCostCents: number;
  confidenceBps: number;
  risks: string[];
  requiredEvidence: string[];
  reason: string;
}
export interface OpportunityEvaluator { evaluate(candidate: OpportunityCandidate): Promise<ValidatedOpportunityAssessment>; }
export interface IntegrationFlags {
  externalEffectsEnabled: false;
  github: { enabled: boolean; repositories: string[]; candidateLabel: string; approvalLabel: string };
  gmail: { enabled: boolean; allowedSenders: string[]; allowedDomains: string[]; intakeLabel: string; draftsOnly: true };
  stripe: { enabled: boolean; environment: "sandbox"; allowedCurrencies: Array<"AUD" | "USD"> };
  evaluation: { enabled: boolean; maximumRevenueCents: number; maximumCostCents: number };
}
export const DEFAULT_INTEGRATION_FLAGS: IntegrationFlags = {
  externalEffectsEnabled: false,
  github: { enabled: false, repositories: [], candidateLabel: "automaton-candidate", approvalLabel: "human-approved" },
  gmail: { enabled: false, allowedSenders: [], allowedDomains: [], intakeLabel: "automaton-candidate", draftsOnly: true },
  stripe: { enabled: false, environment: "sandbox", allowedCurrencies: ["AUD", "USD"] },
  evaluation: { enabled: false, maximumRevenueCents: 1_000_000, maximumCostCents: 100_000 },
};
