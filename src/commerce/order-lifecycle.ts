import path from "node:path";

export type OwnedOfferId =
  | "automation-diagnosis"
  | "workflow-repair"
  | "openclaw-deployment"
  | "document-automation"
  | "api-integration"
  | "custom-agent";

export interface OfferRule {
  id: OwnedOfferId;
  priceAudCents: number;
  maximumHours: number;
  skillId: "software" | "research" | "data" | "website" | "documents";
  minimumGrossMarginBps: number;
  acceptance: string[];
}

export const OWNED_OFFER_RULES: Record<OwnedOfferId, OfferRule> = {
  "automation-diagnosis": { id:"automation-diagnosis", priceAudCents:49500, maximumHours:2, skillId:"research", minimumGrossMarginBps:5000, acceptance:["Current and target process are mapped", "Implementation priorities, constraints and acceptance checks are documented"] },
  "workflow-repair": { id:"workflow-repair", priceAudCents:99500, maximumHours:6, skillId:"software", minimumGrossMarginBps:5000, acceptance:["Reported failure is reproduced or evidenced", "Bounded repair passes agreed regression checks", "Rollback and handover notes are supplied"] },
  "openclaw-deployment": { id:"openclaw-deployment", priceAudCents:99500, maximumHours:6, skillId:"software", minimumGrossMarginBps:5000, acceptance:["Deployment health and custom components are inventoried", "Agreed recovery checks pass", "Backup, rollback and upgrade notes are supplied"] },
  "document-automation": { id:"document-automation", priceAudCents:149500, maximumHours:10, skillId:"documents", minimumGrossMarginBps:5000, acceptance:["Agreed fields are extracted from the representative sample", "Exceptions are separated for human review", "Accuracy and limitation report is supplied"] },
  "api-integration": { id:"api-integration", priceAudCents:149500, maximumHours:10, skillId:"software", minimumGrossMarginBps:5000, acceptance:["Primary data flow works between two agreed systems", "Authentication, mapping and failure handling are documented", "Acceptance evidence and runbook are supplied"] },
  "custom-agent": { id:"custom-agent", priceAudCents:199500, maximumHours:16, skillId:"software", minimumGrossMarginBps:5000, acceptance:["Prototype performs the agreed bounded task", "Authority limits and escalation behaviour are demonstrated", "Normal, edge and failure evaluations are supplied"] },
};

export interface ScopeAssessment {
  accepted: boolean;
  offer: OfferRule;
  estimatedHours: number;
  estimatedCostCents: number;
  predictedGrossMarginBps: number;
  reasons: string[];
  normalizedScope: string;
}

export function assessOwnedScope(input:{offerId:string;brief:string;files:Array<{name?:string;size?:number}>;hourlyCostCents?:number}):ScopeAssessment {
  const offer=OWNED_OFFER_RULES[input.offerId as OwnedOfferId];
  if(!offer)throw new Error("UNKNOWN_OWNED_OFFER");
  const brief=input.brief.trim();
  const reasons:string[]=[];
  if(brief.length<20)reasons.push("SCOPE_INCOMPLETE");
  const systemSignals=(brief.match(/\b(api|crm|xero|myob|hubspot|salesforce|shopify|woocommerce|n8n|make|zapier|database|gmail|outlook|sharepoint|openclaw|docker|vps)\b/gi)??[]).length;
  const complexitySignals=(brief.match(/\b(migration|multi-tenant|production-critical|regulated|real-time|legacy|custom plugin|multiple environments|high volume|24\/7|sla)\b/gi)??[]).length;
  const fileLoad=Math.min(4,Math.ceil(input.files.length/3));
  const estimatedHours=Math.max(1,Math.ceil(offer.maximumHours*.45)+Math.floor(systemSignals/3)+complexitySignals*2+fileLoad);
  const hourlyCostCents=input.hourlyCostCents??5000;
  const estimatedCostCents=estimatedHours*hourlyCostCents;
  const predictedGrossMarginBps=Math.floor(((offer.priceAudCents-estimatedCostCents)/offer.priceAudCents)*10000);
  if(estimatedHours>offer.maximumHours)reasons.push("EFFORT_BUDGET_EXCEEDED");
  if(predictedGrossMarginBps<offer.minimumGrossMarginBps)reasons.push("MARGIN_FLOOR_NOT_MET");
  if(input.files.length>10)reasons.push("FILE_LIMIT_EXCEEDED");
  return {accepted:reasons.length===0,offer,estimatedHours,estimatedCostCents,predictedGrossMarginBps,reasons,normalizedScope:brief.replace(/\s+/g," ")};
}

export function safeContractPath(root:string,contractId:string):string {
  if(!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(contractId))throw new Error("INVALID_CONTRACT_ID");
  const base=path.resolve(root),target=path.resolve(base,contractId);
  if(path.dirname(target)!==base)throw new Error("CONTRACT_PATH_ESCAPE");
  return target;
}

export function shouldDeleteIntake(input:{deleteAfter:string;now?:Date}):boolean {
  const at=Date.parse(input.deleteAfter);
  return Number.isFinite(at)&&at<=(input.now??new Date()).getTime();
}
