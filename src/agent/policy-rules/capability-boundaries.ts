/**
 * Hardened capability boundaries.
 *
 * These rules separate the credential-bearing control plane from model-
 * controlled execution. They are deliberately fail-closed: a missing or
 * ambiguous security setting denies the action.
 */

import type { PolicyRule, PolicyRuleResult, SecurityConfig } from "../../types.js";
import { DEFAULT_SECURITY_CONFIG } from "../../types.js";

const EXECUTION_TOOLS = ["exec", "write_file", "read_file"] as const;
const PORT_TOOLS = ["expose_port", "remove_port"] as const;
const RUNTIME_MUTATION_TOOLS = [
  "edit_own_file",
  "revert_last_edit",
  "reset_to_upstream",
  "pull_upstream",
  "modify_heartbeat",
  "update_genesis_prompt",
  "git_commit",
  "git_push",
  "git_branch",
  "git_clone",
] as const;
const RUNTIME_EXTENSION_TOOLS = [
  "install_npm_package",
  "install_mcp_server",
  "install_skill",
  "create_skill",
  "remove_skill",
] as const;
const REPLICATION_TOOLS = ["spawn_child", "fund_child", "start_child"] as const;
const SPENDING_TOOLS = [
  "topup_credits",
  "transfer_credits",
  "x402_fetch",
  "fund_child",
  "register_domain",
  "create_sandbox",
] as const;

function deny(rule: string, reasonCode: string, humanMessage: string): PolicyRuleResult {
  return { rule, action: "deny", reasonCode, humanMessage };
}

function securityConfig(raw: SecurityConfig | undefined): SecurityConfig {
  return { ...DEFAULT_SECURITY_CONFIG, ...(raw ?? {}) };
}

export function createCapabilityBoundaryRules(): PolicyRule[] {
  return [
    {
      id: "capability.execution_isolation",
      description: "Require model-controlled execution to use a separate credentialless sandbox",
      priority: 50,
      appliesTo: { by: "name", names: [...EXECUTION_TOOLS] },
      evaluate(request) {
        const config = securityConfig(request.context.config?.securityConfig);
        if (config.profile === "legacy") return null;
        const executionId = config.executionSandboxId?.trim();
        const controlId = request.context.config?.sandboxId?.trim();
        if (!executionId || executionId === controlId || !request.context.executionConway) {
          return deny(
            "capability.execution_isolation",
            "EXECUTION_ISOLATION_REQUIRED",
            "Shell and file tools require a separate credentialless execution sandbox",
          );
        }
        return null;
      },
    },
    {
      id: "capability.public_ports",
      description: "Disable public port exposure unless explicitly enabled",
      priority: 50,
      appliesTo: { by: "name", names: [...PORT_TOOLS] },
      evaluate(request) {
        const config = securityConfig(request.context.config?.securityConfig);
        if (config.profile === "legacy" || config.allowPublicPorts) return null;
        return deny(
          "capability.public_ports",
          "PUBLIC_PORTS_DISABLED",
          "Public port exposure is disabled by the hardened security profile",
        );
      },
    },
    {
      id: "capability.runtime_self_modification",
      description: "Protect the credential-bearing runtime from direct model modification",
      priority: 50,
      appliesTo: { by: "name", names: [...RUNTIME_MUTATION_TOOLS] },
      evaluate(request) {
        const config = securityConfig(request.context.config?.securityConfig);
        if (config.profile === "legacy" || config.allowRuntimeSelfModification) return null;
        return deny(
          "capability.runtime_self_modification",
          "RUNTIME_SELF_MODIFICATION_DISABLED",
          "Direct mutation of the credential-bearing runtime is disabled; propose changes for reviewed deployment instead",
        );
      },
    },
    {
      id: "capability.runtime_extensions",
      description: "Block unreviewed package, MCP and skill installation",
      priority: 50,
      appliesTo: { by: "name", names: [...RUNTIME_EXTENSION_TOOLS] },
      evaluate(request) {
        const config = securityConfig(request.context.config?.securityConfig);
        if (config.profile === "legacy" || config.allowRuntimeExtensions) return null;
        return deny(
          "capability.runtime_extensions",
          "RUNTIME_EXTENSIONS_DISABLED",
          "Runtime extensions require review and a normal deployment",
        );
      },
    },
    {
      id: "capability.replication",
      description: "Require explicit enablement before creating or funding child agents",
      priority: 50,
      appliesTo: { by: "name", names: [...REPLICATION_TOOLS] },
      evaluate(request) {
        const config = securityConfig(request.context.config?.securityConfig);
        if (config.profile === "legacy" || config.allowChildReplication) return null;
        return deny(
          "capability.replication",
          "CHILD_REPLICATION_DISABLED",
          "Child creation, funding and start are disabled until explicitly enabled by an operator",
        );
      },
    },
    {
      id: "capability.financial_authority",
      description: "Keep spend and signing behind creator authority by default",
      priority: 50,
      appliesTo: { by: "name", names: [...SPENDING_TOOLS] },
      evaluate(request) {
        const config = securityConfig(request.context.config?.securityConfig);
        if (config.profile === "legacy") return null;
        const source = request.turnContext.inputSource;
        if (source === "creator") return null;
        if (source === "agent" && config.allowAgentFinancialActions) return null;
        return deny(
          "capability.financial_authority",
          "CREATOR_AUTHORITY_REQUIRED",
          `Spending action requires creator authority (received ${source ?? "unknown"})`,
        );
      },
    },
  ];
}
