# Godpowers 3.10.0 Release

> Status: Prepared
> Date: 2026-06-15

[DECISION] Godpowers 3.10.0 adds three read-only MCP tools and completes the native fusion of Mythify's evidence engine and quarterback into Godpowers (Phases 0-3 of the fusion design).
[DECISION] The new tools are read-only (`readOnlyHint:true`) and additive; the MCP companion stays a read-only veneer and mutating verification remains on the CLI and orchestrator path.
[DECISION] This release keeps `core` as the omitted installer profile, keeps `--profile=full` as the complete compatibility surface, and keeps the 3.1.0-3.9.0 evidence, close-gate, quarterback, work-report, reflections, memory, lessons, and outcome surface.

## What's in this release

- [DECISION] New `work_report` MCP tool wraps `lib/work-report.js` with a forced peek so it never advances the report cursor.
- [DECISION] New `route` MCP tool wraps `lib/quarterback.js` and classifies a prompt into an entry play without mutating state.
- [DECISION] New `verification_history` MCP tool wraps `lib/evidence.js` history and returns ledger records, optionally filtered to one substep.
- [DECISION] `@godpowers/mcp` now exposes eight read-only tools: `status`, `next`, `gate_check`, `lint_artifact`, `trace_requirement`, `work_report`, `route`, and `verification_history`.
- [DECISION] 120 slash commands, 40 specialist agents, 13 executable workflows, 43 intent recipes, and the 3.1.0-3.9.0 evidence, close-gate, quarterback, work-report, reflections, memory, lessons, and outcome surface remain available.

## Changes

- [DECISION] `package.json`, `package-lock.json`, and `packages/mcp/package.json` now publish the 3.10.0 minor version.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, the mcp package README, and the SECURITY supported-version series now describe the 3.10.0 MCP read tools and the completed fusion.

## Validation

- [DECISION] `npm run lint` passed with 29 static checks.
- [DECISION] `npm --workspace @godpowers/mcp test` passed the protocol and setup tests against the eight-tool surface, exercising each new tool.
- [DECISION] `npm run release:check` passed `coverage:lib` above the 90 percent line floor for `lib/**/*.js`.
- [DECISION] `npm run release:check` passed `npm audit --omit=dev` with 0 vulnerabilities.
- [DECISION] `npm run release:check` passed public surface docs for version 3.10.0 with 120 skills, 40 agents, 13 workflows, and 43 recipes.
- [DECISION] `npm run release:check` passed root and `@godpowers/mcp` package contents.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.10.0` or `npx godpowers@3.10.0`.
- [DECISION] No migration is required. The MCP read tools are additive; no other behavior changed.

## Notes

- [DECISION] The publish targets are npm `godpowers@3.10.0`, npm `@godpowers/mcp@3.10.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.10.0`.
- [DECISION] The tag-triggered GitHub publish workflow remains the preferred npm path because it publishes with provenance.
- [DECISION] Phases 0-3 of the fusion design are now complete. The only remaining item the design lists is the optional one-time importer for existing `.mythify/` ledgers, tracked in `docs/FUSION-ARCHITECTURE.md`.
