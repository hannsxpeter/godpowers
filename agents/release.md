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
- [DECISION] GitHub releases provide the human-readable notes and immutable tag record; npm registry artifacts and their integrity metadata are the authoritative package source.
- [DECISION] Tag-triggered GitHub Actions publish both npm packages with provenance.

## Decisions

- [DECISION] Backward-compatible routing, validation, and workflow capability additions use a minor release.
- [DECISION] Raising a published workspace package's minimum Node.js version or adopting an incompatible protocol major uses a major release for both version-locked packages.
- [DECISION] The release containing `@modelcontextprotocol/server` v2 and the `@godpowers/mcp` Node 20-plus engine is the Godpowers 6.0.0 major line.
- [DECISION] A release is complete only after GitHub, npm, package integrity, and isolated installed behavior agree.
- [DECISION] Godpowers 6.2.0 is published from merged `main` commit `010f02dbccb17fce42107ce39d681adaa4879251` through annotated tag `v6.2.0` and provenance workflow 32242093455.
- [DECISION] npm `godpowers@6.2.0` and `@godpowers/mcp@6.2.0` are promoted to `latest`, and their exact integrity values and shasums are recorded in `RELEASE.md`.
- [DECISION] GitHub Release `v6.2.0` was published at `2026-08-19T10:25:32Z` after PR and merged-main CI passed.
- [DECISION] Backward-compatible engineering evidence, route authority, and optional operations-pack additions make the next release Godpowers 6.3.0.
- [DECISION] Godpowers 6.3.0 remains a release candidate until merged-main CI, annotated tags, provenance workflows, registry verification, GitHub Release creation, and isolated installs all pass.

## Rules

- [DECISION] `README.md`, `CHANGELOG.md`, `RELEASE.md`, package metadata, lockfile metadata, project Pillars, and generated release evidence must identify the same version.
- [DECISION] Never publish from an unmerged task branch or a commit that has not passed `npm run release:check`.

## Workflows

1. [DECISION] Prepare version metadata and release notes on a release branch.
2. [DECISION] Pass local and pull-request release gates.
3. [DECISION] Merge, tag the merge commit, let the provenance workflow publish npm packages, and create the GitHub Release notes record.
4. [DECISION] Verify registry integrity and isolated installation before cleanup.

## Watchouts

- [HYPOTHESIS] Ambient globally installed binaries can contaminate published-package verification unless the exact tarball is installed into an isolated prefix.

## Touchpoints

- [DECISION] Release work touches `package.json`, `packages/mcp/package.json`, `package-lock.json`, `.github/workflows/`, `scripts/release.sh`, and public release documentation.

## Gaps

(none)
