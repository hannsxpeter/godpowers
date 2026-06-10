---
name: god-audit
description: |
  Score existing artifacts against all have-nots. Build nothing. Report gaps
  with prioritized remediation.

  Triggers on: "god audit", "audit the project", "score artifacts", "check quality"
---

# /god-audit

Spawn the **god-auditor** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify `.godpowers/` directory exists. If not: tell user there's nothing to audit.
2. Spawn god-auditor with instructions: "Run full audit mode. Score every
   artifact against `references/HAVE-NOTS.md`."
3. The agent writes `.godpowers/AUDIT-REPORT.md`

## Greenfield Simulation Mode

When invoked by `brownfield-arc` or `bluefield-arc` with
`mode: greenfield-simulation`, spawn god-auditor with the current project
evidence and ask it to compare the repo or org constraints against the
canonical Godpowers greenfield project run. The agent writes
`.godpowers/audit/GREENFIELD-SIMULATION.md`.

This mode builds nothing and rewrites no planning artifacts. It exists so
brownfield and bluefield projects can benefit from the same PRD, design, arch,
roadmap, stack, build, deploy, observe, harden, and launch expectations that a
greenfield Godpowers run would have applied.

## Acting On Greenfield Simulation

The audit is preparation, not the action. In brownfield and bluefield arcs,
the next step must spawn `god-greenfieldifier`.

`god-greenfieldifier` writes
`.godpowers/audit/GREENFIELDIFY-PLAN.md`, classifies every audit finding, and
then pauses before rewriting canonical artifacts whenever the change could
alter product scope, design direction, architecture, roadmap, stack, deploy,
observe, launch, harden, org policy, or user commitments.

After approval, the greenfieldifier updates all affected artifacts thoroughly:
PRD, DESIGN, PRODUCT, ARCH, ROADMAP, STACK, REPO, BUILD, DEPLOY, OBSERVE,
LAUNCH, and HARDEN. It then syncs `state.json`, generated progress views, and
SYNC-LOG.md.

## Verification

After god-auditor returns:
1. Verify AUDIT-REPORT.md exists on disk
2. Display the summary table to the user
3. If any artifact scored below 80%: suggest re-running the failing tier
4. End with a proposition block:

```
Proposition:
  1. Implement partial: [rerun the single lowest-scoring tier or fix the top finding]
  2. Implement complete: [rerun all failing tiers in priority order]
  3. Discuss more: /god-discuss audit remediation plan
  4. Run God Mode: /god-mode only when the audit has no blocking findings
Recommended: [one option and why]
```

## Output Format

The agent produces `.godpowers/AUDIT-REPORT.md`:

```markdown
# Godpowers Audit Report

Date: [timestamp]

## Summary

| Artifact | Have-Nots Checked | Passed | Failed | Score |
|----------|------------------|--------|--------|-------|
| PRD | 8 | 6 | 2 | 75% |
| Architecture | 7 | 7 | 0 | 100% |
| ... | ... | ... | ... | ... |

Overall: 85%

## Failures (prioritized by impact)

### 1. PRD: Target user is generic
- **Have-not**: Target user is "developers" with no further specificity
- **Found**: "This is for developers who want to..." (line 14)
- **Fix**: Replace with specific persona (e.g., "solo founders building SaaS MVPs")

### 2. PRD: Success metric has no timeline
- **Have-not**: Success metric has no timeline
- **Found**: "1000 users" (line 28) -- no "by when"
- **Fix**: Add timeline (e.g., "1000 users within 60 days of launch")
```

## Universal Have-Nots (checked on all artifacts)

- AI-slop: passes substitution test
- Unlabeled sentence: not decision/hypothesis/open question
- Paper artifact: document exists, mechanism does not
- Phantom reference: references an artifact that doesn't exist on disk
