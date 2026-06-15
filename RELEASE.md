# Godpowers 3.3.0 Release

> Status: Prepared
> Date: 2026-06-15

[DECISION] Godpowers 3.3.0 is a minor release that adds the `can-close` close-gate CLI and wires it into the orchestrator loop, completing the orchestrator side of the Phase 1 close-on-evidence path.
[DECISION] The CLI addition is additive and the orchestrator runbook change is prompt-level guidance. No existing command behavior changes in this release.
[DECISION] This release keeps `core` as the omitted installer profile, keeps `--profile=full` as the complete compatibility surface, and keeps the 3.2.0 enforced build and harden gates.

## What's in this release

- [DECISION] New `npx godpowers can-close --substep <id>` CLI subcommand, a read-only face over `evidence.canClose`.
- [DECISION] `can-close` exits zero only when the substep has the evidence to close: executable-gated tiers (build, deploy, harden) need a passing executed record since they went in-flight; other tiers accept an attested record; a failed executed record always blocks.
- [DECISION] The `GOD-ORCHESTRATOR-RUNBOOK` close loop now records executed evidence and confirms `can-close` is green before advancing an executable-gated sub-step to done.
- [DECISION] 120 slash commands, 40 specialist agents, 13 executable workflows, 43 intent recipes, the 3.1.0 `godpowers verify` producer, the 3.1.1 `evidence.canClose` primitive, and the 3.2.0 enforced build and harden gates remain available.

## Changes

- [DECISION] `package.json`, `package-lock.json`, and `packages/mcp/package.json` now publish the 3.3.0 minor version.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, and the SECURITY supported-version series now describe the 3.3.0 `can-close` command and orchestrator wiring.

## Validation

- [DECISION] `npm run lint` passed with 29 static checks.
- [DECISION] `node scripts/test-cli-dispatch.js` passed with 32 CLI dispatch tests, including two new `can-close` tests.
- [DECISION] `npm run release:check` passed `coverage:lib` above the 90 percent line floor for `lib/**/*.js`.
- [DECISION] `npm run release:check` passed `npm audit --omit=dev` with 0 vulnerabilities.
- [DECISION] `npm run release:check` passed public surface docs for version 3.3.0 with 120 skills, 40 agents, 13 workflows, and 43 recipes.
- [DECISION] `npm run release:check` passed root and `@godpowers/mcp` package contents.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.3.0` or `npx godpowers@3.3.0`.
- [DECISION] No migration is required. The CLI addition is additive and no other tier behavior changed.

## Notes

- [DECISION] The publish targets are npm `godpowers@3.3.0`, npm `@godpowers/mcp@3.3.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.3.0`.
- [DECISION] The tag-triggered GitHub publish workflow remains the preferred npm path because it publishes with provenance.
- [DECISION] Phase 1 of the fusion design is complete with this release. The next slice begins Phase 2 (the quarterback: `lib/quarterback.js` plus `npx godpowers route`), tracked in `docs/FUSION-ARCHITECTURE.md`.
