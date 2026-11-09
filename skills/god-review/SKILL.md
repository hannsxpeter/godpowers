---
name: god-review
description: Use for /god-review, "review this", or before shipping. Independent fresh-context review.
argument-hint: "[base ref]"
---

# /god-review

1. Work out the change set: `git diff <base>...HEAD` plus uncommitted work. The base defaults to the main branch or the last release tag. Run `npx -y godpowers@7 reviews` for earlier rounds and dismissed findings, and `npx -y godpowers@7 tests --base <base>` for weakened tests.
2. Get the review from a fresh context. You choose how: any subagent your host offers, a separate session, or another tool, run however suits the work. Before you start the reviewer, say which model and effort you picked for it and why, then pass both explicitly (whichever your host accepts); never let it inherit yours. Size both to the change: a fast model at low effort for a small, low-risk diff; the most capable model at high effort for auth, data, money, or concurrency changes. On a re-review, give only the change since the last reviewed commit plus the dismissed findings, so they are not raised again. Prefer a reviewer from a different model family than the builder when your host offers one. Give the reviewer the diff scope, the requirements (from PLAN.md, or listed under Goal in STATE.md), relevant DECISIONS.md entries, the verify command, any `tests` findings, and this brief, but not your own conclusions:
   - Correctness: does the change meet each requirement and its check, including error paths and unusual inputs?
   - Tests: does each requirement have a test, including the cases that must not trigger it? A test that would still pass with the behavior broken is a finding; name the missing case.
   - Blast radius: what depends on the changed code? Name the one fact that must hold for the change to be safe, and how it was proven.
   - Safety and fit: input validation, auth, secrets, destructive operations, data loss; existing patterns, no scope creep.
   - Output: findings as `severity: what, where, why`, then pass or fail. Severity is relative to the goal: high means the intended case is wrong or callers will hit a real bug; another code path, a rare case, a small cost, or extra compatibility is low, whatever its label.
3. Verify each finding before acting on it. Fix it, or dismiss it with a one-line reason. Do not fix every finding by default. If `reviews` warns the change grew, cut what review added beyond the goal first. Critical and high findings you leave open go under Risks in STATE.md.
4. If you changed code, record the check once after the fixes: `npx -y godpowers@7 verify "<verify command>"`. After a large fix, review the new diff again. When `reviews` reports three failed rounds, stop and rethink the approach.
5. Record the outcome on the final code: `npx -y godpowers@7 record review --pass --reviewer "<model the reviewer reported>" --summary "<one line>"` (omit `--reviewer` if unknown), or `--fail` with the reason. Add `--dismiss "<finding>: <reason>"` for each dismissal.
6. When the review passes, set `stage: harden` in STATE.md if a security pass is due (the change touches a trust boundary, or the user asked to ship), otherwise `stage: done`.
