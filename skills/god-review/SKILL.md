---
name: god-review
description: Independent fresh-context review of the current changes against the plan for correctness, blast radius, safety, and fit, then fix and record the outcome. Use for /god-review, "review this", or before shipping.
argument-hint: "[base ref]"
---

# /god-review

1. Work out the change set: `git diff <base>...HEAD` plus uncommitted work. The base defaults to the main branch or the last release tag.
2. Spawn the god-reviewer subagent with the diff scope, the PLAN.md requirements, relevant DECISIONS.md entries, and the verify command. Do not pass your own conclusions; the review is only useful if it is independent.
3. Fix each finding or state why not. Critical and high findings you leave open go under Risks in STATE.md.
4. Run `npx -y godpowers@7 verify "<verify command>"` after the fixes. After a large fix, review the new diff again.
5. Record the outcome on the final code: `npx -y godpowers@7 record review --pass --summary "<one line>"`, or `--fail` with the reason.
6. When the review passes, set `stage: harden` in STATE.md.
