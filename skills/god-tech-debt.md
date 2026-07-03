---
name: god-tech-debt
description: |
  Assess and prioritize technical debt across 8 categories: code, design,
  dependency, security, test, doc, operational, knowledge. Outputs P0-P3
  prioritized remediation plan with cost/impact estimates.

  Triggers on: "god tech debt", "/god-tech-debt", "tech debt assessment",
  "debt audit", "prioritize debt"
---

# /god-tech-debt

Categorize, prioritize, plan tech debt remediation.

## When to use

- Quarterly health check on a brownfield project
- Before /god-upgrade or /god-refactor on legacy code
- After /god-archaeology surfaced concerns
- Before promising features that may need debt paydown first

## Setup

1. Verify codebase exists
2. Spawn god-debt-assessor in fresh context

## Verification

- `.godpowers/tech-debt/REPORT.mdx` exists
- All 8 debt categories assessed (no silent skips)
- Items prioritized P0/P1/P2/P3 with cost + impact rationale
- P0 items have specific recommended commands

## On Completion

```
Tech debt assessment complete: .godpowers/tech-debt/REPORT.mdx

Summary:
  P0 (do this sprint):    [N] items, [N] person-weeks
  P1 (this quarter):      [N] items
  P2 (when convenient):   [N] items
  P3 (backlog or ignore): [N] items

Top 3 P0 items:
  1. [item] -- /god-hotfix
  2. [item] -- /god-add-tests
  3. [item] -- /god-deploy revisit

Suggested next:
  - Address P0 items first (route via the suggested commands)
  - /god-update-deps if dependency debt is a P0/P1 driver
  - /god-upgrade for major-version migrations
  - Re-run /god-tech-debt quarterly

Next commands:
- /god-refactor <top-p0-item>: Address the highest-priority debt item first.
- /god-feature or /god-refactor for the full P0 bundle: Run the full recommended path.
- /god-discuss the highest-cost or highest-risk debt item: Resolve the open question before continuing.
- /god-mode only if debt work should join the full project run: Run the full autonomous project workflow when it fits.
lands.
```
