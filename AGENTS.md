# Godpowers - Agent Brief

This is the Godpowers repository: an AI-powered development system that takes
projects from raw idea to hardened production.

## Reading Order

1. `README.md` - what this is, how to use it
2. `SKILL.md` - the core skill (the brain)
3. `skills/god-mode.md` - the autonomous orchestrator
4. `skills/god-init.md` - project initialization
5. `skills/god-prd.md` through `skills/god-harden.md` - individual tier skills

## Architecture

- `SKILL.md` is the main entry point, loaded by AI coding tools
- `skills/` contains individual command skills (one per file)
- `routing/` contains command routing metadata and intent recipes
- `workflows/` contains executable workflow YAML
- `references/` contains per-tier reference material (antipatterns, examples)
- `bin/` contains the CLI installer (`npx godpowers`)
- `lib/` contains executable runtime helpers, sync checks, dogfood, dashboard, and release logic
- `scripts/` contains validation and testing scripts
- `templates/` contains artifact templates
- `fixtures/dogfood/` contains messy-repo release dogfood scenarios

## Conventions

- Every skill file has YAML frontmatter with `name`, `description`, and trigger phrases
- Every tier skill documents its gate check (upstream dependency)
- Every tier skill documents its have-nots (failure modes)
- Artifacts are written to `.godpowers/<tier>/` paths
- State is tracked in `.godpowers/PROGRESS.mdx`
- Dashboard state is computed by `lib/dashboard.js`
- Repo docs, repo surface, route quality, recipe coverage, release surface, host capability, and dogfood checks are executable release gates
- Disk state is authoritative; conversation memory is not

## Quality Rules

- No em dashes or en dashes (use commas, colons, semicolons, or parentheses)
- No emojis (use `+`, `-`, `x`, `!` for status indicators)
- Every sentence in generated artifacts must be labeled: DECISION, HYPOTHESIS, or OPEN QUESTION
- Every claim must fail the substitution test (swap in a competitor, sentence must break)

<!-- pillars:begin -->
# Godpowers Project Context

This is a Godpowers project. Godpowers uses the Pillars standard as its native project context layer.
Coding agents read project context from `./agents/*.md` before changing code, while `.godpowers/` remains the Godpowers workflow state and artifact layer.

## At the start of any task

1. Load every pillar whose frontmatter has `always_load: true`.
2. Scan remaining pillar frontmatter and select task-relevant primaries from `triggers` and `covers`.
3. Add each primary pillar direct `must_read_with` dependencies, depth 1 only.
4. Read every pillar body in the computed load set.
5. Read `see_also` pillars only when the task explicitly touches that area.
6. Follow Rules, apply Workflows, heed Watchouts, and ask before deciding open Gaps.

## Handling missing pillars

| State | Action |
|---|---|
| `status: present` | Load and comply. |
| `status: stub` | Treat the concern as acknowledged but undecided. Ask before making domain decisions. |
| Name in `excluded:` | Treat as intentionally not applicable. |
| Relevant but absent | Infer from code, state the assumption, and recommend authoring the pillar. |

If `context.md` or `repo.md` is missing, pause and create stubs before continuing.

## Excluded pillars

```yaml
excluded: []
```
<!-- pillars:end -->
