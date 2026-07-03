---
name: god-hygiene
description: |
  Composite health check for ongoing projects. Runs audit (artifact quality)
  + dep audit (CVEs, staleness) + docs verification (drift). Use periodically
  (weekly/monthly) or before milestones.

  Triggers on: "god hygiene", "/god-hygiene", "health check", "project health",
  "weekly check", "audit everything"
---

# /god-hygiene

Periodic health check. Three audits in one slash command.

## When to use

- Weekly or monthly cadence on a live project
- Before announcing a milestone
- After a long break from a project
- Before handing off to a new owner

## When NOT to use

- Mid-incident: focus on /god-hotfix or /god-debug
- Right after /god-mode: hygiene was already optional during the project run

## Orchestration

Run three sub-audits in sequence. Each is independent and reports to the
top-level summary.

### 1. Artifact Quality Audit
Spawn **god-auditor** with audit-only mode.
Output: `.godpowers/AUDIT-REPORT.mdx`

### 2. Dependency Audit
Spawn **god-deps-auditor** in audit-only mode (no updates applied).
Output: `.godpowers/deps/AUDIT.mdx`

### 3. Docs Verification
Spawn **god-docs-writer** in verify-only mode (no edits applied).
Output: `.godpowers/docs/UPDATE-LOG.mdx` with drift list

## Composite Report

After all three complete, write `.godpowers/HYGIENE-REPORT.mdx`:

```markdown
# Project Hygiene Report

Date: [ISO 8601]

## Artifact Quality
- Score: [%]
- Passing: [N artifacts]
- Failing: [N artifacts]
- Top fix: [most impactful remediation]

## Dependencies
- Critical CVEs: [N]
- Stale (>18mo): [N]
- Major behind: [N]
- Top action: [highest-priority update]

## Documentation
- Drift entries: [N]
- Top drift: [most misleading claim]

## Recommended Actions (prioritized)
1. [Highest-priority action across all three audits]
2. [Next]
3. [Next]

## Health Score
Overall: [composite score 0-100]
- Artifact quality: [%]
- Dependency hygiene: [%]
- Documentation accuracy: [%]
```

## On Completion

```
Hygiene check complete.
Report: .godpowers/HYGIENE-REPORT.mdx

Health score: [%]

Suggested next actions (in priority order):
  1. [highest-priority]
  2. [next]
  3. [next]

Schedule next hygiene check in [N days] (default: 30).

Next commands:
- /god-next: Run the highest-priority hygiene follow-up from disk state.
- /god-hygiene: Re-run the health check after P0 and P1 fixes.
- /god-discuss hygiene remediation: Resolve the open question before continuing.
- /god-status after fixes: Inspect status before continuing.
```

## Have-Nots

Hygiene check FAILS if:
- Any sub-audit was skipped without justification
- Composite report has no prioritized actions
- Critical CVE found and not surfaced as P0
- Doc drift "minor only" without verifying
