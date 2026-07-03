---
name: god-archaeology
description: |
  Deep code archaeology for brownfield projects. Goes beyond /god-map-codebase
  by tracing history, surfacing tribal knowledge, identifying risk areas, and
  reconstructing decisions from evidence in the code.

  Triggers on: "god archaeology", "/god-archaeology", "code archaeology",
  "understand legacy", "deep code analysis"
---

# /god-archaeology

Deep brownfield code analysis.

## When to use

- Inheriting an existing codebase
- Before significant refactor or migration
- Onboarding to a complex legacy system
- After /god-map-codebase wasn't deep enough

## Setup

1. Verify there's existing code to analyze (not an empty dir)
2. Spawn god-archaeologist in fresh context

## Verification

- `.godpowers/archaeology/REPORT.mdx` exists
- Report covers: history, decisions, conventions, risks, tribal knowledge
- High-risk files explicitly listed
- Recommendations are specific (not "be careful")

## On Completion

```
Archaeology complete: .godpowers/archaeology/REPORT.mdx

History analyzed: [N] commits over [time period]
High-risk files identified: [N]
Open tribal-knowledge questions: [N]

Suggested next:
  /god-reconstruct  - reverse-engineer planning artifacts from this code
  /god-tech-debt    - assess and prioritize debt revealed
  /god-feature      - now safe to add new work with archaeology in hand

Next commands:
- /god-tech-debt for only the highest-risk areas: Run the smallest safe next step.
- /god-reconstruct then /god-audit for full brownfield alignment: Run the full recommended path.
- /god-discuss the open tribal-knowledge questions: Resolve the open question before continuing.
- /god-mode only after reconstruction or audit makes the state clear: Run the full autonomous project workflow when it fits.
```
