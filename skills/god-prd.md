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

1. If `.godpowers/state.json` does not exist: tell the user to run `/god-init` first.
2. Read `.godpowers/prep/INITIAL-FINDINGS.mdx` if present.
3. Read `.godpowers/prep/IMPORTED-CONTEXT.mdx` if present.
4. Select the primary product form before applying domain assumptions. Use
   `lib/product-routing.selectProductForm` with the durable intent, then load
   `references/building/PRODUCT-FORM-ROUTER.md` and
   `references/building/DOMAIN-COMPOSITION-REGISTRY.md`. If the result is
   ambiguous, record an open question instead of defaulting to a web app.
5. Compose the route in this order: product form, product archetype, industry
   overlay, regulatory overlay. Record an explicit none-evidenced value for an
   empty axis and verify freshness-sensitive regulatory claims.
6. Spawn god-pm with the user's project description from `state.json`,
   `.godpowers/intent.yaml`, and any prep artifacts. Prep artifacts are
   context, not source of truth. Include the ordered product route and the
   selected form-specific completion evidence.
7. The agent writes `.godpowers/prd/PRD.mdx`
8. The agent runs have-nots checks before declaring done
9. If god-pm pauses for a human question: relay to user using pause format
10. If prep artifacts or the PRD show UI or product-experience signals, route
   to `/god-design` next so DESIGN.md can shape architecture. Otherwise route
   to `/god-arch`.

## Verification

After god-pm returns:
1. Verify `.godpowers/prd/PRD.mdx` exists on disk
2. Spawn god-auditor briefly to verify have-nots pass
3. Run `npx godpowers gate --tier=prd --project=.` and do not proceed on a non-zero exit
4. Run `npx godpowers state advance --step=prd --status=done --project=.` to update `state.json` and regenerate `.godpowers/PROGRESS.mdx`.

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
PRD complete: .godpowers/prd/PRD.mdx

Suggested next: /god-design (shape product experience) if UI/product experience is detected, otherwise /god-arch (design the architecture)
```


## Re-invocation contract

What happens if `/god-prd` is run when `.godpowers/prd/PRD.mdx` already exists:

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


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
