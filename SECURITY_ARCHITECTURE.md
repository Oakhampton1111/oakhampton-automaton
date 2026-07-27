# Oakhampton Automaton Security Architecture

## Security objective

Retain Automaton's useful long-lived agent mechanics without combining untrusted content, arbitrary code, mutable runtime files and financial credentials inside one authority boundary.

The hardened profile is fail-closed. Missing configuration disables capabilities rather than silently restoring upstream behaviour.

## Retained mechanisms

- persistent Think → Act → Observe loop;
- balance-aware survival tiers and model throttling;
- spend tracking and treasury ceilings;
- structured memory, goals and plans;
- sandbox lifecycle and child lineage records;
- audit logging and git history;
- creator control and read-only operational introspection.

## Enforced boundaries

### 1. Control plane and execution plane

The control plane holds configuration, API access and wallet material. Model-controlled `exec`, `read_file`, `write_file` and installed command tools are routed only to `securityConfig.executionSandboxId` through a separate Conway client.

Hardened mode denies these tools when:

- no execution sandbox is configured;
- the execution sandbox equals the control-plane sandbox; or
- the execution client is unavailable.

The execution sandbox must contain no wallet, Conway API key, model-provider key, messaging credential or Oakhampton data. Network egress restrictions remain an infrastructure responsibility because Conway's public client API does not expose an enforceable egress policy. Until that is available, the execution sandbox is not approved for sensitive workloads.

This implements the same core principle described in the [Firecracker production guidance](https://github.com/firecracker-microvm/firecracker/blob/main/docs/prod-host-setup.md): untrusted workloads need a distinct isolation boundary, privilege dropping and resource controls. Landlock or seccomp alone can add defence in depth but cannot separate a secret from arbitrary code running as its owner.

### 2. Immutable external provenance

Inbox messages now retain `inputSource: "inbox"`. Other low-authority source types are `social`, `webhook` and `external`. Sanitisation never upgrades source authority.

The policy engine derives all of these as external. Dangerous child, financial and runtime-mutation tools therefore remain denied even when a prompt-injection filter considers the text benign. This follows the context-aware authorisation pattern documented by [Open Policy Agent](https://www.openpolicyagent.org/docs/external-data): provenance and request metadata must be policy inputs supplied by the trusted caller, not conclusions inferred from message content.

### 3. Wallet custody and spending

In the first hardened release the local wallet remains available to the trusted control-plane process for compatibility, but the model has no shell, file or self-modification path into that process. Signing and spending tools accept creator-originated authority only by default. Agent-originated financial actions require the explicit `allowAgentFinancialActions` setting and remain subject to treasury policy.

Production autonomous spending is not approved with a local plaintext key. The next custody stage is an out-of-process signer backed by KMS, HSM or Vault, with transaction decoding, destination and amount policy enforced before signing. [AWS KMS](https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html) supports secp256k1 signing without exporting the private key; [Vault Transit](https://developer.hashicorp.com/vault/docs/secrets/transit) provides cryptographic operations behind ACLs. A bearer token alone is insufficient: the signer must independently enforce spend policy and caller workload identity.

### 4. Runtime mutation and supply chain

Direct code edits, git mutation, package installation, MCP installation and skill installation are disabled by default. The safe evolution mechanism is:

1. generate a proposed patch in the credentialless execution plane;
2. run tests and security checks in that plane;
3. require review and a normal deployment into the control plane;
4. retain the commit and policy evidence.

This preserves adaptation while removing the model's ability to rewrite the code that guards its credentials.

### 5. Replication and orchestration

Child spawning, funding and starting are disabled by default. Hardened mode also refuses the upstream fallback from a failed remote sandbox to an in-process local worker. Enabling replication does not enable local fallback.

Each future child should receive a distinct workload identity, budget, sandbox and signer policy. SPIFFE's [workload identity model](https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/) is the reference pattern; children must not inherit long-lived parent credentials.

### 6. CI must fail closed

Test timeouts now fail the workflow. Security tests use the supported Vitest name filter. High-severity dependency audit failures are no longer ignored.

## Hardened default configuration

```json
{
  "securityConfig": {
    "profile": "hardened",
    "executionSandboxId": "separate-credentialless-sandbox-id",
    "allowPublicPorts": false,
    "allowRuntimeSelfModification": false,
    "allowRuntimeExtensions": false,
    "allowChildReplication": false,
    "allowAgentFinancialActions": false
  }
}
```

`profile: "legacy"` exists only to compare upstream behaviour during migration. It is not approved for Oakhampton use.

## Residual risks and production gates

The fork is a hardened research runtime, not yet an approved production financial agent. Before production use it still requires:

- an independently policy-enforcing remote signer;
- provider-level egress controls for execution sandboxes;
- short-lived workload identity rather than shared API credentials;
- resource quotas and guaranteed sandbox destruction;
- adversarial prompt-injection and secret-exfiltration testing;
- signed build provenance, dependency pinning and security review;
- human approval for every external communication or financial commitment until measured evidence supports narrower standing authority.

