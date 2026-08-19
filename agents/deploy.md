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
- [DECISION] Source version `6.2.0` published with npm provenance through identity-bound workflow 32242093455 from merged `main` commit `010f02dbccb17fce42107ce39d681adaa4879251`.
- [DECISION] npm `godpowers@6.2.0` and `@godpowers/mcp@6.2.0` are the `latest` versions; their exact registry integrity values and shasums are recorded in `RELEASE.md`.
- [DECISION] The 6.2.0 workflow passed release identity, full release, and fresh prepublication gates before publishing and promoting the exact root and MCP pair.
- [DECISION] Isolated published-install verification passes for the exact package pair, Quick Proof, read-only project inspection, status, next route, Claude, Codex, MCP `--help`, and MCP read-only setup JSON.
- [DECISION] The isolated dependency audit reports zero vulnerabilities, and registry signature verification covers all 5 installed packages and their attestations.
- [DECISION] The prior `v6.1.0` tag remains the rollback reference.

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
- [DECISION] Godpowers 6.2.0 adds a blast-radius safety case to existing Stage 2 review with exactly one load-bearing safety fact, 10 boundary classes, and a five-level evidence ladder.
- [DECISION] The public surface contains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes; the blast-radius release adds, removes, or renames none of those surfaces.
- [DECISION] The core package contains 113 runtime library modules, supports Node.js 18 or newer, and keeps zero production dependencies.
- [DECISION] The read-only `@godpowers/mcp` companion shares version 6.2.0 and requires Node.js 20 or newer.
- [DECISION] The published package checks report 647 root files and 8 MCP files.
- [DECISION] Pull request 95, merged-main CI, annotated tag identity, provenance workflow 32242093455, both npm packages, GitHub Release, isolated installs, dependency audit, registry signatures, and attestations all pass for 6.2.0.
<!-- godpowers:pillar-sync:end -->
