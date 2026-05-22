---
name: god-review
description: |
  Two-stage code review. Spawns god-spec-reviewer (Stage 1) followed by
  god-quality-reviewer (Stage 2). Both must PASS for the review to pass.

  Triggers on: "god review", "/god-review", "review this", "code review"
---

# /god-review

Spawn two specialist review agents in fresh contexts via the host platform's native agent spawning mechanism.

## Setup

1. Gather context: what code is being reviewed? (recent diff, specific files, PR)
2. Locate the relevant plan or PRD acceptance criteria
3. Compute the Pillars load set from the task and changed files with
   `lib/pillars.computeLoadSet(projectRoot, taskText)`. Reviews may cite
   violations of `agents/auth.md`, `agents/data.md`, `agents/ui.md`, or any
   other loaded pillar directly.
4. Run Stage 1 first, then Stage 2 only if Stage 1 passes

## Stage 1: Spec Compliance

Spawn **god-spec-reviewer** in fresh context with:
- The code to review
- The plan or PRD acceptance criteria
- The test results

Stage 1 also checks that touched files trace to the request, acceptance
criteria, failing test, or implementation-caused cleanup. Scope creep,
speculative flexibility, and unrelated churn fail here before code-quality
review begins.

If FAIL: report findings and STOP. The code must be fixed before Stage 2.
If PASS: proceed to Stage 2.

## Stage 2: Code Quality

Spawn **god-quality-reviewer** in fresh context with:
- The code to review (independent of stage 1 findings)

Stage 2 checks readability, security, error handling, performance,
maintainability, and simplicity/surgicality. A solution that is technically
correct but broader than needed still fails review.

If FAIL: report findings.
If PASS: review complete.

## Output

```
## Code Review Verdict

### Stage 1: Spec Compliance - [PASS/FAIL]
[findings from god-spec-reviewer]

### Stage 2: Code Quality - [PASS/FAIL]
[findings from god-quality-reviewer]

### Overall: [PASS/FAIL]
```

Both stages must PASS for the review to PASS.
