---
name: god-debug
description: |
  Systematic 6-phase debugging. Spawns the god-debugger agent in a fresh
  context. Evidence-driven root cause analysis with regression tests.

  Triggers on: "god debug", "/god-debug", "debug this", "why is this broken", "fix this bug"
---

# /god-debug

<!-- Implements: P-MUST-45 -->

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
4. Before forming any hypothesis, require the specialist to write the
   structured reproduction record to `.godpowers/debug/REPRO.json` and run
   `lib/debug-feedback-loop.validateFeedbackLoop` against it. Continue only
   when the result passes with one already-executed exact-symptom command that
   is red-capable, repeatable, fast, and agent-runnable. Evidence must be
   redacted and the record must contain no raw secrets.
5. The agent writes a regression test FIRST, then the fix
6. The agent commits with explanation of root cause

## Verification

After god-debugger returns:
1. Verify `.godpowers/debug/REPRO.json` passes
   `lib/debug-feedback-loop.validateFeedbackLoop`
2. Verify the regression test exists and now passes
3. Verify the full test suite passes (no regressions)
4. Verify the commit message explains root cause
