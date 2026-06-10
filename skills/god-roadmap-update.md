---
name: god-roadmap-update
description: |
  After feature work, update ROADMAP.md to reflect what changed. Marks
  milestones complete, appends new entries, moves work between Now/Next/Later,
  records changes in a changelog section.

  Triggers on: "god roadmap update", "/god-roadmap-update", "update roadmap",
  "mark milestone complete", "amend roadmap"
---

# /god-roadmap-update

Keep ROADMAP.md as a living artifact.

## When to use

- After completing a milestone (mark done, gate passed)
- After adding a feature mid-run that wasn't on the original roadmap
- When priorities shift (move between Now / Next / Later)
- When a planned milestone is superseded

## Setup

1. Verify `.godpowers/roadmap/ROADMAP.md` exists
2. Determine the operation:
   - Mark complete: which milestone?
   - Append: where (Now/Next/Later) and what?
   - Move: which milestone, where to?
   - Remove: which milestone, why?

## Process

Spawn **god-roadmap-updater** in fresh context with:
- Current ROADMAP.md
- Description of the change
- Optional: changeset (commits)

Agent updates the roadmap and re-validates have-nots.

## Verification

After god-roadmap-updater returns:
1. Verify ROADMAP.md still passes have-nots (R-01 through R-07)
2. Verify Roadmap Changelog section is appended
3. If the update changes tracked roadmap completion, run `npx godpowers state advance --step=roadmap --status=done --project=.` or the owning command wrapper.

## On Completion

```
Roadmap updated: .godpowers/roadmap/ROADMAP.md

Change: [description]
Have-nots: still passing

Suggested next: /god-status (see overall state)
```

## Special: PRD divergence detection

If the update adds a feature not in PRD.md:
- Surface this as a have-not (P-13: moving-target PRD)
- Recommend `/god-redo prd` to add the requirement
- Don't silently let roadmap diverge from PRD
