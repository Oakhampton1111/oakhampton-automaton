# Auto-Company Pattern Integration

This runtime incorporates selected orchestration patterns inspired by
[MaxMiksa/Auto-Company](https://github.com/MaxMiksa/Auto-Company), reviewed at
the upstream `main` branch on 2026-07-22. Auto-Company is MIT licensed.

Oakhampton does **not** embed or run Auto-Company as another control plane.
OpenClaw remains the supervisor and PicoClaw remains a scoped low-cost worker.
The adopted patterns are independently implemented here:

- a compact, checksummed consensus baton projected to `data/consensus.md`;
- forced `discover -> validate -> execute -> measure -> decide` convergence;
- task-sized squads of no more than five workers;
- expected-contribution and 50% margin gates;
- adapter circuit breakers, durable events, and operational visibility.

Structured SQLite records are authoritative. The Markdown projection is for
operators and OpenClaw handoffs and must never be used to bypass policy,
payment verification, sandboxing, or authority checks.
