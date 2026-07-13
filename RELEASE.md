# Godpowers 5.3.0 Release

> Status: Approved for publication
> Date: 2026-07-13

- [DECISION] Godpowers 5.3.0 is the product trust hardening release.
- [DECISION] The public surface contains 122 slash commands, 40 agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 98 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.3.0.

## Changes

- [DECISION] `lib/self-project-truth.js` blocks release when package versions, public counts, Pillars, state, progress, requirements, roadmap provenance, or lifecycle artifacts contradict one another.
- [DECISION] `lib/host-capabilities.js` separates installed capability metadata from active-session evidence and prevents `full on unknown` output.
- [DECISION] `lib/quick-proof.js` labels fixture evidence explicitly and uses `--inspect-project` for read-only current-project inspection.
- [DECISION] `lib/outcome-metrics.js` reports time to accepted change, cost, manual intervention, resume success, deployment completion, and rollback proof only when events support the claim.
- [DECISION] The default core profile contains 15 high-level commands, while builder, maintainer, suite, and full profiles preserve progressive access to all 122 commands.
- [DECISION] PRD, architecture, roadmap, stack, repository, build, deploy, observe, harden, launch, final sync, checkpoint, and Pillars evidence are reconciled for this source release.

## Validation

- [DECISION] `npm run release:check` passes on the final source tree.
- [DECISION] Aggregate coverage is 94.69% lines, 79.48% branches, and 96.85% functions.
- [DECISION] Per-file line coverage is at least 70% across all 96 expected non-browser runtime modules.
- [DECISION] The self-project truth gate passes 141 checks and fails closed on missing lifecycle steps, stale generated bodies, artifact drift, version drift, public surface drift, and stale roadmap hashes.
- [DECISION] Root package validation covers 577 files and MCP package validation covers 8 files.

## Upgrade

- [DECISION] After publication, install with `npm install -g godpowers@5.3.0` or `npx godpowers@5.3.0`.
- [DECISION] Existing 5.x projects need no artifact migration because MDX-first reads retain legacy Markdown fallback.
- [DECISION] Re-run the installer for each host runtime so the narrowed core profile and updated skills replace installed copies.

## Publication Boundary

- [DECISION] Publication is authorized for npm `godpowers@5.3.0`, npm `@godpowers/mcp@5.3.0`, GitHub tag `v5.3.0`, and a GitHub Release containing both package tarballs.
- [DECISION] The tag-triggered workflow verifies that the tag matches both package versions and belongs to merged main before it runs `npm run release:check` and npm publication with provenance.
- [DECISION] Published-install verification is required before the release is recorded as complete.
