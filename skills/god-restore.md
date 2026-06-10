---
name: god-restore
description: |
  Recover files from .godpowers/.trash/. Lists trash contents, lets the
  user pick what to restore, and moves files back to their original
  location. Pairs with /god-rollback and /god-undo, both of which
  send files to .trash/ rather than permanently deleting.

  Triggers on: "god restore", "/god-restore", "recover deleted",
  "undo the rollback", "where did my prd go"
---

# /god-restore

Recover files from `.godpowers/.trash/`.

## What's in .trash/

Anything that godpowers operations moved out of the active project:
- `.trash/rollback-<id>/` - from `/god-rollback`
- `.trash/redo-<id>/` - pre-redo snapshots
- `.trash/undo-<id>/` - pre-undo snapshots
- `.trash/expired-<date>/` - auto-cleanup candidates

Files in `.trash/` are not deleted until explicit `/god-restore --purge`
or after 30 days (configurable in intent.yaml).

## Usage

### `/god-restore`
List trash contents grouped by operation id with timestamps. Interactive
selection.

### `/god-restore <op-id>`
Restore everything from a specific operation, e.g.
`/god-restore rollback-abc123`.

### `/god-restore <path>`
Restore a specific file by its trash-relative path.

## Process

1. Enumerate `.trash/` entries.
2. Present user with the list (or filter by argument).
3. For each restoration:
   - Check whether the destination still exists. If yes: confirm overwrite.
   - Move file from `.trash/` back to its original path.
   - Run `/god-scan` to refresh linkage for restored artifacts.
4. Append `op:restore` event to reflog.
5. Optionally: re-run `/god-repair` to reconcile state.json with restored content.

## Subcommands

### `/god-restore --purge [<op-id>]`
Permanently delete trash entries. Asks for typed confirmation. Use to
free disk or to commit to a rollback decision.

### `/god-restore --list`
Show trash contents without entering interactive mode.

### `/god-restore --age=<days>`
Show only trash entries older than N days (auto-cleanup candidates).

## Safety

- Restore never silently overwrites without user confirmation.
- The trash is per-project, not global. Multiple projects each have
  their own `.godpowers/.trash/`.
- Trash auto-cleanup is age-based and configurable; default 30 days.

## Implementation

Built-in. Reads `.godpowers/.trash/` directory tree. Writes restored
files back via standard fs operations. Calls `/god-scan` after restore
to refresh linkage map.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
