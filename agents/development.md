---
pillar: development
status: present
always_load: false
covers: [local setup, developer workflow, debugging, generated artifacts]
triggers: [develop, development, local setup, bootstrap, debug]
must_read_with: [repo, quality]
see_also: [stack]
---

## Scope

- [DECISION] This pillar captures the contributor inner loop for the Godpowers repository.

## Context

- [DECISION] Contributors use Node.js 18 or newer and npm from the repository root.
- [DECISION] Source-controlled commands, specialist contracts, routes, workflows, schemas, and runtime helpers are edited in place without a compilation step.
- [DECISION] Generated `.godpowers/PROGRESS.mdx` and tier state views derive from `.godpowers/state.json` and must not be edited directly.

## Decisions

- [DECISION] Focused tests run before `npm test`, while `npm run release:check` is reserved for complete release evidence because it includes coverage and package checks.

## Rules

- [DECISION] Preserve unrelated user changes in dirty worktrees.
- [DECISION] Add new runtime behavior in `lib/` and keep `bin/install.js` a thin dispatch surface.

## Workflows

1. [DECISION] Read the applicable Pillars load set and source-controlled route before changing a command.
2. [DECISION] Run the smallest focused test that exercises the change.
3. [DECISION] Run `npm test`, `npm run lint`, and relevant package checks before handoff.

## Watchouts

- [HYPOTHESIS] Direct edits to generated views can appear correct locally while leaving authoritative state stale.

## Touchpoints

- [DECISION] Development workflow touches `lib/`, `scripts/`, `skills/`, `specialists/`, `routing/`, `workflows/`, and `.godpowers/state.json`.

## Gaps

(none)
