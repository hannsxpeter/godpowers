---
name: god-upgrade
description: |
  Framework, version, or stack migration. Uses expand-contract pattern,
  incremental rollout with parallel paths during transition, metric-gated
  steps. Avoids big-bang migrations.

  Triggers on: "god upgrade", "/god-upgrade", "migrate framework", "upgrade version",
  "framework migration", "stack migration", "version bump"
---

# /god-upgrade

Migrate a framework, version, or stack component safely.

## When to use

- React 17 -> React 19
- Node 18 -> Node 22
- Python 3.10 -> 3.13
- Express -> Fastify
- Replacing one library with another

## When NOT to use

- Single dependency bump (patch/minor): use /god-update-deps
- New feature, not migration: use /god-feature
- Refactor without version change: use /god-refactor

## Setup

Ask the user:
- From: current version/framework
- To: target
- Why: business reason (not "newer is better")

## Orchestration

### Phase 1: Strategy (god-migration-strategist)
Spawn **god-migration-strategist** in fresh context with the migration target.

The agent:
1. Audits surface area (which files/modules touched)
2. Reads upstream changelog for breaking changes
3. Assesses test coverage on affected surface
4. Drafts MIGRATION.md with phased plan (expand -> migrate slices -> contract)
5. Identifies risks and rollback strategy

### Phase 2: Test Coverage Gap-Fill
If coverage is insufficient on the affected surface:
Spawn **god-planner** to plan adding tests
Spawn **god-executor** + reviewers per test slice
Test coverage must be sufficient BEFORE migration starts.

### Phase 3: Expand
For each component being migrated:
- Spawn **god-executor** to introduce the new version alongside the old
- Add abstraction layer if needed (branch-by-abstraction)
- Both code paths exist
- Tests cover both

### Phase 4: Migrate Slices
For each migration slice:
1. Spawn **god-executor** to migrate one slice
2. Spawn **god-spec-reviewer** + **god-quality-reviewer**
3. Atomic commit
4. Spawn **god-deploy-engineer** with feature flag (1% -> 10% -> 50% -> 100%)
5. Spawn **god-observability-engineer** to monitor key metrics
6. Wait at least 24 hours before next slice (configurable)
7. If metrics regress: rollback this slice, investigate

### Phase 5: Contract
After 100% migrated AND a monitoring window passes:
- Spawn **god-executor** to remove old code path
- Spawn reviewers
- Atomic commit: `chore(migration): remove old <thing> path (100% on new)`

## On Completion

```
Migration complete: <from> -> <to>

Surface migrated: N files, N modules
Slices: N (all committed and verified)
Old code path: removed
Monitoring window: passed

Suggested next: /god-status
Or: /god-update-deps to address any other outdated dependencies
```

## Have-Nots

Upgrade FAILS if:
- Big-bang migration (no incremental slices)
- No expand-contract pattern
- Tests not added before migration starts
- Metrics not gating slice progression
- Old code removed before 100% migrated
- No rollback plan per slice

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
