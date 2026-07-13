# Godpowers 5.5.0 Release

> Status: Published
> Date: 2026-07-13

- [DECISION] Godpowers 5.5.0 is the Arc-Ready and Pillars conformance release.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.5.0.

## Changes

- [DECISION] Product routing selects one of six forms before applying product archetype, industry, or regulatory overlays.
- [DECISION] Each product form carries a distinct vertical slice and completion-evidence contract, so web assumptions do not leak into API, CLI, mobile, data, or infrastructure work.
- [DECISION] OWASP hardening uses the 2025 Web Top 10 and routes supply-chain failures plus exceptional-condition handling as first-class checks.
- [DECISION] Public activation requires `.godpowers/launch/PREPUBLICATION.mdx`, bound to the exact hardening findings hash, authoritative hardening timestamp, and Critical count.
- [DECISION] Godpowers imports Arc-Ready 1.1 canonical tier artifacts as read-only migration evidence and writes sync-back only to `.arc-ready/GODPOWERS-SYNC.md`.
- [DECISION] Pillars 1.1 support includes path-derived identities, recursive sub-pillars, nested scopes, exact portable matching, local catalogs, exclusions, dependency depth, budgets, and all official routing fixtures.
- [DECISION] Specialist source contracts live under `specialists/`, while host installation still writes portable contracts to the host `agents/` registry.
- [DECISION] The pinned official Agent Skills validator runs in release checks and GitHub publication workflows.

## Validation

- [DECISION] Product routing passes 11 focused tests across six forms and four composition axes.
- [DECISION] The pre-publication gate passes 12 focused tests for recording, hash drift, timestamp drift, Critical policy, malformed authority, and fail-closed behavior.
- [DECISION] Pillars passes 14 native behavior tests, all 6 official portable routing fixtures, and the official Pillars repository validator with 0 errors and 0 warnings.
- [DECISION] The official Agent Skills validator accepts the absolute Godpowers repository path.
- [DECISION] The complete release gate passes with 94.64 percent line coverage, 79.26 percent branch coverage, 96.77 percent function coverage, and at least 70 percent line coverage across 98 included runtime modules.
- [DECISION] The dependency audit reports 0 vulnerabilities and self-project truth passes 141 checks.
- [DECISION] Package verification records 582 files in `godpowers` and 8 files in `@godpowers/mcp`.
- [DECISION] Pull request 70 passed Node 18, 20, and 22 plus the package release gate before merge commit `84fbd00066d2bd833929d6d0b6b769de45275313` reached `main`.
- [DECISION] Main CI run 29264958862 passed against the merged release commit.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.5.0` or `npx godpowers@5.5.0`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so updated skills, specialists, routes, references, and runtime helpers replace installed copies.
- [DECISION] Repository contributors should treat `agents/` as Pillars context and `specialists/` as portable specialist source contracts.

## Publication Evidence

- [DECISION] Tag `v5.5.0` resolves to merged `main` commit `84fbd00066d2bd833929d6d0b6b769de45275313`.
- [DECISION] GitHub Release `v5.5.0` publishes `godpowers-5.5.0.tgz`, `godpowers-mcp-5.5.0.tgz`, and `SHA256SUMS`.
- [DECISION] The root release asset SHA-256 digest is `d8452cb7e8d862da6609faf1858e50e8e1d4a31147eeb811d53abf61e69a3c2f`.
- [DECISION] The MCP release asset SHA-256 digest is `afccadc9727398aa666bd5e155af477a258f0aa06428a7aaf53bf5389c4b028e`.
- [DECISION] Provenance workflow 29264981272 published `godpowers@5.5.0` and `@godpowers/mcp@5.5.0` under the `latest` tag.
- [DECISION] The root registry integrity is `sha512-matKwEhx+nxl+luBjAnGSPzdef1I19hpxfXmaxGAgRCu54qcGPLZbuMPLhH8/PHYI6FGODUMoeNmG1i2vSvGAA==` and matches the local release tarball.
- [DECISION] The MCP registry integrity is `sha512-VJbTGQXf8Xlyfm1TXK5fisr7qgZFBFkvliQnZEhhMaTwMhYIazmF8r1330AJYhQ/hOMDff725VWpZGDLdy0Fzg==` and matches the local release tarball.
- [DECISION] Isolated exact-version verification passes for Quick Proof, read-only project inspection, dashboard, next route, Claude install, Codex install, and the MCP executable.
