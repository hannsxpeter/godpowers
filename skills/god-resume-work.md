---
name: god-resume-work
description: |
  Resume work from a previous session. Reads .godpowers/HANDOFF.mdx if it
  exists, otherwise re-derives state from state.json and disk, with
  PROGRESS.md as a generated legacy fallback. Continues from the last
  incomplete sub-step.

  Triggers on: "god resume", "/god-resume-work", "resume work", "continue",
  "pick up where I left off"
---

# /god-resume-work

Load context and continue.

## Process

1. Check for `.godpowers/HANDOFF.mdx`:
   - If exists: read it, summarize for user, ask if context is correct
   - If not: fall back to /god-status (re-derive from disk)

2. If HANDOFF.mdx exists:
   - Display "Where We Were", "Active Work", "Open Threads"
   - Confirm with user: "Pick up here?"
   - If yes: route to the specific next action

3. If only generated legacy PROGRESS.md exists:
   - Run the same logic as /god-next
   - Suggest the next command based on re-derived state

4. After resuming, archive HANDOFF.mdx:
   - Move to `.godpowers/archive/HANDOFF-[timestamp].md` so the trail is preserved
   - Reset `.godpowers/HANDOFF.mdx` (or delete) so future pauses start clean

## On Completion

```
Resumed from [timestamp pause].

Continuing: [specific action]
Next: [/god-X command or specific work]
```
