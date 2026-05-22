# Godpowers Feature Awareness

Feature awareness keeps existing `.godpowers` projects current when the
installed Godpowers runtime adds capabilities.

## Purpose

- [DECISION] Disk state remains authoritative for whether a project has learned
  about current Godpowers runtime features.
- [DECISION] Awareness refreshes are safe local runtime work, not specialist
  agent work.
- [DECISION] The helper records feature metadata in `.godpowers/state.json` and
  refreshes managed AI-tool context fences.
- [DECISION] It never rewrites user planning, source-system, product, or code
  files outside Godpowers-owned fences.

## Runtime Helper

`lib/feature-awareness.js` exposes:

- `detect(projectRoot, opts)` for read-only checks
- `run(projectRoot, opts)` for safe state and context refreshes

`detect` reports:

- current installed runtime version
- missing feature IDs in `state.json`
- missing managed `AGENTS.md` or tool pointer fences
- unimported GSD, BMAD, or Superpowers planning evidence
- missing dogfood, host capability, extension-authoring, or suite dry-run
  awareness on upgraded projects
- `god-greenfieldifier` recommendation when migration evidence is low
  confidence or conflicting

`run` applies:

- `.godpowers/state.json` `godpowers-features` metadata
- managed `AGENTS.md` and detected tool pointer fences through
  `lib/context-writer.js`

## Auto-Invoke Points

- [DECISION] `/god-doctor` calls `lib/feature-awareness.detect(projectRoot)` as
  read-only diagnostic work.
- [DECISION] `/god-doctor --fix` may call `lib/feature-awareness.run(projectRoot)`
  because it writes only safe metadata and managed fences.
- [DECISION] `/god-context refresh` calls `lib/feature-awareness.run(projectRoot)`.
- [DECISION] `/god-sync` calls `lib/feature-awareness.run(projectRoot)` before
  broader artifact sync.
- [DECISION] `/god-mode` calls `lib/feature-awareness.run(projectRoot)` when it
  resumes an existing `.godpowers` project.

## State Shape

```json
{
  "godpowers-features": {
    "feature-set-version": 1,
    "runtime-version": "2.0.1",
    "known": [
      "planning-system-migration",
      "source-system-sync-back",
      "feature-awareness",
      "repo-documentation-sync",
      "repo-surface-sync",
      "route-quality-sync",
      "recipe-coverage-sync",
      "release-surface-sync",
      "dashboard-action-brief",
      "host-capabilities",
      "quick-proof",
      "request-trace-review",
      "dogfood-runner",
      "extension-authoring",
      "suite-release-dry-run"
    ],
    "last-awareness-refresh-at": "2026-05-16T12:00:00.000Z"
  }
}
```

## Reporting

When awareness runs automatically, report it as:

```text
Auto-invoked:
  Trigger: <doctor, context refresh, sync, or god-mode resume>
  Agent: none, local runtime only
  Local syncs:
    + feature-awareness: <recorded runtime features, refreshed context, or no-op>
  Artifacts: <state.json, AGENTS.md/tool pointers, or no-op>
  Log: none
```

## Escalation

- [DECISION] If detection finds unimported source-system context, suggest
  `/god-migrate`.
- [DECISION] If detection finds low-confidence or conflicting source-system
  context, spawn or recommend `god-greenfieldifier` depending on the command's
  current auto-spawn authority.
