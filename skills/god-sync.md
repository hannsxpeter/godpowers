---
name: god-sync
description: |
  Sync all affected artifacts after feature work. Updates PRD, ARCH, ROADMAP,
  STACK, DEPLOY, OBSERVE, HARDEN, LAUNCH, BACKLOG, SEEDS, TODOS, THREADS
  based on what the work actually touched. Closes the loop after
  /god-reconcile + feature execution.

  Triggers on: "god sync", "/god-sync", "sync everything", "update all",
  "close the loop", "post-work sync"
---

# /god-sync

Update all artifacts after feature work.

## When auto-invoked

End of feature-addition recipes. After feature work completes, /god-sync
runs to ensure no artifact drifts.

## When manually invoked

User runs `/god-sync` after manual changes. Useful for:
- After making code changes outside the recipe flow
- Periodic sync to catch drift
- Before declaring a milestone complete

## Setup

1. Verify `.godpowers/` exists
2. Call `lib/feature-awareness.run(projectRoot)` so existing projects learn
   about newly installed Godpowers runtime capabilities before sync closes.
   Report this as `Agent: none, local runtime only`.
3. Call `lib/pillars.pillarizeExisting(projectRoot)` if Pillars is absent or
   partial, because every Godpowers project must also carry native Pillars
   context.
4. Call `lib/repo-doc-sync.run(projectRoot)` so README badges, public surface
   counts, release references, contribution docs, and security policy are
   checked before sync closes. Safe mechanical updates are local runtime work.
   Narrative drift should recommend or spawn `god-docs-writer`.
5. Call `lib/repo-surface-sync.run(projectRoot)` so command routing, package
   payload, agent handoffs, workflow metadata, recipe routes, extension packs,
   route quality, recipe coverage, release surfaces, and release policy are
   checked before sync closes. Structural drift should recommend scoped agents
   such as `god-auditor`, `god-reconciler`, `god-coordinator`, or
   `god-docs-writer`.
6. If repo documentation changed durable project truth, plan or apply Pillars
   updates through `lib/pillars.planArtifactSync` or
   `lib/pillars.applyArtifactSync` under the active Pillars policy.
7. If `state.json` contains enabled `source-systems`, auto-invoke
   `lib/source-sync.run(projectRoot)` so current Godpowers progress is written
   back to imported legacy planning, BMAD, or Superpowers companion files. Report this as
   `Agent: none, local runtime only`.
8. Spawn god-updater in fresh context with:
   - The reconciliation verdict (if available from a prior /god-reconcile)
   - Or: re-run reconciliation against current state to detect what changed
   - Recent commits for context

Before spawning, show a visible auto-invoke card:

```
Auto-invoked:
  Trigger: <manual /god-sync, recipe closeout, /god-mode final sync, or other source>
  Agent: god-updater
  Local syncs:
    - pending: feature-awareness, reverse-sync, source-sync, repo-doc-sync, repo-surface-sync, route-quality-sync, recipe-coverage-sync, release-surface-sync, pillars-sync, checkpoint-sync, context-refresh
  Artifacts: pending
  Log: .godpowers/SYNC-LOG.md
```

## Verification

After god-updater returns:
1. Verify each touched artifact passes its tier's have-nots
2. Verify SYNC-LOG.md was appended
3. Verify Pillars source sections were updated for any changed durable
   artifact. Under `--yolo`, pillar updates are auto-applied and logged.
4. Verify state.json reflects new tier statuses
5. Display summary of what changed

## Output

```
Sync complete.

Sync status:
  Trigger: /god-mode final sync
  Agent: god-updater spawned
  Local syncs:
    + reverse-sync: <scanned N files, updated M footers, populated K review items>
    + feature-awareness: <recorded runtime features, refreshed context, or no-op>
    + source-sync: <written legacy planning/BMAD/Superpowers companion files, no-op, or skipped>
    + repo-doc-sync: <refreshed README badges/counts, recommended god-docs-writer, or no-op>
    + repo-surface-sync: <checked routes/package/agents/workflows/extensions, recommended scoped agents, or no-op>
    + route-quality-sync: <checked atomic spawns and typed route outcomes, no-op, or recommended god-auditor>
    + recipe-coverage-sync: <checked high-frequency intent recipes, no-op, or recommended god-reconciler>
    + release-surface-sync: <checked badges/changelog/release/package guards, no-op, or recommended god-docs-writer>
    + pillars-sync: <updated N pillar files, no-op, or proposed>
    + checkpoint-sync: <CHECKPOINT.md updated or skipped>
    + context-refresh: <updated AGENTS.md/tool pointers, no-op, or skipped by setting>
  Artifacts: <changed files, no-op, or deferred>
  Log: .godpowers/SYNC-LOG.md

If this path ran only a local helper, say:
  Agent: none, local runtime only
  Why: this path called lib/reverse-sync.run directly

Updated:
  - prd/PRD.md (added requirement P-MUST-12)
  - arch/ARCH.md (added ADR-007)
  - roadmap/ROADMAP.md (Milestone 2 marked complete)
  - state.json tier-3.deploy (new env var)
  - state.json tier-3.observe (new SLO)
  - backlog/BACKLOG.md (entry resolved)
  - todos/TODOS.md (1 todo marked done)
  - threads/auth-migration.md (progress note)

Have-nots: all passing
SYNC-LOG.md updated.

Current status:
  State: <complete | partial | blocked | no-op>
  Progress: <pct>% when available

Next:
  Recommended: /god-status
  Why: verify the disk-derived state after sync.
```

## What this prevents

| Drift type | How /god-sync catches it |
|---|---|
| Roadmap drift | Marks milestones complete; appends new entries |
| PRD-roadmap divergence | Flags if roadmap added work not in PRD |
| Stale ARCH | Adds ADR for new architectural decisions |
| Forgotten SLOs | New endpoints/features get SLO entries |
| Backlog cruft | Resolved entries linked to commits |
| Orphan todos | Closes superseded todos |
| Lost threads | Active threads get progress notes |
| Pillars drift | Keeps `agents/*.md` aligned with current `.godpowers` artifacts |
| Repo docs drift | Keeps README badges, repo docs, and release surfaces aligned |
| Repo surface drift | Keeps routes, packages, agents, workflows, recipes, and extensions aligned |

The loop:

```
  /god-reconcile  ->  recipe execution  ->  /god-sync
      (before)         (the actual work)       (after)
```

Both bookends run automatically in feature-addition recipes. Both can be
invoked manually for spot-checks.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
