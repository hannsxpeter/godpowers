---
name: god-stack
description: |
  Pick the technology stack. Spawns the god-stack-selector agent in a fresh
  context. Gated on Architecture.

  Triggers on: "god stack", "/god-stack", "pick the stack", "what stack"
---

# /god-stack

Spawn the **god-stack-selector** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify `.godpowers/arch/ARCH.mdx` exists. If not, tell user to run `/god-arch` first.
2. Read the product route recorded by PRD or Architecture. If absent, select
   the product form before applying archetype, industry, or regulatory
   guidance through `lib/product-routing`.
3. Load `references/building/DOMAIN-COMPOSITION-REGISTRY.md`. Score the primary
   stack profile first, then add only hard constraints from secondary
   profiles. Do not average complete profile matrices.
4. Verify current regulatory obligations and provider capabilities before
   making a freshness-sensitive commitment.
5. Spawn god-stack-selector with the ARCH path and ordered product route.
6. Unless `--yolo` is set, the agent runs the gated widening pass in
   `references/planning/DIVERGENCE.md` before scoring, which widens the category
   list as well as the candidates inside each category.
7. The agent writes `.godpowers/stack/DECISION.mdx`.

## Verification

After god-stack-selector returns:
1. Verify DECISION.md exists on disk
2. Run `npx godpowers gate --tier=stack --project=.` and do not proceed on a non-zero exit
3. Run `npx godpowers state advance --step=stack --status=done --project=.` to update `state.json` and regenerate `.godpowers/PROGRESS.mdx`.

## On Completion

```
Stack decision complete: .godpowers/stack/DECISION.mdx

Suggested next: /god-repo (scaffold the repo with the chosen stack)
```


## Re-invocation contract

What happens if `/god-stack` is run when `.godpowers/stack/DECISION.mdx` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-stack-selector; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-stack-selector in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-stack --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-stack-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-stack invocation as `op:god-stack` for `/god-undo`.

### Idempotency guarantees

- Running `/god-stack` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-stack --dry-run` is always read-only.
- An interrupted `/god-stack` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
