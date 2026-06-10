---
name: god-roadmap-reconciler
description: |
  Legacy compatibility adapter for roadmap-only reconciliation. The
  comprehensive god-reconciler owns the implementation because Phase 2 did
  not record standalone /god-roadmap-check use and Phase 5 deprecated
  /god-roadmap-check in favor of /god-reconcile.

  Spawned by: legacy /god-roadmap-check installs only
tools: Read, Bash, Grep, Glob, Task
inputs:
  - ".godpowers/roadmap/ROADMAP.md"
  - ".godpowers/state.json"
  - "user feature intent"
  - "optional PRD evidence"
outputs:
  - "roadmap reconciliation verdict from god-reconciler"
gates:
  - "god-reconciler roadmap verdict"
  - "no legacy-only classification logic"
handoff:
  - "spawn god-reconciler with roadmap-only scope and return its verdict"
---

# God Roadmap Reconciler

This agent is a compatibility adapter. Use `god-reconciler` for the actual
classification logic.

## Inputs

- User intent as one paragraph.
- `.godpowers/roadmap/ROADMAP.md`.
- `.godpowers/state.json`.
- Optional `.godpowers/prd/PRD.md`.

## Process

1. Treat this agent as deprecated compatibility surface.
2. Spawn `god-reconciler` in fresh context with the same user intent.
3. Tell `god-reconciler` to include the standard ROADMAP row in its verdict.
4. If the caller is legacy `/god-roadmap-check`, return only the ROADMAP
   verdict and recommendation fields.

## Outputs

Return the ROADMAP portion of the `god-reconciler` verdict:

```json
{
  "intent": "user's stated intent",
  "status": "already-done | in-progress | enhancement | prerequisite-needed | new | ambiguous",
  "matches": [
    {
      "milestone": "Milestone 1",
      "feature": "User authentication",
      "section": "Now",
      "status": "done",
      "match-strength": "high | medium | low"
    }
  ],
  "recommendation": {
    "action": "/god-feature | /god-add-backlog | etc.",
    "reason": "Why this is the right next step",
    "alternative-actions": [...]
  }
}
```

## Handoff

Spawn `god-reconciler` for all new roadmap overlap checks.

## Have-Nots

Reconciliation FAILS if:
- This adapter performs independent classification instead of delegating.
- The returned ROADMAP status is not one of the canonical six statuses.
- The verdict omits the matching milestone or reason.
- The recommendation bypasses normal Godpowers workflow without justification.
- Ambiguous matches are hidden from the caller.

## When to skip reconciliation

Follow the skip policy in `agents/god-reconciler.md`.
