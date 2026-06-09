---
name: god-migrate
description: |
  Detect legacy planning, BMAD, and Superpowers planning systems, migrate useful context
  into Godpowers prep and seed artifacts, and sync Godpowers progress back to
  the prior system through managed companion files.

  Triggers on: "god migrate", "/god-migrate", "migrate from legacy-planning",
  "migrate from bmad", "migrate from superpowers", "sync back to legacy-planning",
  "sync back to bmad", "sync back to superpowers"
---

# /god-migrate

Detect and migrate adjacent planning systems into Godpowers.

## When To Use

- A project already has legacy planning `.planning/` or `.legacy-planning/` context.
- A project already has BMAD `_bmad/`, `_bmad-output/`, `.bmad-core/`, or
  `.bmad/` context.
- A project already has Superpowers specs, plans, or project-local skills.
- The user wants a reversible migration path into Godpowers.
- The user wants current Godpowers progress written back to the prior planning
  system before returning to it.

## Auto-Invoke Contract

`/god-init` auto-invokes the import path when it detects legacy planning, BMAD, or
Superpowers context. It must show this visible status card:

```
Auto-invoked:
  Trigger: /god-init planning-system detection
  Agent: none, local runtime only
  Local syncs:
    + planning-system-import: <detected systems, written seeds, or no-op>
  Artifacts: .godpowers/prep/IMPORTED-CONTEXT.md and optional seed artifacts
```

`/god-sync` auto-invokes sync-back when `state.json` contains enabled
`source-systems` entries. It must show this visible status card:

```
Auto-invoked:
  Trigger: /god-sync source-system sync-back
  Agent: none, local runtime only
  Local syncs:
    + source-sync: <written companion files, pointer fences, or no-op>
  Artifacts: <.planning/GODPOWERS-SYNC.md, _bmad-output/GODPOWERS-SYNC.md, docs/superpowers/GODPOWERS-SYNC.md>
```

If the import has low confidence, multiple conflicting systems, or missing
canonical Godpowers seeds after import, spawn `god-greenfieldifier` with a
fresh context and this instruction:

```
This project has imported external planning-system context. Read
.godpowers/prep/IMPORTED-CONTEXT.md and .godpowers/state.json. Produce a
controlled migration plan that converts imported hypotheses into Godpowers
artifacts without overwriting source-system files outside managed fences.
```

## Runtime Calls

### Import

Call:

```
lib/planning-systems.importPlanningContext(projectRoot, {
  syncBackEnabled: true
})
```

This:
- detects legacy planning, BMAD, and Superpowers sources
- writes `.godpowers/prep/IMPORTED-CONTEXT.md`
- writes missing Godpowers seed artifacts when enough source evidence exists
- marks those seed artifacts as `imported` in `state.json`
- records detected systems under `state.json` `source-systems`

### Sync-Back

Call:

```
lib/source-sync.run(projectRoot)
```

This:
- reads current Godpowers state and artifacts
- writes a managed companion file in the prior planning system
- writes pointer fences only when a safe native state file already exists
- updates `last-sync-back-hash` and `last-sync-back-at` in `state.json`

## Source Mapping

| Source system | Import evidence | Godpowers destination | Sync-back destination |
|---|---|---|---|
| legacy planning | `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, phase files | prep context, PRD seed, roadmap seed, build-state seed | `.planning/GODPOWERS-SYNC.md` |
| legacy planning variant | `.legacy-planning/` files | prep context and seeds when source files are readable | `.legacy-planning/GODPOWERS-SYNC.md` |
| BMAD | `_bmad-output/planning-artifacts/PRD.md`, `architecture.md`, epics, stories, sprint status | prep context, PRD seed, arch seed, roadmap seed | `_bmad-output/GODPOWERS-SYNC.md` |
| Superpowers | `docs/superpowers/specs/*.md`, `docs/superpowers/plans/*.md`, project-local skills | prep context, PRD seed, roadmap seed, build-state seed | `docs/superpowers/GODPOWERS-SYNC.md` |

## Guardrails

- Do not delete, move, or rewrite legacy planning, BMAD, or Superpowers files.
- Do not treat imported content as authoritative until a Godpowers artifact or
  the user confirms it.
- Do not write outside Godpowers-owned fences in source-system files.
- Do not overwrite existing Godpowers artifacts unless the user passes
  `--force` and the command shows a diff or clear file list first.
- If conflicts appear, pause or spawn `god-greenfieldifier` for a controlled
  migration plan.

## Output

```
Migration complete.

Detected:
  + legacy planning: high confidence, 12 files
  + BMAD: not detected
  + Superpowers: medium confidence, 2 files

Imported:
  + .godpowers/prep/IMPORTED-CONTEXT.md
  + .godpowers/prd/PRD.md (imported seed)
  + .godpowers/roadmap/ROADMAP.md (imported seed)

Sync-back:
  + .planning/GODPOWERS-SYNC.md

Auto-spawn:
  + god-greenfieldifier: skipped, import confidence high and no conflicts

Suggested next:
  /god-audit to score imported seeds before treating them as authoritative.
```

## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
