# Godpowers 2.5.2 Release

> Status: Published
> Date: 2026-06-10

[DECISION] Godpowers 2.5.2 is a Phase 2 blocker patch after the 2.5.1 host-proof docs release.
[DECISION] This release fixes the installed-runtime gate command gap and build-gate false-pass gap captured during Phase 2 proof work.
[DECISION] This release does not change the 2.5.1 host-proof case-study claims.

## What's in this release

- [DECISION] 112 slash commands.
- [DECISION] 40 specialist agents.
- [DECISION] 13 executable workflows.
- [DECISION] 42 intent recipes.
- [DECISION] 8 installer CLI helpers.

## Highlights

- [DECISION] `godpowers-runtime` now includes `bin/` next to `package.json`, so host workflows can run `npm exec --package <runtime> -- godpowers gate`.
- [DECISION] Build gates now fail closed when `.godpowers/build/STATE.md` records any failed verification command.
- [DECISION] Slot A, Slot B, and Slot C evidence remains the repository state shipped in 2.5.1.

## Validation

- [DECISION] `node scripts/test-gate.js` passed before the latest `main` merge.
- [DECISION] `node scripts/test-install-smoke.js` passed before the latest `main` merge.
- [DECISION] `npm run test:e2e` passed before the latest `main` merge.
- [DECISION] `node scripts/test-runtime-verification.js` passed before the latest `main` merge.
- [DECISION] `node scripts/test-agent-browser.js` passed before the latest `main` merge.
- [DECISION] `node scripts/static-check.js` passed before the latest `main` merge.
- [DECISION] `npm run release:check` passed before the latest `main` merge with `coverage:lib` at 92.9 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.1, and package contents verified at 534 files.
- [DECISION] Post-merge 2.5.2 `npm run test:surface` passed.
- [DECISION] Post-merge 2.5.2 `node scripts/test-gate.js` passed.
- [DECISION] Post-merge 2.5.2 `node scripts/test-install-smoke.js` passed.
- [DECISION] Post-merge 2.5.2 `node scripts/static-check.js` passed.
- [DECISION] Post-merge 2.5.2 `npm run test:e2e` passed.
- [DECISION] Post-merge 2.5.2 `node scripts/test-runtime-verification.js` passed.
- [DECISION] Post-merge 2.5.2 `node scripts/test-agent-browser.js` passed.
- [DECISION] Post-merge 2.5.2 `npm run release:check` passed with `coverage:lib` at 92.9 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.2, and package contents verified at 534 files.
- [DECISION] Clean release-clone `bash scripts/release.sh 2.5.2` passed its release gate before tagging.
- [DECISION] GitHub Publish to npm workflow `27289417888` completed successfully.
- [DECISION] `npm run verify:published-install` passed after publish and resolved npm `godpowers@latest` to version 2.5.2.
- [DECISION] Release-status closeout `npm run lint` passed after npm publication.
- [DECISION] Release-status closeout `npm run release:check` passed after npm publication with `coverage:lib` at 92.9 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.2, and package contents verified at 534 files.

## Upgrade

- [DECISION] Use `npm install -g godpowers@2.5.2` or `npx godpowers@2.5.2` after the package is published.
- [DECISION] Reinstall Godpowers in host runtimes to refresh the installed runtime bundle.
- [DECISION] Existing `.godpowers/` state remains compatible.

## Notes

- [DECISION] The npm `godpowers@2.5.1` package is already published.
- [DECISION] The npm `godpowers@2.5.2` package is published with provenance.
- [DECISION] GitHub release `v2.5.2` was created at `https://github.com/aihxp/godpowers/releases/tag/v2.5.2`.
