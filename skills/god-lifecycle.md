---
name: god-lifecycle
deprecated: true
successor: god-status --lifecycle
description: |
  Show where the project is in its lifecycle and what workflows make sense
  next. Distinguishes: pre-init, planning, building, shipping, steady state,
  in-incident, in-migration. Suggests appropriate workflows for each.

  Triggers on: "god lifecycle", "/god-lifecycle", "where am I", "what now",
  "project phase"
---

# /god-lifecycle

Deprecated: prefer `/god-status --lifecycle` for new workflows. This command
remains callable in the full profile for one minor release as a compatibility
alias.

Show project phase and contextually appropriate workflows.

## Process

1. Detect lifecycle phase from disk:
   - **No `.godpowers/`** -> Pre-init
   - **`.godpowers/state.json` exists, not all tracked steps done** -> In progress
   - **Only generated legacy `.godpowers/PROGRESS.mdx` exists** -> In progress after re-deriving state from disk
   - **All tiers done, no special markers** -> Steady state
   - **`.godpowers/postmortems/<id>/` exists with no POSTMORTEM.md** -> Post-incident pending
   - **`.godpowers/migrations/<slug>/MIGRATION.mdx` exists, status != complete** -> In-migration
   - **`.godpowers/spikes/` has any inconclusive entries** -> Spike pending follow-up

2. Display the phase with context.

3. Suggest workflows appropriate to the phase.

## Output Format

### Pre-init
```
Lifecycle: Pre-init (no Godpowers project here)

Available actions:
  /god-init     Initialize a Godpowers project
  /god-explore  Brainstorm before committing
  /god-mode     Run full autonomous project run (will init first)
```

### In Progress
```
Lifecycle: In progress (planning/building/shipping)

Current state:
  PRD:          [done/pending]
  Roadmap:      [done/pending]
  Current step: [phase, tier, or roadmap milestone]
  Completion:   [pct]% ([done] of [total] tracked steps)
  Architecture: [done/pending]
  ...

Suggested next: [via /god-next logic]

Or run /god-mode to autonomously continue from here.
```

### Steady state
```
Lifecycle: Steady state (project run complete, in maintenance)

Last full audit: [N days ago]
Last dep audit: [N days ago]
Last docs check: [N days ago]

For ongoing work:
  Adding features:        /god-feature
  Production bugs:        /god-hotfix
  Code cleanup:           /god-refactor
  Research questions:     /god-spike
  Framework upgrades:     /god-upgrade
  Documentation:          /god-docs
  Dependency updates:     /god-update-deps

Periodic (recommended cadence):
  /god-hygiene every 30 days
  /god-audit before milestones

Or describe what you want; /god-next will route.
```

### Post-incident pending
```
Lifecycle: Post-incident pending

Incident detected: [.godpowers/postmortems/<id>/]
No POSTMORTEM.md yet.

REQUIRED next: /god-postmortem
This is overdue if hotfix was >48 hours ago.
```

### In-migration
```
Lifecycle: In-migration

Migration: [from -> to]
Status: [expanding / migrating / contracting]
Slices done: N/M

Continue with: /god-upgrade
Or pause and switch context: /god-pause-work
```

### Spike pending follow-up
```
Lifecycle: Spike pending follow-up

Inconclusive spike: .godpowers/spikes/<slug>/SPIKE.mdx
Recommended follow-up: [from spike's recommendation]

Suggested next: /god-spike with narrower question
Or: archive the spike if no longer relevant
```

## Next Commands Closeout

Every lifecycle report must end with a Next commands block. Use the detected
phase to fill in concrete commands:

```
Next commands:
- /god-next: Run the smallest safe next command from the lifecycle report.
- /god-mode [resume or scope] when the phase is safe for an autonomous project run: Run the full recommended path.
- /god-discuss [unclear phase, blocker, or choice]: Resolve the open question before continuing.
- /god-status or /god-next: Inspect status before continuing.
```

For hard blockers, such as post-incident pending, replace the broad options
with the required next command plus inspect and discuss alternatives:

```
Next commands:
- /god-postmortem: Resolve the required incident follow-up before continuing.
- /god-status --full: Inspect full status before acting.
- /god-discuss incident follow-up: Resolve the blocker with a focused discussion.
```

## Have-Nots

Lifecycle check FAILS if:
- Multiple lifecycle phases detected without resolution (data inconsistency)
- Lifecycle phase doesn't match disk reality (drift)
- Suggestions don't match phase
