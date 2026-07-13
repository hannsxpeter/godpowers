---
pillar: deploy
status: present
always_load: false
covers: [ci, release, npm publish, package verification]
triggers: [deploy, publish, release, npm, ci, provenance]
must_read_with: [repo, quality]
see_also: [security, observe]
---

## Scope

- [DECISION] This pillar captures deployment and release context for Godpowers.

## Context

### Release Surface

- [DECISION] Godpowers deploys as an npm package published from tag-triggered GitHub Actions when provenance is available.
- [DECISION] `.github/workflows/ci.yml` runs the full matrix test suite and the Node 20 release gate on pushes and pull requests to `main`.
- [DECISION] `.github/workflows/publish.yml` runs `npm run release:check` before publishing tagged releases to npm with provenance.
- [DECISION] `.github/workflows/publish-pack.yml` runs `npm run release:check` before publishing first-party extension packs.
- [DECISION] `package.json` exposes `bin.godpowers` at `./bin/install.js`.
- [DECISION] Manual tarball publish is a fallback only when the tag-triggered workflow cannot run, and provenance is unavailable for that publish.
- [HYPOTHESIS] Source version `5.5.0` will publish through the identity-bound tag workflow after the release candidate merges to `main`.
- [HYPOTHESIS] npm `godpowers@5.5.0` and `@godpowers/mcp@5.5.0` will become `latest` only after registry and asset integrity verification passes.
- [DECISION] Isolated published-install verification passes for Quick Proof, read-only project inspection, dashboard, next route, Claude, Codex, and the MCP executable.
- [DECISION] The prior `v5.4.0` tag remains the tested rollback reference.

## Decisions

(none)

## Rules

(none)

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] A release is incomplete until git tag, GitHub release, npm version, package tarball, README badges, CHANGELOG, RELEASE, and local install verification agree.
- [HYPOTHESIS] Registry and published-install proof do not substitute for adoption evidence from an unaffiliated production user.

## Touchpoints

- [DECISION] Release truth synchronizes from package metadata, GitHub workflows, npm registry evidence, and authoritative Godpowers state.

## Gaps

(none)

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `RELEASE.md`.
- Rule: keep this pillar aligned when these artifacts change durable deploy truth.

### Extracted durable signals

From `RELEASE.md`:
- [DECISION] Godpowers 5.5.0 is the Arc-Ready and Pillars conformance release.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.5.0.
- [DECISION] Product routing selects one of six forms before applying product archetype, industry, or regulatory overlays.
- [DECISION] Each product form carries a distinct vertical slice and completion-evidence contract, so web assumptions do not leak into API, CLI, mobile, data, or infrastructure work.
- [DECISION] OWASP hardening uses the 2025 Web Top 10 and routes supply-chain failures plus exceptional-condition handling as first-class checks.
- [DECISION] Public activation requires `.godpowers/launch/PREPUBLICATION.mdx`, bound to the exact hardening findings hash, authoritative hardening timestamp, and Critical count.
<!-- godpowers:pillar-sync:end -->
