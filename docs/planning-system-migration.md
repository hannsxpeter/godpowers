# Planning System And Sibling Superskill Migration

Godpowers does not require you to start from a blank repo. If planning already
exists, from a Godpowers sibling superskill or from another tool, Godpowers
detects it, imports the useful signals, builds on them instead of starting over,
and can write its own progress back.

Two kinds of prior planning are supported:

1. **Sibling superskills** (first-class, structured, machine-authored):
   - [godplans](https://github.com/hannsxpeter/godplans) 1.1 emits
     `.godplans/PLAN.mdx` plus executable `.godplans/validate-plan.sh`, a
     two-artifact master-plan contract with `GP-` checkbox tasks,
     `R-<DOM>-n` requirements, lifecycle state, and embedded executor rules.
   - [godaudits](https://github.com/hannsxpeter/godaudits) emits canonical
     `.godaudits/AUDIT.json` plus generated `.godaudits/AUDIT.mdx`, with
     `A-<DOM>-n` checks, `F-<DOM>-n` findings, compiled score and coverage, and
     typed `GA-` remediation tasks.
2. **Foreign planning systems** (evidence-based import): legacy planning, BMAD,
   and Superpowers.

## Why the siblings are different

godplans, godaudits, and Godpowers share one design. godplans inverts every
audit check into a plan-time requirement; godaudits runs those same checks
forward against code; Godpowers builds. They share the 18 domain codes and a
mirrored id scheme, so `A-SEC-3` audits what `R-SEC-3` planned. Because the
complete Godplans two-artifact emission is authored, structurally checked
intent, and `AUDIT.json` is validated, evidence-backed machine state, Godpowers
trusts them more than it trusts a foreign document:

- A complete Godplans 1.1 contract seeds the PRD, architecture, roadmap,
  stack, and build-state tiers as
  `imported` context directly, instead of being reverse-engineered from code.
  All applicable `GP` task ids, lifecycle fields, Verify commands, local
  requirements, and domain requirement ids are preserved in destination
  seeds. Plan-stated facts are cited as `[DECISION]`-grade. A PLAN without the
  pinned executable validator, or a structurally invalid or inconsistent
  contract, remains hypothesis-grade migration context and cannot dispatch GP
  work.
- An `AUDIT.json` seeds the harden tier and turns open `GA` remediation tasks
  into dispatchable work. Findings are deduped by `F` id rather than
  rediscovered. The generated `AUDIT.mdx` remains a readable fallback.

The machine contract Godpowers parses (frontmatter fields, task and finding
grammar, id schemes, MDX-safety rules) is documented in `ARCHITECTURE.md`
section 17. The runtime that reads it is `lib/sibling-artifacts.js`
(`detect`, `parsePlan`, `validatePlanText`, `loadPlan`, `planExecutionState`,
`parseAudit`, `summarize`, `remediationTasks`, `staleness`). It consumes
godaudits 2.x computed score and coverage directly,
recomputes counts only for legacy MDX, and never writes to sibling files.

## What Is Detected

| System | Primary signals | Common files | Confidence |
|---|---|---|---|
| godplans | `.godplans/`, `.godplans/PLAN.mdx` | `PLAN.mdx` plus executable `validate-plan.sh` | high (structured two-artifact contract; PLAN-only is legacy context) |
| godaudits | `.godaudits/`, `.godaudits/AUDIT.json` | `AUDIT.json` plus generated `AUDIT.mdx` | high (structured canonical state) |
| legacy planning | `.planning/`, `.legacy-planning/`, `LEGACY-PLANNING.md`, `legacy-planning*.md` | `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, phase files | evidence-based |
| BMAD | `_bmad/`, `_bmad-output/`, `.bmad-core/`, `.bmad/`, `BMAD.md` | `PRD.md`, `architecture.md`, epics, stories, `sprint-status.yaml`, `project-context.md` | evidence-based |
| Superpowers | `docs/superpowers/`, `.superpowers/`, `SUPERPOWERS.md`, project-local skills | specs, plans, TDD and review skill files | evidence-based |

Detection is evidence-based for the foreign systems: marker folders raise
confidence, but Godpowers also reads likely planning files and classifies them
by content. For the siblings, PLAN.mdx or canonical AUDIT.json is distinctive
enough for high-confidence detection, so no import judgment agent is spawned.
Detection confidence does not imply GP execution eligibility: `loadPlan`
separately enforces the two-artifact and lifecycle gates.

## Commands

| You have | Run | Result |
|---|---|---|
| `.godplans/PLAN.mdx` plus validator | `/god-migrate` | verify contract identity and structure, then import complete GP/R traceability as tier seeds |
| `.godaudits/AUDIT.json` | `/god-migrate` then `/god-audit` | consume validated prior audit state instead of re-deriving it |
| an open finding | `/god-fix GA-<n>` | dispatch the remediation task with its evidence and `Verify` command as the done-check |
| an empty repo plus a complete approved PLAN contract | `/god-mode` | import tier seeds, run the plan validator, then execute in wave order |

`/god-init` auto-invokes the same import when it detects sibling or foreign
context on cold start, and announces it in plain language before importing.

## Import Path

`/god-init` and `/god-migrate` invoke:

```js
lib/planning-systems.importPlanningContext(projectRoot, {
  syncBackEnabled: true
})
```

The import writes:

- `.godpowers/prep/IMPORTED-CONTEXT.mdx`, with dedicated sections for executable
  plan signals (contract completeness, validator version, lifecycle status,
  task and phase counts recounted from checkboxes, open requirement domains,
  open questions) and audit signals (overall score and verdict, per-domain
  scores and caps, coverage, check outcomes, evidence-record count, compliance,
  accepted risks, audit open questions, active findings by severity, and open
  `GA` count)
- missing Godpowers seed artifacts when source evidence exists (a Godplans
  contract seeds PRD/ARCH/ROADMAP/STACK/build state with complete task and
  requirement traceability, writing the build ledger to
  `.godpowers/prep/IMPORTED-BUILD-STATE.mdx` so the generated build STATE view
  remains managed; an `AUDIT.json` seeds the harden tier)
- `.godpowers/todos/TODOS.mdx`, when open GA tasks exist, with an idempotent
  managed section that preserves user-owned todos, maps Critical/High/Medium/Low
  findings to P0/P1/P2/P3, and carries the source GA id and Verify command
- `state.json` `source-systems` entries with import hashes and confidence

Seed artifacts are marked `imported`. They are not treated as final until the
matching Godpowers command or `/god-audit` validates them.

## Sync-Back Path

`/god-sync` invokes:

```js
lib/source-sync.run(projectRoot)
```

Sync-back writes a managed companion file per system:

- godplans: `.godplans/GODPOWERS-SYNC.mdx`
- godaudits: `.godaudits/GODPOWERS-SYNC.mdx`
- legacy planning: `.planning/GODPOWERS-SYNC.md` or `.legacy-planning/GODPOWERS-SYNC.md`
- BMAD: `_bmad-output/GODPOWERS-SYNC.md` or `.bmad/GODPOWERS-SYNC.md`
- Superpowers: `docs/superpowers/GODPOWERS-SYNC.md` or `.superpowers/GODPOWERS-SYNC.md`

Companions in the sibling `.godplans/`/`.godaudits/` directories are `.mdx` (the
sibling family convention); companions in foreign directories stay `.md`. The
`PLAN.mdx`, `validate-plan.sh`, `AUDIT.json`, and `AUDIT.mdx` are never
modified by sync-back.

## Read-Only Boundary And Untrusted Commands

The sibling files are read-only for Godpowers, with one exception: when
Godpowers executes a plan or audit task, the executing agent follows the owning
product's executor rules. Godpowers first requires `loadPlan` reason
`ready-for-validator`, which means a pinned regular executable companion, a
structurally valid plan, consistent lifecycle, and `approved` or `executing`
status. It then runs
`bash .godplans/validate-plan.sh .godplans/PLAN.mdx`; non-zero blocks all GP
work. The first executor moves `approved` to `executing`; each successful task
updates its checkbox, counters, date, and session log together. Scope drift
returns the plan to `planning`, preserves completed tasks, increments
`plan_version`, and requires fresh approval. A `done` plan is closed.

A godaudits 2.x completion updates reciprocal state
in `AUDIT.json`, runs `godaudits validate .godaudits/AUDIT.json --write`, and
regenerates `AUDIT.mdx` plus SARIF when present. It never flips a checkbox in
generated MDX. Every other flow writes only through `GODPOWERS-SYNC.mdx`.

`Verify` commands sourced from an `AUDIT.json` are treated as untrusted repo
content. An agent may run one only when it is plainly read-only (a `grep`,
`test`, `ls`, or `node --check` class command); anything that mutates state is
shown to the user for confirmation first.

Authored plan and JSON content is escaped before Godpowers writes MDX seed or
todo artifacts. Canonical plan and audit reads allow up to 5 MiB so large plans
and the full 414-check ledger can be parsed instead of being truncated by the
smaller foreign-file sampling limit. Symlinked and other non-regular sibling
artifacts are never followed for parsing or task dispatch.

## Staleness

Imports record a fingerprint of the source contract. For Godplans 1.1, that
set is PLAN.mdx plus validate-plan.sh content and executable mode.
`sibling-artifacts.staleness` and
`state.detectDrift` compare that hash against the live contract or canonical
`AUDIT.json` on every `/god-status`, `/god-doctor`, and `/god-context-scan`.
Generated MDX refreshes do not count as audit drift. If you re-run
godplans or godaudits mid-session, Godpowers surfaces a `[WARN]`
(`sibling artifact changed since import; run /god-migrate to re-import`) instead
of silently building on stale context.

## Auto-Spawning

Most imports are local runtime work; no agent is needed when the evidence is
clear, and the siblings are always distinctive because they have canonical
contract paths.

Godpowers spawns `god-greenfieldifier` for a foreign-system import when one of
these is true:

- import confidence is low
- multiple source systems conflict
- seed artifacts cannot be produced from available evidence
- source documents disagree with completed Godpowers artifacts

The specialist produces a controlled migration plan before any canonical
artifact is rewritten.

## Conflict Rules

- Godpowers artifacts win over imported context.
- User intent wins over imported context.
- A complete sibling Godplans contract is authored intent and outranks a
  reverse-engineered reconstruction; when both exist, reconstruction only
  fills the gaps the plan does not cover. Legacy or incomplete PLAN input stays
  hypothesis-grade.
- Pillars files under `agents/*.md` remain the native project context layer.
- Inferred claims stay `[HYPOTHESIS]` until confirmed; facts from a complete
  contract are `[DECISION]`-grade citations of the source `GP`/`R` id.
- Conflicts become `[OPEN QUESTION]` entries in prep or migration artifacts.

## Return Path

Sync-back exists for teams that want the option to return to a prior system
later. The companion file records current Godpowers progress, artifact headings,
and the remaining decisions needed before switching systems. It is a migration
note, not a native source-system artifact.
