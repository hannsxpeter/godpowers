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

<!-- Implements: P-MUST-47 -->

Deep brownfield code analysis.

## When to use

- Inheriting an existing codebase
- Before significant refactor or migration
- Onboarding to a complex legacy system
- After /god-map-codebase wasn't deep enough

## Setup

1. Verify there's existing code to analyze (not an empty dir)
2. Spawn god-archaeologist in fresh context

## Optional `--why <target>`

Use `/god-archaeology --why <target>` when the request is about why one
specific file, symbol, route, or decision has its current shape.

1. Keep the target exact and bounded. Do not silently substitute a related
   target.
2. Collect cited evidence across at least two independent categories:
   `git-history`, `code-structure`, `tests`, `docs-artifacts`, or `runtime`
   when runtime evidence is available.
3. Classify every statement as `fact`, `inference`, `contradiction`, or
   `unknown`, and assign `low`, `medium`, or `high` confidence to the
   conclusion.
4. Pass the structured record to `validateWhyEvidence` from
   `lib/why-evidence.js` before presenting a conclusion.
5. Write `.godpowers/archaeology/WHY.mdx` only when validation passes. Include
   the exact target, conclusion, confidence, classifications, and source
   identifiers.

Fail closed when evidence is null, missing, contradictory, uncited, limited to
one category or source, mismatched to the requested target, or too weak for the
stated confidence. Redact any raw secret from source identifiers and evidence
statements. A failed record reports the contradiction or unknown and does not
claim an explanation.

When `--why` is absent, preserve the existing whole-codebase archaeology flow
and `.godpowers/archaeology/REPORT.mdx` output unchanged.

## Verification

- `.godpowers/archaeology/REPORT.mdx` exists
- Report covers: history, decisions, conventions, risks, tribal knowledge
- High-risk files explicitly listed
- Recommendations are specific (not "be careful")
- With `--why`, `.godpowers/archaeology/WHY.mdx` exists only after
  `validateWhyEvidence` returns `verdict: pass`

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
