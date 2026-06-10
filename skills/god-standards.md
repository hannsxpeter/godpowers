---
name: god-standards
description: |
  Run artifact standards check on a specific artifact. Verifies
  substitution test, three-label test, and tier-specific have-nots. Use
  manually for spot-checks or invoke as a gate between commands.

  Triggers on: "god standards", "/god-standards", "check standards",
  "verify quality", "run substitution test"
---

# /god-standards

Run quality gate check on an artifact.

## When to use

- Suspect an artifact has drifted from quality standards
- Before committing to a downstream tier
- After manual edits to an artifact (which bypass the producing agent)
- Spot check at any time

## Process

1. Identify the artifact to check, using the user-provided path first, then `state.json`, then generated progress view fallback.
2. Resolve the Godpowers runtime root: use `<projectRoot>` when `<projectRoot>/lib/router.js` exists, otherwise use the installed bundle at `<tool-config-dir>/godpowers-runtime`
3. Look up the routing for the relevant tier (`<runtimeRoot>/lib/router.js` getStandards)
4. Spawn god-standards-check in fresh context with:
   - artifact-path
   - tier
   - have-nots-list (from routing)
   - gate-on-failure: pause-for-user (default for manual runs)

## Output

Display the standards-check verdict:

```
Standards check: .godpowers/prd/PRD.md

Substitution test:    PASS
Three-label test:     PASS
Have-nots (15):       13 PASS / 2 FAIL

Failures:
  - P-02 (line 14): Target user is "developers" with no specificity
    Fix: Replace with specific persona

  - P-04 (line 28): Success metric "1000 users" has no timeline
    Fix: Add timeline ("within 60 days of launch")

Verdict: PARTIAL (87%)

Suggested next:
  /god-redo prd to address failures with feedback
  /god-skip prd --reason "..." to accept-as-is

Proposition:
  1. Implement partial: /god-redo [tier] with the listed failures
  2. Implement complete: fix all failures, rerun /god-standards, then continue the gate
  3. Discuss more: /god-discuss standards failure
  4. Skip: /god-skip [tier] --reason "..." only with an explicit reason
Recommended: [one option and why]
```

## Auto-invocation

This skill is also invoked automatically by the routing system between stages
when `standards.gate-on-failure` is configured. The user-facing version (this
skill) is for manual spot-checks.
