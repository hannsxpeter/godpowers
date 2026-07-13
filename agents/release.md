---
pillar: release
status: present
always_load: false
covers: [versioning, release preparation, publication, changelog policy]
triggers: [release, version, changelog, publish, semver]
must_read_with: [repo, quality, deploy]
see_also: [security]
---

## Scope

- [DECISION] This pillar owns Godpowers version decisions, release readiness, artifacts, and publication truth.

## Context

- [DECISION] The root `godpowers` package and `@godpowers/mcp` workspace publish the same semantic version.
- [DECISION] GitHub releases attach both npm tarballs and a `SHA256SUMS` file.
- [DECISION] Tag-triggered GitHub Actions publish both npm packages with provenance.

## Decisions

- [DECISION] Backward-compatible routing, validation, and workflow capability additions use a minor release.
- [DECISION] A release is complete only after GitHub, npm, package integrity, and isolated installed behavior agree.

## Rules

- [DECISION] `README.md`, `CHANGELOG.md`, `RELEASE.md`, package metadata, lockfile metadata, project Pillars, and generated release evidence must identify the same version.
- [DECISION] Never publish from an unmerged task branch or a commit that has not passed `npm run release:check`.

## Workflows

1. [DECISION] Prepare version metadata and release notes on a release branch.
2. [DECISION] Pass local and pull-request release gates.
3. [DECISION] Merge, tag the merge commit, create checksummed assets, and let the provenance workflow publish npm packages.
4. [DECISION] Verify registry integrity and isolated installation before cleanup.

## Watchouts

- [HYPOTHESIS] Ambient globally installed binaries can contaminate published-package verification unless the exact tarball is installed into an isolated prefix.

## Touchpoints

- [DECISION] Release work touches `package.json`, `packages/mcp/package.json`, `package-lock.json`, `.github/workflows/`, `scripts/release.sh`, and public release documentation.

## Gaps

(none)
