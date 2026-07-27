import type { IntegrationFlags } from "./types.js";
import { DEFAULT_INTEGRATION_FLAGS } from "./types.js";
export interface IntegrationReadinessItem { name: "github" | "gmail" | "stripe" | "evaluation"; enabled: boolean; configured: boolean; ready: boolean; missing: string[]; }
export interface IntegrationReadinessReport { mode: "staging"; externalEffectsEnabled: false; ready: boolean; items: IntegrationReadinessItem[]; }
export function inspectIntegrationReadiness(flags: IntegrationFlags = DEFAULT_INTEGRATION_FLAGS, env: NodeJS.ProcessEnv = process.env): IntegrationReadinessReport {
  const specs = [
    { name: "github" as const, enabled: flags.github.enabled, vars: ["GITHUB_TOKEN"], extra: flags.github.repositories.length ? [] : ["github.repositories"] },
    { name: "gmail" as const, enabled: flags.gmail.enabled, vars: ["GMAIL_ACCESS_TOKEN"], extra: flags.gmail.allowedSenders.length || flags.gmail.allowedDomains.length ? [] : ["gmail.allowlist"] },
    { name: "stripe" as const, enabled: flags.stripe.enabled, vars: ["STRIPE_SANDBOX_SECRET_KEY", "STRIPE_SANDBOX_WEBHOOK_SECRET"], extra: [] },
    { name: "evaluation" as const, enabled: flags.evaluation.enabled, vars: [], extra: [] },
  ];
  const items = specs.map((spec) => {
    const missing = [...spec.vars.filter((name) => !env[name]), ...spec.extra];
    const configured = missing.length === 0;
    return { name: spec.name, enabled: spec.enabled, configured, ready: spec.enabled && configured, missing };
  });
  return { mode: "staging", externalEffectsEnabled: false, ready: items.some((item) => item.ready) && items.filter((item) => item.enabled).every((item) => item.ready), items };
}
