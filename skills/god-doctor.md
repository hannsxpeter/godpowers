---
name: god-doctor
description: |
  Diagnose Godpowers install state and project state. Reports installed
  runtimes, version mismatches, missing files, broken artifact paths,
  unwired skills, and orphan routing. Suggests fixes.

  Triggers on: "god doctor", "/god-doctor", "diagnose godpowers", "what's
  broken", "is godpowers ok"
---

# /god-doctor

Run a system-state diagnostic. Build nothing. Touch nothing. Report only.

## What it checks

### Install integrity (per runtime)
1. Is the runtime config dir present? (e.g. `~/.claude/`)
2. Is `<runtime>/skills/god-*.md` populated?
3. Is `<runtime>/agents/god-*.md` populated?
4. Is `<runtime>/godpowers-references/` populated?
5. Does `<runtime>/GODPOWERS_VERSION` match `bin/install.js` VERSION?
6. Are all referenced agents present in `agents/`?
7. Are all routing YAMLs paired with skill files?

### Project state integrity
1. Is `.godpowers/` present?
2. Is `state.json` valid against `schema/state.v1.json`?
3. Is `intent.yaml` valid against `schema/intent.v1.yaml.json`?
4. Do declared artifact paths exist on disk?
5. Is the reflog (`.godpowers/log`) parseable?
6. Are there entries in `.godpowers/.trash/`?
7. Do declared linkage entries point at real code files?
8. Does `state.json` know the current Godpowers feature set?
9. Are managed AI-tool context fences present when tools are detected?

### External integration health
1. Is impeccable present? `node_modules/impeccable` or `~/.claude/skills/impeccable`?
2. Is agent-browser installed and reachable on PATH?
3. Is SkillUI present?

## Output

Plain-text report grouped by severity:

```
GODPOWERS DOCTOR

Install: claude (~/.claude/)
  [OK] 111 skills installed
  [OK] 40 agents installed
  [OK] VERSION matches (2.2.1)
  [WARN] routing/god-doctor.yaml exists but skill file did not until now

Project: /Users/.../my-project/.godpowers/
  [OK] state.json valid
  [WARN] feature awareness stale -> run /god-context refresh
  [WARN] PRD declared but .godpowers/prd/PRD.md missing -> run /god-prd
  [INFO] 2 entries in .trash/; run /god-restore to review

External integrations:
  [OK] impeccable found via npx
  [WARN] agent-browser not installed -> /god-test-runtime falls back to Playwright

Suggested next steps:
  1. /god-prd  (fill missing artifact)
  2. /god-restore  (review trash)
```

## Proposition Closeout

End every human-readable doctor report with a proposition block:

```
Proposition:
  1. Implement partial: [safest single fix or diagnostic follow-up]
  2. Implement complete: /god-doctor --fix when all proposed fixes are safe categories
  3. Discuss more: /god-discuss [highest-risk warning or unclear repair]
  4. Inspect status: /god-status after repair
Recommended: [one option and why it is safe]
```

If the report contains errors that need manual repair, do not recommend
`/god-doctor --fix` as complete. Recommend the highest-priority manual repair
or `/god-repair` instead.

## Subcommands

### `/god-doctor`
Full diagnostic across install + project + integrations.

### `/god-doctor --install-only`
Skip project checks.

### `/god-doctor --project-only`
Skip install checks. Useful inside the project.

### `/god-doctor --fix`
Attempt to repair detected issues automatically (only for safe categories: regenerate missing routing YAMLs, repair PROGRESS.md from state.json, etc.). Pauses before any destructive change.

## Feature Awareness

For initialized projects, `/god-doctor` calls `lib/feature-awareness.detect`
as a read-only diagnostic. It reports:
- runtime version recorded in `state.json`
- missing current Godpowers feature IDs
- missing managed AI-tool context fences
- unimported GSD, BMAD, or Superpowers evidence that should route to
  `/god-migrate`
- `god-greenfieldifier` recommendation when migration evidence is low
  confidence or conflicting

`/god-doctor --fix` may call `lib/feature-awareness.run(projectRoot)` because
that helper writes only safe state metadata and managed context fences.

## Repo Documentation Sync

For initialized projects, `/god-doctor` calls `lib/repo-doc-sync.detect` as a
read-only diagnostic. It reports stale README badges, public surface counts,
release notes, changelog entries, contribution guidance, security policy, and
Pillars sync planning for changed repo docs.

`/god-doctor --fix` may call `lib/repo-doc-sync.run(projectRoot)` because that
helper writes only safe mechanical version, badge, and count claims. It should
recommend `god-docs-writer` when narrative release, contribution, support, or
security prose needs judgment.

## Repo Surface Sync

For initialized projects, `/god-doctor` calls `lib/repo-surface-sync.detect`
as a read-only diagnostic. It reports structural drift across command routing,
package payload rules, agent spawn targets, workflow metadata, recipe command
routes, extension packs, route quality, recipe coverage, release surfaces, and
release policy checks.

`/god-doctor --fix` may call
`lib/repo-surface-sync.run(projectRoot, { fixRouting: true })` to create
missing routing metadata for shipped slash-command skills. Other structural
findings should recommend the scoped specialist named by the helper.

## Implementation

Built-in, no spawned agent. Reads:
- `<runtime>/GODPOWERS_VERSION` (compare to package.json)
- `<runtime>/skills/` and `<runtime>/agents/` listings
- `.godpowers/state.json`, `intent.yaml`, `log`, `links/`
- `lib/feature-awareness.detect(projectRoot)` for existing-project upgrade
  awareness
- `lib/repo-doc-sync.detect(projectRoot)` for repo documentation freshness
- `lib/repo-surface-sync.detect(projectRoot)` for structural repo surface
  freshness
- `lib/route-quality-sync.detect(projectRoot)` through repo surface sync for
  atomic spawn and contextual route exit freshness
- `lib/recipe-coverage-sync.detect(projectRoot)` through repo surface sync for
  high-frequency intent recipe coverage freshness
- `lib/release-surface-sync.detect(projectRoot)` through repo surface sync for
  release-facing surface freshness
- `bin/install.js` VERSION constant

## Exit codes

- 0: everything green
- 1: warnings present, but functional
- 2: errors present, manual repair needed
