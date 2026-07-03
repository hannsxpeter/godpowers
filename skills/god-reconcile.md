---
name: god-reconcile
description: |
  Check before feature work (read-only for artifacts; writes only the
  .godpowers/sync/ safe-sync gate markers): reconcile all impacted artifacts to
  find conflicts before you build. This is the BEFORE half of the pair; its
  write-back counterpart is /god-sync, which updates artifacts AFTER the work.
  Checks PRD, ARCH, ROADMAP, STACK, REPO, DEPLOY, OBSERVE,
  HARDEN, LAUNCH, BACKLOG, SEEDS, TODOS, THREADS, repository documentation,
  repository surface, runtime feature awareness, source-system sync-back,
  sibling godplans/godaudits artifacts, and host capabilities in parallel.
  Replaces /god-roadmap-check (kept for back-compat; this is the
  comprehensive version).

  Triggers on: "god reconcile", "/god-reconcile", "check all", "full check",
  "where does this fit", "what does this touch"
---

# /god-reconcile

Multi-artifact reconciliation before feature work.

## When auto-invoked

When the user describes feature intent and the matched recipe is in the
`feature-addition` category, /god-next automatically calls /god-reconcile
before showing the recipe sequence.

## When manually invoked

User runs `/god-reconcile` with an intent description. Useful for:
- Sanity check before starting any non-trivial work
- "Where does this fit in the existing system?"
- Resolving overlap between intent and existing artifacts

## Setup

1. Verify `.godpowers/` exists. If not: nothing to reconcile against; suggest /god-init.
2. Spawn god-reconciler in fresh context with the intent.

## Verification

After god-reconciler returns:
1. Verify all core artifact and runtime surface statuses are reported (no silent skips)
2. Display structured verdict to user
3. Present recommended sequence (preflight + main work + post-work)
4. Await user decision

## Safe-sync gate

When god-reconciler finds blocking cross-artifact sync conflicts (artifacts
that contradict each other in a way that would make Tier 3 shipping claims
false), it writes `.godpowers/sync/SAFE-SYNC-PLAN.mdx`: the conflict list plus
concrete resolution steps. While that plan exists with no resolution marker,
`lib/router.js` blocks Tier 3 commands (/god-deploy, /god-observe,
/god-harden, /god-launch, and /god-mode's Tier 3 substeps) through the
`safe-sync-clear` prerequisite and routes back to /god-reconcile. That is why
those commands refuse to run while the plan is open.

When the user reports the conflicts resolved, /god-reconcile re-checks each
conflict in the plan against the artifacts. If all are resolved, it writes
`.godpowers/sync/SAFE-SYNC-RESOLVED.mdx` (which conflicts were resolved, how,
and when), reports the gate cleared, and Tier 3 commands unblock. If any
conflict remains, it reports which ones and leaves the plan in place.

## Output

```
Reconciliation: <intent>

Where this intersects existing artifacts:

Tier 1 (Planning):
  PRD:        [status] [action if needed]
  ARCH:       [status] [action if needed]
  ROADMAP:    [status] [match if any]
  STACK:      [status]

Tier 2 (Building):
  REPO:       [status]
  BUILD:      [status]

Tier 3 (Shipping):
  DEPLOY:     [status]
  OBSERVE:    [status]
  HARDEN:     [status]
  LAUNCH:     [status]

Capture:
  BACKLOG:    [status] [match if any]
  SEEDS:      [status] [match if any]
  TODOS:      [status] [match if any]
  THREADS:    [status] [match if any]

Runtime and repository surfaces:
  REPO DOCS:  [fresh | needs-mechanical-sync | needs-docs-writer]
  SURFACE:    [fresh | needs-surface-sync | needs-safe-fix | needs-human-review]
  FEATURES:   [fresh | needs-awareness-refresh | needs-migration-judgment]
  SOURCE:     [not-applicable | fresh | needs-sync-back | blocked-by-conflict]
  PLAN:       [not-applicable | planned-in-godplans GP-<n> | not-in-plan | plan-conflict]
  AUDIT:      [not-applicable | addresses-ga-task GA-<n> | invalidates-finding F-<id> | unrelated]
  HOST:       [full | degraded | unknown]

Safe-sync gate: [clear | BLOCKING - plan written to .godpowers/sync/SAFE-SYNC-PLAN.mdx;
                 /god-deploy, /god-observe, /god-harden, /god-launch stay blocked
                 until resolved]

Recommended sequence:
  Preflight:  [/god-redo prd, /god-arch delta-only]
  Main work:  [/god-feature scoped to Milestone 2]
  Post-work:  [/god-sync]

Next commands:
- /god-next: Run only the first preflight command.
- /god-sync: Run the full recommended sync sequence after reconciliation.
- /god-discuss [ambiguous overlap or artifact conflict]: Resolve the open question before continuing.
- /god-reconcile (when the safe-sync gate is BLOCKING): after fixing the conflicts
  in SAFE-SYNC-PLAN.mdx, re-run to verify, write
  .godpowers/sync/SAFE-SYNC-RESOLVED.mdx, and clear the Tier 3 gate.
- stop: Leave artifacts unchanged.
```

## Difference from /god-roadmap-check

| | /god-roadmap-check | /god-reconcile |
|---|---|---|
| Scope | ROADMAP only | Core artifacts plus runtime and repository surfaces |
| Use | Quick check | Comprehensive |
| Auto-invoked | legacy compatibility only | by feature-addition recipes |
| Replaces | delegated to /god-reconcile | primary command |

For new projects, use /god-reconcile. /god-roadmap-check remains a
compatibility alias that asks `god-reconciler` for ROADMAP-focused output.
