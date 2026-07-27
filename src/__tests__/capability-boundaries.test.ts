import { describe, expect, it } from "vitest";
import { createCapabilityBoundaryRules } from "../agent/policy-rules/capability-boundaries.js";
import { createBuiltinTools } from "../agent/tools.js";
import { DEFAULT_SECURITY_CONFIG } from "../types.js";
import type {
  AutomatonTool,
  InputSource,
  PolicyRequest,
  SecurityConfig,
  ToolContext,
} from "../types.js";
import {
  MockConwayClient,
  MockInferenceClient,
  createTestConfig,
  createTestDb,
  createTestIdentity,
} from "./mocks.js";

function tool(name: string, category: AutomatonTool["category"] = "vm"): AutomatonTool {
  return {
    name,
    description: name,
    parameters: { type: "object", properties: {} },
    execute: async () => "ok",
    riskLevel: "dangerous",
    category,
  };
}

function context(
  security: Partial<SecurityConfig> = {},
  executionConway?: MockConwayClient,
): ToolContext {
  const config = createTestConfig({ sandboxId: "control-plane" });
  config.securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...security };
  return {
    identity: createTestIdentity(),
    config,
    db: createTestDb(),
    conway: new MockConwayClient(),
    executionConway,
    inference: new MockInferenceClient(),
  };
}

function request(
  name: string,
  ctx: ToolContext,
  inputSource: InputSource = "agent",
): PolicyRequest {
  return {
    tool: tool(name),
    args: {},
    context: ctx,
    turnContext: {
      inputSource,
      turnToolCallCount: 0,
      sessionSpend: {
        recordSpend: () => {},
        getHourlySpend: () => 0,
        getDailySpend: () => 0,
        getTotalSpend: () => 0,
        checkLimit: () => ({
          allowed: true,
          currentHourlySpend: 0,
          currentDailySpend: 0,
          limitHourly: 0,
          limitDaily: 0,
        }),
        pruneOldRecords: () => 0,
      },
    },
  };
}

function decision(ruleId: string, req: PolicyRequest) {
  const rule = createCapabilityBoundaryRules().find((item) => item.id === ruleId)!;
  return rule.evaluate(req);
}

describe("hardened capability boundaries", () => {
  it("fails closed when shell has no separate execution sandbox", () => {
    const ctx = context();
    expect(decision("capability.execution_isolation", request("exec", ctx))?.reasonCode)
      .toBe("EXECUTION_ISOLATION_REQUIRED");
    ctx.db.close();
  });

  it("allows shell only with a distinct execution client", () => {
    const worker = new MockConwayClient();
    const ctx = context({ executionSandboxId: "worker-plane" }, worker);
    expect(decision("capability.execution_isolation", request("exec", ctx))).toBeNull();
    ctx.db.close();
  });

  it("routes shell execution to the credentialless client", async () => {
    const worker = new MockConwayClient();
    const ctx = context({ executionSandboxId: "worker-plane" }, worker);
    const execTool = createBuiltinTools("control-plane").find((item) => item.name === "exec")!;
    await execTool.execute({ command: "echo safe" }, ctx);
    expect(worker.execCalls).toHaveLength(1);
    expect((ctx.conway as MockConwayClient).execCalls).toHaveLength(0);
    ctx.db.close();
  });

  it("blocks direct runtime mutation and child replication by default", () => {
    const ctx = context();
    expect(decision("capability.runtime_self_modification", request("edit_own_file", ctx))?.action)
      .toBe("deny");
    expect(decision("capability.replication", request("spawn_child", ctx))?.action)
      .toBe("deny");
    ctx.db.close();
  });

  it("allows spending only from creator authority by default", () => {
    const ctx = context();
    expect(decision("capability.financial_authority", request("transfer_credits", ctx, "agent"))?.action)
      .toBe("deny");
    expect(decision("capability.financial_authority", request("transfer_credits", ctx, "inbox"))?.action)
      .toBe("deny");
    expect(decision("capability.financial_authority", request("transfer_credits", ctx, "creator")))
      .toBeNull();
    ctx.db.close();
  });
});
