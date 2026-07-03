---
name: god-preflight
description: |
  Run a read-only intake audit before project-run readiness, pillars, archaeology, or
  reconstruction work. Inventory the codebase, surface blockers, and recommend
  the safest next pass without changing project code.

  Triggers on: "god preflight", "/god-preflight", "preflight audit",
  "audit before project-run readiness", "audit before pillars", "intake audit"
---

# /god-preflight

Read-only intake audit for an existing codebase.

## When to use

- Before applying project-run direction to an existing repo
- Before scoring the repo against pillars
- Before brownfield archaeology or reconstruction
- When deciding whether to restructure, refactor, initialize Godpowers, or pause

## Purpose

This command diagnoses the repo before stronger workflows touch it.

It answers:

- What kind of project is this?
- What structure, tooling, tests, docs, CI, deploy paths, and agent instructions exist?
- What is missing before the project run can make good decisions?
- Which pillar weaknesses are already visible?
- What areas are risky to refactor before more evidence exists?
- What is the safest next pass?

## Process

1. Verify the target directory contains code or project configuration.
2. Create `.godpowers/preflight/` if needed.
3. Inspect the repo read-only:
   - package manifests, lockfiles, build files, test config, CI config
   - source tree shape, entry points, module boundaries, scripts
   - README, docs, ADRs, architecture notes, env examples, AGENTS.md
   - test presence, test command discoverability, coverage signals
   - deploy, observability, security, dependency, and ownership signals
   - `.godplans/PLAN.mdx` and `.godaudits/AUDIT.mdx` presence (sibling
     superskill artifacts; a master plan is direct arc-readiness evidence,
     a prior audit is direct scoring evidence; both are read-only)
4. Produce `.godpowers/preflight/PREFLIGHT.mdx`.
5. Do not edit source files, planning artifacts, configs, or docs outside
   `.godpowers/preflight/`.

## Scoring

Score only what can be supported by repo evidence.

Use these dimensions:

| Dimension | Looks for |
|---|---|
| Repo shape | Project type, framework, package manager, entry points, source layout |
| Arc readiness | Product direction, architecture notes, roadmap, deploy story, decision records, godplans master plan (`.godplans/PLAN.mdx`) |
| Pillar readiness | Tests, security, docs, observability, maintainability, UX, deployability |
| Godpowers readiness | Disk artifacts, AGENTS.md, commands, progress state, safe agent boundaries |
| Refactor risk | Coupling, missing tests, unclear ownership, ambiguous runtime paths |
| Suite signals | Multi-package or multi-repo structure, shared packages, release coordination |

Scores are directional, not final quality grades. The value is the evidence and
the sequence.

## Output

The report must be plain and evidence-backed. Every recommendation must explain
why it comes before the next one.

Write `.godpowers/preflight/PREFLIGHT.mdx`:

```markdown
# Godpowers Preflight

Date: [timestamp]
Target: [path]

## Snapshot

- DECISION: Project type is [type] because [files or commands].
- HYPOTHESIS: Primary runtime appears to be [runtime] because [evidence].
- OPEN QUESTION: [question that blocks confident planning].

## Readiness Scores

| Lens | Score | Evidence | Main blocker |
|---|---:|---|---|
| Arc-ready | [0-100] | [specific files or absence] | [blocker] |
| Pillars | [0-100] | [specific files or absence] | [blocker] |
| Godpowers | [0-100] | [specific files or absence] | [blocker] |
| Ready-suite | [0-100 or N/A] | [specific files or absence] | [blocker] |

## Inventory

- DECISION: [thing found] at `[path]`.
- HYPOTHESIS: [thing inferred] from `[path]`.

## Blockers Before Arc-Ready

1. DECISION: [blocker].
   Evidence: `[path]` or missing `[path]`.
   Next move: [specific command or artifact].

## Pillar Weaknesses

1. DECISION: [weakness].
   Evidence: `[path]` or missing `[path]`.
   Impact: [why it matters].

## Refactor Risk

1. HYPOTHESIS: [risk].
   Evidence: `[path]`.
   Avoid until: [needed proof or test].

## Recommended Sequence

1. DECISION: Run [next command or task] first because [reason].
2. DECISION: Run [next command or task] second because [reason].
3. DECISION: Defer [task] until [condition].
```

## Routing Guidance

Use the report to choose the next pass:

| Finding | Suggested next |
|---|---|
| Missing basic project state | `/god-init` |
| Unknown legacy structure | `/god-archaeology` |
| godplans `PLAN.mdx` exists | `/god-migrate` (import the plan; do NOT reconstruct) |
| godaudits `AUDIT.mdx` exists | `/god-migrate` then `/god-audit` in prior-audit mode (consume, do not re-derive) |
| Existing code lacks planning artifacts | `/god-reconstruct` |
| Debt dominates delivery risk | `/god-tech-debt` |
| Artifacts exist but quality is unknown | `/god-audit` |
| Tests are absent before refactor | `/god-add-tests` |
| Refactor path is obvious and bounded | `/god-refactor` |

## Next Commands Closeout

End the user-facing response with a Next commands block based on the recommended
sequence:

```
Next commands:
- /god-next: Run the first recommended command from the preflight result.
- /god-mode: Continue the full recommended sequence when preflight is clear.
- /god-discuss [highest uncertainty or blocker]: Resolve the open question before continuing.
- /god-mode only when the preflight says the repo is ready or the remaining gaps are acceptable: Run the full autonomous project workflow when it fits.
```

## Guardrails

- Build nothing.
- Do not modify application code.
- Do not normalize formatting.
- Do not create roadmap, PRD, architecture, or pillar artifacts.
- Do not score by vibe. Tie every score to evidence.
- Prefer "unknown" over confident invention.
