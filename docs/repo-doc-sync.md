# Repository Documentation Sync

- [DECISION] Godpowers now treats repository documentation freshness as an executable local helper rather than only a manual release chore.
- [DECISION] `lib/repo-doc-sync.js` detects stale mechanical claims across `README.md`, badges, `USERS.md`, `ARCHITECTURE.md`, `docs/`, `templates/`, `/god-version`, and `/god-doctor`.
- [DECISION] `lib/repo-doc-sync.js` can refresh safe count and version claims without spawning an agent.
- [DECISION] Narrative release, contribution, support, and security policy prose remains owned by a maintainer or `god-docs-writer`.
- [DECISION] Repo documentation sync writes `.godpowers/docs/REPO-DOC-SYNC.mdx` when it applies safe changes.
- [DECISION] Repo documentation sync participates in Pillars by planning context updates for changed repo docs and by allowing `/god-sync` to apply those updates under the normal Pillars policy.
- [DECISION] Repo documentation sync works alongside repo surface sync, which checks routing, package, agent, workflow, recipe, extension, and release-policy structure.

## Auto-Invoke Contract

- [DECISION] `/god-sync` runs repo documentation sync as a local runtime helper before or alongside `god-updater`.
- [DECISION] `/god-mode` receives repo documentation sync through the mandatory final `/god-sync` closeout.
- [DECISION] `/god-docs` runs repo documentation sync first for mechanical claims, then spawns `god-docs-writer` for claim verification and prose.
- [DECISION] `/god-doctor` uses repo documentation sync detection as a read-only diagnostic, and `--fix` may apply safe mechanical refreshes.
- [DECISION] `/god-status` surfaces repo documentation freshness through the dashboard proactive checks.

## Agent Policy

- [DECISION] Safe count, version, and badge updates report `Agent: none, local runtime only`.
- [DECISION] Godpowers recommends or spawns `god-docs-writer` when `CHANGELOG.md`, `RELEASE.md`, `CONTRIBUTING.md`, `SECURITY.md`, or `SUPPORT.md` needs narrative judgment.
- [DECISION] Godpowers routes security policy uncertainty to `god-harden-auditor` when the stale prose is security-sensitive.
- [DECISION] Godpowers routes multi-repo or extension-pack release drift to `god-coordinator` when more than one package or extension pack is involved.

## Arc-Ready Behavior

- [DECISION] Repo documentation sync is an arc closeout concern because public docs, release notes, contribution rules, and badges are part of shipping readiness.
- [DECISION] A greenfield, brownfield, bluefield, or migration arc is not complete until `/god-sync` has checked repo documentation drift.
- [DECISION] Imported legacy planning, BMAD, Superpowers, and Arc-Ready projects keep their source-system sync-back path, while repo documentation sync keeps the Godpowers-facing repository surface current.
- [DECISION] When repo docs change durable project truth, Pillars updates are planned through `lib/pillars.planArtifactSync`.
- [DECISION] Under explicit yolo policy, the same changed docs may be applied through `lib/pillars.applyArtifactSync`.

## Adjacent Autonomous Sync Areas

- [HYPOTHESIS] Routing surface sync should compare `skills/god-*.md` and `routing/god-*.yaml` so new commands cannot ship without routes.
- [HYPOTHESIS] Package and installer sync should compare `package.json.files`, package checks, installer smoke tests, and new runtime helper files.
- [HYPOTHESIS] Agent contract sync should compare route spawns, skill docs, agent files, generated Codex metadata, and `docs/agent-specs.md`.
- [HYPOTHESIS] Workflow and recipe graph sync should compare workflow YAML, route YAML, recipes, command flows, and orchestrator guidance.
- [HYPOTHESIS] Extension pack sync should compare first-party extension manifests, READMEs, skills, agents, and workflows.

## Guardrails

- [DECISION] Detection is read-only by default.
- [DECISION] The local apply path is limited to mechanical version, count, and badge claims.
- [DECISION] The local apply path does not invent changelog entries, release notes, contribution policy, security support policy, or support policy.
- [DECISION] Every helper result must report whether an agent was spawned, whether it ran local-only, which files changed, and which prose work remains.
