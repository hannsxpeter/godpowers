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
- [DECISION] Source version `6.0.0` published with npm provenance through identity-bound workflow 32097275283 from merged `main` commit `9eb6a5cbdff3399e6d65a5cc660bf135814de7b7`.
- [DECISION] npm `godpowers@6.0.0` and `@godpowers/mcp@6.0.0` are the `latest` versions; their exact registry integrity values are recorded in `RELEASE.md`.
- [DECISION] The 6.0.0 workflow published both immutable artifacts under `release-6-0-0`, then stopped on an immediate registry propagation read; recovery promoted the verified pair without republishing, and the workflow now retries those reads for up to 120 seconds.
- [DECISION] Isolated published-install verification passes for Quick Proof, read-only project inspection, dashboard, next route, Claude, Codex, and the MCP executable.
- [DECISION] The prior `v5.17.1` tag remains the rollback reference.

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
- [DECISION] Godpowers 6.1.0 adds a shared post-draft prose audit, a pure advisory scanner, and universal non-blocking U-12 findings without changing the existing three-label, substitution, or blocking artifact checks.
- [DECISION] The public surface contains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes; this release adds, removes, or renames none of those surfaces.
- [DECISION] The core package contains 113 runtime library modules, supports Node.js 18 or newer, and keeps zero production dependencies.
- [DECISION] The read-only `@godpowers/mcp` companion shares version 6.1.0 and requires Node.js 20 or newer.
- [DECISION] The repository contains 111 focused test scripts, and the current root package-content check reports 646 files.
- [DECISION] `references/shared/VOICE.md` now runs one post-draft audit after the draft's meaning, requirements, and evidence are settled.
- [DECISION] The audit checks each claim for a named actor, action or decision, mechanism or source, observable effect, and reader action when one is needed.
- [DECISION] The audit preserves requirements, verified facts, code terms, quotations, and user-approved tone; it does not replace the three-label rule or substitution test.
<!-- godpowers:pillar-sync:end -->
