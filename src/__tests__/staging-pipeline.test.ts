import { describe, expect, it } from "vitest";
import { AutonomousStagingPipeline } from "../integrations/index.js";
const base: any = { source: "github", immutableReference: "x", title: "x", body: "x", labels: [], acceptanceCriteria: [], evidenceRequired: [], receivedAt: new Date().toISOString() };
describe("autonomous staging pipeline", () => {
  it("evaluates only human-approved candidates and has no external effects", async () => {
    const source = { fetch: async () => ({ candidates: [{ ...base, sourceId: "1", humanApproved: true }, { ...base, sourceId: "2", humanApproved: false }], quarantined: [] }) };
    const evaluator = { evaluate: async () => ({ recommendation: "accept" as const, estimatedRevenueCents: 100, maximumCostCents: 10, confidenceBps: 9000, risks: [], requiredEvidence: [], reason: "ok" }) };
    const result = await new AutonomousStagingPipeline([source], evaluator).run();
    expect(result).toMatchObject({ mode: "staging", externalEffectsEnabled: false, fetched: 2, evaluated: 1, approved: 1, rejected: 1 });
  });
});
