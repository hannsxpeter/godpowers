---
name: god-rollback
description: |
  Walk back a tier and everything downstream. Moves affected artifacts
  to .godpowers/.trash/ and marks tier statuses as pending. Heavier
  than /god-undo (which is single-operation). Use when a tier is
  fundamentally wrong and downstream cleanup is needed.

  Triggers on: "god rollback", "/god-rollback", "roll back tier", "undo
  the architecture and everything that depends on it"
---

# /god-rollback

Walk back a tier + every downstream tier in one atomic operation.

## Usage

### `/god-rollback <tier>`

Examples:
- `/god-rollback arch` - moves ARCH.md, ROADMAP.md, STACK.md,
  build/, deploy/, observe/, launch/, harden/ to `.trash/rollback-<id>/`.
  Marks each tier `pending` in state.json.
- `/god-rollback deploy` - moves deploy/, observe/, launch/, harden/.
- `/god-rollback build` - moves build/, deploy/, observe/, launch/,
  harden/. Resets the linkage map for code under those tiers.

## Process

1. Identify the tier from the argument.
2. Compute the dependency closure: every tier whose `needs:` includes
   the target tier (transitively).
3. Show the user what will move and ask for confirmation. This is
   destructive (recoverable via `/god-restore`, but disruptive).
4. Move all affected artifacts to `.godpowers/.trash/rollback-<id>/`
   preserving directory structure.
5. Mark each tier `status: pending` in state.json.
6. Append a `op:rollback` event to the reflog with the full closure.
7. Truncate the linkage map entries belonging to rolled-back artifacts.
8. Let the generated `PROGRESS.md` view refresh from `state.json`.

## Difference from /god-undo

- `/god-undo`: revert the single most recent operation
- `/god-rollback`: revert a tier and all downstream work in one atomic op

## Difference from /god-skip

- `/god-skip`: record a decision not to do the work; nothing moves
- `/god-rollback`: undo work that was already done

## Subcommands

### `/god-rollback --dry-run`
Show what would move; do nothing.

### `/god-rollback --to=<tier>`
Roll back to (but not including) a specific tier. Equivalent to rolling
back the tier immediately after.

## Recovery

Everything goes to `.godpowers/.trash/rollback-<id>/`. Use:
- `/god-restore` to recover specific files
- `/god-undo` to undo the rollback as a whole (within reflog window)

## Implementation

Built-in. Reads workflow graph from state.json `tiers` + workflow YAML.
Writes via `lib/reverse-sync.js` (for linkage truncation) and standard
fs operations (for artifact move).


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
