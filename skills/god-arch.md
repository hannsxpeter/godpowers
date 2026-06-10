---
name: god-arch
description: |
  Design system architecture. Spawns the god-architect specialist agent in a
  fresh context. Gated on PRD.

  Triggers on: "god arch", "/god-arch", "design architecture", "system design"
---

# /god-arch

Spawn the **god-architect** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify `.godpowers/prd/PRD.md` exists. If not, tell user to run `/god-prd` first.
2. Spawn god-auditor briefly to verify PRD passes have-nots. If fails, report and stop.
3. If `.godpowers/design/DESIGN.md` or `.godpowers/design/PRODUCT.md` exists,
   include it as input. Design is optional, but when present it informs UI
   containers, routes, flows, and tradeoffs.
4. Spawn god-architect with the PRD path and full context window
5. The agent writes `.godpowers/arch/ARCH.md` and ADRs to `.godpowers/arch/adr/`

## Verification

After god-architect returns:
1. Verify ARCH.md and ADRs exist on disk
2. Spawn god-auditor to verify have-nots pass
3. Run `npx godpowers gate --tier=arch --project=.` and do not proceed on a non-zero exit
4. Run `npx godpowers state advance --step=arch --status=done --project=.`

## Pause Format

Relay any pauses from god-architect using the standard format (What/Why/Options/Default).

## On Completion

```
Architecture complete: .godpowers/arch/ARCH.md

Suggested next: /god-roadmap (sequence the work) or /god-stack (pick the tech)
Both are gated on ARCH and can run in either order.
```


## Re-invocation contract

What happens if `/god-arch` is run when `.godpowers/arch/ARCH.md` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-architect; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-architect in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-arch --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-arch-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-arch invocation as `op:god-arch` for `/god-undo`.

### Idempotency guarantees

- Running `/god-arch` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-arch --dry-run` is always read-only.
- An interrupted `/god-arch` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
