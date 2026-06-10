---
name: god-quick
description: |
  Execute a small task with Godpowers atomic commits and TDD discipline, but
  skip optional gates (no PRD, no ARCH, no roadmap). For tasks too big for
  /god-fast but too small for /god-build.

  Triggers on: "god quick", "/god-quick", "small task", "minor feature"
---

# /god-quick

Run a focused task with TDD and atomic commits, but skip the full planning
workflow.

## When to use

- One small feature with clear scope (1-3 hours of work)
- Refactor with regression risk (TDD matters here)
- Bug fix that needs a regression test

## Process

1. Ask the user for the task description (one paragraph max)
2. Skip PRD, ARCH, ROADMAP, STACK
3. Spawn god-planner directly with the task description (treat it as a single slice)
4. Spawn god-executor for the slice (TDD enforced)
5. Spawn god-spec-reviewer + god-quality-reviewer
6. Atomic commit on pass

## What still applies

- TDD enforcement
- Two-stage review
- Atomic commit
- Have-nots check on the code

## What's skipped

- Planning tier (PRD/ARCH/ROADMAP/STACK)
- Build planning into waves (single slice only)
- Project state updates when no `.godpowers/` exists

## On Completion

```
Quick task complete.
Test results: [N] passed
Commit: [SHA]
```
