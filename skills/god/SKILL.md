---
name: god
description: Godpowers front door. Reads .godpowers/STATE.md and either names the next step or drives a goal through plan, build, review, harden, and ship. Use for /god, "what next", or "take this to production".
argument-hint: "[goal]"
---

# /god

1. Run `npx -y godpowers@7 status`. If there is no project, offer /god-init (it also migrates 6.x projects) and stop.
2. With no goal: answer in at most five lines: where the project stands, the single next step, and the command for it.
3. With a goal, pick the smallest path that does it well:
   - A question or assessment: answer from the code and the state files.
   - A small change (one slice, low risk): make it, run `npx -y godpowers@7 verify "<verify command>"`, and touch STATE.md only if the stage or risks changed.
   - A feature or product: go through the stages in order with their skills: /god-plan, /god-build, /god-review, /god-harden, /god-ship. Skip a stage only when STATE.md shows it is already done for this goal.
4. Keep going between stages without asking. Stop only for decisions that belong to the user (scope, spending, credentials, public or irreversible actions), or when the same gate fails twice for the same reason.
5. Finish with what changed, the verify result, open risks, and the next step.
