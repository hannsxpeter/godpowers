---
name: god-review
description: Independent fresh-context review of the current changes against the plan for correctness, blast radius, safety, and fit, then fix and record the outcome. Use for /god-review, "review this", or before shipping.
argument-hint: "[base ref]"
---

# /god-review

1. Work out the change set: `git diff <base>...HEAD` plus uncommitted work. The base defaults to the main branch or the last release tag.
2. Get the review from a fresh context. You choose how: any subagent your host offers, a separate session, or another tool, run however suits the work. Set the reviewer's model and effort yourself, sized to the change: a fast model at low effort for a small, low-risk diff; the most capable model at high effort for auth, data, money, or concurrency changes. Give the reviewer the diff scope, the PLAN.md requirements, relevant DECISIONS.md entries, the verify command, and this brief, but not your own conclusions:
   - Correctness: does the change meet each "Done when" check, including error paths and unusual inputs?
   - Blast radius: what depends on the changed code? Name the one fact that must hold for the change to be safe, and how it was proven.
   - Safety and fit: input validation, auth, secrets, destructive operations, data loss; existing patterns, no scope creep.
   - Output: findings as `severity: what, where, why`, then pass or fail.
3. Fix each finding or state why not. Critical and high findings you leave open go under Risks in STATE.md.
4. Run `npx -y godpowers@7 verify "<verify command>"` after the fixes. After a large fix, review the new diff again.
5. Record the outcome on the final code: `npx -y godpowers@7 record review --pass --summary "<one line>"`, or `--fail` with the reason.
6. When the review passes, set `stage: harden` in STATE.md if a security pass is due (the change touches a trust boundary, or the user asked to ship), otherwise `stage: done`.
