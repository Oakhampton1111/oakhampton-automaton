import type { EconomicEvidenceEvent } from "./evidence-store.js";
export interface EconomicMetrics {
  proposals: number; grants: number; simulatedActions: number; acceptedValueCents: number;
  collectedRevenueCents: number; actualCostCents: number; incidents: number; grantRate: number; valueCostRatio: number;
}
export interface GraduationGates {
  minimumSimulatedActions: number; minimumAcceptedValueCents: number; minimumValueCostRatio: number;
  maximumIncidents: number; requireCollectedRevenue: boolean;
}
export interface GraduationEvaluation { passed: boolean; failures: Array<{ code: string; message: string }>; }
export function calculateEconomicMetrics(events: EconomicEvidenceEvent[]): EconomicMetrics {
  const sum = (type: EconomicEvidenceEvent["type"], field: string) => events.filter((event) => event.type === type)
    .reduce((total, event) => total + (typeof event.payload[field] === "number" ? event.payload[field] as number : 0), 0);
  const proposals = events.filter((event) => event.type === "proposal_received").length;
  const grants = events.filter((event) => event.type === "capability_granted").length;
  const actualCostCents = sum("action_simulated", "actualCostCents");
  const acceptedValueCents = sum("value_accepted", "acceptedValueCents");
  return { proposals, grants, simulatedActions: events.filter((event) => event.type === "action_simulated").length,
    acceptedValueCents, collectedRevenueCents: events.filter((event) => event.type === "revenue_collected" && event.payload.countTowardGraduation === true).reduce((total, event) => total + (typeof event.payload.revenueCents === "number" ? event.payload.revenueCents : 0), 0), actualCostCents,
    incidents: events.filter((event) => event.type === "incident").length,
    grantRate: proposals === 0 ? 0 : grants / proposals,
    valueCostRatio: actualCostCents === 0 ? (acceptedValueCents > 0 ? Number.POSITIVE_INFINITY : 0) : acceptedValueCents / actualCostCents };
}
export function evaluateGraduation(metrics: EconomicMetrics, gates: GraduationGates): GraduationEvaluation {
  const failures: GraduationEvaluation["failures"] = [];
  if (metrics.simulatedActions < gates.minimumSimulatedActions) failures.push({ code: "insufficient_simulated_actions", message: "Not enough governed simulations have completed" });
  if (metrics.acceptedValueCents < gates.minimumAcceptedValueCents) failures.push({ code: "insufficient_accepted_value", message: "Accepted value is below the graduation gate" });
  if (metrics.valueCostRatio < gates.minimumValueCostRatio) failures.push({ code: "value_cost_ratio_below_gate", message: "Accepted value to cost ratio is below the graduation gate" });
  if (metrics.incidents > gates.maximumIncidents) failures.push({ code: "incident_limit_exceeded", message: "Incident count exceeds the graduation gate" });
  if (gates.requireCollectedRevenue && metrics.collectedRevenueCents <= 0) failures.push({ code: "no_collected_revenue", message: "No independently collected revenue is evidenced" });
  return { passed: failures.length === 0, failures };
}
