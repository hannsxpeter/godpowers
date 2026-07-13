# Planning System And Sibling Superskill Migration

Godpowers does not require you to start from a blank repo. If planning already
exists, from a Godpowers sibling superskill or from another tool, Godpowers
detects it, imports the useful signals, builds on them instead of starting over,
and can write its own progress back.

Two kinds of prior planning are supported:

1. **Sibling superskills** (first-class, structured, machine-authored):
   - [godplans](https://github.com/hannsxpeter/godplans) emits `.godplans/PLAN.mdx`, a
     master plan with `GP-` checkbox tasks, `R-<DOM>-n` requirements, and
     embedded executor rules.
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
mirrored id scheme, so `A-SEC-3` audits what `R-SEC-3` planned. Because a
`PLAN.mdx` is authored intent and `AUDIT.json` is validated, evidence-backed
machine state, Godpowers trusts them more than it trusts a foreign document:

- A `PLAN.mdx` seeds the PRD, architecture, roadmap, and stack tiers as
  `imported` context directly, instead of being reverse-engineered from code.
  Plan-stated facts are cited as `[DECISION]`-grade (with the source `GP`/`R` id
  preserved verbatim); product claims inferred beyond the plan stay
  `[HYPOTHESIS]`.
- An `AUDIT.json` seeds the harden tier and turns open `GA` remediation tasks
  into dispatchable work. Findings are deduped by `F` id rather than
  rediscovered. The generated `AUDIT.mdx` remains a readable fallback.

The machine contract Godpowers parses (frontmatter fields, task and finding
grammar, id schemes, MDX-safety rules) is documented in `ARCHITECTURE.md`
section 17. The runtime that reads it is `lib/sibling-artifacts.js`
(`detect`, `parsePlan`, `parseAudit`, `summarize`, `remediationTasks`,
`staleness`). It consumes godaudits 2.x computed score and coverage directly,
recomputes counts only for legacy MDX, and never writes to sibling files.

## What Is Detected

| System | Primary signals | Common files | Confidence |
|---|---|---|---|
| godplans | `.godplans/`, `.godplans/PLAN.mdx` | `PLAN.mdx` | high (structured, single file) |
| godaudits | `.godaudits/`, `.godaudits/AUDIT.json` | `AUDIT.json` plus generated `AUDIT.mdx` | high (structured canonical state) |
| legacy planning | `.planning/`, `.legacy-planning/`, `LEGACY-PLANNING.md`, `legacy-planning*.md` | `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, phase files | evidence-based |
| BMAD | `_bmad/`, `_bmad-output/`, `.bmad-core/`, `.bmad/`, `BMAD.md` | `PRD.md`, `architecture.md`, epics, stories, `sprint-status.yaml`, `project-context.md` | evidence-based |
| Superpowers | `docs/superpowers/`, `.superpowers/`, `SUPERPOWERS.md`, project-local skills | specs, plans, TDD and review skill files | evidence-based |

Detection is evidence-based for the foreign systems: marker folders raise
confidence, but Godpowers also reads likely planning files and classifies them
by content. For the siblings, the canonical PLAN.mdx or AUDIT.json artifact is
itself high-confidence, so no import judgment agent is spawned.

## Commands

| You have | Run | Result |
|---|---|---|
| `.godplans/PLAN.mdx` | `/god-migrate` | import the plan as tier seeds, `GP`/`R` ids preserved |
| `.godaudits/AUDIT.json` | `/god-migrate` then `/god-audit` | consume validated prior audit state instead of re-deriving it |
| an open finding | `/god-fix GA-<n>` | dispatch the remediation task with its evidence and `Verify` command as the done-check |
| an empty repo plus a `PLAN.mdx` | `/god-mode` | the greenfield-with-plan fast path: import the plan as tier-1 seeds, then execute |

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
  plan signals (task counts recounted from checkboxes, open requirement domains,
  open questions) and audit signals (overall score and verdict, per-domain
  scores and caps, coverage, check outcomes, evidence-record count, compliance,
  accepted risks, audit open questions, active findings by severity, and open
  `GA` count)
- missing Godpowers seed artifacts when source evidence exists (a `PLAN.mdx`
  seeds PRD/ARCH/ROADMAP/STACK; an `AUDIT.json` seeds the harden tier)
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
`PLAN.mdx`, `AUDIT.json`, and `AUDIT.mdx` are never modified by sync-back.

## Read-Only Boundary And Untrusted Commands

The sibling files are read-only for Godpowers, with one exception: when
Godpowers executes a plan or audit task, the executing agent follows the owning
product's executor rules. A godaudits 2.x completion updates reciprocal state
in `AUDIT.json`, runs `godaudits validate .godaudits/AUDIT.json --write`, and
regenerates `AUDIT.mdx` plus SARIF when present. It never flips a checkbox in
generated MDX. Every other flow writes only through `GODPOWERS-SYNC.mdx`.

`Verify` commands sourced from an `AUDIT.json` are treated as untrusted repo
content. An agent may run one only when it is plainly read-only (a `grep`,
`test`, `ls`, or `node --check` class command); anything that mutates state is
shown to the user for confirmation first.

Authored JSON titles and commands are escaped before Godpowers writes MDX seed
or todo artifacts. Canonical audit reads allow up to 5 MiB so the full 414-check
ledger can be parsed instead of being truncated by the smaller foreign-file
sampling limit. Symlinked and other non-regular sibling artifacts are never
followed for parsing or remediation dispatch.

## Staleness

Imports record a content hash of the source file. `sibling-artifacts.staleness`
and `state.detectDrift` compare that hash against live `PLAN.mdx` or canonical
`AUDIT.json` on every `/god-status`, `/god-doctor`, and `/god-context-scan`.
Generated MDX refreshes do not count as audit drift. If you re-run
godplans or godaudits mid-session, Godpowers surfaces a `[WARN]`
(`sibling artifact changed since import; run /god-migrate to re-import`) instead
of silently building on stale context.

## Auto-Spawning

Most imports are local runtime work; no agent is needed when the evidence is
clear, and the siblings are always clear because they are structured single-file
artifacts.

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
- A sibling `PLAN.mdx` is authored intent and outranks a reverse-engineered
  reconstruction; when both exist, reconstruction only fills the gaps the plan
  does not cover.
- Pillars files under `agents/*.md` remain the native project context layer.
- Inferred claims stay `[HYPOTHESIS]` until confirmed; plan-stated facts are
  `[DECISION]`-grade citations of the source `GP`/`R` id.
- Conflicts become `[OPEN QUESTION]` entries in prep or migration artifacts.

## Return Path

Sync-back exists for teams that want the option to return to a prior system
later. The companion file records current Godpowers progress, artifact headings,
and the remaining decisions needed before switching systems. It is a migration
note, not a native source-system artifact.
