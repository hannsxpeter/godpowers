---
name: god
description: Godpowers front door. Reads .godpowers/STATE.md and either names the next step or drives a goal through only the stages it needs. Use for /god, "what next", or "take this to production".
argument-hint: "[goal]"
---

# /god

1. Run `npx -y godpowers@7 status`. If there is no project, offer /god-init (it also migrates 6.x projects) and stop.
2. With no goal: answer in at most five lines: where the project stands, the single next step, and the command for it.
3. With a goal, pick the smallest path that does it well, skipping any stage STATE.md shows is already done for this goal:
   - A question or assessment: answer from the code and the state files.
   - A small change (one slice, low risk, no trust boundary): make it, run `npx -y godpowers@7 verify "<verify command>"`, and touch STATE.md only if the stage or risks changed.
   - A feature: /god-plan, /god-build, then /god-review. Add /god-harden only when the change touches a trust boundary: auth, secrets, untrusted input, money, or deleting data.
   - A new product, or a large or unclear goal: /god-plan in full, /god-build, /god-review, and /god-harden.
4. Run /god-ship only when the user asks to ship, release, or deploy. Its gate needs a security record for the current code, so run /god-harden first if there is none.
5. Keep going between the stages you chose without asking. Stop only for decisions that belong to the user (scope, spending, credentials, public or irreversible actions), or when the same gate fails twice for the same reason.
6. Finish with what changed, the verify result, open risks, and the next step.
