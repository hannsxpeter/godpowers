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
- `agents/` contains Pillars 1.1 project context only
- `specialists/` contains source contracts installed into each supported host agent registry
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

This project follows Pillars 1.1.0. Coding agents read project pillar files before acting.

## At the start of any task

1. Resolve scopes from repository root to the task target. A scope contains both `AGENTS.md` and `agents/`. Apply outer scopes first and let the nearest scope win conflicts.
2. Inventory pillar frontmatter recursively, local exclusions, and optional `agents/catalog.yaml` absent concerns in each scope.
3. Load every pillar whose frontmatter has `always_load: true`. Match remaining `triggers` with the Pillars portable ASCII token matcher to select primaries and absent concerns.
4. Add each primary pillar direct `must_read_with` dependencies, depth 1 only. Path-qualified sub-pillars use identities such as `auth/agent-registration`.
5. Add a selected pillar `see_also` target only when the task matches the target identity, triggers, or covers. Do not follow soft references recursively.
6. Read every selected body. Follow Rules, apply Workflows, heed Watchouts, and ask before deciding open Gaps.

## Handling missing pillars

| State | Action |
|---|---|
| `status: present` | Load and comply. |
| `status: stub` | Treat the concern as acknowledged but undecided. Ask before making domain decisions. |
| Name in `excluded:` | Treat as intentionally not applicable in that scope. |
| Trigger matches local `agents/catalog.yaml` entry | Infer from code, state the assumption, and recommend authoring the pillar. |
| No local file, exclusion, or catalog entry | Make no Pillars-specific claim about that concern. |

If `context.md` or `repo.md` is missing and not explicitly excluded, pause and ask the human to create a stub or record an exclusion.

## Excluded pillars

```yaml
excluded: []
```
<!-- pillars:end -->

<!-- godpowers:begin -->
## Godpowers project

This project uses Godpowers. The on-disk state is the source of truth;
conversation memory is not.

- Project: godpowers
- Mode: B    Scale: large
- State: `.godpowers/state.json` is authority; `.godpowers/PROGRESS.mdx` is generated for humans

### Quarterback rule

There is exactly one orchestrator: `god-orchestrator`. It owns writes to
`state.json`, `intent.yaml`, and `events.jsonl`; `PROGRESS.mdx` is regenerated from state. Skills like
`/god`, `/god-next`, `/god-status` read state without writing.

### Useful commands

- `/god-status` - re-derive state from disk
- `/god-next` - what to run next, with reason
- `/god-mode` - run the full autonomous project run
- `/god-sync` - refresh artifacts, context, and source-system sync-back
- `/god-migrate` - import or sync legacy planning, BMAD, or Superpowers context
- `/god-context refresh` - refresh AI-tool awareness for this project

### Linkage status

- Coverage: 100%

### Active artifacts

- orchestration: `runs/20260713-arc-pillars-1-1-hardening/ORCHESTRATOR-HANDOFF.mdx`
- preflight: `preflight/PREFLIGHT.mdx`
- archaeology: `archaeology/REPORT.mdx`
- tech-debt: `tech-debt/ASSESSMENT.mdx`
- greenfield-simulation: `audit/GREENFIELD-SIMULATION.mdx`
- greenfieldify: `audit/GREENFIELDIFY-PLAN.mdx`
- sync: `SYNC-LOG.mdx`
- prd: `prd/PRD.mdx`
- arch: `arch/ARCH.mdx`
- roadmap: `roadmap/ROADMAP.mdx`
- stack: `stack/DECISION.mdx`
- repo: `repo/AUDIT.mdx`
- build: `build/STATE.mdx`
- deploy: `deploy/STATE.mdx`
- observe: `observe/STATE.mdx`
- harden: `harden/FINDINGS.mdx`
- launch: `launch/STATE.mdx`

See `.godpowers/state.json` for authority and `.godpowers/PROGRESS.mdx` for the generated tier table.
<!-- godpowers:end -->
