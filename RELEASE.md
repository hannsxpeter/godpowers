# Godpowers 5.3.1 Release

> Status: Published
> Date: 2026-07-13

- [DECISION] Godpowers 5.3.1 is the Godaudits 2.0 interoperability patch release.
- [DECISION] The public surface contains 122 slash commands, 40 agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 98 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.3.1.

## Changes

- [DECISION] `lib/sibling-artifacts.js` reads `.godaudits/AUDIT.json` as canonical machine state and retains checks, evidence metadata, findings, accepted risks, compliance, coverage, score caps, and typed GA tasks.
- [DECISION] Generated `.godaudits/AUDIT.mdx` and legacy `.godaudits/AUDIT.md` remain supported fallbacks without overriding canonical JSON.
- [DECISION] `lib/planning-systems.js` synchronizes open GA remediation into an idempotent managed todo section while preserving user-owned todo content.
- [DECISION] Invalid JSON, unsupported schemas, malformed core records, oversized inputs, and non-regular sibling artifacts fail closed without dispatching remediation or seeding harden work.
- [DECISION] Godaudits staleness follows canonical JSON so regenerated human reports do not create false drift.
- [DECISION] Audit, migration, fix, preflight, doctor, context, orchestration, routing, workflow, template, and architecture documentation now describe the Godaudits 2.0 contract.

## Validation

- [DECISION] `npm run release:check` passes on the final source tree.
- [DECISION] Aggregate coverage is 94.76% lines, 79.09% branches, and 96.90% functions.
- [DECISION] Per-file line coverage is at least 70% across all 96 expected non-browser runtime modules.
- [DECISION] The self-project truth gate passes 141 checks and fails closed on missing lifecycle steps, stale generated bodies, artifact drift, version drift, public surface drift, and stale roadmap hashes.
- [DECISION] The sibling integration suite passes 49 checks, including canonical authority, fallback behavior, safety boundaries, todo synchronization, and staleness.
- [DECISION] A live contract probe passes against the Godaudits 2.0 compiler and renderer.
- [DECISION] Root package validation covers 577 files and MCP package validation covers 8 files.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.3.1` or `npx godpowers@5.3.1`.
- [DECISION] Existing 5.x projects need no Godpowers artifact migration.
- [DECISION] Projects with Godaudits 2.0 should keep `.godaudits/AUDIT.json` canonical and regenerate `.godaudits/AUDIT.mdx` after remediation.
- [DECISION] Re-run the installer for each host runtime so the updated skills and runtime helpers replace installed copies.

## Publication Evidence

- [DECISION] GitHub tag `v5.3.1` and the GitHub Release point to merged main commit `40b442aedf35b39fc6c3ea1b37c4f063578dd194`.
- [DECISION] GitHub Actions run `29231358334` verified release identity, passed the complete release gate, and published npm `godpowers@5.3.1` plus npm `@godpowers/mcp@5.3.1` with provenance.
- [DECISION] The 577-file root tarball and 8-file MCP tarball attached to the GitHub Release exactly match the npm registry integrity values.
- [DECISION] npm latest resolves both packages to 5.3.1, and published verification passes for Quick Proof, read-only project inspection, dashboard, next route, Claude, Codex, and the MCP executable.
