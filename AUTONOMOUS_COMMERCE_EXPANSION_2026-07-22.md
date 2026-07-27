# Autonomous Commerce Expansion — 2026-07-22

## Architecture map

1. **Discover** — public job feeds, agent-native task APIs, approved email alerts and low-rate community listening.
2. **Qualify** — capability fit, acceptance-test clarity, delivery time, net margin, platform rules, identity and financial risk.
3. **Propose** — job-specific evidence, scoped deliverable, price floor, critique/revision and idempotent submission.
4. **Converse** — AgentMail and platform message ingestion; classify interview, award, scope change and payment events.
5. **Contract and settle** — platform escrow, Stripe or USDC; never treat an unverified payment as settled.
6. **Fulfil** — bounded local/model workflow; OpenClaw escalation for complex or tool-heavy jobs.
7. **Deliver** — manifest, acceptance test, secure delivery and one included revision.
8. **Learn** — conversion, margin, rejection reason, quality and channel yield feed the next strategy review.
9. **Publish** — owned service catalogue and paid APIs; reputation channels point to the catalogue without spam.

## Channel classes

### Agent-native work feeds — integrate first
- DealWork: MCP work discovery, bidding, contracts and payments.
- OpenTask: API-oriented bidding and delivery with explicit agent spending/tool safeguards.
- UGig: CLI/API profiles, gigs, applications, posts and wallet settlement.
- Pinch: agent-to-agent jobs and Base settlement.

These channels may become fully automatic only after scoped credentials, sandbox tests and per-channel monetary/action limits pass.

### Owned services — highest long-run margin
- Existing Oakhampton checkout/intake/delivery path.
- x402 endpoints for narrow, testable pay-per-call services.
- MCP Hive listing for MCP tools.
- Circle Agent Marketplace/Agent Stack discovery and USDC settlement when onboarding is available.
- Nevermined is an optional metering/settlement layer, not a work feed.

### Discovery/reputation, not direct work feeds
- Moltbook, Reddit, Agentverse, Virtuals and on-chain agent registries.
- Automate monitoring and draft posts. Auto-publish only where platform rules and account configuration explicitly permit it; use strict frequency and duplicate-content limits.

### Excluded from unattended operation
- DeFi arbitrage, liquidity management, solver competition and leveraged trading.
- Security bounties without explicit scope.
- Physical-world bounties the agent cannot independently verify.
- GPU marketplaces without owned suitable hardware.

## Guardrails for useful autonomy

- Default-deny external effects; channel-specific credentials and enable flags.
- Daily proposal/post/spend caps, minimum expected margin and maximum fulfilment hours.
- No CAPTCHA bypass, fake identity, undisclosed impersonation, spam or terms evasion.
- Escalate ambiguous scope, legal/regulated work, irreversible actions, deposits/spend and high-value commitments.
- Use idempotency keys, durable queues, dead-letter monitoring and a kill switch.
- Log source, exact posting, proposal, client response, cost, payment and final margin.

## Activation sequence

1. Keep current daemon online; validate readiness and queue health.
2. Add scoped DealWork, OpenTask, UGig and Pinch credentials one at a time.
3. Implement contract tests against each sandbox/read-only endpoint before live submission.
4. Run 72 hours in discovery/draft mode and review false positives and projected margins.
5. Enable low-value auto-bids only on channels whose rules permit automation.
6. Publish three narrow paid APIs via x402, then list them in MCP Hive and relevant registries.
7. Add one useful, non-promotional weekly case study and two evidence-led service posts; stop channels with low inbound yield.

## Success metrics

Qualified opportunities/day, proposal acceptance rate, response rate, paid conversion, delivery pass rate, gross margin after model/platform fees, owner interventions/job, chargebacks/disputes and channel profit per hour of agent runtime.
