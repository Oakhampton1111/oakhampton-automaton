# Workflow Repair Report

## Root cause
The webhook response depended on CRM completion and the create operation had no idempotency key.

## Repair
1. Persist request before acknowledgement.
2. Derive idempotency key from source lead ID.
3. Use bounded exponential retry.
4. Route terminal failures to an operator queue.

## Rollback
Restore workflow version 41 and disable the durable intake node.
