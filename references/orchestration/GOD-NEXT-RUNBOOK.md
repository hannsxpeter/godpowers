# God Next Runbook

This reference owns the detailed process notes for `/god-next`. The skill file stays a concise dispatch contract.

## Invocation modes

1. Post-completion routing reads `routing/<just-completed>.yaml`, applies success-path and conditional-next rules, runs any configured standards gate, and announces the next command.
2. Pre-flight routing reads `routing/<target>.yaml`, evaluates prerequisites, and offers auto-completable prerequisites before the target command runs.
3. Standalone routing reads disk state, uses `lib/router.js` for structural next steps, then uses recipes when the project is already in steady state.
4. Intent-based routing uses `lib/recipes.js` for fuzzy text, ranked recipes, and state-aware command sequences.

## Data sources

Use runtime routing YAML, recipes, `lib/command-families.js`, `lib/router.js`, `lib/dashboard.js`, state.json, PROGRESS.md, CHECKPOINT.md, and completed artifacts.

Read `.godpowers/prep/INITIAL-FINDINGS.mdx` and `.godpowers/prep/IMPORTED-CONTEXT.mdx` when present. Treat them as preparation context only.

## Route detail

When the suggestion is based on state.json, show a three-line path ahead: current state, next command, and the following gate if known.

When prerequisites are missing, name the missing prerequisite, the auto-completable command when available, and the exact decision needed from the user.

When a standards gate fails, show the failures, suggest `/god-redo` with feedback or `/god-skip` with a reason, and do not auto-progress.

## Edge cases

State drift routes to `/god-repair`. Safe sync blockers route to `/god-reconcile Release Truth And Safe Sync` before deploy, observe, harden, launch, broad migration, or resume work.

Unresolved Critical harden findings block launch in default mode and under `--yolo`.

In steady state, use the work-family ladders before raw route order so feature, hotfix, refactor, docs, dependency, audit, hygiene, and preflight intents resolve to the narrowest useful command.
