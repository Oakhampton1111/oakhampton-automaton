import type { CursorStore } from "./deduplication.js";
import { sourceKey } from "./deduplication.js";
import type { OpportunityBatch, OpportunityCandidate, OpportunitySource } from "./types.js";
export interface GitHubIssue { id: number; number: number; html_url: string; title: string; body?: string | null; labels: Array<string | { name?: string }>; updated_at: string; pull_request?: unknown; }
export interface GitHubIssueClient { listIssues(repository: string, since?: string): Promise<GitHubIssue[]>; }
export interface GitHubSourceConfig { repositories: string[]; candidateLabel: string; approvalLabel: string; maximumBodyLength?: number; }
function labels(issue: GitHubIssue): string[] { return issue.labels.map((item) => typeof item === "string" ? item : item.name).filter((item): item is string => Boolean(item)); }
function money(body: string, key: string): number | undefined { const match = body.match(new RegExp(`^${key}\\s*:\\s*(\\d+)$`, "im")); return match ? Number(match[1]) : undefined; }
export class GitHubIssueOpportunitySource implements OpportunitySource {
  constructor(private readonly client: GitHubIssueClient, private readonly config: GitHubSourceConfig, private readonly store: CursorStore) {}
  async fetch(cursor?: string): Promise<OpportunityBatch> {
    const candidates: OpportunityCandidate[] = []; const quarantined: OpportunityBatch["quarantined"] = []; let latest = cursor;
    for (const repository of this.config.repositories) {
      const effectiveCursor = cursor ?? this.store.getCursor("github");
      const issues = await this.client.listIssues(repository, effectiveCursor);
      for (const issue of issues) {
        if (issue.pull_request) continue;
        const issueLabels = labels(issue); if (!issueLabels.includes(this.config.candidateLabel)) continue;
        const id = `${repository}#${issue.number}`; const key = sourceKey("github", String(issue.id));
        if (this.store.has(key)) continue;
        const body = issue.body ?? "";
        if (body.length > (this.config.maximumBodyLength ?? 50_000)) { quarantined.push({ sourceId: id, reason: "BODY_TOO_LARGE" }); this.store.add(key); continue; }
        candidates.push({ source: "github", sourceId: id, immutableReference: issue.html_url, title: issue.title, body,
          labels: issueLabels, humanApproved: issueLabels.includes(this.config.approvalLabel), estimatedRevenueCents: money(body, "revenue_cents"),
          maximumCostCents: money(body, "max_cost_cents"), currency: /currency\s*:\s*USD/i.test(body) ? "USD" : "AUD",
          acceptanceCriteria: body.match(/acceptance\s*:\s*(.+)/ig)?.map((line) => line.replace(/acceptance\s*:\s*/i, "")) ?? [],
          evidenceRequired: body.match(/evidence\s*:\s*(.+)/ig)?.map((line) => line.replace(/evidence\s*:\s*/i, "")) ?? [],
          receivedAt: issue.updated_at });
        this.store.add(key); if (!latest || issue.updated_at > latest) latest = issue.updated_at;
      }
    }
    if (latest) this.store.setCursor("github", latest);
    return { candidates, quarantined, cursor: latest };
  }
}
