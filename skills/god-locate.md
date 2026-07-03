---
name: god-locate
deprecated: true
successor: god-status --locate
description: |
  Orient a new chat session or new AI tool. Reads CHECKPOINT.md +
  state.json + events.jsonl tail + intent.yaml + reflog tail and
  produces a single-screen "you are here" summary. Run this FIRST
  in any new session; it's the disk-authoritative orientation.

  Triggers on: "god locate", "/god-locate", "where am i", "what's
  going on here", "orient me", "I'm new here"
---

# /god-locate

Deprecated: prefer `/god-status --locate` for new workflows. This command
remains callable in the full profile for one minor release as a compatibility
alias.

Orient a new session against disk reality. Single-screen output.

## When to use

- **Always run as the FIRST command in a new chat session** that
  enters a Godpowers project.
- When switching from Claude Code to Codex (or any tool change) so
  the new tool inherits state.
- When you (the AI) think you've lost track of where things are.
- When `/god-status` output is overwhelming and you just want the
  pin.

## What it reads (in priority order)

1. `.godpowers/CHECKPOINT.mdx` (the pin)
2. `.godpowers/state.json` (authoritative facts)
3. `.godpowers/runs/<latest>/events.jsonl` last 20 events
4. `.godpowers/log` last 5 reflog entries
5. `.godpowers/intent.yaml` (project intent)
6. `.godpowers/HANDOFF.mdx` if it exists (paused-work context)

## Output (single screen)

```
GODPOWERS LOCATE

Project: <name>  Mode: <A/B/C/E>  Suite: <yes/no>
Lifecycle: <phase>  Current: <tier>/<substep>
Progress: <pct>% (<complete> of <total> steps complete; current step <n> of <total>)
Deliverables: <done>/<total> requirements done (state.json cache; full list in .godpowers/REQUIREMENTS.mdx)

Last action: <name> by <actor> at <ts>
Last user instruction: <if available>

Held facts (top 5):
- <fact 1>
- <fact 2>
- <fact 3>
- ...

Recent events (last 5):
- <event>
- <event>
- ...

What happened recently:
- <checkpoint action or event summary>
- <checkpoint action or event summary>

What happens next:
- <next command>
- <one-line reason>

Next suggested: <command>
  Reason: <why>

Drift check:
- CHECKPOINT.md last-update: <ts> (<age>)
- state.json last-update: <ts> (<age>)
- If gap > 1 hour, run /god-context-scan
```

## Next Commands Closeout

The orientation summary must end with a compact Next commands block:

```
Next commands:
- /god-next: Run the next suggested command from disk state.
- /god-mode to continue the project run when no drift is flagged: Run the full recommended path.
- /god-discuss [unclear state or stale checkpoint]: Resolve the open question before continuing.
- /god-status for the full report: Inspect status before continuing.
```

If drift is flagged, recommend `/god-context-scan` or `/god-repair` before
continuing work.

## Process

1. If `.godpowers/` does not exist: report "no Godpowers project here"
   and suggest `/god-init`.
2. If CHECKPOINT.md is missing: synthesize from state.json + reflog;
   produce CHECKPOINT.md as a side effect (so the next session sees it).
3. If state.json is missing: project is broken; run `/god-doctor`.
4. Compute age of CHECKPOINT last-update; flag staleness if > 1 hour
   or > 100 events since last checkpoint write.
5. Compute progress from `lib/state.progressSummary(stateJson)` and show
   percentage, complete count, total count, and current step number.
6. Summarize "what happened recently" from CHECKPOINT.md actions or recent
   events, then summarize "what happens next" from routing.
7. Produce single-screen orientation summary.
8. Append `op:locate` event to events.jsonl.

## Difference from /god-status

- `/god-status`: full state report with every artifact's status.
  Comprehensive, dense, ~50 lines.
- `/god-locate`: orient-a-new-session pin. Single screen, ~20 lines.
  Designed to be read by an AI that has no prior context.

## Implementation

Built-in. Reads `lib/checkpoint.js`, `lib/state.js`,
`lib/events.js`, `lib/intent.js`. No agent spawn (orientation is too
fast to justify fresh-context overhead).

## Related

- `/god-status` - full state report
- `/god-next` - propose the next command
- `/god-context-scan` - detect drift between AI's model and disk
- `/god-doctor` - diagnose install + state integrity
