---
name: god-roadmap-check
deprecated: true
replacement: god-reconcile
successor: god-reconcile
description: |
  Check if user intent overlaps with the existing ROADMAP.md before doing
  feature work. Returns: already-done, in-progress, enhancement,
  prerequisite-needed, new, or ambiguous. Auto-invoked by /god-next when
  matched recipe is feature-addition category; can also run manually.

  Triggers on: "god roadmap check", "/god-roadmap-check", "is this on the roadmap",
  "does this exist", "should this be a new feature"
---

# /god-roadmap-check

Deprecated: prefer `/god-reconcile` for new workflows. This command remains in
the full profile for backward compatibility with existing route references.

Reconcile intent against ROADMAP.md before adding work. This legacy command
delegates to `god-reconciler` with ROADMAP-focused output.

## Setup

1. Verify `.godpowers/roadmap/ROADMAP.mdx` exists. If not: nothing to reconcile against; suggest /god-roadmap or /god-feature directly.
2. Spawn `god-reconciler` with the user's intent description and ask for ROADMAP-focused output.

## Output

The reconciler returns a verdict (one of 6 statuses). Display to user:

```
Roadmap reconciliation: <intent>

Status: ENHANCEMENT
Match: Milestone 2 (Now): "User can connect Stripe and see basic MRR"
       Feature: "MRR breakdown views"
       Match strength: high

Recommendation: This should be added to Milestone 2, not done as a separate
feature. Two options:

  A: /god-feature scoped to Milestone 2
     (extends Milestone 2 with this work)

  B: /god-roadmap update
     (amend Milestone 2's feature list, then continue building)

Default: A (folds into existing milestone for cohesion)
```

For each status, the recommendation differs:
- **already-done**: "/god-status to verify; /god-graph trace to find code"
- **in-progress**: "/god-status; the work is underway"
- **enhancement**: "Fold into the existing milestone"
- **prerequisite-needed**: "Complete X first via Y, OR /god-add-backlog"
- **new**: "4 options: add to Now / add to Next / backlog / seed"
- **ambiguous**: "Pick from these matches"

## Verification

After `god-reconciler` returns:
1. Verify the verdict has a status from the canonical 6
2. Verify recommendation has a concrete action
3. Display to user; await decision before proceeding
4. End with a Next commands block:

```
Next commands:
- /god-roadmap-update: Apply the smallest roadmap correction from the recommendation.
- /god-feature <feature-name>: Start feature work after roadmap overlap is clear.
- /god-discuss roadmap overlap: Resolve the open question before continuing.
- /god-add-backlog [intent]: Defer the work for later review.
```

## When called manually

User runs `/god-roadmap-check` with an intent description. Useful for:
- Sanity check before starting feature work
- Resolving "should this be a new milestone or part of an existing one?"
- Reviewing whether backlog items overlap with current plan
