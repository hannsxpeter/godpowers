---
name: god-feature
description: |
  Add a feature to an existing project. Skips the full project-run setup (no /god-init,
  no repo scaffolding, no /god-stack). Mini-PRD for the feature, optional
  micro-architecture, build, deploy via existing pipeline, harden new code.

  Triggers on: "god feature", "/god-feature", "add a feature", "new feature",
  "build feature"
---

# /god-feature

Add a feature to an already-existing project.

## When to use

- You have a working app with deployed code
- You want to add a discrete feature
- Full /god-mode would be overkill (it'd re-run PRD/ARCH/STACK for the whole product)

## When NOT to use

- New project: use /god-mode
- Trivial change: use /god-fast or /god-quick
- Refactor: use /god-refactor
- Bug fix: use /god-debug or /god-hotfix

## Setup

1. Verify `.godpowers/` exists. If not, fall back to /god-init first.
2. Read existing PRD, ARCH, ROADMAP for context
3. Compute the Pillars load set for the feature request with
   `lib/pillars.computeLoadSet(projectRoot, taskText)`. Load
   `agents/context.md` and `agents/repo.md` first, then task-routed pillars
   such as `auth`, `data`, `api`, `ui`, or `quality`.

## Orchestration

### Phase 1: Mini-PRD
Spawn **god-pm** in fresh context with instructions:
"This is a feature addition to an existing product. Write a feature-scoped
PRD section. The product PRD already exists at .godpowers/prd/PRD.md; do NOT
rewrite it. Append the feature spec to .godpowers/features/<feature-slug>/PRD.md."

### Phase 2: Micro-architecture (conditional)
If the feature touches new architectural ground:
Spawn **god-architect** with instructions:
"Existing ARCH.md describes the system. This feature extends it. Write only
the architectural deltas to .godpowers/features/<feature-slug>/ARCH-DELTA.md
and update relevant ADRs."

If the feature fits within existing architecture: skip this phase.

### Phase 3: Plan and Build
Spawn **god-planner** scoped to the feature only.
Then run god-executor + god-spec-reviewer + god-quality-reviewer per slice.

### Phase 4: Deploy
Use existing deploy pipeline (.godpowers/deploy/STATE.md). No new pipeline.
Feature flag the rollout if the feature is high-risk.

### Phase 5: Harden (just the new code)
Spawn **god-harden-auditor** with instructions:
"Review only the new code added for this feature. Existing code already
audited at .godpowers/harden/FINDINGS.md."

### Phase 6: Soft launch
No landing page. No marketing. The feature ships behind a flag, gradually
enabled. Update CHANGELOG.

### Phase 7: Pillars sync
If the feature changes durable project truth, plan updates through
`lib/pillars.planArtifactSync`. Default mode proposes the pillar edits for
review. Under `/god-mode --yolo`, apply them immediately and log the decision.

## On Completion

```
Feature complete: .godpowers/features/<feature-slug>/

Suggested next: /god-status (see overall project state)
Or: /god-feature for the next feature
```

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


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
