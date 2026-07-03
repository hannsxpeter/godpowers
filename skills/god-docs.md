---
name: god-docs
description: |
  Write or update project documentation. Verifies every claim against the
  codebase. Detects docs that lie. Substitution test on every claim,
  three-label test on every sentence.

  Triggers on: "god docs", "/god-docs", "update docs", "write docs",
  "documentation", "fix readme", "verify docs"
---

# /god-docs

Documentation work. Docs that don't lie.

## When to use

- README is out of date
- API docs missing or stale
- New feature shipped, docs need updating
- Onboarding new contributors and docs are insufficient
- Verifying existing docs for drift

## Orchestration

First call `lib/repo-doc-sync.run(projectRoot)` for mechanical repository
documentation claims such as README badges, version references, public surface
counts, and `/god-doctor` sample counts. Report this as `Agent: none, local
runtime only`.

Then call `lib/repo-surface-sync.run(projectRoot)` so documentation work sees
whether route, package, agent, workflow, recipe, extension, or release policy
surfaces disagree before prose claims are rewritten.

Spawn **god-docs-writer** in fresh context.

The agent:
1. Inventories existing docs vs code surface
2. Verifies every claim in existing docs against code
3. Identifies gaps and drift
4. Writes/updates docs
5. Substitution test + three-label test on every claim
6. Writes UPDATE-LOG.md summarizing changes

## On Completion

```
Docs updated.

Verified: N claims across M docs
Drift found and corrected: N
New docs created: N
Existing docs updated: N

Update log: .godpowers/docs/UPDATE-LOG.mdx

Suggested next: /god-status or continue with feature work
```

## Proactive docs drift

Godpowers may invoke docs work proactively in two ways:

| Trigger | Action | Guardrail |
|---|---|---|
| Docs changed after code changed | Spawn `god-docs-writer` in drift-check mode when current workflow owns docs | Do not invent new docs scope |
| Code changed after docs that claim current behavior | Suggest `/god-docs` or spawn drift-check inside `/god-mode`, `/god-feature`, `/god-refactor`, or `/god-sync` closeout | Verify claims against code before editing |
| Repo docs surface drift | Run `lib/repo-doc-sync.run` for safe mechanical fixes, then spawn `god-docs-writer` for prose | Do not auto-invent changelog or release notes |
| Repo structural surface drift | Run `lib/repo-surface-sync.run` and include findings in docs scope | Do not invent routing or agent ownership prose without evidence |
| `REVIEW-REQUIRED.md` contains docs drift items | Suggest `/god-review-changes` first | Do not auto-clear review items |

When auto-invoked, show a concise default note:

```text
Checked docs against changed code. Details were written to .godpowers/docs/UPDATE-LOG.mdx.
```

Use a detailed `Auto-invoked:` card only with `--verbose` or release-gate
debugging.

## Have-Nots

Docs FAIL if:
- Any claim contradicts the code
- Examples don't actually run
- Substitution test passes (reads generic)
- Runbooks not tested before commit
- Diagrams represent past or future state, not current

## Linkage and reverse-sync

Per Phase 13 of the production-ready plan, this workflow participates
in the linkage system:

- On completion of any code change, `lib/reverse-sync.run(projectRoot)`
  is called via god-updater. This:
  - Scans new/modified code for linkage annotations (// Implements: P-MUST-NN, etc.)
  - Updates `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
  - Detects drift via `lib/drift-detector`
  - Appends fenced footers to PRD/ARCH/ROADMAP/STACK/DESIGN
  - Surfaces drift findings to REVIEW-REQUIRED.md

- Stable IDs MUST be used in artifact deltas (P-MUST-NN, ADR-NNN,
  C-{slug}, M-{slug}, S-{slug}, D-{slug}, token paths). The scanner
  picks them up automatically via comment annotations.

- For UI work: agent-browser audit may run as part of /god-build
  post-wave or /god-launch gate (see `/god-test-runtime`).

- Findings flow into the standard REVIEW-REQUIRED.md walkthrough
  via `/god-review-changes`.
