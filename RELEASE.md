# Godpowers 3.0.0 Release

> Status: Published
> Date: 2026-06-10

[DECISION] Godpowers 3.0.0 is the Phase 5 surface contraction release.
[DECISION] This release makes the omitted installer profile resolve to `core` instead of `full`.
[DECISION] This release keeps `--profile=full` as the complete compatibility surface for every shipped command.
[DECISION] This release preserves the optional `@godpowers/mcp` companion boundary and keeps the main `godpowers` package dependency-free.

## What's in this release

- [DECISION] 117 slash commands.
- [DECISION] 40 specialist agents.
- [DECISION] 13 executable workflows.
- [DECISION] 42 intent recipes.
- [DECISION] Five thin verb dispatch commands: `/god-plan`, `/god-fix`, `/god-ship`, `/god-capture`, and `/god-extend`.
- [DECISION] `core` installs the front door, status, verb dispatchers, and `/god-mode` compatibility.
- [DECISION] `full` preserves all direct leaf commands and compatibility aliases.
- [DECISION] Five read-only MCP tools remain available in `@godpowers/mcp`.

## Highlights

- [DECISION] Omitted installer profile selection now writes `GODPOWERS_PROFILE` as `core`.
- [DECISION] `/god-plan` routes planning intent to PRD, design, architecture, roadmap, stack, or reconstruction leaves.
- [DECISION] `/god-fix` routes fix intent to debug or hotfix leaves.
- [DECISION] `/god-ship` routes shipping intent to deploy, observe, or launch leaves.
- [DECISION] `/god-capture` routes capture intent to note, todo, backlog, or seed leaves.
- [DECISION] `/god-extend` routes extension intent to scaffold, add, list, info, remove, test, or agent-authoring leaves.
- [DECISION] `/god-locate` is deprecated in favor of `/god-status --locate`.
- [DECISION] `/god-lifecycle` is deprecated in favor of `/god-status --lifecycle`.
- [DECISION] `/god-roadmap-check` now has `successor` metadata pointing to `/god-reconcile`.

## Validation

- [DECISION] `npm ci` passed and reported 0 vulnerabilities.
- [DECISION] `node scripts/test-installer-profiles.js` passed.
- [DECISION] `node scripts/test-surface-contraction.js` passed.
- [DECISION] `node scripts/test-command-families.js` passed.
- [DECISION] `node scripts/validate-skills.js` passed.
- [DECISION] `node scripts/test-quick-proof.js` passed.
- [DECISION] `node scripts/test-doc-surface-counts.js` passed with public surface docs matching version 3.0.0.
- [DECISION] `node scripts/test-repo-doc-sync.js` passed.
- [DECISION] `node scripts/test-repo-surface-sync.js` passed.
- [DECISION] `node scripts/test-automation-surface-sync.js` passed.
- [DECISION] `node scripts/test-router.js` passed.
- [DECISION] `npm run test:e2e` passed.
- [DECISION] `node scripts/test-runtime-verification.js` passed.
- [DECISION] `node scripts/test-agent-browser.js` passed.
- [DECISION] `node scripts/test-install-smoke.js` passed.
- [DECISION] `node bin/install.js dogfood --json` passed 5 of 5 scenarios.
- [DECISION] `npm --workspace @godpowers/mcp test` passed.
- [DECISION] `npm run pack:check` passed with 548 root package files.
- [DECISION] `npm run pack:mcp:check` passed with 8 companion package files.
- [DECISION] `npm run lint` passed.
- [DECISION] `npm run test:audit` passed with `npm audit --omit=dev`, `git diff --check`, and public surface checks green.
- [DECISION] `npm run release:check` passed with `coverage:lib` at 92.79 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 3.0.0, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Clean-clone `bash scripts/release.sh 3.0.0` passed and pushed tag `v3.0.0`.
- [DECISION] Publish workflow `27308383323` passed and published `godpowers@3.0.0` plus `@godpowers/mcp@3.0.0` with provenance.
- [DECISION] `npm run verify:published-install` passed against `godpowers@latest`.
- [DECISION] `npm exec --yes --package @godpowers/mcp@3.0.0 -- godpowers-mcp --help` passed.
- [DECISION] `gh release view v3.0.0 --repo aihxp/godpowers` passed.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.0.0` or `npx godpowers@3.0.0`.
- [DECISION] Use `npx godpowers --profile=full` when the complete pre-3.0 command surface should be installed.
- [DECISION] Use `npx godpowers --profile=core` or omit `--profile` for the contracted default surface.
- [DECISION] Use optional MCP package install `npm install -g godpowers @godpowers/mcp` when the host can register MCP servers.
- [DECISION] Re-run `/god-context` in each project to refresh installed runtime metadata.

## Notes

- [DECISION] npm `godpowers@3.0.0` is published as `latest`.
- [DECISION] npm `@godpowers/mcp@3.0.0` is published as `latest`.
- [DECISION] GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.0.0` is published.
- [DECISION] The next bridge-plan action is Phase 6 prompt diet completion and agent contracts.
