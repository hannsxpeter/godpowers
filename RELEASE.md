# Godpowers 3.7.0 Release

> Status: Prepared
> Date: 2026-06-15

[DECISION] Godpowers 3.7.0 is a minor release that adds a durable key/value memory store, the next Phase 3 slice of the fusion design.
[DECISION] The memory store is isolated and additive: it never touches `state.json`, the verifications ledger, or the event stream. No existing command behavior changes.
[DECISION] This release keeps `core` as the omitted installer profile, keeps `--profile=full` as the complete compatibility surface, and keeps the 3.1.0-3.6.0 evidence, close-gate, quarterback, work-report, and reflections surface.

## What's in this release

- [DECISION] New `evidence.memory.set/get/list/clear`, rebound from Mythify's memory.json.
- [DECISION] A durable key/value store with categories fact, decision, discovery, and state at `.godpowers/ledger/memory.json`.
- [DECISION] `set` upserts by key and defaults the category to fact; `get` reads one entry; `list` shows all or by category; `clear` removes one key or all entries; writes go through `lib/atomic-write.js`.
- [DECISION] New `npx godpowers memory set|get|list|clear [<key>] [<value>] [--category fact|decision|discovery|state]` CLI subcommand.
- [DECISION] 120 slash commands, 40 specialist agents, 13 executable workflows, 43 intent recipes, and the 3.1.0-3.6.0 evidence, close-gate, quarterback, work-report, and reflections surface remain available.

## Changes

- [DECISION] `package.json`, `package-lock.json`, and `packages/mcp/package.json` now publish the 3.7.0 minor version.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, and the SECURITY supported-version series now describe the 3.7.0 memory store and `memory` command.

## Validation

- [DECISION] `npm run lint` passed with 29 static checks.
- [DECISION] `node scripts/test-memory.js` passed with 5 memory tests.
- [DECISION] `node scripts/test-evidence.js` passed with 26 evidence tests.
- [DECISION] `node scripts/test-cli-dispatch.js` passed with 42 CLI dispatch tests, including the new `memory` tests.
- [DECISION] `npm run release:check` passed `coverage:lib` above the 90 percent line floor for `lib/**/*.js` (evidence.js at 96.5 percent lines).
- [DECISION] `npm run release:check` passed `npm audit --omit=dev` with 0 vulnerabilities.
- [DECISION] `npm run release:check` passed public surface docs for version 3.7.0 with 120 skills, 40 agents, 13 workflows, and 43 recipes.
- [DECISION] `npm run release:check` passed root and `@godpowers/mcp` package contents.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.7.0` or `npx godpowers@3.7.0`.
- [DECISION] No migration is required. The memory store is isolated and additive; no other behavior changed.

## Notes

- [DECISION] The publish targets are npm `godpowers@3.7.0`, npm `@godpowers/mcp@3.7.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.7.0`.
- [DECISION] The tag-triggered GitHub publish workflow remains the preferred npm path because it publishes with provenance.
- [DECISION] Phase 3 continues after this release with lessons, outcome loops, and the MCP read tools (`work_report`, `route`, `verification_history`), tracked in `docs/FUSION-ARCHITECTURE.md`.
