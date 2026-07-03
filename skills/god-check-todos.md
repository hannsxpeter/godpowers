---
name: god-check-todos
description: |
  List pending todos from .godpowers/todos/TODOS.mdx. Optionally select one
  to work on (routes to appropriate workflow).

  Triggers on: "god check todos", "/god-check-todos", "show todos", "what's pending"
---

# /god-check-todos

List todos and optionally route to a workflow.

## Process

1. Read `.godpowers/todos/TODOS.mdx`
2. Display open todos grouped by priority
3. Ask: "Want to work on one of these?"
4. If yes: route to the right workflow based on todo nature:
   - "fix" -> /god-debug or /god-hotfix
   - "add" -> /god-feature
   - "refactor" -> /god-refactor
   - "research" -> /god-spike
   - default: /god-quick

## Output

```
Open todos (7):

P0 (1):
  - 2026-04-15: Fix auth bypass in /api/admin (CRITICAL-001 from harden)

P1 (3):
  - 2026-04-20: Update Stripe library to v14 (deps audit)
  - 2026-04-22: Add CSP headers (HARDEN-04)
  - ...

P2 (3): ...

Want to work on one? (number, or "no")
```
