# Planning System Migration

Godpowers can detect legacy planning, BMAD, and Superpowers project context, migrate useful
signals into Godpowers, and write Godpowers progress back to the prior system.

## What Is Detected

| System | Primary signals | Common files |
|---|---|---|
| legacy planning | `.planning/`, `.legacy-planning/`, `LEGACY-PLANNING.md`, `legacy-planning*.md` | `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, phase files |
| BMAD | `_bmad/`, `_bmad-output/`, `.bmad-core/`, `.bmad/`, `BMAD.md` | `PRD.md`, `architecture.md`, epics, stories, `sprint-status.yaml`, `project-context.md` |
| Superpowers | `docs/superpowers/`, `.superpowers/`, `SUPERPOWERS.md`, project-local skills | specs, plans, TDD and review skill files |

Detection is intentionally evidence-based. Marker folders increase confidence,
but Godpowers also reads likely planning files and classifies them by content.

## Import Path

`/god-init` auto-invokes:

```js
lib/planning-systems.importPlanningContext(projectRoot, {
  syncBackEnabled: true
})
```

The import writes:

- `.godpowers/prep/IMPORTED-CONTEXT.mdx`
- missing Godpowers seed artifacts when source evidence exists
- `state.json` `source-systems` entries with import hashes and confidence

Seed artifacts are marked `imported`. They are not treated as final until the
matching Godpowers command or `/god-audit` validates them.

## Sync-Back Path

`/god-sync` auto-invokes:

```js
lib/source-sync.run(projectRoot)
```

The sync-back writes companion files:

- legacy planning: `.planning/GODPOWERS-SYNC.md` or `.legacy-planning/GODPOWERS-SYNC.md`
- BMAD: `_bmad-output/GODPOWERS-SYNC.md` or `.bmad/GODPOWERS-SYNC.md`
- Superpowers: `docs/superpowers/GODPOWERS-SYNC.md` or `.superpowers/GODPOWERS-SYNC.md`

When a safe native state file already exists, Godpowers may also write a short
managed pointer fence. It does not rewrite native source-system prose outside
the managed fence.

## Auto-Spawning

Most imports are local runtime work. No agent is needed when the evidence is
clear.

Godpowers spawns `god-greenfieldifier` when one of these is true:

- import confidence is low
- multiple source systems conflict
- seed artifacts cannot be produced from available evidence
- source documents disagree with completed Godpowers artifacts

The specialist produces a controlled migration plan before any canonical
artifact is rewritten.

## Conflict Rules

- Godpowers artifacts win over imported context.
- User intent wins over imported context.
- Pillars files under `agents/*.md` remain the native project context layer.
- Imported claims stay `[HYPOTHESIS]` until confirmed.
- Conflicts become `[OPEN QUESTION]` entries in prep or migration artifacts.

## Return Path

Sync-back exists for teams that want the option to return to legacy planning, BMAD, or
Superpowers later. The companion file records current Godpowers progress,
artifact headings, and the remaining decisions needed before switching systems.

The companion file is a migration note, not a native source-system artifact.
