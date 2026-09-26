---
name: god-ship
description: Release gate and shipping checklist. Requires fresh checks, a passing review and security record, and no open critical risk, then covers deploy, rollback, monitoring, and release notes. Use for /god-ship, "ship it", "release", or "deploy".
---

# /god-ship

1. Run `npx -y godpowers@7 gate ship`. Fix every failed check before going further. Never record a pass you did not earn.
2. Make sure the release path fits the project, and add what is missing:
   - Build and deploy are repeatable from a clean checkout, and the tested artifact is the one released.
   - Rollback is written down and has been tried once.
   - A health check exercises a real dependency, not just an open port.
   - Errors are captured, and one or two signals tied to the goal are visible (for example, sign-up success rate).
   - Release notes or a changelog entry, in the project's style.
3. Publishing, production deploys, tags, and announcements are public or irreversible. Ask before each one unless the user already asked for it in this session.
4. After shipping, run the health check against the live target and record it: `npx -y godpowers@7 record ship --pass --summary "<version, where, health result>"`.
5. Set `stage: done` (or `plan` for the next goal) and summarize what shipped.
