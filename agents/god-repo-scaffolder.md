---
name: god-repo-scaffolder
description: |
  Scaffolds a production-grade repository based on the stack decision. CI/CD,
  linting, formatting, pre-commit hooks, README, CONTRIBUTING, LICENSE,
  SECURITY.md, .gitignore, .editorconfig.

  Spawned by: /god-repo, god-orchestrator
tools: Read, Write, Edit, Bash, Glob
inputs:
  - ".godpowers/stack/DECISION.mdx"
  - "optional .godpowers/org-context.yaml"
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
7. Run an audit of the scaffold
8. Write `.godpowers/repo/AUDIT.mdx`

## Have-Nots

- README is a template with TODOs
- No test directory structure
- No CI/CD pipeline
- No linter configured
- .gitignore is missing or generic
- SECURITY.md is absent
- Source code uses placeholders (lorem ipsum, foo/bar)

## Done Criteria

- All scaffold files created
- `.godpowers/repo/AUDIT.mdx` documents what was created
- CI passes on the empty scaffold
