import type { OpportunityCandidate, ValidatedOpportunityAssessment } from "../integrations/types.js";
export interface BacktestPolicy { minimumConfidenceBps: number; minimumExpectedProfitCents: number; minimumReturnOnCost: number; maximumRevenueCents: number; maximumCostCents: number; requireEvidence: boolean; rejectInjectionSignals: boolean; }
export interface BacktestCase {
  id: string; provenance: string; capturedAt: string; commercialOverlay: "none" | "hypothetical";
  candidate: OpportunityCandidate; assessment: ValidatedOpportunityAssessment; expectedDecision: "accept" | "reject";
}
export interface BacktestDecision { id: string; decision: "accept" | "reject"; reasons: string[]; expectedProfitCents: number; }
export interface BacktestReport {
  policy: BacktestPolicy; cases: number; trueAccepts: number; trueRejects: number; falseAccepts: number; falseRejects: number;
  precision: number; recall: number; estimatedExpectedProfitCents: number; safetyScore: number; decisions: BacktestDecision[];
}
