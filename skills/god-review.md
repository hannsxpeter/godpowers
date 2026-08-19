---
name: god-review
description: |
  Two-stage code review. Spawns god-spec-reviewer (Stage 1) followed by
  god-quality-reviewer (Stage 2). Both must PASS for the review to pass.

  Triggers on: "god review", "/god-review", "review this", "code review"
---

# /god-review

<!-- Implements: P-MUST-36, P-MUST-37, P-MUST-38, P-MUST-39, P-MUST-40, P-MUST-41, P-MUST-42, P-MUST-43 -->

Spawn the Stage 1 and Stage 2 specialist reviewers in fresh contexts via the
host platform's native agent spawning mechanism. Wide changes add one more
independent Stage 2 context.

## Setup

1. Gather context: what code is being reviewed? (recent diff, specific files, PR)
2. Locate the relevant plan or PRD acceptance criteria
3. Compute the Pillars load set from the task and changed files with
   `lib/pillars.computeLoadSet(projectRoot, taskText)`. Reviews may cite
   violations of `agents/auth.md`, `agents/data.md`, `agents/ui.md`, or any
   other loaded pillar directly.
4. Load `references/building/BLAST-RADIUS.md` as the single Stage 2 safety-case protocol
5. Run Stage 1 first, then Stage 2 only if Stage 1 passes

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
- `references/building/BLAST-RADIUS.md`
- Sanitized local projections returned by `lib/evidence.resolveReviewEvidence`

Before the spawn, resolve each cited record ID locally with the expected claim,
exact command, canonical substep, review-window start, and latest relevant
behavior-change timestamp. Pass only the sanitized result. Do not pass raw
ledger records, gate-event attributes, command or claim values, output tails,
or secret-bearing arguments into either Stage 2 context.

Stage 2 checks readability, security, error handling, performance,
maintainability, and simplicity/surgicality. A solution that is technically
correct but broader than needed still fails review.

Stage 2 also produces the blast-radius safety case from the shared protocol:

1. The first reviewer independently verifies or replaces the executor's candidate safety fact, completes all 10 boundary rows, and returns a provisional safety-case verdict.
2. Classify bounded or wide before acting on the provisional first-pass verdict.
3. Classify the change as wide when it crosses at least 3 boundary classes or at least 2 high-impact classes; otherwise classify it as bounded.
4. A bounded change uses one pass, while a wide change requires at least 2 independent safety cases.
5. A bounded provisional safety-case verdict can proceed to the final Stage 2 gate.
6. If wide, always run a second independent safety case in a fresh context, even when the provisional first-pass verdict is FAIL. Give the second reviewer the diff, requirements, shared protocol, and the same sanitized resolver projections, but not the first reviewer's conclusions.
7. After all required passes finish, reconcile the safety cases and issue the final Stage 2 verdict. Preserve each provisional verdict and lower confidence or request proof on disagreement; reviewer agreement never raises an evidence level.

Any confirmed blocking risk or high-impact `UNPROVEN` claim makes Stage 2 FAIL.
A lower-impact `UNPROVEN` claim remains a warning and must name the exact next
proof. Level 4 and level 5 conclusions must cite an accepted sanitized
`resolveReviewEvidence` projection for a record created through
`npx godpowers verify`.

Do not return on the first provisional FAIL until the first pass classifies the
change. If bounded, report the final failure after that single pass. If wide,
obtain and reconcile the required second safety case before reporting the final
failure. The review is complete only when the applicable Stage 2 pass count and
reconciled verdict pass.

## Output

```
## Code Review Verdict

### Stage 1: Spec Compliance - [PASS/FAIL]
[findings from god-spec-reviewer]

### Stage 2: Code Quality - [PASS/FAIL]
[findings from god-quality-reviewer]

### Blast-Radius Safety Case - [PASS/FAIL]
[one safety fact, threshold calculation, pass count, boundary inventory,
Confirmed Risks, Cleared Risks, Unproven Claims, and Before Merge]

### Overall: [PASS/FAIL]
```

Both stages and the reconciled safety case must PASS for the review to PASS.
