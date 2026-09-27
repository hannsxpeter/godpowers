---
name: god-harden
description: Security pass on the current code, an OWASP Top 10 walkthrough scaled to the product plus dependency and secret checks, with findings fixed or tracked by severity. Use for /god-harden, "security review", or before a public release.
---

# /god-harden

1. Run the pass yourself, or delegate it to a subagent of your choice, run however you prefer. Either way it covers: the trust boundaries and where untrusted input enters; each OWASP Top 10 (2025) category that can apply to this product form (web app, API, CLI, library, or service), probed against a local build where possible; the dependency audit; committed secrets. A delegated auditor gets the product form, the entry points, and the verify command. Before you start it, say which model and effort you picked and why, then pass both explicitly (whichever your host accepts); never let it inherit yours. Size both to the stakes: the most capable model at high effort for products that handle auth, money, personal data, or internet-facing input; a faster model at lower effort for a small internal tool.
2. Findings read `severity: what, where, how to reproduce`. Critical means exploitable now (data exposure, auth bypass, code execution). High is exploitable with effort, medium is a defense-in-depth gap, low is hygiene.
3. Fix criticals and highs now, each with a regression test, then run `npx -y godpowers@7 verify "<verify command>"`. List anything left open under Risks in STATE.md with its severity.
4. Record the result on the final code: `npx -y godpowers@7 record harden --pass --summary "<what was checked, counts by severity>"`. Use `--fail` while a critical is open.
5. When no critical risk is open, set `stage: ship` in STATE.md if the user asked to ship, otherwise `stage: done`.
