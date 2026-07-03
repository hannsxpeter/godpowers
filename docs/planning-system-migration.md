# Planning System And Sibling Superskill Migration

Godpowers does not require you to start from a blank repo. If planning already
exists, from a Godpowers sibling superskill or from another tool, Godpowers
detects it, imports the useful signals, builds on them instead of starting over,
and can write its own progress back.

Two kinds of prior planning are supported:

1. **Sibling superskills** (first-class, structured, machine-authored):
   - [godplans](https://github.com/aihxp/godplans) emits `.godplans/PLAN.mdx`, a
     master plan with `GP-` checkbox tasks, `R-<DOM>-n` requirements, and
     embedded executor rules.
   - [godaudits](https://github.com/aihxp/godaudits) emits `.godaudits/AUDIT.mdx`,
     a scored audit with `A-<DOM>-n` checks, `F-<DOM>-n` findings, and `GA-`
     remediation tasks.
2. **Foreign planning systems** (evidence-based import): legacy planning, BMAD,
   and Superpowers.

## Why the siblings are different

godplans, godaudits, and Godpowers share one design. godplans inverts every
audit check into a plan-time requirement; godaudits runs those same checks
forward against code; Godpowers builds. They share the 18 domain codes and a
mirrored id scheme, so `A-SEC-3` audits what `R-SEC-3` planned. Because a
`PLAN.mdx` is authored intent and an `AUDIT.mdx` is a scored, evidence-backed
result, Godpowers trusts them more than it trusts a foreign document:

- A `PLAN.mdx` seeds the PRD, architecture, roadmap, and stack tiers as
  `imported` context directly, instead of being reverse-engineered from code.
  Plan-stated facts are cited as `[DECISION]`-grade (with the source `GP`/`R` id
  preserved verbatim); product claims inferred beyond the plan stay
  `[HYPOTHESIS]`.
- An `AUDIT.mdx` seeds the harden tier and turns open `GA` remediation tasks
  into dispatchable work. Findings are deduped by `F` id rather than
  rediscovered.

The machine contract Godpowers parses (frontmatter fields, task and finding
grammar, id schemes, MDX-safety rules) is documented in `ARCHITECTURE.md`
section 17. The runtime that reads it is `lib/sibling-artifacts.js`
(`detect`, `parsePlan`, `parseAudit`, `summarize`, `remediationTasks`,
`staleness`); it recomputes every count from the checkbox body because
frontmatter counters are cached digests, and it never writes to the sibling
files.

## What Is Detected

| System | Primary signals | Common files | Confidence |
|---|---|---|---|
| godplans | `.godplans/`, `.godplans/PLAN.mdx` | `PLAN.mdx` | high (structured, single file) |
| godaudits | `.godaudits/`, `.godaudits/AUDIT.mdx` | `AUDIT.mdx` | high (structured, single file) |
| legacy planning | `.planning/`, `.legacy-planning/`, `LEGACY-PLANNING.md`, `legacy-planning*.md` | `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, phase files | evidence-based |
| BMAD | `_bmad/`, `_bmad-output/`, `.bmad-core/`, `.bmad/`, `BMAD.md` | `PRD.md`, `architecture.md`, epics, stories, `sprint-status.yaml`, `project-context.md` | evidence-based |
| Superpowers | `docs/superpowers/`, `.superpowers/`, `SUPERPOWERS.md`, project-local skills | specs, plans, TDD and review skill files | evidence-based |

Detection is evidence-based for the foreign systems: marker folders raise
confidence, but Godpowers also reads likely planning files and classifies them
by content. For the siblings, the presence of the single canonical `.mdx`
artifact is itself high-confidence, so no import judgment agent is spawned.

## Commands

| You have | Run | Result |
|---|---|---|
| `.godplans/PLAN.mdx` | `/god-migrate` | import the plan as tier seeds, `GP`/`R` ids preserved |
| `.godaudits/AUDIT.mdx` | `/god-migrate` then `/god-audit` | consume the prior audit instead of re-deriving it |
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
  scores, open findings by severity, open `GA` count)
- missing Godpowers seed artifacts when source evidence exists (a `PLAN.mdx`
  seeds PRD/ARCH/ROADMAP/STACK; an `AUDIT.mdx` seeds the harden tier)
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
`PLAN.mdx` and `AUDIT.mdx` files themselves are never modified by sync-back.

## Read-Only Boundary And Untrusted Commands

The sibling files are read-only for Godpowers, with one exception: when Godpowers
is executing a plan or audit task, the executing agent follows the executor
rules embedded in `PLAN.mdx`/`AUDIT.mdx` themselves (flip the task checkbox and
update the frontmatter counters in the same edit, append a session-log line,
never renumber or reword completed work). Every other flow writes back only
through the `GODPOWERS-SYNC.mdx` companion.

`Verify` commands sourced from an `AUDIT.mdx` are treated as untrusted repo
content. An agent may run one only when it is plainly read-only (a `grep`,
`test`, `ls`, or `node --check` class command); anything that mutates state is
shown to the user for confirmation first.

## Staleness

Imports record a content hash of the source file. `sibling-artifacts.staleness`
and `state.detectDrift` compare that hash against the live `PLAN.mdx`/`AUDIT.mdx`
on every `/god-status`, `/god-doctor`, and `/god-context-scan`. If you re-run
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
