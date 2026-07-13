---
name: god-context-scan
description: |
  Detect drift between the current AI session's mental model and
  disk reality. The defensive cousin of /god-status. Use in long
  sessions or when an output starts feeling wrong. Surfaces
  hallucinated facts, missed updates, stale memories, and
  context-rot before they cause bad commits.

  Triggers on: "god context scan", "/god-context-scan", "check
  drift", "am I out of date", "verify my context"
---

# /god-context-scan

Detect when the AI's working memory has diverged from disk.

## When to use

- **Long sessions** (more than ~50 turns) where the AI's window
  has had to summarize old context away.
- **Before any commit** in a session that has been running for
  more than 30 minutes.
- **After a pause and resume** when the AI might have been talked
  out of an earlier decision.
- **Whenever an AI output starts feeling wrong** - faster than
  re-reading state by hand.

## What it does

This skill is unusual: it asks the AI to dump its current
understanding, then compares that to disk. Discrepancies are
called drifts.

### Process

1. AI writes down its claimed model of state in a structured form:
   ```yaml
   claim:
     project: <name>
     mode: <A/B/C/E>
     currentTier: <tier>
     currentSubstep: <substep>
     lastAction: <name>
     lastArtifactWritten: <path>
     openTodos: [...]
     heldFacts: [...]
   ```
2. `lib/checkpoint.diff(projectRoot, claim)` compares the claim to
   `.godpowers/CHECKPOINT.mdx` frontmatter + facts.
3. `lib/state.detectDrift(projectRoot)` cross-checks artifacts on
   disk match their recorded hashes. This includes source-systems
   import hashes for sibling artifacts: when `.godplans/PLAN.mdx` plus its
   recorded validator companion, or canonical
   `.godaudits/AUDIT.json` no longer matches the hash recorded at
   import (the user re-ran godplans/godaudits mid-session), report a
   WARN drift "sibling artifact changed since import" with suggested
   action `/god-migrate` re-import.
4. `lib/events.readRun(projectRoot, latestRun)` last 30 events
   verified for hash-chain continuity (when v0.13+ event hash
   chain is in place).
5. Drift findings are presented with severity:
   - **error**: claim contradicts disk (e.g. AI thinks PRD is in
     progress, disk says done)
   - **warn**: claim has stale data (e.g. AI doesn't know about
     last 3 events)
   - **info**: claim mentions facts not in CHECKPOINT held-facts
     (might be new, worth recording)
6. Suggested actions: `/god-locate` to re-orient, or `/god-repair`
   to reconcile state drift and record the new facts.

### Output

```
GODPOWERS CONTEXT SCAN

Claims compared: 8
Matches: 6
Drifts: 2

ERROR drifts:
- field: currentSubstep
  claimed: prd-in-progress
  actual: arch-pending
  -> the PRD was completed and you started ARCH; refresh memory

WARN drifts:
- field: openTodos
  claimed: 3 open
  actual: 5 open (2 were added after your last sync)

Suggested next:
1. /god-locate    (re-orient against disk)
2. Accept the 2 new todos: /god-check-todos
```

## Next Commands Closeout

End every context scan report with a Next commands block:

```
Next commands:
- /god-locate: Re-orient from checkpoint and disk state.
- /god-repair: Resolve state drift before continuing.
- /god-discuss context drift: Resolve the open question before continuing.
- /god-status after re-orientation: Inspect status before continuing.
```

## What this does NOT do

- Does not modify state. Read-only.
- Does not "fix" the AI's context (only the AI can do that, by
  re-reading the relevant files).
- Does not catch hallucinations about content the AI never claimed.
  It can only compare what the AI explicitly states.

## Subcommands

### `/god-context-scan`
Full scan: AI states model, system compares, reports drifts.

### `/god-context-scan --quick`
Compare only the top 5 highest-value fields (mode, currentTier,
currentSubstep, lastAction, openTodoCount).

### `/god-context-scan --auto`
Skips the "AI states model" step and just compares
CHECKPOINT.md timestamp against state.json timestamp +
recent-events count. Useful in autonomous mode.

## Implementation

Built-in. Reads `lib/checkpoint.js`, `lib/state.js`,
`lib/events.js`. The "ask AI to state its model" step is the AI's
own work; the comparison is library code.

## Related

- `/god-locate` - orient a NEW session
- `/god-status` - full state report
- `/god-doctor` - install + state integrity
- `/god-repair` - reconcile state drift
