# Godpowers 3.13.1 Release

> Status: Prepared
> Date: 2026-06-16

[DECISION] Godpowers 3.13.1 is a maintenance release that drives a full self-audit (`codeaudit.md`, codeauditor-grade, nine weighted dimensions) to zero. It fixes one High finding plus the Medium and Low findings across runtime correctness, security hardening, the test gate, documentation, and de-duplication.
[DECISION] No new skill, agent, workflow, or recipe surface is added or removed. Surface counts are unchanged from 3.13.0: 120 slash commands, 40 specialist agents, 13 workflows, 44 recipes.
[DECISION] This release keeps `core` as the omitted installer profile, keeps `--profile=full` as the complete compatibility surface, and keeps the full 3.1.0-3.13.0 surface (fusion + codeauditor-grade audit + remediation loop + audited/documented greenfield arc).

## What's in this release

- [DECISION] Runtime correctness: `lib/evidence.js` `appendJsonlAtomic` now appends with `fs.appendFileSync` (O_APPEND) instead of a read-modify-write, so concurrent `verify`/`outcome check` processes no longer lose ledger records and the append is no longer O(n) (ERR-001). A `maxBuffer` overflow is surfaced distinctly instead of as a plain failure (ERR-003).
- [DECISION] Security hardening: the pre-tool-use hook is reframed as a best-effort advisory typo guard and matches more destructive-command variants (SEC-001); `outcome check` announces a disk-sourced verifier before running it (SEC-002); the `LEDGER-LOG.md` command echo masks obvious secret shapes and `SECURITY.md` documents the ledger and Codex-sandbox trust boundaries (SEC-003, SEC-004); `SECURITY.md` replaces the non-existent `npm install --verify` with `npm audit signatures` (DOC-002).
- [DECISION] Test gate: `coverage:lib` now enforces `--branches 75` (TEST-001); a new `scripts/test-runtime-audit.js` raises `lib/runtime-audit.js` line coverage from 68.8% to 77.8% (TEST-002); `scripts/test-router.js` no longer shares cumulative state across tests and cleans up its temp dirs (TEST-003); new `scripts/test-hooks.js`, `scripts/test-cli-log.js`, and `scripts/test-text-util.js` cover the new code.
- [DECISION] De-duplication: the five `*-sync` modules share `lib/sync-fs.js`; the ANSI logger moves to `lib/cli-log.js` and `slugify` to `lib/text-util.js`; `installer-args.parseArgs` is now table-driven (ARC-001, QUAL-001, QUAL-002).
- [DECISION] Documentation: `ARCHITECTURE-MAP.md` counts are regenerated and now machine-guarded by `scripts/test-doc-surface-counts.js`; `state.STATE_FILE` is the canonical state-file constant and `artifact-map.js`'s scope is documented accurately (DOC-001, DOC-003, ARC-002).
- [DECISION] Re-audit follow-ups: a fresh self-audit confirmed no regressions and closed the residual gaps it found - `installer-core.js` imports the shared logger (QUAL-003); `dashboard.js`/`planning-systems.js` consume `sync-fs` (ARC-003); the `lib/README` module catalog is complete and now guarded by a completeness check (DOC-004); the ledger-append comment is corrected (DOC-005); the corrupt-state error is typed rather than message-matched (ERR-004); and the hook tests assert each warning's text (TEST-005).

## Changes

- [DECISION] `package.json`, `package-lock.json`, and `packages/mcp/package.json` now publish the 3.13.1 version.
- [DECISION] New runtime modules `lib/sync-fs.js`, `lib/cli-log.js`, and `lib/text-util.js` (lib module count 87 -> 90). No public command/agent/workflow/recipe surface change.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, and the architecture map now reflect 3.13.1. The SECURITY supported-version table already carries the `3.13.x` row.

## Validation

- [DECISION] `npm test` passed all command groups.
- [DECISION] `npm run release:check` passed `coverage:lib` above the 90 percent line floor and the new 75 percent branch floor for `lib/**/*.js`.
- [DECISION] `npm run release:check` passed `npm audit --omit=dev` with 0 vulnerabilities and `git diff --check`.
- [DECISION] `npm run release:check` passed public surface docs for version 3.13.1 with 120 skills, 40 agents, 13 workflows, and 44 recipes.
- [DECISION] `npm run release:check` passed root and `@godpowers/mcp` package contents.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.13.1` or `npx godpowers@3.13.1`.
- [DECISION] No migration is required. Existing projects are unaffected; the changes are internal correctness, security, test-gate, and maintainability fixes with no surface change.

## Notes

- [DECISION] The publish targets are npm `godpowers@3.13.1`, npm `@godpowers/mcp@3.13.1`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.13.1`.
- [DECISION] The tag-triggered GitHub publish workflow remains the preferred npm path because it publishes with provenance. This release has not been tagged or published to npm yet.
