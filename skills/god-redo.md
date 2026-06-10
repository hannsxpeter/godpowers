---
name: god-redo
description: |
  Re-run a tier or sub-step that already completed. Useful when an
  upstream change invalidates downstream work, or when the user wants
  a fresh pass with different parameters. Pairs with /god-undo for
  full revert + rerun.

  Triggers on: "god redo", "/god-redo", "rerun tier", "redo arch",
  "regenerate the prd"
---

# /god-redo

Re-run a tier or sub-step.

## Usage

### `/god-redo <tier-or-substep>`
Examples:
- `/god-redo prd` (re-run god-pm)
- `/god-redo arch` (re-run god-architect; warn if downstream tiers exist)
- `/god-redo build` (re-run god-planner + executor + reviewers)
- `/god-redo tier-1` (re-run all of planning)

## Process

1. Identify the tier or sub-step from the argument.
2. If it has downstream completed work in state.json: warn the user.
   Options: A) `/god-rollback` first to clean state, B) overwrite in
   place (downstream may go stale), C) cancel.
3. Snapshot the current artifact to `.godpowers/.trash/redo-<id>/` so
   `/god-undo` can revert.
4. Re-spawn the producing agent in fresh context.
5. Verify with `/god-standards` if a routing config exists for the
   sub-step.
6. Update state.json + append a `op:redo` event to the reflog.

## Difference from /god-undo + run-again

- `/god-undo` then run-again: two operations, easier to reason about.
- `/god-redo`: single operation, atomic in the reflog. Use when you
  know you want a redo.

## Subcommands

### `/god-redo --dry-run`
Show what would be re-run and what downstream work would be marked stale.

### `/god-redo --force`
Skip the downstream-stale warning. Use with care.

## Implementation

Built-in. Reads state.json to find the sub-step. Spawns the same agent
that originally produced the artifact. Updates the linkage map via
`/god-scan` after the artifact is rewritten.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
