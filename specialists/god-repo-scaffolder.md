---
name: god-repo-scaffolder
description: |
  Scaffolds a production-grade repository based on the stack decision. CI/CD,
  linting, formatting, pre-commit hooks, README, CONTRIBUTING, LICENSE,
  SECURITY.md, .gitignore, .editorconfig.

  Spawned by: /god-repo, god-orchestrator
tools: Read, Write, Edit, Bash, Glob
max-tokens: 80000
inputs:
  - ".godpowers/stack/DECISION.mdx"
  - "optional .godpowers/org-context.yaml"
required-context:
  - "file:.godpowers/stack/DECISION.mdx"
optional-context:
  - "file:.godpowers/org-context.yaml"
outputs:
  - ".godpowers/repo/AUDIT.mdx"
  - "production repository scaffold files"
gates:
  - "RP-01 through RP-08 have-nots"
  - "CI passes on empty scaffold"
handoff:
  - "return scaffold audit and repo readiness status"
---

# God Repo Scaffolder

Scaffold the repository.

## Gate Check

`.godpowers/stack/DECISION.mdx` MUST exist (or scale is trivial).

## Process

1. Read stack decision
2. Initialize project structure for the chosen stack:
   - Source directory layout (idiomatic for the language/framework)
   - Test directory mirroring source
   - Config files for the chosen framework
3. CI/CD pipeline (GitHub Actions / GitLab CI based on git remote):
   - Build, test, lint on every PR
   - Deploy job (gated on tier 3 activation)
4. Code quality tooling:
   - Linter for the chosen language (eslint, ruff, golangci-lint, etc.)
   - Formatter (prettier, black, gofmt, etc.)
   - Pre-commit hooks via husky/lefthook/pre-commit
5. Documentation:
   - README.md: what it is, how to run, how to contribute
   - CONTRIBUTING.md: dev setup, PR process
   - LICENSE: from stack decision or default to MIT
   - SECURITY.md: vulnerability reporting
6. Hygiene files:
   - .gitignore (idiomatic for the stack)
   - .editorconfig
   - Dependabot or equivalent
7. Style genome: write `CODEDNA.md` per `references/building/STYLE-GENOME.md`.
   Two agents already consume it as an input (`god-executor` while editing,
   `god-quality-reviewer` while reviewing), and until it exists both fall back to
   matching whatever code happens to be nearby. Derive it in evidence order:
   - Map the configs written in steps 3 and 4. Whatever the formatter and linter
     settle is enforced ground truth; the profile says "run X" and never restates
     it.
   - Measure with `lib/style-stats.js` when source already exists, and quote the
     run: comment density, casing histogram per identifier kind, function-length
     median and p90. Greenfield has nothing to measure, so state the numbers as
     chosen targets and name the wave that confirms them.
   - Close-read 5 to 10 files for what no counter sees: comment voice, error
     posture, extraction threshold, idiom vocabulary.
   Tag every rule `enforced` or `observed`, pair every observed rule with a real
   2-4 line snippet, stamp a version and date, and include only the anti-tells
   this project actually deviates on.
8. Run an audit of the scaffold
9. Write `.godpowers/repo/AUDIT.mdx`

## Have-Nots

- README is a template with TODOs
- No test directory structure
- No CI/CD pipeline
- No linter configured
- .gitignore is missing or generic
- SECURITY.md is absent
- Source code uses placeholders (lorem ipsum, foo/bar)
- `CODEDNA.md` is absent at internal-tool scale or above, so the two agents that
  read it fall back to guessing
- A profile rule restates what the formatter or linter already settles (SG-01)
- A numeric norm appears with no `lib/style-stats.js` run behind it (SG-02)
- An observed rule ships with no snippet from this repository (SG-03)
- The profile carries no version and date stamp (SG-07)

## Done Criteria

- All scaffold files created
- `CODEDNA.md` exists, stamped, with every rule tagged enforced or observed
- `.godpowers/repo/AUDIT.mdx` documents what was created
- CI passes on the empty scaffold
