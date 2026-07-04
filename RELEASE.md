# Godpowers 5.0.0 Release

> Status: Ready to publish
> Date: 2026-07-04

[DECISION] Godpowers 5.0.0 is the loop-native release. It makes the autonomous loop a first-class mode rather than only a human-launched arc, and closes the three gaps a loop-engineering comparison surfaced: no accepted-change metric, no external write connectors, and no permission re-audit cadence.
[DECISION] The release is additive over 4.x. Existing commands, artifacts, schemas, and the direct-to-`main` maintainer workflow are unchanged; no project migration is required. New counts: 122 slash commands, 40 specialist agents, 13 workflows, 44 recipes, 95 lib modules, 157 have-nots. The `@godpowers/mcp` companion moves from eight to nine read-only tools.

## What's new in 5.0.0

- [DECISION] `/god-loop` stands up the minimum viable loop: one automation (heartbeat), one skill (work), one state file (memory), one objective gate (brake). It refuses to wire a loop that has no hard stop, and keeps the maker separate from the checker.
- [DECISION] `/god-connect` detects and scopes external connectors (GitHub, Linear, Slack, Sentry, Notion). Godpowers delegates every action to the host's MCP connector and never vendors an API client, so credentials stay on the host. Reads are allowed by default; writes require an explicit per-connector opt-in in `.godpowers/connectors.json`.
- [DECISION] Accepted-change rate: `lib/change-metrics.js` derives the loop's accepted-vs-rejected change rate from the hash-chained event ledger (default 50% target). It is surfaced through `/god-metrics` and the new read-only MCP `change_metrics` tool.
- [DECISION] Permission re-audit cadence: `lib/reaudit.js` tracks how stale the last permission and attack-surface audit is (default 30-day cadence) and reports when a re-audit is due. It is surfaced through `/god-harden` and a read-only `permission-reaudit` automation template.

## Changes

- [DECISION] Three new runtime modules (`lib/change-metrics.js`, `lib/connectors.js`, `lib/reaudit.js`; lib module count 92 -> 95), each with a dedicated test wired into `scripts/run-tests.js`.
- [DECISION] Two new skills (`/god-loop`, `/god-connect`; slash-command count 120 -> 122) with routing metadata, command-family membership, and install-profile assignment (`god-loop` in builder and maintainer, `god-connect` in maintainer).
- [DECISION] Event vocabulary gains `change.proposed`, `change.accepted`, and `change.rejected` in `lib/events.js`.
- [DECISION] `lib/host-capabilities.js` reports external connector availability; `lib/automation-providers.js` adds the read-only `permission-reaudit` template.
- [DECISION] `@godpowers/mcp` adds the read-only `change_metrics` tool (nine tools total) and stays read-only; external write actions are delegated to host connectors via `/god-connect`.
- [DECISION] `package.json` and `packages/mcp/package.json` publish the 5.0.0 version; extension pack manifests widen `engines.godpowers` to `>=2.0.0 <6.0.0`.
- [DECISION] `README.md` was rewritten for newcomers (two-minute on-ramp, plain-English glossary, loop-engineering model up front); CHANGELOG, roadmap, reference, architecture, the architecture map, MCP docs, security supported-versions, and the surface counts now reflect 5.0.0.

## Validation

- [DECISION] `npm test` passes across all command groups (the full `scripts/run-tests.js` suite, 0 failures).
- [DECISION] The offline release gate passes: `npm run coverage:lib` (90% lines / 75% branches aggregate, per-file floors), `node scripts/check-per-file-coverage.js`, `git diff --check`, `npm run pack:check`, `npm run pack:mcp:check`, and `npm run test:surface`. The registry-only step (`npm audit --omit=dev`) runs in the tag-triggered publish workflow's `release:check`.
- [DECISION] `node scripts/test-doc-surface-counts.js` passes public surface docs for version 5.0.0 with 122 skills, 40 agents, 13 workflows, 44 recipes, and 95 lib modules.

## Upgrade

- [DECISION] Use `npm install -g godpowers@5.0.0` or `npx godpowers@5.0.0`.
- [DECISION] Upgrading from 4.x needs no artifact-format change. Re-run `npx godpowers install` (or your runtime flags, e.g. `npx godpowers --claude --global`) so installed runtimes pick up the two new skills.
- [DECISION] Loops, connectors, and the re-audit cadence are opt-in: no existing project behavior changes until you run `/god-loop`, `/god-connect`, or `/god-harden`.

## Notes

- [DECISION] The publish targets are npm `godpowers@5.0.0`, npm `@godpowers/mcp@5.0.0`, and GitHub release `https://github.com/hannsxpeter/godpowers/releases/tag/v5.0.0`.
- [DECISION] Publishing is tag-triggered: pushing the `v5.0.0` tag runs `.github/workflows/publish.yml`, which runs `npm run release:check` and publishes both `godpowers` and `@godpowers/mcp` to npm with provenance. Do not `npm publish` by hand; the tag path carries provenance and the release gate.
