import type { CursorStore } from "./deduplication.js";
import { sourceKey } from "./deduplication.js";
import type { OpportunityBatch, OpportunityCandidate, OpportunitySource } from "./types.js";
export interface GmailMessage { id: string; threadId: string; from: string; subject: string; body: string; labels: string[]; internalDate: string; historyId: string; }
export interface GmailReadClient { listMessages(startHistoryId?: string, label?: string): Promise<{ messages: GmailMessage[]; historyId?: string }>; createDraft(input: { threadId: string; to: string; subject: string; body: string }): Promise<{ id: string }>; }
export interface GmailSourceConfig { allowedSenders: string[]; allowedDomains: string[]; intakeLabel: string; maximumBodyLength?: number; }
export class GmailOpportunitySource implements OpportunitySource {
  constructor(private readonly client: GmailReadClient, private readonly config: GmailSourceConfig, private readonly store: CursorStore) {}
  async fetch(cursor?: string): Promise<OpportunityBatch> {
    const effectiveCursor = cursor ?? this.store.getCursor("gmail");
    const page = await this.client.listMessages(effectiveCursor, this.config.intakeLabel); const candidates: OpportunityCandidate[] = []; const quarantined: OpportunityBatch["quarantined"] = [];
    for (const message of page.messages) {
      const key = sourceKey("gmail", message.id); if (this.store.has(key)) continue;
      const address = (message.from.match(/<([^>]+)>/)?.[1] ?? message.from).trim().toLowerCase(); const domain = address.split("@")[1] ?? "";
      const allowed = this.config.allowedSenders.map((x) => x.toLowerCase()).includes(address) || this.config.allowedDomains.map((x) => x.toLowerCase()).includes(domain);
      if (!allowed || message.body.length > (this.config.maximumBodyLength ?? 50_000)) { quarantined.push({ sourceId: message.id, reason: allowed ? "BODY_TOO_LARGE" : "SENDER_NOT_ALLOWED" }); this.store.add(key); continue; }
      candidates.push({ source: "gmail", sourceId: message.id, immutableReference: `gmail:${message.threadId}:${message.id}`, title: message.subject,
        body: message.body, sender: address, labels: message.labels, humanApproved: false, acceptanceCriteria: [], evidenceRequired: [], receivedAt: new Date(Number(message.internalDate)).toISOString() });
      this.store.add(key);
    }
    if (page.historyId) this.store.setCursor("gmail", page.historyId);
    return { candidates, quarantined, cursor: page.historyId ?? cursor };
  }
  async createDraft(candidate: OpportunityCandidate, body: string) {
    if (!candidate.sender || candidate.source !== "gmail") throw new Error("gmail candidate with sender required");
    const threadId = candidate.immutableReference.split(":")[1]; return this.client.createDraft({ threadId, to: candidate.sender, subject: `Re: ${candidate.title}`, body });
  }
}
