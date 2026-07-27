
## Governed economic loop foundation

The fork now includes a shadow-mode economic control foundation under `src/economic/`:

- typed action proposals with purpose, provenance, cost ceiling, destination, data classification, time window and evidence requirements;
- policy-scoped, expiring and single-use capability grants;
- worst-case budget reservation followed by actual-cost settlement;
- separate accepted-value, collected-revenue and compute-budget accounting;
- a simulation gateway that cannot perform external communications, payments, compute procurement or child creation;
- fail-closed checks for authority, destination class, data classification, expiry, idempotency and available budget.

This implements the first safe layer of the research roadmap. It deliberately does not connect a wallet, signer, email account, public network gateway or production provisioning system. Real gateways remain evidence-gated future work.
