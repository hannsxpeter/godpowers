# Godpowers 3.4.0 Release

> Status: Prepared
> Date: 2026-06-15

[DECISION] Godpowers 3.4.0 is a minor release that lands Phase 2 of the fusion design: the quarterback entry router.
[DECISION] The quarterback is read-only and additive. It composes the existing structural router and intent recipes; no existing command behavior changes.
[DECISION] This release keeps `core` as the omitted installer profile, keeps `--profile=full` as the complete compatibility surface, and keeps the 3.1.0-3.3.0 close-on-evidence path.

## What's in this release

- [DECISION] New `lib/quarterback.js`, the entry-level two-layer router that composes `router.suggestNext` and `recipes.matchIntent`.
- [DECISION] Refuse-on-red: the quarterback never starts new work when the latest executed verdict is red or harden findings carry an unresolved Critical (the recover route).
- [DECISION] Proportional ceremony: a one-line fix routes to `/god-fast` instead of opening a full arc (the trivial route).
- [DECISION] Priority ladder, first match wins: recover, resume, recovery, brownfield, research, review, full, feature, trivial.
- [DECISION] New read-only `npx godpowers route "<prompt>"` CLI subcommand that returns the chosen play with next command, ceremony, verification strategy, and an evidence block.
- [DECISION] 120 slash commands, 40 specialist agents, 13 executable workflows, 43 intent recipes, and the 3.1.0-3.3.0 evidence and close-gate surface remain available.

## Changes

- [DECISION] `package.json`, `package-lock.json`, and `packages/mcp/package.json` now publish the 3.4.0 minor version.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, and the SECURITY supported-version series now describe the 3.4.0 quarterback and `route` command.

## Validation

- [DECISION] `npm run lint` passed with 29 static checks.
- [DECISION] `node scripts/test-quarterback.js` passed with 14 quarterback tests covering every ladder branch.
- [DECISION] `node scripts/test-cli-dispatch.js` passed with 34 CLI dispatch tests, including the new `route` tests.
- [DECISION] `npm run release:check` passed `coverage:lib` above the 90 percent line floor for `lib/**/*.js` (quarterback.js at 97 percent).
- [DECISION] `npm run release:check` passed `npm audit --omit=dev` with 0 vulnerabilities.
- [DECISION] `npm run release:check` passed public surface docs for version 3.4.0 with 120 skills, 40 agents, 13 workflows, and 43 recipes.
- [DECISION] `npm run release:check` passed root and `@godpowers/mcp` package contents.

## Upgrade

- [DECISION] Use `npm install -g godpowers@3.4.0` or `npx godpowers@3.4.0`.
- [DECISION] No migration is required. The quarterback is read-only and additive; no other tier behavior changed.

## Notes

- [DECISION] The publish targets are npm `godpowers@3.4.0`, npm `@godpowers/mcp@3.4.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.4.0`.
- [DECISION] The tag-triggered GitHub publish workflow remains the preferred npm path because it publishes with provenance.
- [DECISION] Phase 2 of the fusion design is complete with this release. The next slice begins Phase 3 (outcome loops, memory, lessons, reflections, the chat work-report after each substep, and the MCP read tools), tracked in `docs/FUSION-ARCHITECTURE.md`.
