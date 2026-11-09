---
name: god-ship
description: Use for /god-ship, "ship it", "release", or "deploy". Release gate and checklist.
---

# /god-ship

1. Run `npx -y godpowers@7 gate ship` (add `--onto <target branch>` when shipping from a branch; if it warns the target moved, rebase and verify again). Its requirements follow the risk tier it prints; run /god-harden only when it asks for a security record. Show the user any `tests` warning before shipping. Fix every failed check before going further. Never record a pass you did not earn.
2. Make sure the release path fits the project, and add what is missing:
   - Build and deploy are repeatable from a clean checkout, and the tested artifact is the one released.
   - Rollback is written down and has been tried once.
   - A health check exercises a real dependency, not just an open port.
   - Errors are captured, and one or two signals tied to the goal are visible (for example, sign-up success rate).
   - Release notes or a changelog entry, in the project's style. Paste the output of `npx -y godpowers@7 verdict` unedited into the PR description or release notes.
3. Publishing, production deploys, tags, and announcements are public or irreversible. Ask before each one unless the user already asked for it in this session.
4. After shipping, run the health check against the live target and record it: `npx -y godpowers@7 record ship --pass --summary "<version, where, health result>"`.
5. Set `stage: done` (or `plan` for the next goal) and summarize what shipped.
