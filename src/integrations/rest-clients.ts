import { ResilientHttpClient } from "../conway/http-client.js";
import type { GitHubIssue, GitHubIssueClient } from "./github-source.js";
import type { GmailMessage, GmailReadClient } from "./gmail-source.js";

async function requireJson(response: Response): Promise<any> {
  if (!response.ok) throw new Error(`integration HTTP ${response.status}`);
  return response.json();
}

export class GitHubRestIssueClient implements GitHubIssueClient {
  constructor(private readonly token: string, private readonly http = new ResilientHttpClient()) {
    if (!token) throw new Error("GitHub token required");
  }
  async listIssues(repository: string, since?: string): Promise<GitHubIssue[]> {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("invalid GitHub repository");
    const url = new URL(`https://api.github.com/repos/${repository}/issues`);
    url.searchParams.set("state", "open"); url.searchParams.set("per_page", "100");
    if (since) url.searchParams.set("since", since);
    const response = await this.http.request(url.toString(), { headers: {
      Accept: "application/vnd.github+json", Authorization: `Bearer ${this.token}`, "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "oakhampton-automaton-staging",
    } });
    const data = await requireJson(response);
    if (!Array.isArray(data)) throw new Error("invalid GitHub response");
    return data as GitHubIssue[];
  }
}

function decodeBase64Url(value?: string): string {
  if (!value) return "";
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}
function findBody(payload: any): string {
  if (payload?.body?.data) return decodeBase64Url(payload.body.data);
  for (const part of payload?.parts ?? []) { const body = findBody(part); if (body) return body; }
  return "";
}
function header(payload: any, name: string): string {
  return payload?.headers?.find((item: any) => String(item.name).toLowerCase() === name.toLowerCase())?.value ?? "";
}

export class GmailRestClient implements GmailReadClient {
  constructor(private readonly accessToken: string, private readonly http = new ResilientHttpClient()) {
    if (!accessToken) throw new Error("Gmail access token required");
  }
  async listMessages(startHistoryId?: string, label?: string): Promise<{ messages: GmailMessage[]; historyId?: string }> {
    const ids = new Set<string>(); let historyId = startHistoryId;
    if (startHistoryId) {
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
      url.searchParams.set("startHistoryId", startHistoryId); url.searchParams.set("historyTypes", "messageAdded");
      if (label) url.searchParams.set("labelId", label);
      const data = await this.get(url);
      for (const entry of data.history ?? []) for (const added of entry.messagesAdded ?? []) if (added.message?.id) ids.add(added.message.id);
      historyId = data.historyId ?? historyId;
    } else {
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      url.searchParams.set("maxResults", "100"); if (label) url.searchParams.set("labelIds", label);
      const data = await this.get(url); for (const message of data.messages ?? []) if (message.id) ids.add(message.id);
      const profile = await this.get(new URL("https://gmail.googleapis.com/gmail/v1/users/me/profile")); historyId = profile.historyId;
    }
    const messages: GmailMessage[] = [];
    for (const id of ids) {
      const data = await this.get(new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`));
      messages.push({ id: data.id, threadId: data.threadId, from: header(data.payload, "From"), subject: header(data.payload, "Subject"),
        body: findBody(data.payload), labels: data.labelIds ?? [], internalDate: data.internalDate, historyId: data.historyId ?? historyId ?? "" });
    }
    return { messages, historyId };
  }
  async createDraft(input: { threadId: string; to: string; subject: string; body: string }): Promise<{ id: string }> {
    const mime = [`To: ${input.to}`, `Subject: ${input.subject}`, "Content-Type: text/plain; charset=utf-8", "", input.body].join("\r\n");
    const raw = Buffer.from(mime).toString("base64url");
    const response = await this.http.request("https://gmail.googleapis.com/gmail/v1/users/me/drafts", { method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { threadId: input.threadId, raw } }), idempotencyKey: `gmail-draft-${input.threadId}` });
    return requireJson(response);
  }
  private async get(url: URL): Promise<any> {
    const response = await this.http.request(url.toString(), { headers: { Authorization: `Bearer ${this.accessToken}` } });
    return requireJson(response);
  }
}
