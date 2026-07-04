# Godpowers 5.1.0 Release

> Status: Published
> Date: 2026-07-04

[DECISION] Godpowers 5.1.0 is the craft and connectors release. It adopts a set of proven agent-prompting patterns (drawn from studying a current Anthropic system prompt) as a single shared voice and craft contract, and extends the 5.0 connector work with a capability priority ladder.
[DECISION] The release is additive over 5.0. Surface counts are unchanged: 122 slash commands, 40 specialist agents, 13 workflows, 44 recipes, 95 lib modules, 157 have-nots. The `@godpowers/mcp` companion stays at nine read-only tools. No project migration is required.

## What's new in 5.1.0

- [DECISION] Voice and craft contract (`references/shared/VOICE.md`), wired globally as Core Principle 15 in `SKILL.md`. Every agent adopts it alongside the have-nots. It defines: constraint tiers (Guideline / Requirement / HARD LIMIT, with the have-nots as the hard-limit tier), an honest anti-sycophancy voice (no gratitude loops, no forced engagement, accountability without self-abasement, scoped uncertainty), minimal formatting for human-facing output, an example-driven-rules convention, and silent application of memory and lessons.
- [DECISION] Worked good/bad example pairs on the highest-traffic have-nots (U-01 substitution, U-02 three-label, U-05 rubber-stamp) so the most-misread rules are resolved by example, not restated.
- [DECISION] Connector capability ladder: `connectors.pickConnector(capability)` walks a priority order (for example Linear then GitHub for issue work) and stops at the first available, enabled connector. A disabled connector is skipped. Documented in `/god-connect`.
- [DECISION] Silent-memory wiring at the memory site: `skills/god-extract-learnings.md` documents applying recalled lessons without narrating the recall, pointing at `VOICE.md`.

## Changes

- [DECISION] One new shared reference (`references/shared/VOICE.md`) and its index entry in `references/shared/README.md`. No new skill, agent, workflow, recipe, or lib module, so public surface counts are unchanged.
- [DECISION] `lib/connectors.js` gains `CAPABILITY_LADDER` and `pickConnector(...)`, covered by new cases in `scripts/test-connectors.js`.
- [DECISION] `SKILL.md` adds Core Principle 15 (Voice and Craft). `references/HAVE-NOTS.md`, `skills/god-connect.md`, and `skills/god-extract-learnings.md` are updated accordingly.
- [DECISION] `package.json` and `packages/mcp/package.json` publish the 5.1.0 version; CHANGELOG, roadmap, reference, architecture, the architecture map, MCP docs, security supported-versions, and the surface docs now reflect 5.1.0.

## Validation

- [DECISION] `npm test` passes across all command groups (the full `scripts/run-tests.js` suite, 0 failures).
- [DECISION] The offline release gate passes: `npm run coverage:lib` (90% lines / 75% branches aggregate, per-file floors), `node scripts/check-per-file-coverage.js`, `git diff --check`, `npm run pack:check`, `npm run pack:mcp:check`, and `npm run test:surface`. The registry-only step (`npm audit --omit=dev`) runs in the tag-triggered publish workflow's `release:check`.
- [DECISION] `node scripts/test-doc-surface-counts.js` passes public surface docs for version 5.1.0 with 122 skills, 40 agents, 13 workflows, 44 recipes, and 95 lib modules.

## Upgrade

- [DECISION] Use `npm install -g godpowers@5.1.0` or `npx godpowers@5.1.0`.
- [DECISION] Upgrading from 5.0 needs no artifact-format change. Re-run `npx godpowers install` (or your runtime flags, e.g. `npx godpowers --claude --global`) so installed runtimes pick up the refreshed contracts.
- [DECISION] The voice contract and connector ladder are behavioral: they change how agents communicate and choose connectors, not the command surface or on-disk artifacts.

## Notes

- [DECISION] The publish targets are npm `godpowers@5.1.0`, npm `@godpowers/mcp@5.1.0`, and GitHub release `https://github.com/hannsxpeter/godpowers/releases/tag/v5.1.0`.
- [DECISION] Publishing is tag-triggered: pushing the `v5.1.0` tag runs `.github/workflows/publish.yml`, which runs `npm run release:check` and publishes both `godpowers` and `@godpowers/mcp` to npm with provenance. Do not `npm publish` by hand; the tag path carries provenance and the release gate.
