# Godpowers 5.2.0 Release

> Status: Ready to publish
> Date: 2026-07-04

[DECISION] Godpowers 5.2.0 is the voice gate release. It promotes the anti-sycophancy half of the 5.1 voice and craft contract from prose guidance to a mechanical gate, closing the caveat that the voice contract was prompt-level and unenforced.
[DECISION] The release is additive over 5.1. Public command surface is unchanged: 122 slash commands, 40 specialist agents, 13 workflows, 44 recipes. Counts that move: have-nots 157 to 158, lib modules 95 to 96. The `@godpowers/mcp` companion stays at nine read-only tools. No project migration is required.

## What's new in 5.2.0

- [DECISION] `lib/voice-lint.js`: a high-precision detector for sycophancy and gratitude-loop filler (praising the question, thanking merely for the message, help-eagerness such as "happy to help", a "hope this helps" sign-off, and forced engagement such as "let me know if you" or "feel free to reach out"). It keeps false positives low by matching only phrases that are almost always filler in engineering communication. Agents can run it on their own drafted output before sending.
- [DECISION] Have-not U-14 (sycophancy or gratitude loop) in `references/HAVE-NOTS.md`, wired as a universal check in `lib/have-nots-validator.js`. It flags generated artifacts at warning severity and carries a good/bad worked example. This is the mechanical enforcement of the honest-voice section of `references/shared/VOICE.md`.
- [DECISION] Self-dogfood gate: `scripts/static-check.js` and `scripts/test-voice-lint.js` assert that the framework's own shipped `skills/` and `agents/` prose contains no gratitude-loop filler, enforced in CI. The current surface is already clean, so the gate locks in the clean state going forward. References that intentionally quote the filler as examples (`VOICE.md`, `HAVE-NOTS.md`) are out of scope for the self-dogfood scan.

## Changes

- [DECISION] One new runtime module (`lib/voice-lint.js`; lib module count 95 to 96) with a dedicated test (`scripts/test-voice-lint.js`) wired into `scripts/run-tests.js`.
- [DECISION] One new documented have-not (U-14; count 157 to 158). `lib/have-nots-validator.js` registers U-14 as a universal check and updates its header count.
- [DECISION] `package.json` and `packages/mcp/package.json` publish the 5.2.0 version; CHANGELOG, roadmap, reference, architecture, the architecture map, MCP docs, security supported-versions, and the surface docs now reflect 5.2.0.

## Validation

- [DECISION] `npm test` passes across all command groups (the full `scripts/run-tests.js` suite, 0 failures).
- [DECISION] The offline release gate passes: `npm run coverage:lib` (90% lines / 75% branches aggregate, per-file floors), `node scripts/check-per-file-coverage.js`, `git diff --check`, `npm run pack:check`, `npm run pack:mcp:check`, and `npm run test:surface`. The registry-only step (`npm audit --omit=dev`) runs in the tag-triggered publish workflow's `release:check`.
- [DECISION] `node scripts/test-doc-surface-counts.js` passes public surface docs for version 5.2.0 with 122 skills, 40 agents, 13 workflows, 44 recipes, and 96 lib modules.

## Upgrade

- [DECISION] Use `npm install -g godpowers@5.2.0` or `npx godpowers@5.2.0`.
- [DECISION] Upgrading from 5.x needs no artifact-format change. Re-run `npx godpowers install` (or your runtime flags, e.g. `npx godpowers --claude --global`) so installed runtimes pick up the refreshed contracts and the new have-not.
- [DECISION] The voice gate is additive: it flags gratitude-loop filler in generated artifacts (warning) and blocks it in the framework's own shipped prose (CI). No existing project artifact changes until it is re-linted.

## Notes

- [DECISION] The publish targets are npm `godpowers@5.2.0`, npm `@godpowers/mcp@5.2.0`, and GitHub release `https://github.com/hannsxpeter/godpowers/releases/tag/v5.2.0`.
- [DECISION] Publishing is tag-triggered: pushing the `v5.2.0` tag runs `.github/workflows/publish.yml`, which runs `npm run release:check` and publishes both `godpowers` and `@godpowers/mcp` to npm with provenance. Do not `npm publish` by hand; the tag path carries provenance and the release gate.
