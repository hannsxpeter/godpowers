---
name: god-build
description: Implement the next PLAN.md slices test-first and record verification evidence for the exact code. Use for /god-build, "build it", "implement the plan", or continuing work in progress.
argument-hint: "[slice or change]"
---

# /god-build

1. Read STATE.md and PLAN.md. If there is no plan and the change is not trivial, run /god-plan first. Take the next unchecked slice, or the one the user named.
2. For each slice:
   - Write or extend a test for its "Done when" check and watch it fail, then make it pass with the smallest change that fits the existing code.
   - Run `npx -y godpowers@7 verify "<verify command>" --claim "slice N: <check>"`. Fix and re-run until it passes. Never weaken, skip, or delete a test to get green.
   - Tick the slice in PLAN.md.
3. Independent slices that touch different files can go to subagents of your choice, run however you prefer, one slice each, with the slice text, the files involved, and the verify command. Run the full verify yourself after they return.
4. If a design choice turns out wrong, record the new decision in DECISIONS.md and adjust the remaining slices.
5. When every slice is done, run verify on the final code, set `stage: review` in STATE.md, and suggest /god-review.
6. Report what changed, the verify result, and what is left.
