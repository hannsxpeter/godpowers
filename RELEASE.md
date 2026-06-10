# Godpowers 2.6.0 Release

> Status: Release candidate
> Date: 2026-06-10

[DECISION] Godpowers 2.6.0 is the Phase 3 MCP companion package release.
[DECISION] This release keeps the main `godpowers` package dependency-free while adding an optional `@godpowers/mcp` package for MCP-capable hosts.
[DECISION] This release preserves the 2.5.2 installed-runtime gate command fix and build-gate false-pass fix.

## What's in this release

- [DECISION] 112 slash commands.
- [DECISION] 40 specialist agents.
- [DECISION] 13 executable workflows.
- [DECISION] 42 intent recipes.
- [DECISION] 9 installer CLI helpers.
- [DECISION] 5 read-only MCP tools in `@godpowers/mcp`.

## Highlights

- [DECISION] `@godpowers/mcp` exposes `status`, `next`, `gate_check`, `lint_artifact`, and `trace_requirement` over stdio.
- [DECISION] `godpowers mcp-info --project=.` prints setup instructions without requiring or loading the MCP SDK in the main package.
- [DECISION] `godpowers-mcp setup --host=codex --project=. --write` writes a managed Codex MCP registration only after the user explicitly asks for it.
- [DECISION] Dashboard and Quick Proof host guarantee lines now include MCP availability.
- [DECISION] The main `godpowers` package still has no production dependencies.

## Validation

- [DECISION] `npm --workspace @godpowers/mcp test` passed before the latest `main` merge.
- [DECISION] `npm --workspace @godpowers/mcp run pack:check` passed before the latest `main` merge.
- [DECISION] `npm run test:e2e` passed before the latest `main` merge.
- [DECISION] `node scripts/test-runtime-verification.js` passed before the latest `main` merge.
- [DECISION] `node scripts/test-agent-browser.js` passed before the latest `main` merge.
- [DECISION] `npm run release:check` passed before the latest `main` merge with `coverage:lib` at 92.85 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 535 files, and MCP package contents verified at 8 files.
- [DECISION] Post-merge 2.6.0 `npm --workspace @godpowers/mcp test` passed.
- [DECISION] Post-merge 2.6.0 `npm --workspace @godpowers/mcp run pack:check` passed.
- [DECISION] Post-merge 2.6.0 `node scripts/test-gate.js` passed.
- [DECISION] Post-merge 2.6.0 `node scripts/test-install-smoke.js` passed.
- [DECISION] Post-merge 2.6.0 `node scripts/static-check.js` passed.
- [DECISION] Post-merge 2.6.0 `npm run test:e2e` passed.
- [DECISION] Post-merge 2.6.0 `node scripts/test-runtime-verification.js` passed.
- [DECISION] Post-merge 2.6.0 `node scripts/test-agent-browser.js` passed.
- [DECISION] Post-merge 2.6.0 `npm run release:check` passed with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 535 files, and MCP package contents verified at 8 files.

## Upgrade

- [DECISION] Use `npm install -g godpowers@2.6.0` or `npx godpowers@2.6.0` after the package is published.
- [DECISION] Use optional MCP package install `npm install -g godpowers @godpowers/mcp` when the host can register MCP servers.
- [DECISION] Re-run `/god-context` in each project to refresh installed runtime metadata.
- [DECISION] Existing `.godpowers/` state remains compatible.

## Notes

- [DECISION] The npm `godpowers@2.5.2` package is published with provenance.
- [DECISION] GitHub release `v2.5.2` was created at `https://github.com/aihxp/godpowers/releases/tag/v2.5.2`.
- [DECISION] The 2.5.2 release-status closeout confirmed GitHub workflow `27289417888`, npm `latest` version 2.5.2, published-install verification, `npm run lint`, and `npm run release:check`.
- [DECISION] GitHub release `v2.6.0` should be created only after the release gate passes on the merged branch.
- [DECISION] The tag should match the npm package version.
- [DECISION] The companion package should publish as `@godpowers/mcp@2.6.0` after the release gate passes.
- [DECISION] The `v2.6.0` tag is not pushed yet because the current tag workflow publishes only the root `godpowers` package and does not publish `@godpowers/mcp`.
