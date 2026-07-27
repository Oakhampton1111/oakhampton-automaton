import { describe, expect, it, vi } from "vitest";
import { GmailRestClient, GitHubRestIssueClient } from "../integrations/rest-clients.js";
describe("integration REST clients", () => {
  it("uses read-only GitHub issue endpoint and versioned headers", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify([{ id: 1 }]), { status: 200 }));
    const client = new GitHubRestIssueClient("token", { request } as any);
    expect(await client.listIssues("owner/repo")).toHaveLength(1);
    expect(request.mock.calls[0][0]).toContain("/repos/owner/repo/issues");
    expect((request.mock.calls[0][1] as any).method).toBeUndefined();
  });
  it("reads Gmail messages and creates drafts without a send endpoint", async () => {
    const request = vi.fn(async (url: string) => {
      if (url.includes("/messages?")) return new Response(JSON.stringify({ messages: [{ id: "m1" }] }));
      if (url.includes("/profile")) return new Response(JSON.stringify({ historyId: "10" }));
      if (url.includes("/messages/m1")) return new Response(JSON.stringify({ id: "m1", threadId: "t1", labelIds: ["INBOX"], internalDate: "1", payload: { headers: [{ name: "From", value: "a@example.com" }, { name: "Subject", value: "Work" }], body: { data: Buffer.from("details").toString("base64url") } } }));
      return new Response(JSON.stringify({ id: "draft1" }));
    });
    const client = new GmailRestClient("token", { request } as any);
    expect((await client.listMessages(undefined, "INBOX")).messages[0].body).toBe("details");
    expect((await client.createDraft({ threadId: "t1", to: "a@example.com", subject: "Re: Work", body: "draft" })).id).toBe("draft1");
    expect(request.mock.calls.some((call) => String(call[0]).includes("/messages/send"))).toBe(false);
  });
});
