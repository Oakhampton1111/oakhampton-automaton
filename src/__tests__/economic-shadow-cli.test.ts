import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { getEconomicShadowStatus, runEconomicShadowDemo } from "../economic/shadow-cli.js";

describe("economic shadow CLI", () => {
  it("runs locally with no external effects and remains below graduation gates", () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "economic-shadow-cli-")), "evidence.jsonl");
    const result = runEconomicShadowDemo(filePath);
    expect(result.mode).toBe("shadow");
    expect(result.externalEffectsEnabled).toBe(false);
    expect(result.integrity).toEqual({ valid: true, count: 4 });
    expect(result.metrics.simulatedActions).toBe(1);
    expect(result.metrics.acceptedValueCents).toBe(300);
    expect(result.metrics.collectedRevenueCents).toBe(0);
    expect(result.graduation.passed).toBe(false);
    expect(result.graduation.failures.map((failure) => failure.code)).toContain("no_collected_revenue");
  });

  it("reports an empty evidence store safely", () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "economic-shadow-status-")), "evidence.jsonl");
    const result = getEconomicShadowStatus(filePath);
    expect(result.integrity).toEqual({ valid: true, count: 0 });
    expect(result.graduation.passed).toBe(false);
  });
});
