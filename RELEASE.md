# Godpowers 2.7.0 Release

> Status: Release candidate
> Date: 2026-06-10

[DECISION] Godpowers 2.7.0 is the Phase 4 one-directional state release.
[DECISION] This release makes `.godpowers/state.json` the authority for Godpowers state decisions while treating `.godpowers/PROGRESS.md` and Godpowers-owned per-tier `STATE.md` files as generated human views.
[DECISION] This release preserves the optional `@godpowers/mcp` companion boundary and keeps the main `godpowers` package dependency-free.

## What's in this release

- [DECISION] 112 slash commands.
- [DECISION] 40 specialist agents.
- [DECISION] 13 executable workflows.
- [DECISION] 42 intent recipes.
- [DECISION] A locked `godpowers state advance --step=<step> --status=<status> --project=.` state mutation helper.
- [DECISION] Generated checksummed state views for `.godpowers/PROGRESS.md` and Godpowers-owned design, build, deploy, observe, and launch `STATE.md` files.
- [DECISION] Five read-only MCP tools in `@godpowers/mcp`.

## Highlights

- [DECISION] `godpowers state advance` updates `.godpowers/state.json` through the state lock and refreshes generated markdown views after the mutation.
- [DECISION] Route prerequisites, executable gates, workflow handoffs, command prompts, and specialist agent contracts now use `.godpowers/state.json` for Godpowers state decisions.
- [DECISION] Generated markdown views preserve user prose outside managed fences and replace tampered managed fences on the next state mutation.
- [DECISION] Design and build gates now use structured state evidence instead of markdown `STATE.md` authority.
- [DECISION] Deploy, observe, and launch handoffs now use structured state evidence for readiness, target, rollback, SLO, alert, runbook, and launch data.
- [DECISION] `god-repair` remains available as diagnostics and recovery while generated state views prove themselves.

## Validation

- [DECISION] `npm ci` passed and reported 0 vulnerabilities.
- [DECISION] `node scripts/test-state-advance.js` passed.
- [DECISION] `node scripts/test-state-views.js` passed.
- [DECISION] `npm --workspace @godpowers/mcp test` passed.
- [DECISION] `node scripts/static-check.js` passed.
- [DECISION] `npm run lint` passed.
- [DECISION] `npm run test:quick-proof` passed.
- [DECISION] `npm run test:audit` passed with `npm audit --omit=dev`, `git diff --check`, and public surface checks green.
- [DECISION] `npm run test:e2e` passed.
- [DECISION] `node scripts/test-runtime-verification.js` passed.
- [DECISION] `node scripts/test-agent-browser.js` passed.
- [DECISION] `npm run pack:check` passed with 538 root package files.
- [DECISION] `npm run pack:mcp:check` passed with 8 companion package files.
- [DECISION] `node bin/install.js dogfood --json` passed 5 of 5 scenarios.
- [DECISION] Repo documentation sync, repo surface sync, and release surface sync were fresh.
- [DECISION] Changed-file banned character scans passed.
- [DECISION] `npm run release:check` passed with `coverage:lib` at 92.78 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.7.0, root package contents verified at 538 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] The final publish result must be recorded in `docs/BRIDGE-PLAN.md` after the tag-triggered GitHub workflow completes.

## Upgrade

- [DECISION] Use `npm install -g godpowers@2.7.0` or `npx godpowers@2.7.0`.
- [DECISION] Use optional MCP package install `npm install -g godpowers @godpowers/mcp` when the host can register MCP servers.
- [DECISION] Re-run `/god-context` in each project to refresh installed runtime metadata.
- [DECISION] Existing `.godpowers/state.json` files remain compatible.
- [DECISION] Existing `.godpowers/PROGRESS.md` and Godpowers-owned per-tier `STATE.md` files become generated human views after the next state mutation.

## Notes

- [DECISION] The npm `godpowers@2.7.0` package must be published through the tag-triggered GitHub workflow with provenance.
- [DECISION] The npm `@godpowers/mcp@2.7.0` package must be published through the same workflow with provenance.
- [DECISION] The `v2.7.0` tag must match the npm package version.
- [DECISION] The next bridge-plan phase after 2.7.0 publish verification is Phase 5: Surface Contraction.
