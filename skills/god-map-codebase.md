---
name: god-map-codebase
description: |
  Analyze codebase with parallel mapper agents. Produces structured analysis
  documents in .godpowers/codebase/ covering tech stack, architecture, code
  quality, and concerns.

  Triggers on: "god map codebase", "/god-map-codebase", "analyze codebase",
  "codebase intelligence", "map the code"
---

# /god-map-codebase

Spawn parallel mappers to understand an existing codebase.

## When to use

- Joining an existing codebase
- Inheriting code from another team
- Pre-flight before /god-feature or /god-upgrade in unfamiliar code

## Process

Spawn 4 mapper agents in parallel, each in fresh context:

1. **Tech mapper**: language, framework, dependencies, build tooling
2. **Architecture mapper**: directory structure, modules, data flow
3. **Quality mapper**: test coverage, lint warnings, complexity hotspots
4. **Concerns mapper**: security risks, performance hotspots, technical debt

Each writes to `.godpowers/codebase/<focus>.mdx`.

After all 4 return, optionally synthesize into `.godpowers/codebase/SUMMARY.mdx`.

## On Completion

```
Codebase mapped.
  + .godpowers/codebase/tech.mdx
  + .godpowers/codebase/architecture.mdx
  + .godpowers/codebase/quality.mdx
  + .godpowers/codebase/concerns.mdx

Suggested next: /god-init Mode B (gap-fill) or /god-feature

Next commands:
- /god-intel or /god-tech-debt on the riskiest mapped area: Run the smallest safe next step.
- /god-init Mode B to gap-fill project artifacts: Run the full recommended path.
- /god-discuss the unclear architecture or quality findings: Resolve the open question before continuing.
- /god-mode after Mode B context exists: Run the full autonomous project workflow when it fits.
are missing.
```
