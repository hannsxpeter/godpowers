---
name: god-postmortem
description: |
  Post-incident investigation. Builds timeline, identifies root cause AND
  class-of-bug, produces action items with owners and due dates, updates
  runbooks. Blameless framing.

  Triggers on: "god postmortem", "/god-postmortem", "incident review",
  "after-action", "root cause analysis", "what happened"
---

# /god-postmortem

Investigate an incident after resolution.

## When to use

- An incident has been resolved (or is being resolved)
- You need to prevent the class of bug, not just this instance
- You're following up after /god-hotfix

## When NOT to use

- Incident is still active: use /god-debug or /god-hotfix
- Bug found in dev (no incident): use /god-debug

## Setup

Ask the user:
- Incident ID or short title
- When it started (rough)
- When it was resolved
- Who responded
- The hotfix commit SHA if applicable

## Orchestration

Spawn **god-incident-investigator** in fresh context with the incident metadata.

The agent:
1. Builds the timeline from logs, events, git history
2. Identifies root cause via 5-whys or causal chain
3. Identifies class-of-bug (broader pattern)
4. Drafts blameless action items with owners and due dates
5. Updates relevant runbooks
6. Writes POSTMORTEM.md

## After the Investigator Returns

Optionally spawn **god-docs-writer** to:
- Update relevant runbooks
- Update on-call documentation if applicable
- Update architecture docs if the incident revealed a structural issue

## On Completion

```
Postmortem complete: .godpowers/postmortems/<incident-id>/POSTMORTEM.mdx

Severity: SEV-[N]
Root cause: [one line]
Class of bug: [pattern]
Action items: [N], with owners and due dates

Suggested next:
  - Schedule a blameless review meeting if multi-person team
  - /god-status to see action items in PROGRESS.md
  - /god-feature to prioritize the highest-priority action item
```

## Have-Nots

Postmortem FAILS if:
- Action items are vague ("communicate better", "more tests")
- Action items have no owner or due date
- Phrasing blames individuals instead of systems
- Root cause is symptom-level
- No class-of-bug identified
- Runbooks not updated
- Timeline has gaps without acknowledging unknowns

## Linkage and reverse-sync

Per Phase 13 of the production-ready plan, this workflow participates
in the linkage system:

- On completion of any code change, `lib/reverse-sync.run(projectRoot)`
  is called via god-updater. This:
  - Scans new/modified code for linkage annotations (// Implements: P-MUST-NN, etc.)
  - Updates `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
  - Detects drift via `lib/drift-detector`
  - Appends fenced footers to PRD/ARCH/ROADMAP/STACK/DESIGN
  - Surfaces drift findings to REVIEW-REQUIRED.md

- Stable IDs MUST be used in artifact deltas (P-MUST-NN, ADR-NNN,
  C-{slug}, M-{slug}, S-{slug}, D-{slug}, token paths). The scanner
  picks them up automatically via comment annotations.

- For UI work: agent-browser audit may run as part of /god-build
  post-wave or /god-launch gate (see `/god-test-runtime`).

- Findings flow into the standard REVIEW-REQUIRED.md walkthrough
  via `/god-review-changes`.
