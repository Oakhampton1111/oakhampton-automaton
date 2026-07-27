import type { ChannelOpportunity } from "./channel-adapters.js";
import type { ProductionQualification } from "../quality/production.js";

export type DeliveryRoute = "autonomous" | "openclaw" | "human" | "decline";

export interface BidStrategy {
  route: DeliveryRoute;
  fitScoreBps: number;
  bidPriceCents: number;
  clientSignals: string[];
  matchedCapabilities: string[];
  risks: string[];
  escalationReason?: string;
}

const CAPABILITIES: Array<{ name: string; terms: string[] }> = [
  { name: "AI engineering", terms: ["ai", "llm", "openai", "agent", "rag", "prompt"] },
  { name: "workflow automation", terms: ["automation", "workflow", "n8n", "zapier", "make.com", "cron"] },
  { name: "OpenClaw support", terms: ["openclaw", "docker", "vps", "telegram", "connector"] },
  { name: "software and API delivery", terms: ["api", "typescript", "javascript", "python", "backend", "integration"] },
  { name: "data and reporting", terms: ["csv", "excel", "spreadsheet", "sql", "report", "data"] },
  { name: "web delivery", terms: ["website", "landing page", "frontend", "react", "wordpress"] },
  { name: "research and location intelligence", terms: ["research", "location", "site selection", "market", "competitor"] },
  { name: "market-data tooling", terms: ["trading", "backtest", "market data", "monitoring", "signal"] },
];

const ESCALATION_TERMS = ["enterprise", "migration", "production access", "on-site", "onsite", "security clearance", "regulated", "licensed", "team of", "months"];
const PROHIBITED_TERMS = ["guaranteed returns", "trade my funds", "legal opinion", "medical diagnosis", "bypass security"];

const clean = (value: unknown, max = 180) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function extractClientSignals(opportunity: ChannelOpportunity): string[] {
  const supplied = Array.isArray(opportunity.metadata.requirements) ? opportunity.metadata.requirements : [];
  const acceptance = Array.isArray(opportunity.metadata.acceptanceCriteria) ? opportunity.metadata.acceptanceCriteria : [];
  const sentences = clean(opportunity.body, 5000).split(/(?<=[.!?])\s+/).filter((s) => s.length >= 20);
  return [...supplied, ...acceptance, ...sentences]
    .map((item) => clean(item, 180))
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index)
    .slice(0, 5);
}

export function buildBidStrategy(opportunity: ChannelOpportunity, qualification: ProductionQualification): BidStrategy {
  const text = `${opportunity.title} ${opportunity.body} ${JSON.stringify(opportunity.metadata.tags ?? [])}`.toLowerCase();
  const matchedCapabilities = CAPABILITIES.filter((capability) => capability.terms.some((term) => text.includes(term))).map((capability) => capability.name);
  const clientSignals = extractClientSignals(opportunity);
  const risks: string[] = [];
  if (PROHIBITED_TERMS.some((term) => text.includes(term))) risks.push("PROHIBITED_OR_REGULATED_SCOPE");
  if (!qualification.acceptanceTestable) risks.push("ACCEPTANCE_REQUIRES_CLARIFICATION");
  if (opportunity.budgetCents <= 0) risks.push("BUDGET_UNKNOWN");
  for(const reason of ["EMPLOYMENT_ROLE_NOT_PROJECT_WORK","GEOGRAPHIC_OR_WORK_AUTH_RESTRICTION","ROLE_OUTSIDE_PRODUCTION_CAPABILITY"]) if(qualification.reasons.includes(reason)) risks.push(reason);

  const humanRequired = ["on-site", "onsite", "security clearance"].some((term) => text.includes(term));
  const escalationHit = ESCALATION_TERMS.find((term) => text.includes(term));
  const largeProject = opportunity.budgetCents >= 500_000 || text.length > 8_000;
  let route: DeliveryRoute;
  let escalationReason: string | undefined;
  if (risks.some(r=>["PROHIBITED_OR_REGULATED_SCOPE","EMPLOYMENT_ROLE_NOT_PROJECT_WORK","GEOGRAPHIC_OR_WORK_AUTH_RESTRICTION","ROLE_OUTSIDE_PRODUCTION_CAPABILITY"].includes(r))) route = "decline";
  else if (!qualification.eligible && matchedCapabilities.length === 0) route = "decline";
  else if (largeProject || escalationHit) {
    route = humanRequired ? "human" : "openclaw";
    escalationReason = largeProject ? "LARGE_OR_COMPLEX_PROJECT" : `ESCALATION_SIGNAL:${escalationHit}`;
  } else route = "autonomous";

  const fitScoreBps = Math.min(10_000, matchedCapabilities.length * 1_250 + clientSignals.length * 600 + (qualification.eligible ? 2_500 : 0));
  const commercialRateCents=route==="autonomous"?9_500:route==="openclaw"?15_000:20_000;
  const productionCents = Number.isFinite(qualification.estimatedProductionCents) ? qualification.estimatedProductionCents : 0;
  const estimatedHours = Number.isFinite(qualification.estimatedHours) ? qualification.estimatedHours : 0;
  const feeAdjustedFloor = Math.max(productionCents * 2, estimatedHours * commercialRateCents, 15_000);
  const winDiscount = route === "autonomous" && fitScoreBps >= 7_000 ? 0.82 : route === "autonomous" ? 0.92 : 1;
  const bidPriceCents = opportunity.budgetCents > 0 ? Math.max(feeAdjustedFloor, Math.round(opportunity.budgetCents * winDiscount)) : feeAdjustedFloor;
  return { route, fitScoreBps, bidPriceCents, clientSignals, matchedCapabilities, risks, escalationReason };
}

export function renderSpecificOpening(opportunity: ChannelOpportunity, strategy: BidStrategy): string {
  const signal = strategy.clientSignals[0] ?? clean(opportunity.title, 180);
  const capability = strategy.matchedCapabilities.slice(0, 2).join(" and ") || "delivery workflow";
  return `You specifically need ${signal.replace(/[.]+$/, "")}. That maps directly to our ${capability} capability.`;
}
