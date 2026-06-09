---
name: god-next
description: |
  Decision engine. For any command intent, checks prerequisites, proposes
  auto-completion of missing prerequisites, runs standards checks at gates,
  and suggests next commands after success. Backed by runtime routing YAML
  configurations.

  Triggers on: "god next", "/god-next", "what's next", "what should I do next",
  "next step", "continue"
---

# /god-next

The unified decision engine. Route between commands based on disk state,
routing definitions, recipes, command families, and user intent.

## Runtime module resolution

1. If `<projectRoot>/lib/router.js` exists, use the repository checkout runtime at `<projectRoot>`.
2. Otherwise use the installed bundle at `<tool-config-dir>/godpowers-runtime`.
3. Read routing definitions from `<runtimeRoot>/routing/*.yaml` and recipes from `<runtimeRoot>/routing/recipes/*.yaml`.
4. Load `<runtimeRoot>/lib/command-families.js` before resolving broad intent.
5. Load `<runtimeRoot>/lib/dashboard.js` and render the shared dashboard before route-specific detail.
6. If no dashboard module is available, say `Dashboard engine: unavailable, manual scan used`.

## Required references

Read these references before producing a route recommendation:

- `<runtimeRoot>/references/orchestration/GOD-NEXT-RUNBOOK.md` for invocation modes, route detail, and edge cases.
- `<runtimeRoot>/references/shared/DASHBOARD-CONTRACT.md` for the shared status and proposition shape.

## Invocation modes

- Post-completion: after a command finishes, read its routing file and announce the next gate.
- Pre-flight: before a target command runs, evaluate prerequisites and offer auto-completion when available.
- Standalone: when the user asks what is next, derive the recommendation from disk state.
- Intent-based: when the user uses fuzzy text, match recipes and command families before raw route order.

## Decision rules

- Disk state beats chat memory.
- state.json and completed artifacts beat prep artifacts.
- INITIAL-FINDINGS.md and IMPORTED-CONTEXT.md explain context but do not override completed Godpowers artifacts.
- If PRD is complete, DESIGN is missing, and UI or product-experience signals exist, suggest `/god-design` before `/god-arch`.
- Safe sync blockers route to `/god-reconcile Release Truth And Safe Sync` before release-facing work.
- Unresolved Critical harden findings block `/god-launch` in default mode and under `--yolo`.
- Missing prerequisites should name the prerequisite, the route that can create it, and the smallest user decision needed.
- Standards failures should suggest `/god-redo` with feedback or `/god-skip` with a reason, then stop.

## Output contract

Render this sequence:

1. `Godpowers Next` heading.
2. Shared Godpowers Dashboard from `DASHBOARD-CONTRACT.md`.
3. Suggested next command and one-line reason.
4. Optional three-line path ahead when state allows it.
5. Optional pre-flight, standards, or blocker detail.
6. Proactive checks using the shared labels.
7. Proposition block unless the selected command already launched.

Keep the route preview to three lines unless the user asks for the full plan.
