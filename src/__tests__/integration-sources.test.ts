import { describe, expect, it, vi } from "vitest";
import { GitHubIssueOpportunitySource, GmailOpportunitySource, MemoryCursorStore } from "../integrations/index.js";
describe("opportunity sources", () => {
  it("requires GitHub candidate label and preserves human approval", async () => {
    const client = { listIssues: vi.fn(async () => [
      { id: 1, number: 7, html_url: "https://github.com/o/r/issues/7", title: "Paid work", body: "revenue_cents: 1000\nmax_cost_cents: 200\nacceptance: tests pass", labels: ["automaton-candidate", "human-approved"], updated_at: "2026-01-01T00:00:00Z" },
      { id: 2, number: 8, html_url: "x", title: "ignore", body: "", labels: [], updated_at: "2026-01-01T00:00:00Z" },
    ]) };
    const source = new GitHubIssueOpportunitySource(client, { repositories: ["o/r"], candidateLabel: "automaton-candidate", approvalLabel: "human-approved" }, new MemoryCursorStore());
    const result = await source.fetch(); expect(result.candidates).toHaveLength(1); expect(result.candidates[0]).toMatchObject({ humanApproved: true, estimatedRevenueCents: 1000, maximumCostCents: 200 });
    expect((await source.fetch()).candidates).toHaveLength(0);
  });
  it("quarantines unallowlisted Gmail and only creates drafts", async () => {
    const client = { listMessages: vi.fn(async () => ({ historyId: "2", messages: [
      { id: "1", threadId: "t1", from: "ok@example.com", subject: "work", body: "details", labels: ["automaton-candidate"], internalDate: "1", historyId: "2" },
      { id: "2", threadId: "t2", from: "bad@evil.test", subject: "x", body: "x", labels: [], internalDate: "1", historyId: "2" },
    ] })), createDraft: vi.fn(async () => ({ id: "draft-1" })) };
    const source = new GmailOpportunitySource(client, { allowedSenders: [], allowedDomains: ["example.com"], intakeLabel: "automaton-candidate" }, new MemoryCursorStore());
    const result = await source.fetch(); expect(result.candidates).toHaveLength(1); expect(result.quarantined[0].reason).toBe("SENDER_NOT_ALLOWED");
    await source.createDraft(result.candidates[0], "draft"); expect(client.createDraft).toHaveBeenCalledOnce();
  });
});
