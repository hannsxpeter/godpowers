# Godpowers 5.4.0 Release

> Status: Approved for publication
> Date: 2026-07-13

- [DECISION] Godpowers 5.4.0 is the Godplans 1.1 interoperability release.
- [DECISION] The public surface contains 122 slash commands, 40 agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 98 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.4.0.

## Changes

- [DECISION] `lib/sibling-artifacts.js` recognizes the Godplans 1.1 PLAN plus validator contract, mirrors its structural rules without executing repository-owned shell, and pins the official validator by exact SHA-256 identity.
- [DECISION] GP execution is blocked for planning, done, invalid, incomplete, unsupported-validator, non-executable, symlinked, and lifecycle-inconsistent contracts.
- [DECISION] Approved or executing plans expose only dependency-ready tasks, and parallel dispatch remains inside one wave with disjoint file ownership.
- [DECISION] `lib/planning-systems.js` preserves the complete GP task ledger, phases, waves, statuses, `Reuses`, `Verify`, story requirements, and domain requirements during migration.
- [DECISION] Godplans staleness covers PLAN content, validator content, and validator executable mode while ignoring Godpowers-owned sync companions.
- [DECISION] Legacy and incomplete plans remain readable as hypothesis-grade migration context but cannot become execution authority.
- [DECISION] Planning, migration, preflight, doctor, context, reconciliation, reconstruction, orchestration, routing, workflow, template, architecture, and reference documentation now describe the Godplans 1.1 contract.

## Validation

- [DECISION] `npm run release:check` passes on the final 5.4.0 release-candidate tree.
- [DECISION] Aggregate coverage is 94.65% lines, 79.28% branches, and 96.93% functions.
- [DECISION] Per-file line coverage is at least 70% across all 96 expected non-browser runtime modules.
- [DECISION] `npm run lint` passes all static release-sensitive checks.
- [DECISION] The sibling integration suite passes 59 checks, including official validator identity, structural parity, lifecycle gates, companion safety, staleness, large-plan reads, and full GP and requirement traceability.
- [DECISION] A live parity probe passes the same Godplans fixture through the official 1.1.0 validator and the Godpowers static mirror.
- [DECISION] Node 18, Node 20, Node 22, and the package check pass in GitHub Actions run `29233469337` for pull request 67.
- [DECISION] Repository documentation, repository surface, route quality, recipe coverage, and release surface detectors report no stale checks.
- [DECISION] Root package validation covers 577 files and MCP package validation covers 8 files.
- [DECISION] The self-project truth gate passes 141 checks and fails closed on stale source versions, generated state, artifact hashes, roadmap provenance, lifecycle status, and public surface claims.

## Upgrade

- [DECISION] After publication, install with `npm install -g godpowers@5.4.0` or `npx godpowers@5.4.0`.
- [DECISION] Existing 5.x projects need no Godpowers artifact migration.
- [DECISION] Projects using Godplans 1.1 should keep `.godplans/PLAN.mdx` beside its emitted executable `.godplans/validate-plan.sh` companion.
- [DECISION] Re-run the installer for each host runtime so updated skills and runtime helpers replace installed copies.

## Publication Boundary

- [DECISION] Publication is authorized for npm `godpowers@5.4.0`, npm `@godpowers/mcp@5.4.0`, GitHub tag `v5.4.0`, and a GitHub Release containing both verified package tarballs.
- [DECISION] The tag-triggered workflow must verify that the tag matches both package versions and belongs to merged main before it runs the complete release gate and npm publication with provenance.
- [DECISION] Published-install verification is required before this release is recorded as complete.
