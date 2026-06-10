---
name: god-roadmap
description: |
  Sequence the work into Godpowers delivery increments. Spawns the
  god-roadmapper agent in a fresh context. Gated on Architecture.

  Triggers on: "god roadmap", "/god-roadmap", "sequence the work", "delivery plan"
---

# /god-roadmap

Spawn the **god-roadmapper** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify `.godpowers/arch/ARCH.md` exists. If not, tell user to run `/god-arch` first.
2. Spawn god-auditor briefly to verify ARCH passes have-nots.
3. Spawn god-roadmapper with PRD and ARCH paths.
4. The agent writes `.godpowers/roadmap/ROADMAP.md`.

## Verification

After god-roadmapper returns:
1. Verify ROADMAP.md exists on disk
2. Spawn god-auditor to verify have-nots pass
3. Run `npx godpowers gate --tier=roadmap --project=.` and do not proceed on a non-zero exit
4. Run `npx godpowers state advance --step=roadmap --status=done --project=.` to update `state.json` and regenerate `.godpowers/PROGRESS.md`.

## On Completion

```
Roadmap complete: .godpowers/roadmap/ROADMAP.md

Suggested next: /god-stack (pick the tech) if not already done,
                otherwise /god-repo (scaffold the repo)
```


## Re-invocation contract

What happens if `/god-roadmap` is run when `.godpowers/roadmap/ROADMAP.md` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-roadmapper; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-roadmapper in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-roadmap --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-roadmap-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-roadmap invocation as `op:god-roadmap` for `/god-undo`.

### Idempotency guarantees

- Running `/god-roadmap` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-roadmap --dry-run` is always read-only.
- An interrupted `/god-roadmap` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
