---
name: god-debug
description: |
  Systematic 6-phase debugging. Spawns the god-debugger agent in a fresh
  context. Evidence-driven root cause analysis with regression tests.

  Triggers on: "god debug", "/god-debug", "debug this", "why is this broken", "fix this bug"
---

# /god-debug

Spawn the **god-debugger** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Gather user's bug description (or use the most recent failure context)
2. Spawn god-debugger with:
   - Bug description
   - Repository context
   - Recent commits (`git log --oneline -20`)
3. The agent runs the 6-phase process: Observe, Minimize, Instrument,
   Hypothesize, Test, Conclude. If Phase 5 refutes every hypothesis, or if
   instrumentation did not narrow the failure boundary, the agent widens the
   hypothesis set per `references/planning/DIVERGENCE.md` rather than re-running
   the same anchored context.
4. The agent writes a regression test FIRST, then the fix
5. The agent commits with explanation of root cause

## Verification

After god-debugger returns:
1. Verify the regression test exists and now passes
2. Verify the full test suite passes (no regressions)
3. Verify the commit message explains root cause
