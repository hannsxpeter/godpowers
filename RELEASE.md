# Godpowers 5.3.0 Release

> Status: Published
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

## Publication Evidence

- [DECISION] GitHub tag `v5.3.0` and the GitHub Release point to merged main commit `9c6efed128b22df6458273c9428d0ceb0a0b0312`.
- [DECISION] The GitHub Release contains the exact 577-file root tarball and 8-file MCP tarball whose integrity values match the npm registry.
- [DECISION] The tag-triggered workflow verified both package versions and merged-main ancestry, passed the complete release gate, and published npm `godpowers@5.3.0` plus npm `@godpowers/mcp@5.3.0` with provenance.
- [DECISION] Registry verification, root published-install verification, Claude and Codex installation, and the published MCP executable all pass.
