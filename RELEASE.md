# Godpowers 3.13.2 Release

> Status: Prepared
> Date: 2026-06-17

[DECISION] Godpowers 3.13.2 is a maintenance release that drives a third self-audit (`codeaudit.md`, codeauditor-grade, nine weighted dimensions) to zero. It fixes one Medium finding and twelve Low findings across de-duplication, error handling, security hardening, the test gate, and documentation.
[DECISION] No new skill, agent, workflow, or recipe surface is added or removed. Surface counts are unchanged from 3.13.1: 120 slash commands, 40 specialist agents, 13 workflows, 44 recipes. The lib module count rises from 90 to 91 (`lib/sync-check.js`).
[DECISION] This release keeps `core` as the omitted installer profile, keeps `--profile=full` as the complete compatibility surface, and keeps the full 3.1.0-3.13.1 surface.

## What's in this release

- [DECISION] De-duplication (ARC-001, QUAL-001/002/003): the four `*-sync` modules share `lib/sync-check.js` (`addCheck`/`makeAddCheck`/`listFiles`) instead of copy-pasting them; removed dead helpers (two unused `rel()`, an unused `sha`); added `sync-fs.readTextOrNull` adopted by `requirements.js`, which now sources PRD/ROADMAP paths from `artifact-map`; fixed a boolean/string status wart in `repo-surface-sync`.
- [DECISION] Test gate (TEST-001, TEST-002): `coverage:lib` now emits a json-summary and `scripts/check-per-file-coverage.js` (in `release:check`) fails any lib module below 70% lines, excluding the two environment-bound browser drivers, so a single file can no longer rot while the aggregate stays green; the `run()`/`appendLog()` write path of the three sync siblings is now tested for the no-banned-dash invariant.
- [DECISION] Error handling (ERR-001): reverse-sync writes state before the ledger and surfaces a caught error as `requirementsError` instead of silently nulling it.
- [DECISION] Security hardening (SEC-001, SEC-002): the MCP `requireRuntime` rejects any module name that is not a plain lib basename; `intent.cleanArrays` caps recursion depth so a pathologically deep YAML cannot overflow the stack.
- [DECISION] Performance and docs (PERF-001/002, DOC-001, ARC-002): `have-nots` `findPositions` compiles its regex once per call; the bounded whole-ledger read is documented with an opt-in prune noted; the README's `docs/*` links are now absolute GitHub URLs (docs are deliberately excluded from the package); and `pillars.js` is delineated into its model and artifact-sync halves (a full split was deferred because the halves share public-API construction functions).

## Changes

- [DECISION] `package.json`, `package-lock.json`, and `packages/mcp/package.json` now publish the 3.13.2 version.
- [DECISION] New runtime module `lib/sync-check.js` (lib module count 90 -> 91). No public command/agent/workflow/recipe surface change.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, and the architecture map now reflect 3.13.2. The SECURITY supported-version table already carries the `3.13.x` row.

## Validation

- [DECISION] `npm test` passed all command groups.
- [DECISION] `npm run release:check` passed `coverage:lib` above the 90 percent line floor and the 75 percent branch floor, and the new per-file floor (>= 70 percent lines across 88 lib modules).
- [DECISION] `npm run release:check` passed `npm audit --omit=dev` with 0 vulnerabilities and `git diff --check`.
- [DECISION] `npm run release:check` passed public surface docs for version 3.13.2 with 120 skills, 40 agents, 13 workflows, and 44 recipes.
- [DECISION] `npm run release:check` passed root and `@godpowers/mcp` package contents.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.13.2` or `npx godpowers@3.13.2`.
- [DECISION] No migration is required. The changes are internal de-duplication, error-visibility, security, test-gate, and documentation improvements with no surface change.

## Notes

- [DECISION] The publish targets are npm `godpowers@3.13.2`, npm `@godpowers/mcp@3.13.2`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.13.2`.
- [DECISION] The tag-triggered GitHub publish workflow remains the preferred npm path because it publishes with provenance. This release has not been tagged or published to npm yet.
