---
name: god-observe
description: |
  Wire observability. Spawns the god-observability-engineer agent in a fresh
  context. Gated on Deploy.

  Triggers on: "god observe", "/god-observe", "add monitoring", "SLOs", "alerting"
---

# /god-observe

Spawn the **god-observability-engineer** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify `.godpowers/deploy/STATE.md` exists. App is deployed.
2. Spawn god-observability-engineer with PRD (for success metrics) and ARCH paths.
3. The agent writes `.godpowers/observe/STATE.md`.

## Verification

After god-observability-engineer returns:
1. Verify STATE.md exists on disk
2. Verify each SLO has an error budget policy
3. Verify each alert has a runbook
4. Verify provider work is one of:
   - real provider alerts and dashboards verified
   - provider-neutral definitions as code created and locally checked
   - missing dashboard/API credentials appended to the single external access
     bundle
5. Update `.godpowers/PROGRESS.md`: Observe status = done only for verified
   real provider config or local definitions as code. If external access is
   missing, mark Observe = waiting-for-external-access.

## On Completion

```
Observability complete: .godpowers/observe/STATE.md

Suggested next: /god-harden (adversarial security review, gates Launch)
```

Under `/god-mode --yolo`, do not stop with a dashboard checklist. Create or
update alert definitions, dashboard definitions, runbooks, and local checks
first. If real provider access is still required, append the exact missing
credentials to `.godpowers/deploy/WAITING-FOR-EXTERNAL-ACCESS.md`.

Provider credentials are last-mile inputs. Do not ask for dashboard access,
API keys, or observability admin consoles until the local definitions, runbook
dry-runs, log-shape checks, and CI-verifiable checks are done and the next
named command cannot run without one exact credential.


## Re-invocation contract

What happens if `/god-observe` is run when `.godpowers/observe/STATE.md` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-observability-engineer; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-observability-engineer in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-observe --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-observe-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-observe invocation as `op:god-observe` for `/god-undo`.

### Idempotency guarantees

- Running `/god-observe` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-observe --dry-run` is always read-only.
- An interrupted `/god-observe` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
