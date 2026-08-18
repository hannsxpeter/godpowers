# Godpowers 6.0.0 Release

> Status: Release candidate, publication pending
> Date: 2026-08-17

- [DECISION] Godpowers 6.0.0 hardens the complete coding-agent harness: verification output, specialist context, larger-change design, slice resume, maintainability interpretation, and sequential changeability evidence now have executable contracts.
- [DECISION] The public surface contains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes; no command, specialist, workflow, or recipe was added, removed, or renamed.
- [DECISION] The core package contains 112 runtime library modules, supports Node.js 18 or newer, and keeps zero production dependencies.
- [DECISION] The read-only `@godpowers/mcp` companion shares version 6.0.0, uses the MCP v2 server package, and requires Node.js 20 or newer.
- [DECISION] The package contains 110 focused test scripts, including the new harness-quality and authorized provenance suites.

## Harness Quality

- [DECISION] `npm test -- --agent-output` retains complete child bytes in a private log while presenting bounded aggregate success or focused first-failure evidence; normal output remains unchanged without the flag.
- [DECISION] All 41 specialists declare required context, optional context, inline inputs, and a positive token cap or an explicit no-project-context contract; file sources reject symlinks and retain pinned bytes, and every loadout event path preserves complete counts but no source contents.
- [DECISION] Medium and large Build plans require a program design approved by a hash-bound `user.resolve` event, while small plans require a recorded size and skip rationale; plan text cannot authorize itself.
- [DECISION] Slice handoffs stay at or below 8 KiB, preserve the recovery-critical fields, and remain projections under `.godpowers/state.json` authority.
- [DECISION] Maintainability trajectories report separate measures, signed deltas, and sample counts without turning one score into a build gate during the first three release candidates.
- [DECISION] The packaged evolution benchmark reveals exactly six requirements in order, runs behavior plus maintainability checks offline, isolates Git configuration and hooks, bounds inputs, baselines, traversal, and evidence, retains partial interruption evidence, and removes temporary state.

## Authorized Provenance Extension

- [DECISION] `@godpowers/provenance-pack` provides an optional skill, specialist, responsible-use contract, and dependency-free client for content the user owns or is authorized to process.
- [DECISION] Loopback is the default. Remote HTTPS and internal-network transfers require separate grants matching the exact normalized origin, credentials remain in environment variables, service responses are bounded and sanitized, and source bytes are preserved by default.
- [DECISION] The root package does not install or start the external inspection service, and the extension remains inactive until the user installs it.

## MCP v2 And Compatibility

- [DECISION] `@godpowers/mcp` moved from the legacy MCP SDK production server to `@modelcontextprotocol/server` v2 and `zod` 4.2.
- [DECISION] Protocol tests exercise the current v2 client and the legacy v1 client against the same nine read-only tools.
- [DECISION] Every MCP tool is pinned to the server-configured project root, and artifact lint paths reject symbolic links before canonical containment is verified.
- [DECISION] The MCP companion now requires Node.js 20 or newer, which is the breaking change that requires the 6.0.0 major version; the root CLI retains Node.js 18 support.
- [DECISION] First-party extension manifests and peer dependencies accept the Godpowers 6.x line.
- [DECISION] Root and MCP packages publish first under one staging tag, verify as an exact pair, and only then promote `latest`; reruns recover a missing half without republishing the existing version.
- [DECISION] First-party extension packs publish only from a matching version tag whose commit is already merged into `main`.

## Validation

- [DECISION] Independent specification and quality reviews passed for compact verification, context loadouts, program design, slice handoffs, and maintainability trajectory behavior.
- [DECISION] The evolution benchmark quality review exposed and drove repairs for symlink containment, network guard bypasses, interruption cleanup, evidence bounds, Git metadata and hooks, baseline resource limits, invalid numeric evidence, canonical handoff validation, falsy handoff substitution, and test-temporary cleanup; the repaired focused suite passes 18 checks.
- [DECISION] The release hardening review exposed and drove repairs for MCP root containment, authoritative plan approval, context identity pinning, exact-origin consent, universal event bounds, resource-bounded scans, recoverable pair publication, and merged-tag pack publication.
- [DECISION] Provenance client and pack suites pass 20 and 14 checks, the extension publication suite passes 65 checks, and the MCP protocol suite passes with modern and legacy clients.
- [DECISION] The final local release gate passes 114 test commands and 3,114 checks, 94.64 percent line coverage, 79.8 percent branch coverage, the 70 percent per-file floor across 110 included runtime modules, zero dependency vulnerabilities, 140 self-project truth checks, synchronized Mythify 5.6.0 evidence provenance, and root plus MCP package-content verification.
- [DECISION] The pre-publication gate passes against hardening revision `sha256:5f65a4de4bb0ab7dcce5e7fb11c182a77345f23b2e6f75077c549ccef4ce9268` with zero unresolved or accepted Critical findings.
- [HYPOTHESIS] Pull-request CI, tag workflow, registry integrity, and isolated published installation remain pending until their corresponding steps execute.

## Upgrade

- [DECISION] Install the root CLI with `npm install -g godpowers@6.0.0` or run it with `npx godpowers@6.0.0`.
- [DECISION] Root CLI users have no state migration, artifact migration, command rename, or production dependency change.
- [DECISION] MCP users must run Node.js 20 or newer before upgrading `@godpowers/mcp` to 6.0.0.
- [DECISION] Third-party extension maintainers should validate against 6.0.0 and widen any `<6.0.0` peer range deliberately.

## Publication Evidence

- [OPEN QUESTION] The merge commit, `v6.0.0` tag, provenance workflow run, npm integrity values, GitHub Release, and isolated exact-version verification will be recorded after the external publication steps complete.
