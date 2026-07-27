import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { DEFAULT_INTEGRATION_FLAGS, buildIntegrationRuntime, runSourceDryRun } from "../integrations/index.js";
describe("integration runtime", () => {
  it("builds an inert runtime with all integrations disabled", async () => {
    const runtime = buildIntegrationRuntime(DEFAULT_INTEGRATION_FLAGS, {}, join(mkdtempSync(join(tmpdir(), "integration-runtime-")), "state.json"));
    expect(runtime.sources).toHaveLength(0);
    expect(await runSourceDryRun(runtime)).toMatchObject({ mode: "dry-run", externalEffectsEnabled: false, sourceCount: 0, fetched: 0 });
  });
  it("fails closed before constructing enabled sources with missing configuration", () => {
    const flags = { ...DEFAULT_INTEGRATION_FLAGS, github: { ...DEFAULT_INTEGRATION_FLAGS.github, enabled: true, repositories: ["o/r"] } };
    expect(() => buildIntegrationRuntime(flags, {})).toThrow("INTEGRATION_NOT_READY");
  });
  it("rejects any attempt to enable external effects", () => {
    expect(() => buildIntegrationRuntime({ ...DEFAULT_INTEGRATION_FLAGS, externalEffectsEnabled: true } as any, {})).toThrow("EXTERNAL_EFFECTS_MUST_REMAIN_DISABLED");
  });
});
