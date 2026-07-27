import { describe, expect, it } from "vitest";
import { DEFAULT_INTEGRATION_FLAGS, inspectIntegrationReadiness } from "../integrations/index.js";
describe("integration readiness", () => {
  it("reports missing configuration without exposing secret values", () => {
    const flags = { ...DEFAULT_INTEGRATION_FLAGS, github: { ...DEFAULT_INTEGRATION_FLAGS.github, enabled: true } };
    const report = inspectIntegrationReadiness(flags, { GITHUB_TOKEN: "super-secret" });
    expect(report.ready).toBe(false); expect(report.items[0].missing).toContain("github.repositories");
    expect(JSON.stringify(report)).not.toContain("super-secret");
  });
  it("requires enabled integrations and keeps external effects disabled", () => {
    const flags = { ...DEFAULT_INTEGRATION_FLAGS, github: { ...DEFAULT_INTEGRATION_FLAGS.github, enabled: true, repositories: ["o/r"] } };
    expect(inspectIntegrationReadiness(flags, { GITHUB_TOKEN: "token" })).toMatchObject({ ready: true, externalEffectsEnabled: false });
  });
});
