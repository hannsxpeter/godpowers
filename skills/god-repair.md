---
name: god-repair
description: |
  Fix detected drift between state.json and actual disk state. Drift
  happens when files are edited outside Godpowers, when an agent crashes
  mid-operation, or when state.json is hand-edited incorrectly. Repair
  reconciles disk reality with state.

  Triggers on: "god repair", "/god-repair", "fix drift", "reconcile
  state", "state is broken"
---

# /god-repair

Detect and fix drift between `state.json` and disk.

## What it repairs

| Drift kind | Fix |
|---|---|
| state.json says PRD done; PRD.md missing | mark PRD pending, alert user |
| state.json says PRD pending; PRD.md exists and passes lint | mark PRD imported |
| state.json file hash differs from current PRD.md hash | re-hash and update |
| links/ entry points at deleted code file | remove entry, mark artifact for review |
| links/ entry missing for an annotated code file | scan + add |
| Schema version in state.json older than installed | migrate (if path exists) |
| .trash/ contains items older than 30 days | offer to permanently delete |

## Process

1. Run `lib/drift-detector.js detect()` to enumerate drift.
2. Categorize: safe-auto-fix vs needs-confirmation vs blocks-progress.
3. Apply safe-auto-fix immediately (re-hashing, re-running scan).
4. Show needs-confirmation drift to user; ask Y/N for each.
5. For blocks-progress drift, instruct the user (e.g. "manually
   recreate PRD.md or run /god-rollback prd").
6. Append `op:repair` event to reflog with the fix list.

## Subcommands

### `/god-repair`
Run repair across the whole project.

### `/god-repair --dry-run`
Detect drift; do nothing.

### `/god-repair --category=<linkage|hashes|trash|schema>`
Only repair one category.

### `/god-repair --interactive`
Walk every drift item with the user, even safe-auto-fixes.

## Difference from related commands

- `/god-doctor`: read-only diagnostic; suggests `/god-repair` for fixable items
- `/god-scan`: rebuilds the linkage map (one specific kind of drift)
- `/god-repair`: covers all drift categories including linkage

## Implementation

Built-in. Reads + writes:
- `.godpowers/state.json`
- `.godpowers/links/`
- `.godpowers/log` (appends repair event)

Calls into `lib/drift-detector.js`, `lib/code-scanner.js`, `lib/reverse-sync.js`.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
