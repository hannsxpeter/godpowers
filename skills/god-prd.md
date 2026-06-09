---
name: god-prd
description: |
  Write a Product Requirements Document with mechanical quality enforcement.
  Spawns the god-pm specialist agent in a fresh context.

  Triggers on: "god prd", "/god-prd", "write the prd", "product requirements"
---

# /god-prd

Spawn the **god-pm** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. If `.godpowers/PROGRESS.md` does not exist: tell the user to run `/god-init` first
2. Read `.godpowers/prep/INITIAL-FINDINGS.md` if present.
3. Read `.godpowers/prep/IMPORTED-CONTEXT.md` if present.
4. Spawn god-pm with the user's project description from PROGRESS.md plus any
   prep artifacts. Prep artifacts are context, not source of truth.
5. The agent writes `.godpowers/prd/PRD.md`
6. The agent runs have-nots checks before declaring done
7. If god-pm pauses for a human question: relay to user using pause format
8. If prep artifacts or the PRD show UI or product-experience signals, route
   to `/god-design` next so DESIGN.md can shape architecture. Otherwise route
   to `/god-arch`.

## Verification

After god-pm returns:
1. Verify `.godpowers/prd/PRD.md` exists on disk
2. Spawn god-auditor briefly to verify have-nots pass
3. Update `.godpowers/PROGRESS.md`: PRD status = done

## Pause Format

```
PAUSE: [question]
Why: [why only you can answer]
Options:
  A: ... -- [tradeoff]
  B: ... -- [tradeoff]
Default: [if you say "go", I'll pick X because Y]
```

## On Completion

After PRD is written and have-nots pass, print:

```
PRD complete: .godpowers/prd/PRD.md

Suggested next: /god-design (shape product experience) if UI/product experience is detected, otherwise /god-arch (design the architecture)
```


## Re-invocation contract

What happens if `/god-prd` is run when `.godpowers/prd/PRD.md` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-pm; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-pm in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-prd --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-prd-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-prd invocation as `op:god-prd` for `/god-undo`.

### Idempotency guarantees

- Running `/god-prd` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-prd --dry-run` is always read-only.
- An interrupted `/god-prd` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
