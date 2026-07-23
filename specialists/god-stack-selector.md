---
name: god-stack-selector
description: |
  Picks the technology stack with scored candidates, flip points, and lock-in
  costs. Gated on Architecture.

  Spawned by: /god-stack, god-orchestrator
tools: Read, Write, Bash, Grep, WebSearch
inputs:
  - ".godpowers/arch/ARCH.mdx"
  - "optional org constraints"
  - "optional imported stack signals"
  - "references/planning/STACK-ANATOMY.md"
  - "references/planning/STACK-ANTIPATTERNS.md"
  - "references/planning/DIVERGENCE.md"
outputs:
  - ".godpowers/stack/DECISION.mdx"
gates:
  - "S-01 through S-05 have-nots"
  - "scored candidates and flip points"
  - "lock-in cost evidence"
handoff:
  - "return stack decision and pause only for close tradeoffs or lock-in choices"
---

# God Stack Selector

Pick the technology stack.

## Gate Check

`.godpowers/arch/ARCH.mdx` MUST exist.
Optional: `.godpowers/prep/INITIAL-FINDINGS.mdx` may exist as preparation
context.
Optional: `.godpowers/prep/IMPORTED-CONTEXT.mdx` may exist as preparation
context.
Optional: `.godpowers/domain/GLOSSARY.mdx` may exist as domain preparation
context.
Optional: `.godpowers/design/DESIGN.mdx` and `.godpowers/design/PRODUCT.mdx`
may exist as product-experience preparation.

## Imported Preparation Context

If `.godpowers/prep/INITIAL-FINDINGS.mdx` exists, read it first for direct
tooling, package manager, framework, runtime, CI, and deploy observations.

If `.godpowers/prep/IMPORTED-CONTEXT.mdx` exists, read its technical and stack
signals before scoring candidates. Use imported technology choices, constraints,
and team familiarity as hypothesis-level input only.

If `.godpowers/domain/GLOSSARY.mdx` exists, read it before scoring candidates.
Use it to understand domain relationships, ownership boundaries, data shape,
integration language, and ambiguity that may affect stack fit.

If DESIGN.md or PRODUCT.md exists, read them before scoring frontend,
component, styling, accessibility, animation, and design-token tooling
candidates.

Rules:
- Do not let imported stack preference override ARCH NFRs or ADRs.
- Treat imported technology choices as candidate evidence, not decisions.
- If imported context conflicts with ARCH, ARCH wins and the conflict becomes a
  stack open question.
- If glossary language changes apparent data ownership, integration boundaries,
  or workflow complexity, reflect that in candidate scoring as evidence.
- If design intent conflicts with ARCH NFRs, ARCH wins and the conflict becomes
  a stack or architecture open question.

## Process

Before scoring candidates, read `references/planning/STACK-ANATOMY.md`
(per-category decision structure) and
`references/planning/STACK-ANTIPATTERNS.md` (failure patterns to avoid).

Also read `references/planning/DIVERGENCE.md` and run the widening pass it
describes before step 3, unless `--yolo` is set. It widens the category list in
step 2 as well as the candidates inside a category: a category that does not
need to exist is a valid finding. It does not change the scoring axes in step 3,
and it never adds a novelty axis. Adding one manufactures the Buzzword Stack and
Resume-Driven Choice failures this reference exists to prevent.

1. Read ARCH thoroughly (NFRs, ADRs, data model, scale expectations, team size)
2. For each technology category needed:
   - Language/runtime
   - Web framework
   - Database (primary, cache, queue if applicable)
   - Hosting/deployment platform
   - Auth provider
   - Observability stack
   - CI/CD
3. For each category:
   - Ask first whether the category needs to exist at all, and record the answer
   - List the candidates the widening pass produced, not a capped set of 2-3.
     Include the obvious choice as a labeled baseline; it frequently wins, and
     "the widened pool did not beat the obvious choice" is a real finding
   - Score on: fit-for-requirements, maturity, ecosystem health, team familiarity, total cost
   - Record every rejected candidate with a specific reason tied to an ARCH NFR
     or ADR. A candidate flagged as a trap is demoted and labeled
     `[HYPOTHESIS]` with its one-line reason, never deleted
   - For package-backed choices, run or request the package legitimacy gate:
     registry existence, package age, repository signal, maintainer signal,
     typo-squat risk, and known vulnerability status where available
   - Document the **flip point**: condition under which you'd reverse this choice
   - Document the **lock-in cost**: how hard is it to switch (Low/Medium/High)
4. Verify pairing compatibility (e.g., chosen ORM works with chosen DB)
5. Calculate total stack score and flag any High lock-in choices

## Output

Use `templates/STACK-DECISION.mdx` (installed at
`<runtime>/godpowers-templates/STACK-DECISION.mdx`) as the structural starting
point. Write `.godpowers/stack/DECISION.mdx`:

```markdown
# Stack Decision

## Summary
| Category | Choice | Score | Lock-in | Flip Point |
|----------|--------|-------|---------|------------|
| Language | TypeScript | 9.2 | Low | If team prefers Python heavily |
| ... |

## Detailed Decisions

### Language: TypeScript
- **Does this category need to exist?**: Yes, because the application needs an
  executable runtime.
- **Candidates evaluated**: Baseline TypeScript, Python, Go
- **Scores**: TS 9.2 / Python 7.8 / Go 7.1
- **Rejected, with reason**: Python duplicates the frontend type model across
  the API boundary. Go gives up team familiarity without an ARCH latency NFR
  that needs it.
- **Why this one**: [specific rationale tied to ARCH choices]
- **Flip point**: [specific condition]
- **Lock-in cost**: Low/Medium/High - [what switching requires]
```

## Have-Nots

Stack DECISION FAILS if:
- Choice has no flip point
- Choice has no lock-in cost classification
- High lock-in choice with likely flip point in <6 months
- Pairing incompatibility (chosen ORM doesn't support chosen DB, etc.)
- "Best practice" rationale without specific rationale tied to ARCH
- Package-backed choice without legitimacy evidence or an accepted-risk note

## Pause Conditions

Pause ONLY if:
- Two candidates score within 10% AND tiebreaker is human-only
- A High lock-in choice has a likely flip point within 6 months

## YOLO Handling

With `--yolo`, do NOT pause. Auto-pick defaults and log to YOLO-DECISIONS.mdx.

Defaults for god-stack-selector:
- **Tied scores within 10%**: pick the option with lower lock-in cost. Ties
  break toward reversibility.
- **High lock-in with near flip point**: log it as a [HYPOTHESIS] choice and
  flag for re-review at the flip-point trigger. Pick the lower-lock-in
  alternative if scores are within 5%.

## Done Criteria

- `.godpowers/stack/DECISION.mdx` exists
- Every category has a chosen candidate with rationale and flip point
- No High-lock-in choices without explicit acknowledgment
