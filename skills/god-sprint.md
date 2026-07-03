---
name: god-sprint
description: |
  Sprint ceremonies. Plan a sprint from the roadmap, run sprint status checks,
  and conduct retrospectives. Optional layer for teams that want agile cadence.

  Triggers on: "god sprint", "/god-sprint", "sprint plan", "retrospective",
  "sprint status", "standup"
---

# /god-sprint

Optional sprint ceremonies. Activates only at scale `large` or `enterprise`,
or when explicitly invoked.

## Subcommands

### `/god-sprint plan [--days=14]`
Plan the next sprint from the roadmap:
1. Read ROADMAP.md and current progress
2. Identify slices that fit in the sprint window based on past velocity
3. Create `.godpowers/sprints/sprint-<N>/PLAN.mdx`:
   - Goal (substitution-tested)
   - Slices committed
   - Capacity (engineers x days x focus factor)
   - Dependencies and risks
4. Each committed slice becomes a tracked item

### `/god-sprint status`
Show sprint progress:
```
Sprint 3 (Day 8 of 14)

Committed: 8 slices
Done: 5 slices
In flight: 2 slices
At risk: 1 slice (Slice 3.4: blocked on third-party API)

Burn-down:
  Day 1-7: [####          ] 50%
  Day 8:   [#####         ] 60% (today)
  Target:  [############  ] 100% by Day 14

Velocity: 0.625 slices/day (within target)
```

### `/god-sprint retro`
Conduct a retrospective at sprint end:
1. Spawn the **god-retrospective** agent (fresh context)
2. Review:
   - What was committed vs delivered
   - Slices that took longer than estimated (and why)
   - Slices that came in faster (and why)
   - Blockers encountered
3. Write `.godpowers/sprints/sprint-<N>/RETRO.mdx`:
   - What went well
   - What didn't
   - Specific actions for next sprint (concrete, not "communicate better")
4. Update velocity baseline for future sprint planning

## When to use

- Team of 3+ engineers
- Project running 3+ months
- External stakeholders need predictable cadence

## When NOT to use

- Solo developer (just use /god-mode)
- Project under 4 weeks (sprints add overhead)

## On Completion

```
Sprint [N] [planned/status/retro] complete.
Artifact: .godpowers/sprints/sprint-<N>/[file]
```
