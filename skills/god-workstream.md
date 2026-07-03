---
name: god-workstream
description: |
  Manage parallel workstreams. Create, list, switch, and merge isolated
  workspaces for parallel development. Each workstream has its own .godpowers/
  state and git branch.

  Triggers on: "god workstream", "/god-workstream", "parallel work", "new branch",
  "split work"
---

# /god-workstream

Manage parallel workstreams for concurrent development.

## Subcommands

### `/god-workstream new <name>`
Create a new workstream:
1. Create git branch `workstream/<name>`
2. Create `.godpowers/workstreams/<name>/` with isolated PROGRESS.md
3. Switch to the new branch and workstream
4. New workstream inherits PRD/ARCH/ROADMAP from main but tracks its own build state

### `/god-workstream list`
List all active workstreams:
```
Active workstreams:
  * main          (current) Build: 60% complete
    feature-x     Build: 20% complete
    bugfix-y      Build: 90% complete (ready to merge)
```

### `/god-workstream switch <name>`
Switch to a different workstream:
1. Verify current workstream has no uncommitted changes (or stash them)
2. Checkout `workstream/<name>` branch
3. Load `.godpowers/workstreams/<name>/PROGRESS.mdx` as active state

### `/god-workstream status`
Show detailed status of current workstream and any conflicts with main.

### `/god-workstream merge <name>`
Merge a workstream back to main:
1. Verify the workstream has no incomplete sub-steps (or confirm partial merge)
2. Run /god-review on the diff
3. If passes: merge to main, archive workstream artifacts
4. If fails: report findings, do not merge

### `/god-workstream remove <name>`
Delete a workstream (with confirmation if not merged).

## When to use

- Two engineers working on different parts of the same project
- Exploring a risky refactor without disrupting main work
- Running /god-mode for a sub-feature in isolation while main keeps moving

## On Completion

Display the new active workstream and suggested next command.
