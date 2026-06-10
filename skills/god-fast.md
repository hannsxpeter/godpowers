---
name: god-fast
description: |
  Make a quick inline edit without full Godpowers planning overhead. For trivial
  changes: typo fixes, config tweaks, single-line updates. No agents, no plans,
  no project state updates.

  Triggers on: "god fast", "/god-fast", "quick fix", "trivial change", "tiny tweak"
---

# /god-fast

Skip the full pipeline. Make a small edit inline.

## When to use

- Single-line bug fix
- Config tweak (port number, env var name)
- Typo correction
- Documentation typo
- One-character syntax fix

## When NOT to use

- Anything that affects user-visible behavior -> use /god-build
- Anything without an existing test -> use /god-build (TDD)
- Anything you can't describe in one sentence

## Process

1. Make the edit directly. No planner, no executor, no reviewer.
2. Run the existing test suite to verify nothing broke.
3. Commit with a one-line message.

## Guardrails

- If running tests reveals regressions: STOP. Switch to /god-build or /god-debug.
- If the change touches more than 3 lines: STOP. Switch to /god-build.
- Skip project state updates (this is below the planning threshold).

## On Completion

```
Quick fix applied: [one-line description]
Tests: [N] passed
Commit: [SHA]
```
