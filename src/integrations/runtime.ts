import { join } from "path";
import { homedir } from "os";
import { GitHubIssueOpportunitySource } from "./github-source.js";
import { GmailOpportunitySource } from "./gmail-source.js";
import { GitHubRestIssueClient, GmailRestClient } from "./rest-clients.js";
import { JsonFileCursorStore } from "./deduplication.js";
import { inspectIntegrationReadiness } from "./readiness.js";
import type { IntegrationFlags, OpportunityBatch, OpportunitySource } from "./types.js";

export interface IntegrationRuntime {
  sources: OpportunitySource[];
  statePath: string;
}
export function buildIntegrationRuntime(
  flags: IntegrationFlags,
  env: NodeJS.ProcessEnv = process.env,
  statePath = join(env.HOME || homedir(), ".automaton", "integrations", "source-state.json"),
): IntegrationRuntime {
  if (flags.externalEffectsEnabled !== false) throw new Error("EXTERNAL_EFFECTS_MUST_REMAIN_DISABLED");
  const report = inspectIntegrationReadiness(flags, env);
  const failed = report.items.filter((item) => item.enabled && !item.ready);
  if (failed.length) throw new Error(`INTEGRATION_NOT_READY:${failed.map((item) => `${item.name}[${item.missing.join(",")}]`).join(";")}`);
  const store = new JsonFileCursorStore(statePath); const sources: OpportunitySource[] = [];
  if (flags.github.enabled) sources.push(new GitHubIssueOpportunitySource(
    new GitHubRestIssueClient(env.GITHUB_TOKEN!),
    { repositories: flags.github.repositories, candidateLabel: flags.github.candidateLabel, approvalLabel: flags.github.approvalLabel }, store));
  if (flags.gmail.enabled) sources.push(new GmailOpportunitySource(
    new GmailRestClient(env.GMAIL_ACCESS_TOKEN!),
    { allowedSenders: flags.gmail.allowedSenders, allowedDomains: flags.gmail.allowedDomains, intakeLabel: flags.gmail.intakeLabel }, store));
  return { sources, statePath };
}
export interface SourceDryRunReport {
  mode: "dry-run"; externalEffectsEnabled: false; sourceCount: number; fetched: number; quarantined: number;
  candidates: Array<{ source: string; sourceId: string; title: string; humanApproved: boolean; immutableReference: string }>;
}
export async function runSourceDryRun(runtime: IntegrationRuntime): Promise<SourceDryRunReport> {
  const batches: OpportunityBatch[] = [];
  for (const source of runtime.sources) batches.push(await source.fetch());
  const candidates = batches.flatMap((batch) => batch.candidates).map((item) => ({
    source: item.source, sourceId: item.sourceId, title: item.title.slice(0, 200),
    humanApproved: item.humanApproved, immutableReference: item.immutableReference,
  }));
  return { mode: "dry-run", externalEffectsEnabled: false, sourceCount: runtime.sources.length, fetched: candidates.length,
    quarantined: batches.reduce((sum, batch) => sum + batch.quarantined.length, 0), candidates };
}
