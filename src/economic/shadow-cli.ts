import { homedir } from "os";
import { join } from "path";
import { ulid } from "ulid";
import { CapabilityBroker } from "./broker.js";
import { EconomicEvidenceStore } from "./evidence-store.js";
import { calculateEconomicMetrics, evaluateGraduation } from "./evaluation.js";
import { EconomicExperimentRunner } from "./experiment-runner.js";
import { EconomicLedger } from "./ledger.js";
import type { ActionProposal, EconomicPolicy } from "./types.js";

const SHADOW_GATES = {
  minimumSimulatedActions: 10,
  minimumAcceptedValueCents: 10_000,
  minimumValueCostRatio: 2,
  maximumIncidents: 0,
  requireCollectedRevenue: true,
};

export function getEconomicShadowEvidencePath(): string {
  return process.env.ECONOMIC_SHADOW_EVIDENCE_PATH
    || join(process.env.HOME || homedir(), ".automaton", "economic-shadow", "evidence.jsonl");
}

export function getEconomicShadowStatus(filePath = getEconomicShadowEvidencePath()) {
  const evidence = new EconomicEvidenceStore(filePath);
  const integrity = evidence.verify();
  const metrics = calculateEconomicMetrics(evidence.readAll());
  return {
    mode: "shadow",
    externalEffectsEnabled: false,
    evidencePath: filePath,
    integrity,
    metrics,
    graduation: evaluateGraduation(metrics, SHADOW_GATES),
  };
}

export function runEconomicShadowDemo(filePath = getEconomicShadowEvidencePath()) {
  const ledger = new EconomicLedger(1_000);
  const policy: EconomicPolicy = {
    revision: "shadow-cli-v1",
    maximumActionCostCents: 100,
    allowedActionTypes: ["deliver_work"],
    allowedDestinationClasses: ["synthetic-test"],
    maximumDataClassification: "internal",
    requireCreatorFor: [],
  };
  const evidence = new EconomicEvidenceStore(filePath);
  const runner = new EconomicExperimentRunner(new CapabilityBroker(policy, ledger), ledger, evidence);
  const now = Date.now();
  const proposalId = ulid();
  const proposal: ActionProposal = {
    proposalId,
    agentId: "shadow-demo",
    releaseDigest: "synthetic-demo",
    inputProvenance: "system",
    actionType: "deliver_work",
    purpose: "Exercise the governed economic loop without external effects",
    expectedValueCents: 300,
    maximumCostCents: 100,
    currency: "AUD",
    destination: "local-simulation",
    destinationClass: "synthetic-test",
    dataClassification: "internal",
    requestedScopes: ["simulation:execute"],
    idempotencyKey: `shadow-demo-${proposalId}`,
    notBefore: new Date(now - 1_000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
    evidenceRequired: ["synthetic-acceptance"],
  };
  const decision = runner.propose(proposal);
  if (decision.action !== "grant" || !decision.grant) throw new Error(`shadow demo was not granted: ${decision.reasonCode}`);
  runner.execute(decision.grant.grantId, 50, 300, ["shadow:synthetic-acceptance"]);
  return getEconomicShadowStatus(filePath);
}
