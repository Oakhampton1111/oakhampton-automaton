# OpenClaw Recovery Handover

## Preserved customisations
- LanceDB memory adapter
- Provider routing policy
- Telegram gateway configuration

## Root causes
1. Unpinned image introduced config schema change.
2. Health check did not exercise provider routing.

## Controls added
Pinned release, validated migration, encrypted backup, connector probes and rehearsed rollback.
