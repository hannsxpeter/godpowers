# Godpowers 3.9.0 Release

> Status: Prepared
> Date: 2026-06-15

[DECISION] Godpowers 3.9.0 is a minor release that adds bounded outcome retry loops, the next Phase 3 slice of the fusion design.
[DECISION] Outcome state lives under the ledger; `outcome check` is the only path that mutates shared state, and it does so through the existing `evidence.verify` rollup. No existing command behavior changes.
[DECISION] This release keeps `core` as the omitted installer profile, keeps `--profile=full` as the complete compatibility surface, and keeps the 3.1.0-3.8.0 evidence, close-gate, quarterback, work-report, reflections, memory, and lessons surface.

## What's in this release

- [DECISION] New `evidence.outcome.start/check/stop/status`, rebound from Mythify's `outcomes/<slug>/` store.
- [DECISION] A bounded retry loop with `goal.json` and `iterations.jsonl` at `.godpowers/ledger/outcomes/<slug>/`.
- [DECISION] `start` sets a goal, verifier, and budget; `check` runs the verifier through `evidence.verify` (writing the executed verdict to the main ledger too), appends an iteration, and marks the outcome succeeded, failed (budget exhausted), or still active; `stop` ends it; `status` returns the goal and iterations.
- [DECISION] New `npx godpowers outcome start|check|stop|status <name> [--goal "<text>"] [--verify "<cmd>"] [--budget N] [--substep <id>] [--reason "<text>"]` CLI subcommand.
- [DECISION] 120 slash commands, 40 specialist agents, 13 executable workflows, 43 intent recipes, and the 3.1.0-3.8.0 evidence, close-gate, quarterback, work-report, reflections, memory, and lessons surface remain available.

## Changes

- [DECISION] `package.json`, `package-lock.json`, and `packages/mcp/package.json` now publish the 3.9.0 minor version.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, and the SECURITY supported-version series now describe the 3.9.0 outcome loops and `outcome` command.

## Validation

- [DECISION] `npm run lint` passed with 29 static checks.
- [DECISION] `node scripts/test-outcome-loops.js` passed with 6 outcome tests, including budget exhaustion and the executed-record write-through.
- [DECISION] `node scripts/test-cli-dispatch.js` passed with 47 CLI dispatch tests, including the new `outcome` tests.
- [DECISION] `npm run release:check` passed `coverage:lib` above the 90 percent line floor for `lib/**/*.js` (evidence.js at 97 percent lines).
- [DECISION] `npm run release:check` passed `npm audit --omit=dev` with 0 vulnerabilities.
- [DECISION] `npm run release:check` passed public surface docs for version 3.9.0 with 120 skills, 40 agents, 13 workflows, and 43 recipes.
- [DECISION] `npm run release:check` passed root and `@godpowers/mcp` package contents.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.9.0` or `npx godpowers@3.9.0`.
- [DECISION] No migration is required. Outcome loops are additive; no other behavior changed.

## Notes

- [DECISION] The publish targets are npm `godpowers@3.9.0`, npm `@godpowers/mcp@3.9.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.9.0`.
- [DECISION] The tag-triggered GitHub publish workflow remains the preferred npm path because it publishes with provenance.
- [DECISION] Phase 3 has one slice left after this release: the MCP read tools (`work_report`, `route`, `verification_history`). It is the final slice of the fusion design (`docs/FUSION-ARCHITECTURE.md`); once it ships, Phases 0-3 are complete.
