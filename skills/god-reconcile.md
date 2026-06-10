---
name: god-reconcile
description: |
  Comprehensive reconciliation across all impacted artifacts before doing
  feature work. Checks PRD, ARCH, ROADMAP, STACK, REPO, DEPLOY, OBSERVE,
  HARDEN, LAUNCH, BACKLOG, SEEDS, TODOS, THREADS, repository documentation,
  repository surface, runtime feature awareness, source-system sync-back, and
  host capabilities in parallel. Replaces /god-roadmap-check (kept for
  back-compat; this is the comprehensive version).

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
  HOST:       [full | degraded | unknown]

Recommended sequence:
  Preflight:  [/god-redo prd, /god-arch delta-only]
  Main work:  [/god-feature scoped to Milestone 2]
  Post-work:  [/god-sync]

Proposition:
  1. Implement partial: [run only the first preflight command]
  2. Implement complete: [run the full recommended sequence]
  3. Discuss more: /god-discuss [ambiguous overlap or artifact conflict]
  4. Cancel: leave artifacts unchanged
Recommended: [one option and why]
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
