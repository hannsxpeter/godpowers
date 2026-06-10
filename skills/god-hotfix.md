---
name: god-hotfix
description: |
  Urgent production bug fix. Skips ALL planning. Goes: debug -> regression
  test -> minimal fix -> two-stage review (compressed) -> expedited deploy
  -> verify in prod -> auto-trigger postmortem.

  Triggers on: "god hotfix", "/god-hotfix", "production is down", "urgent fix",
  "hotfix", "fire drill"
---

# /god-hotfix

Urgent production bug fix. Speed matters; discipline still applies.

## When to use

- Production is broken or degraded
- Users are affected right now
- Waiting for a normal /god-mode project run is unacceptable

## When NOT to use

- Bug found in dev: use /god-debug
- Non-urgent issue: use /god-feature or /god-quick
- Need root-cause investigation but no urgency: use /god-debug
- Already fixed; need postmortem: use /god-postmortem

## Orchestration

### Phase 1: Debug (god-debugger)
Spawn **god-debugger** in fresh context with the symptoms.
Time-box: 30 minutes for diagnosis. If not root-caused in 30 min, escalate.

### Phase 2: Regression Test
Before writing the fix:
- Write a test that reproduces the bug
- Run it. It MUST fail.
- This locks in the fix-verification contract.

### Phase 3: Minimal Fix (god-executor)
Spawn **god-executor** scoped to:
- The smallest possible fix
- The test from Phase 2 must pass
- No refactoring, no scope creep
- Atomic commit

### Phase 4: Compressed Two-Stage Review
Spawn **god-spec-reviewer**:
- Question 1: Does the fix resolve the bug? (test passes)
- Question 2: Are any regressions introduced? (full test suite green)
- Question 3: Is the fix scoped to the bug only? (no scope creep)
PASS or FAIL only.

Spawn **god-quality-reviewer** with FAST PATH:
- Security: any new attack surface? (one question)
- Error handling: graceful failure? (one question)
- No full quality review; that comes later.

If both PASS: proceed.

### Phase 5: Expedited Deploy
Spawn **god-deploy-engineer** with hotfix annotation:
- Skip canary/gradual rollout if appropriate (judgment call)
- Deploy directly to production
- Post-deploy smoke test against the fix-verification scenario

### Phase 6: Verify in Production
Spawn **god-observability-engineer** briefly:
- Did the symptom stop?
- Did any new alerts fire?
- Confirm recovery in metrics

### Phase 7: Schedule Postmortem
Record a state-backed follow-up TODO through the owning command wrapper:
"Run /god-postmortem within 48 hours for incident <id>"

Hotfix doesn't replace postmortem; it precedes it.

## On Completion

```
Hotfix shipped.
Bug: [description]
Root cause: [one line]
Fix: [commit SHA]
Verified in prod: [timestamp]

REQUIRED next within 48 hours: /god-postmortem
This investigates the class-of-bug, action items, runbook updates.
```

## Have-Nots

Hotfix FAILS if:
- No regression test written (fix could regress)
- Fix exceeds the minimum scope
- Two-stage review skipped entirely
- Deploy not verified in prod
- Postmortem not scheduled

## Linkage and reverse-sync

Per Phase 13 of the production-ready plan, this workflow participates
in the linkage system:

- On completion of any code change, `lib/reverse-sync.run(projectRoot)`
  is called via god-updater. This:
  - Scans new/modified code for linkage annotations (// Implements: P-MUST-NN, etc.)
  - Updates `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
  - Detects drift via `lib/drift-detector`
  - Appends fenced footers to PRD/ARCH/ROADMAP/STACK/DESIGN
  - Surfaces drift findings to REVIEW-REQUIRED.md

- Stable IDs MUST be used in artifact deltas (P-MUST-NN, ADR-NNN,
  C-{slug}, M-{slug}, S-{slug}, D-{slug}, token paths). The scanner
  picks them up automatically via comment annotations.

- For UI work: agent-browser audit may run as part of /god-build
  post-wave or /god-launch gate (see `/god-test-runtime`).

- Findings flow into the standard REVIEW-REQUIRED.md walkthrough
  via `/god-review-changes`.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
