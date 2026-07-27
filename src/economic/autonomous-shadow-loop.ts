import { EconomicEvidenceStore } from "./evidence-store.js";
import { EconomicExperimentRunner } from "./experiment-runner.js";
import { selectOpportunityPortfolio } from "./opportunity-selector.js";
import type { EconomicOpportunity, OpportunityPolicy } from "./opportunity-selector.js";

export interface ShadowCycleResult {
  mode: "shadow";
  externalEffectsEnabled: false;
  assessed: number;
  selected: number;
  executed: number;
  rejected: Array<{ opportunityId: string; reasons: string[] }>;
}

export class AutonomousEconomicShadowLoop {
  constructor(private readonly runner: EconomicExperimentRunner, private readonly evidence: EconomicEvidenceStore) {}

  run(opportunities: EconomicOpportunity[], policy: OpportunityPolicy): ShadowCycleResult {
    const selected = selectOpportunityPortfolio(opportunities, policy);
    const selectedIds = new Set(selected.map((item) => item.opportunity.opportunityId));
    const rejected = opportunities.filter((item) => !selectedIds.has(item.opportunityId)).map((item) => {
      const assessment = selectOpportunityPortfolio([item], { ...policy, maximumActionsPerCycle: 1 });
      return { opportunityId: item.opportunityId, reasons: assessment[0]?.eligible ? ["PORTFOLIO_LIMIT"] : ["UNIT_ECONOMICS_OR_POLICY_GATE"] };
    });
    let executed = 0;
    for (const { opportunity } of selected) {
      const decision = this.runner.propose(opportunity.proposal);
      if (decision.action !== "grant" || !decision.grant) {
        rejected.push({ opportunityId: opportunity.opportunityId, reasons: [decision.reasonCode] });
        continue;
      }
      this.runner.execute(decision.grant.grantId, opportunity.syntheticActualCostCents, opportunity.syntheticAcceptedValueCents, opportunity.evidenceReferences);
      executed += 1;
    }
    this.evidence.append("cycle_completed", "shadow-cycle", { assessed: opportunities.length, selected: selected.length, executed, externalEffectsEnabled: false });
    return { mode: "shadow", externalEffectsEnabled: false, assessed: opportunities.length, selected: selected.length, executed, rejected };
  }
}
