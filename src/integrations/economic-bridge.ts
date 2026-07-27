import { createHash } from "crypto";
import type { EconomicOpportunity, OpportunityPolicy } from "../economic/opportunity-selector.js";
import { AutonomousEconomicShadowLoop, type ShadowCycleResult } from "../economic/autonomous-shadow-loop.js";
import type { ActionProposal } from "../economic/types.js";
import type { StagingCycleSummary } from "./staging-pipeline.js";
import type { OpportunityCandidate, ValidatedOpportunityAssessment } from "./types.js";

function stableId(candidate: OpportunityCandidate): string {
  return createHash("sha256").update(`${candidate.source}:${candidate.sourceId}:${candidate.immutableReference}`).digest("hex").slice(0, 32);
}
export function mapCandidateToEconomicOpportunity(candidate: OpportunityCandidate, assessment: ValidatedOpportunityAssessment, now = Date.now()): EconomicOpportunity {
  if (!candidate.humanApproved) throw new Error("HUMAN_APPROVAL_REQUIRED");
  if (assessment.recommendation !== "accept") throw new Error("ASSESSMENT_NOT_ACCEPTED");
  const id = stableId(candidate);
  const currency = candidate.currency ?? "AUD";
  const proposal: ActionProposal = {
    proposalId: `integration-${id}`, agentId: "integration-staging", releaseDigest: "integration-staging-v1",
    inputProvenance: "external", actionType: "deliver_work", purpose: `Staging delivery for ${candidate.source} ${candidate.sourceId}`,
    expectedValueCents: assessment.estimatedRevenueCents, maximumCostCents: assessment.maximumCostCents, currency,
    destination: candidate.immutableReference, destinationClass: "approved-opportunity", dataClassification: "internal",
    requestedScopes: ["simulation:execute"], idempotencyKey: `integration-${id}`,
    notBefore: new Date(now - 1_000).toISOString(), expiresAt: new Date(now + 15 * 60_000).toISOString(),
    evidenceRequired: [...new Set([...candidate.evidenceRequired, ...assessment.requiredEvidence])],
  };
  return { opportunityId: id, proposal, estimatedRevenueCents: assessment.estimatedRevenueCents,
    successProbabilityBps: assessment.confidenceBps, syntheticActualCostCents: assessment.maximumCostCents,
    syntheticAcceptedValueCents: assessment.estimatedRevenueCents,
    evidenceReferences: [`source:${candidate.immutableReference}`, ...proposal.evidenceRequired.map((item) => `required:${item}`)] };
}
export function economicOpportunitiesFromStaging(summary: StagingCycleSummary): EconomicOpportunity[] {
  return summary.candidates.flatMap((item) => item.assessment?.recommendation === "accept"
    ? [mapCandidateToEconomicOpportunity(item.candidate, item.assessment)] : []);
}
export class GovernedIntegrationEconomicCycle {
  constructor(private readonly shadowLoop: AutonomousEconomicShadowLoop, private readonly policy: OpportunityPolicy) {}
  run(summary: StagingCycleSummary): ShadowCycleResult {
    if (summary.externalEffectsEnabled !== false || summary.mode !== "staging") throw new Error("STAGING_MODE_REQUIRED");
    return this.shadowLoop.run(economicOpportunitiesFromStaging(summary), this.policy);
  }
}
