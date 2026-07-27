import type { ActionProposal } from "./types.js";

export interface EconomicOpportunity {
  opportunityId: string;
  proposal: ActionProposal;
  estimatedRevenueCents: number;
  successProbabilityBps: number;
  syntheticActualCostCents: number;
  syntheticAcceptedValueCents: number;
  evidenceReferences: string[];
}
export interface OpportunityPolicy {
  minimumExpectedProfitCents: number;
  minimumReturnOnCost: number;
  maximumCycleCostCents: number;
  maximumActionsPerCycle: number;
}
export interface OpportunityAssessment {
  opportunity: EconomicOpportunity;
  expectedRevenueCents: number;
  expectedProfitCents: number;
  expectedReturnOnCost: number;
  eligible: boolean;
  reasons: string[];
}

export function assessOpportunity(opportunity: EconomicOpportunity, policy: OpportunityPolicy): OpportunityAssessment {
  if (!Number.isInteger(opportunity.estimatedRevenueCents) || opportunity.estimatedRevenueCents < 0) throw new Error("estimated revenue must be non-negative integer cents");
  if (!Number.isInteger(opportunity.successProbabilityBps) || opportunity.successProbabilityBps < 0 || opportunity.successProbabilityBps > 10_000) throw new Error("success probability must be between 0 and 10000 basis points");
  const cost = opportunity.proposal.maximumCostCents;
  const expectedRevenueCents = Math.floor(opportunity.estimatedRevenueCents * opportunity.successProbabilityBps / 10_000);
  const expectedProfitCents = expectedRevenueCents - cost;
  const expectedReturnOnCost = cost === 0 ? (expectedRevenueCents > 0 ? Number.POSITIVE_INFINITY : 0) : expectedRevenueCents / cost;
  const reasons: string[] = [];
  if (expectedProfitCents < policy.minimumExpectedProfitCents) reasons.push("EXPECTED_PROFIT_BELOW_GATE");
  if (expectedReturnOnCost < policy.minimumReturnOnCost) reasons.push("RETURN_ON_COST_BELOW_GATE");
  if (opportunity.syntheticActualCostCents > cost) reasons.push("SYNTHETIC_COST_EXCEEDS_PROPOSAL");
  if (opportunity.evidenceReferences.length === 0) reasons.push("EVIDENCE_REQUIRED");
  return { opportunity, expectedRevenueCents, expectedProfitCents, expectedReturnOnCost, eligible: reasons.length === 0, reasons };
}

export function selectOpportunityPortfolio(opportunities: EconomicOpportunity[], policy: OpportunityPolicy): OpportunityAssessment[] {
  const ranked = opportunities.map((item) => assessOpportunity(item, policy))
    .filter((item) => item.eligible)
    .sort((a, b) => b.expectedProfitCents - a.expectedProfitCents || a.opportunity.opportunityId.localeCompare(b.opportunity.opportunityId));
  const selected: OpportunityAssessment[] = [];
  let committedCost = 0;
  for (const assessment of ranked) {
    if (selected.length >= policy.maximumActionsPerCycle) break;
    const cost = assessment.opportunity.proposal.maximumCostCents;
    if (committedCost + cost > policy.maximumCycleCostCents) continue;
    selected.push(assessment);
    committedCost += cost;
  }
  return selected;
}
