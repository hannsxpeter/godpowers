# Repository Surface Sync

- [DECISION] Godpowers now checks structural repository surfaces as executable sync work.
- [DECISION] `lib/repo-surface-sync.js` detects drift across command skills, routing metadata, package payload rules, agent spawn targets, workflow metadata, recipe command routes, extension packs, Mode D suite readiness, route quality, recipe coverage, release surfaces, and release policy checks.
- [DECISION] Detection is read-only by default.
- [DECISION] The safe apply path only writes a sync log and may create missing routing stubs when `fixRouting` is explicitly enabled.
- [DECISION] Structural findings appear in `/god-status`, `/god-doctor`, `/god-sync`, `/god-docs`, and `/god-mode` closeouts.

## Auto-Invoke Contract

- [DECISION] `/god-status` calls `lib/repo-surface-sync.detect(projectRoot)` and reports the proactive repo surface status.
- [DECISION] `/god-doctor` calls `lib/repo-surface-sync.detect(projectRoot)` as a read-only diagnostic.
- [DECISION] `/god-doctor --fix` may call `lib/repo-surface-sync.run(projectRoot, { fixRouting: true })` to create missing routing metadata only.
- [DECISION] `/god-sync` calls `lib/repo-surface-sync.run(projectRoot)` so structural drift is logged before project closeout.
- [DECISION] `/god-mode` receives repo surface sync through the mandatory final `/god-sync`.

## Areas Covered

- [DECISION] Routing surface sync checks that every `skills/god-*.md` command has matching `routing/god-*.yaml` metadata.
- [DECISION] Package and installer sync checks `package.json.files`, package content checks, package lock version, and required runtime helper files.
- [DECISION] Agent contract sync checks that routed specialist spawns resolve to real `specialists/god-*.md` source files.
- [DECISION] Workflow and recipe graph sync checks parseable workflow metadata and recipe command routes.
- [DECISION] Extension pack sync checks manifest validation, package name and version agreement, peer dependency agreement, and provided file existence.
- [DECISION] Route quality sync checks atomic spawn tokens, routed agent resolution, typed contextual exits, standards coverage, and agent trace event coverage.
- [DECISION] Recipe coverage sync checks high-frequency intent routes for release maintenance, docs drift, context refresh, story work, and automation setup.
- [DECISION] Release surface sync checks README badges, changelog, release notes, release checklist policy, package lock version, package payload guardrails, dogfood tests, extension publish tests, Mode D suite tests, and installer smoke tests.
- [DECISION] Release surface sync accepts delegated test wiring through `scripts/run-tests.js` when `package.json` points `npm test` at that runner.
- [DECISION] Suite readiness sync checks Mode D helper presence, suite command skill and routing coverage, roadmap documentation, and release test wiring.
- [DECISION] Release policy sync checks that repo documentation sync is fresh and that the release checklist names repo surface sync.

## Auto-Spawn Policy

- [DECISION] Local structural checks report `Agent: none, local runtime only`.
- [DECISION] Missing or ambiguous agent handoffs recommend `god-auditor`.
- [DECISION] Workflow or recipe lifecycle ambiguity recommends `god-reconciler`.
- [DECISION] Extension pack drift recommends `god-coordinator`.
- [DECISION] Mode D suite readiness drift recommends `god-coordinator`.
- [DECISION] Release prose drift recommends `god-docs-writer`.

## Guardrails

- [DECISION] Repo surface sync does not publish, tag, stage, commit, delete, or rewrite broad package payload policy.
- [DECISION] Repo surface sync does not invent agent contracts or workflow intent.
- [DECISION] Repo surface sync logs to `.godpowers/surface/REPO-SURFACE-SYNC.mdx` when run with logging enabled.
- [DECISION] Findings that require judgment remain recommendations for scoped specialist agents.
