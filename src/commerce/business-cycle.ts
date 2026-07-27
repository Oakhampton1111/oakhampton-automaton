import crypto from "node:crypto";

export type CommerceCyclePhase = "discover" | "validate" | "execute" | "measure" | "decide";
export type CircuitStatus = "closed" | "open" | "half_open";

export interface EconomicInputs {
  expectedRevenueCents: number;
  conversionProbability: number;
  acquisitionCostCents: number;
  fulfilmentCostCents: number;
  platformFeeCents: number;
  inferenceCostCents: number;
  infrastructureCostCents: number;
  uncertaintyBps?: number;
}

export interface EconomicDecision extends EconomicInputs {
  expectedRevenueWeightedCents: number;
  totalCostCents: number;
  expectedContributionCents: number;
  predictedMarginBps: number;
  downsideContributionCents: number;
  execute: boolean;
  disposition: "auto_execute" | "specialist_review" | "reject";
  reasons: string[];
}

export interface SquadRole { role: "discovery"|"commercial"|"delivery"|"qa"|"outreach"; required: boolean; budgetCents: number; }
export interface SquadPlan { squadId: string; opportunityId: string; roles: SquadRole[]; acceptanceTests: string[]; expiresAt: string; maximumWorkers: number; }
export interface PerformanceObservation { channel: string; offerId: string; language: string; predictedContributionCents: number; realisedContributionCents: number; converted: boolean; refundCents: number; deliveryMinutes: number; capturedAt: string; }
export interface CircuitState { key: string; status: CircuitStatus; failures: number; openedAt?: string; nextProbeAt?: string; lastError?: string; }
export interface CommerceConsensus {
  version: 1;
  revision: number;
  mission: string;
  objective: string;
  cycleId: string;
  phase: CommerceCyclePhase;
  rankedOpportunityIds: string[];
  selectedOpportunityId?: string;
  evidence: string[];
  assumptions: string[];
  budgetCents: number;
  predictedContributionCents: number;
  realisedContributionCents: number;
  blockers: string[];
  decisions: string[];
  nextAction: string;
  researchOnlyCycles: number;
  updatedAt: string;
  checksum: string;
}

const int = (value:number, name:string) => { if(!Number.isSafeInteger(value)||value<0) throw new Error(`INVALID_${name}`); return value; };

export function evaluateEconomics(input:EconomicInputs, automaticMarginBps=3000, reviewMarginBps=1000):EconomicDecision {
  int(input.expectedRevenueCents,"EXPECTED_REVENUE");
  if(!Number.isFinite(input.conversionProbability)||input.conversionProbability<0||input.conversionProbability>1) throw new Error("INVALID_CONVERSION_PROBABILITY");
  const costs=[input.acquisitionCostCents,input.fulfilmentCostCents,input.platformFeeCents,input.inferenceCostCents,input.infrastructureCostCents]; costs.forEach((v,i)=>int(v,`COST_${i}`));
  const uncertaintyBps=Math.min(10000,Math.max(0,Math.round(input.uncertaintyBps??0)));
  const variableCostCents=input.fulfilmentCostCents+input.platformFeeCents+input.infrastructureCostCents;
  const fixedPursuitCostCents=input.acquisitionCostCents+input.inferenceCostCents;
  const expectedRevenueWeightedCents=Math.round(input.expectedRevenueCents*input.conversionProbability);
  const totalCostCents=costs.reduce((a,b)=>a+b,0);
  const unitContributionCents=input.expectedRevenueCents-totalCostCents;
  const expectedContributionCents=Math.round(input.conversionProbability*(input.expectedRevenueCents-variableCostCents))-fixedPursuitCostCents;
  const predictedMarginBps=input.expectedRevenueCents>0?Math.round(unitContributionCents*10000/input.expectedRevenueCents):-10000;
  const downsideProbability=input.conversionProbability*(1-uncertaintyBps/10000);
  const downsideContributionCents=Math.round(downsideProbability*(input.expectedRevenueCents-variableCostCents))-fixedPursuitCostCents;
  const reasons:string[]=[];
  let disposition:EconomicDecision["disposition"];
  if(unitContributionCents<=0||predictedMarginBps<reviewMarginBps){disposition="reject";reasons.push(unitContributionCents<=0?"NEGATIVE_UNIT_ECONOMICS":"MARGIN_BELOW_REVIEW_FLOOR");}
  else if(expectedContributionCents>0&&predictedMarginBps>=automaticMarginBps){disposition="auto_execute";}
  else{disposition="specialist_review";if(expectedContributionCents<=0)reasons.push("LOW_PROBABILITY_REQUIRES_REVIEW");if(predictedMarginBps<automaticMarginBps)reasons.push("MARGIN_REQUIRES_REVIEW");}
  return {...input,uncertaintyBps,expectedRevenueWeightedCents,totalCostCents,expectedContributionCents,predictedMarginBps,downsideContributionCents,execute:disposition==="auto_execute",disposition,reasons};
}

export function buildSquad(input:{opportunityId:string;complexity:"simple"|"standard"|"complex";budgetCents:number;acceptanceTests:string[]}):SquadPlan {
  int(input.budgetCents,"SQUAD_BUDGET"); if(!input.opportunityId||!input.acceptanceTests.length) throw new Error("INVALID_SQUAD_INPUT");
  const names:SquadRole["role"][]=input.complexity==="simple"?["commercial","delivery","qa"]:input.complexity==="standard"?["discovery","commercial","delivery","qa"]:["discovery","commercial","delivery","qa","outreach"];
  const each=Math.floor(input.budgetCents/names.length), remainder=input.budgetCents-each*names.length;
  return {squadId:crypto.randomUUID(),opportunityId:input.opportunityId,roles:names.map((role,i)=>({role,required:role!=="outreach",budgetCents:each+(i===0?remainder:0)})),acceptanceTests:[...input.acceptanceTests],expiresAt:new Date(Date.now()+24*3600000).toISOString(),maximumWorkers:names.length};
}

export function validateConsensus(value:Omit<CommerceConsensus,"checksum">|CommerceConsensus):Omit<CommerceConsensus,"checksum"> {
  if(value.version!==1||!Number.isSafeInteger(value.revision)||value.revision<0) throw new Error("INVALID_CONSENSUS_VERSION");
  for(const key of ["mission","objective","cycleId","nextAction"] as const) if(!value[key]?.trim()) throw new Error(`INVALID_CONSENSUS_${key.toUpperCase()}`);
  if(!["discover","validate","execute","measure","decide"].includes(value.phase)) throw new Error("INVALID_CONSENSUS_PHASE");
  int(value.budgetCents,"CONSENSUS_BUDGET");
  if(value.researchOnlyCycles>2&&["discover","validate"].includes(value.phase)) throw new Error("FORCED_CONVERGENCE_REQUIRED");
  const {checksum:_ignored,...clean}=value as CommerceConsensus; return clean;
}

export function sealConsensus(value:Omit<CommerceConsensus,"checksum">|CommerceConsensus):CommerceConsensus {
  const clean=validateConsensus(value); const checksum=crypto.createHash("sha256").update(JSON.stringify(clean)).digest("hex"); return {...clean,checksum};
}

export function verifyConsensus(value:CommerceConsensus):boolean { try{return sealConsensus(value).checksum===value.checksum;}catch{return false;} }

export function renderConsensus(value:CommerceConsensus):string {
  if(!verifyConsensus(value)) throw new Error("CONSENSUS_CHECKSUM_INVALID");
  const list=(xs:string[])=>xs.length?xs.map(x=>`- ${x}`).join("\n"):"- None";
  return `# Commerce Consensus\n\nRevision: ${value.revision}\nUpdated: ${value.updatedAt}\nCycle: ${value.cycleId}\nPhase: ${value.phase}\n\n## Mission\n${value.mission}\n\n## Objective\n${value.objective}\n\n## Evidence\n${list(value.evidence)}\n\n## Decisions\n${list(value.decisions)}\n\n## Blockers\n${list(value.blockers)}\n\n## Economics\n- Budget: ${value.budgetCents} cents\n- Predicted contribution: ${value.predictedContributionCents} cents\n- Realised contribution: ${value.realisedContributionCents} cents\n\n## Next Action\n${value.nextAction}\n\nChecksum: ${value.checksum}\n`;
}

export function nextPhase(current:CommerceCyclePhase,outcome:"progress"|"reject"|"blocked"):CommerceCyclePhase {
  if(outcome==="reject"||outcome==="blocked") return "decide";
  return ({discover:"validate",validate:"execute",execute:"measure",measure:"decide",decide:"discover"} as const)[current];
}

export function recordCircuitFailure(current:CircuitState,key:string,error:string,threshold=3,cooldownMs=300000,now=new Date()):CircuitState {
  const failures=(current?.failures??0)+1; if(failures<threshold)return{key,status:"closed",failures,lastError:error};
  return{key,status:"open",failures,lastError:error,openedAt:now.toISOString(),nextProbeAt:new Date(now.getTime()+cooldownMs).toISOString()};
}
export function circuitAllows(state:CircuitState|undefined,now=new Date()):boolean { return !state||state.status==="closed"||(state.status==="open"&&Boolean(state.nextProbeAt)&&Date.parse(state.nextProbeAt!)<=now.getTime())||state.status==="half_open"; }
