---
name: god-harden
description: Security pass on the current code, an OWASP Top 10 walkthrough scaled to the product plus dependency and secret checks, with findings fixed or tracked by severity. Use for /god-harden, "security review", or before a public release.
---

# /god-harden

1. Spawn the god-security-auditor subagent with the product form (web app, API, CLI, library, or service), its entry points, and the verify command.
2. It returns findings as `severity: what, where, how to reproduce`. Critical means exploitable now (data exposure, auth bypass, code execution). High is exploitable with effort, medium is a defense-in-depth gap, low is hygiene.
3. Fix criticals and highs now, each with a regression test, then run `npx -y godpowers@7 verify "<verify command>"`. List anything left open under Risks in STATE.md with its severity.
4. Record the result on the final code: `npx -y godpowers@7 record harden --pass --summary "<what was checked, counts by severity>"`. Use `--fail` while a critical is open.
5. When no critical risk is open, set `stage: ship` in STATE.md.
