import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
export interface CursorStore { has(key: string): boolean; add(key: string): void; getCursor(source: string): string | undefined; setCursor(source: string, cursor: string): void; }
export class MemoryCursorStore implements CursorStore {
  protected readonly keys = new Set<string>(); protected readonly cursors = new Map<string, string>();
  has(key: string) { return this.keys.has(key); } add(key: string) { this.keys.add(key); }
  getCursor(source: string) { return this.cursors.get(source); } setCursor(source: string, cursor: string) { this.cursors.set(source, cursor); }
}
export class JsonFileCursorStore extends MemoryCursorStore {
  constructor(private readonly filePath: string) {
    super(); mkdirSync(dirname(filePath), { recursive: true });
    if (existsSync(filePath)) {
      const state = JSON.parse(readFileSync(filePath, "utf8")) as { keys?: string[]; cursors?: Record<string, string> };
      for (const key of state.keys ?? []) this.keys.add(key);
      for (const [source, cursor] of Object.entries(state.cursors ?? {})) this.cursors.set(source, cursor);
    }
  }
  override add(key: string) { super.add(key); this.persist(); }
  override setCursor(source: string, cursor: string) { super.setCursor(source, cursor); this.persist(); }
  private persist() {
    const temporary = `${this.filePath}.tmp`;
    writeFileSync(temporary, JSON.stringify({ keys: [...this.keys], cursors: Object.fromEntries(this.cursors) }), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, this.filePath);
  }
}
export function sourceKey(source: string, id: string): string { return createHash("sha256").update(`${source}:${id}`).digest("hex"); }
