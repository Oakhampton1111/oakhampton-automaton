import { PUBLIC_BACKTEST_FIXTURES, loadAndAnalyzePublicCorpus, tuneBacktest } from "../backtest/index.js";
import { loadConfig } from "../config.js";
import { buildIntegrationRuntime, runSourceDryRun } from "./runtime.js";
import { inspectIntegrationReadiness } from "./readiness.js";
import { AutonomousStagingPipeline } from "./staging-pipeline.js";
import { DEFAULT_INTEGRATION_FLAGS } from "./types.js";
function configuredFlags() { return loadConfig()?.integrationFlags ?? DEFAULT_INTEGRATION_FLAGS; }
export function getIntegrationHealth(flags = configuredFlags()) {
  return { mode: "staging", externalEffectsEnabled: false, flags, safeguards: {
    livePayments: false, autonomousSending: false, autonomousSpending: false, publicWebhookListener: false,
  } };
}
export async function runIntegrationStagingDemo() {
  const now = new Date().toISOString();
  const source = { fetch: async () => ({ candidates: [{ source: "github" as const, sourceId: "synthetic#1",
    immutableReference: "synthetic:github:1", title: "Synthetic approved task", body: "No external content",
    labels: ["automaton-candidate", "human-approved"], humanApproved: true, estimatedRevenueCents: 1000,
    maximumCostCents: 200, currency: "AUD" as const, acceptanceCriteria: ["tests pass"], evidenceRequired: ["test report"], receivedAt: now }], quarantined: [] }) };
  const evaluator = { evaluate: async () => ({ recommendation: "accept" as const, estimatedRevenueCents: 1000,
    maximumCostCents: 200, confidenceBps: 9000, risks: ["synthetic-only"], requiredEvidence: ["test report"], reason: "bounded synthetic demo" }) };
  return new AutonomousStagingPipeline([source], evaluator).run();
}

export function getIntegrationReadiness() { return inspectIntegrationReadiness(configuredFlags()); }
export async function runConfiguredSourceDryRun() { return runSourceDryRun(buildIntegrationRuntime(configuredFlags())); }

export function runPublicBacktest() {
  const policies = [6000, 7000, 8000, 9000].flatMap((minimumConfidenceBps) => [100, 200, 500].flatMap((minimumExpectedProfitCents) => [1.5, 2, 3].map((minimumReturnOnCost) => ({ minimumConfidenceBps, minimumExpectedProfitCents, minimumReturnOnCost, maximumRevenueCents: 10000, maximumCostCents: 2000, requireEvidence: true, rejectInjectionSignals: true }))));
  return tuneBacktest(PUBLIC_BACKTEST_FIXTURES, policies);
}

export function runPublicCorpusReport() { return loadAndAnalyzePublicCorpus("/home/clawdbot/.openclaw/workspace/private-backtests/public-github-redacted.json"); }
