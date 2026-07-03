---
name: god-pause-work
description: |
  Pause work mid-task. Captures the current state, what was being worked on,
  open threads, and next steps so a future session can resume cleanly.
  Writes to .godpowers/HANDOFF.mdx.

  Triggers on: "god pause", "/god-pause-work", "pause work", "save context",
  "I need to stop"
---

# /god-pause-work

Create a context handoff so you can resume cleanly later.

## Process

1. Read `.godpowers/state.json` to capture current state; use `.godpowers/PROGRESS.mdx` only as a generated legacy fallback when state is missing.
2. Identify what was actively being worked on:
   - Which slice? Which agent was running?
   - What was the next step?
   - What was blocked?
3. Capture conversation context:
   - Decisions made this session
   - Open questions raised
   - Things the user mentioned that aren't yet in artifacts
4. Write `.godpowers/HANDOFF.mdx`:

```markdown
# Godpowers Handoff

Paused: [timestamp]

## Where We Were
[Specific tier, sub-step, slice if applicable]

## Active Work
[What was in flight when we paused]

## Open Threads
- [Unresolved item 1]
- [Unresolved item 2]

## Decisions This Session
- [Decision] (recorded in [artifact])
- [Decision] (verbal, needs to be added to [artifact])

## Next Steps
- [Specific next action]
- [Specific next action]

## Resume With
`/god-resume-work` to load this context, then continue.
```

5. Run `npx godpowers state advance --step=<current-step> --status=in-flight --project=.` if the current sub-step is not already in flight.

## On Completion

```
Work paused. Handoff written: .godpowers/HANDOFF.mdx

To resume: open a new session and run /god-resume-work
```
