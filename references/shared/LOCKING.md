# Shared Locking Contract

This reference owns the state-lock contract used by mutating Godpowers commands.

## Contract

The orchestrator acquires a state lock before any skill mutates project state. The lock is scoped to the smallest affected unit, such as `tier-1.prd` for `/god-prd` or `linkage` for `/god-scan`.

The default lock TTL is 5 minutes. The same holder may re-enter the lock. Stale locks are force-reclaimable through `/god-repair`.

Read-only inspection commands do not block on the lock. Examples include `/god-status`, `/god-doctor`, and `/god-locate`.

Concurrent writers on non-overlapping scopes are allowed. Concurrent writers on overlapping scopes must pause or route through `/god-next`.

The full architecture contract lives in `ARCHITECTURE.md` under the concurrency contract section.
