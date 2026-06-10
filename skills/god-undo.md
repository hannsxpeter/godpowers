---
name: god-undo
description: |
  Revert the last operation via the reflog. Reads .godpowers/log, identifies
  the most recent operation, and applies the inverse. Confirms before any
  destructive change.

  Triggers on: "god undo", "/god-undo", "revert last", "undo that"
---

# /god-undo

Revert the most recent state-changing operation.

## Process

1. Read `.godpowers/log` (the reflog)
2. Identify the most recent operation
3. Compute the inverse:
   - `op:run` -> roll back tier statuses + move artifacts to .trash
   - `op:extension.install` -> uninstall the extension
   - `op:agent.update` -> revert agent version
4. Show the user what will happen, ask for confirmation
5. Execute on confirm; append a `op:undo` event to the log

## Safety

Destructive operations move files to `.godpowers/.trash/` (recoverable).
Never permanent deletion without explicit /god-restore decision.

## Subcommands

### `/god-undo`
Undo the most recent operation.

### `/god-undo --to=<op-id>`
Undo back to a specific operation.

### `/god-undo --dry-run`
Show what would happen without doing it.

## On Completion

```
Undone: [operation]
Restored: [N] artifacts to .trash for review
Reflog now points to: [previous op-id]

Suggested next:
  - /god-status to verify current state
  - /god-restore if you want to recover something specific
```


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
