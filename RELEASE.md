# Godpowers 6.0.0 Release

> Status: Published and verified
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
- [DECISION] The final local release gate passes 114 test commands and 3,113 checks, 94.64 percent line coverage, 79.8 percent branch coverage, the 70 percent per-file floor across 110 included runtime modules, zero dependency vulnerabilities, 140 self-project truth checks, synchronized Mythify 5.6.0 evidence provenance, and root plus MCP package-content verification.
- [DECISION] The pre-publication gate passes against hardening revision `sha256:5f65a4de4bb0ab7dcce5e7fb11c182a77345f23b2e6f75077c549ccef4ce9268` with zero unresolved or accepted Critical findings.
- [DECISION] Pull-request CI, merged-main CI, exact package publication, registry integrity, `latest` promotion, GitHub Release creation, and isolated published installation are complete.
- [DECISION] The tag workflow published both immutable packages with npm provenance under `release-6-0-0`; its immediate exact-version read encountered registry propagation delay, so the documented recovery path verified both versions and promoted MCP first and root second without republishing either artifact.
- [DECISION] The publication workflow now retries exact-version reads for up to 120 seconds before treating registry propagation as a failed pair verification.

## Upgrade

- [DECISION] Install the root CLI with `npm install -g godpowers@6.0.0` or run it with `npx godpowers@6.0.0`.
- [DECISION] Root CLI users have no state migration, artifact migration, command rename, or production dependency change.
- [DECISION] MCP users must run Node.js 20 or newer before upgrading `@godpowers/mcp` to 6.0.0.
- [DECISION] Third-party extension maintainers should validate against 6.0.0 and widen any `<6.0.0` peer range deliberately.

## Publication Evidence

- [DECISION] Pull request 91 passed Node.js 18, 20, and 22 plus the package gate in CI run 32096760451 and merged as `main` commit `9eb6a5cbdff3399e6d65a5cc660bf135814de7b7`.
- [DECISION] Merged-main CI run 32097014555 passed the same Node.js matrix and package gate against the exact merge commit.
- [DECISION] Annotated tag `v6.0.0` resolves to merge commit `9eb6a5cbdff3399e6d65a5cc660bf135814de7b7`.
- [DECISION] Provenance workflow 32097275283 passed release identity, the full release gate, and the fresh pre-publication gate, then published `godpowers@6.0.0` and `@godpowers/mcp@6.0.0` under `release-6-0-0` with npm provenance.
- [DECISION] The workflow encountered an npm registry propagation delay during its immediate exact-version read and stopped before promotion; recovery verified both staged artifacts, promoted `@godpowers/mcp@6.0.0` first and `godpowers@6.0.0` second, and confirmed both `latest` tags resolve to 6.0.0.
- [DECISION] Root registry integrity is `sha512-R7tLOkMP9JhXZzYLIGOhXwgB6YIXKi5RjiiY1t7uNRvCpd2RlhexyoCImtu3zSOA2BgqrpF8R6cBKbkNOT6cnQ==` with shasum `e6f63897d83b06b21da20659202fe0614b24809e`.
- [DECISION] MCP registry integrity is `sha512-hfwyLGgjuPsh6yJeNq/SYgNZ3s8h5xxoil/R+288VmgFrXHqTzBLWfgAc361gKPG2VTLoVFMbC3mNk56FQJomA==` with shasum `6c70dc38f938a7852da0cc7ea570d1d7cc0b1395`.
- [DECISION] Isolated exact-version verification with `node scripts/verify-published-install.js godpowers@6.0.0` passes Quick Proof, read-only project inspection, dashboard, next route, Claude install, and Codex install checks.
- [DECISION] The published MCP executable resolves through `npx -y -p @godpowers/mcp@6.0.0 godpowers-mcp --help` on Node.js 20 or newer.
- [DECISION] GitHub Release `v6.0.0` is published at `https://github.com/hannsxpeter/godpowers/releases/tag/v6.0.0` as the notes and tag record; npm remains the authoritative package artifact source.
