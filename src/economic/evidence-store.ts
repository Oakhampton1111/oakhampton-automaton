import { createHash } from "crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { dirname } from "path";
import { ulid } from "ulid";

export type EconomicEvidenceEventType =
  | "proposal_received" | "proposal_denied" | "approval_required" | "capability_granted"
  | "action_simulated" | "value_accepted" | "revenue_observed" | "revenue_collected" | "cycle_completed" | "incident";
export interface EconomicEvidenceEvent {
  id: string; type: EconomicEvidenceEventType; traceId: string; timestamp: string;
  payload: Record<string, unknown>; previousHash: string; hash: string;
}
type UnsignedEvent = Omit<EconomicEvidenceEvent, "hash">;
export class EconomicEvidenceStore {
  constructor(private readonly filePath: string) { mkdirSync(dirname(filePath), { recursive: true }); }
  append(type: EconomicEvidenceEventType, traceId: string, payload: Record<string, unknown>): EconomicEvidenceEvent {
    const events = this.readAll();
    const unsigned: UnsignedEvent = { id: ulid(), type, traceId, timestamp: new Date().toISOString(), payload, previousHash: events.at(-1)?.hash ?? "GENESIS" };
    const event: EconomicEvidenceEvent = { ...unsigned, hash: this.digest(unsigned) };
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
    return event;
  }
  readAll(): EconomicEvidenceEvent[] {
    if (!existsSync(this.filePath)) return [];
    return readFileSync(this.filePath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as EconomicEvidenceEvent);
  }
  verify(): { valid: boolean; count: number; firstInvalidIndex?: number } {
    const events = this.readAll(); let previousHash = "GENESIS";
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index]; const { hash, ...unsigned } = event;
      if (event.previousHash !== previousHash || hash !== this.digest(unsigned)) return { valid: false, count: events.length, firstInvalidIndex: index };
      previousHash = hash;
    }
    return { valid: true, count: events.length };
  }
  private digest(event: UnsignedEvent): string { return createHash("sha256").update(JSON.stringify(event)).digest("hex"); }
}
