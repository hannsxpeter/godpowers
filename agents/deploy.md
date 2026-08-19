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
- [DECISION] Source version `6.3.0` published with npm provenance through identity-bound workflows 32272150358 and 32272475321 from merged `main` commit `c45d0473ad946fcd7c02a5706b02f51a40ed0d25`.
- [DECISION] npm `godpowers@6.3.0`, `@godpowers/mcp@6.3.0`, and `@godpowers/operations-pack@0.1.0` are the `latest` versions; their exact registry integrity values and shasums are recorded in `RELEASE.md`.
- [DECISION] The 6.3.0 workflows passed release identity, full release, fresh prepublication, exact packed-pair, and extension publishability gates before publication.
- [DECISION] Isolated published-install verification passes for the exact root, MCP, and operations-pack set, Quick Proof, read-only project inspection, status, next route, Claude, Codex, and MCP `--help`.
- [DECISION] The isolated dependency audit reports zero vulnerabilities, and registry signature verification covers all 6 installed packages and their attestations.
- [DECISION] The published `v6.2.0` tag is the rollback reference for the published 6.3.0 release.
- [DECISION] The 6.3.0 release retains the tag-triggered root and MCP provenance workflow and publishes `operations-pack` through the explicit first-party pack selector.
- [DECISION] The root and MCP workflow publishes exact packed tarballs and verifies registry integrity plus shasum before any recovery run can promote an existing version.
- [DECISION] The first-party pack workflow passes dispatch inputs through environment variables, allowlists pack names, and validates strict SemVer before identity or publication steps.
- [DECISION] The 6.3.0 public surface contains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes.
- [DECISION] The 6.3.0 core package contains 117 runtime library modules and its package-content check reports 659 files while keeping zero root production dependencies.

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
- Related artifact: `.godpowers/state.json`.
- Related artifact: `RELEASE.md`.
- Rule: keep this pillar aligned when these artifacts change durable deploy truth.

### Extracted durable signals

From `RELEASE.md`:
- [DECISION] Godpowers 6.3.0 adds explicit evidence and authority contracts to runtime verification, debugging, program design, archaeology, durable decision history, and command routing.
- [DECISION] The release retains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes.
- [DECISION] The core package contains 117 runtime library modules and keeps zero root production, optional, or peer dependencies.
- [DECISION] The repository contains 117 focused test scripts and 54 core reference documents.
- [DECISION] The root package-content check reports 659 files, including the new dependency-free validators and the optional operations pack publication surface.
- [DECISION] The root `godpowers` package supports Node.js 18 or newer, while the read-only `@godpowers/mcp` companion requires Node.js 20 or newer; both manifests declare version 6.3.0.
- [DECISION] `/god-test-runtime` now selects one material verification profile for CLI, SDK, API, UI, service, or library products and rejects incomplete or generic completion evidence.
- [DECISION] Existing `test-only`, `audit-only`, and `a11y-only` runtime modes remain available and keep their previous identifiers.
<!-- godpowers:pillar-sync:end -->
