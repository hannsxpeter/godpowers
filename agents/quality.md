---
pillar: quality
status: present
always_load: false
covers: [tests, linting, validation, release gates, artifact checks]
triggers: [test, lint, validation, audit, release, package, check]
must_read_with: [repo]
see_also: [security, deploy]
---

## Scope

- [DECISION] This pillar captures quality gates for Godpowers changes.

## Context

### Commands

- [DECISION] `npm test` is the required full verification command.
- [DECISION] `npm run test:quick-proof` checks README, Quick Proof, release verification, runtime expectations, and adoption canary alignment.
- [DECISION] `npm run test:audit` runs dependency audit, `git diff --check`, and documentation surface count tests.
- [DECISION] `npm run pack:check` verifies the npm package contains required runtime files and excludes local-only files.
- [DECISION] `npm run release:check` combines official Agent Skills validation, Pillars 1.1 behavior and conformance fixtures, per-file library coverage, the full test suite, audit checks, self-project truth checks, and package contents checks.
- [DECISION] `npm run test:self-truth` blocks stale version, public surface, lifecycle, artifact, requirement, generated progress, and roadmap provenance claims.
- [DECISION] The full test suite includes quick proof docs, repo-doc sync, repo-surface sync, automation surface sync, host capabilities, extension authoring, dogfood, Mode D, installer smoke, workflow runner, OTel, and extension publish-readiness checks.
- [DECISION] Sibling-artifact tests cover godaudits 2.x JSON authority, large canonical files, non-regular source rejection, legacy and generated MDX fallback, check and evidence ledgers, compliance, accepted risks, score caps, compiled coverage, typed GA dispatch, managed todo synchronization, MDX safety, canonical staleness, migration seeds, and remediation impact detection.
- [DECISION] Sibling-artifact tests cover the Godplans 1.1 validator identity, two-artifact completeness, static structural preflight, lifecycle dispatch gates, full GP/R seed traceability, large-plan reads, and legacy hypothesis-grade fallback.
- [DECISION] Arc-Ready leverage tests cover six product forms, four-axis domain composition, Arc artifact import and sync-back, OWASP 2025, and hash-bound pre-publication invalidation.
- [DECISION] Build and review agents enforce request-trace discipline: assumptions, public behavior, expected files, and verification command must be explicit before implementation.
- [DECISION] Reviewers block speculative flexibility, unrelated cleanup, and diff churn that cannot be traced to the user request, slice plan, failing test, or implementation-caused cleanup.

## Decisions

(none)

## Rules

- [DECISION] Artifact linter checks must catch em or en dashes, emojis, unlabeled paragraphs, phantom references, future-dated body timestamps, and selected PRD or ARCH failures.
- [DECISION] CI tests Node `18`, Node `20`, and Node `22`.
- [DECISION] Full release work must keep `CHANGELOG.md`, `README.md`, `RELEASE.md`, package metadata, GitHub release notes, npm version, and local installed runtime aligned.

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] The full test suite is intentionally broad and can surface unrelated drift from docs, packaging, workflows, routing, and installer behavior.

## Touchpoints

- [DECISION] Quality evidence synchronizes from roadmap and release artifacts through the managed section below.

## Gaps

(none)

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `docs/ROADMAP.md`.
- Rule: keep this pillar aligned when these artifacts change durable quality truth.
<!-- godpowers:pillar-sync:end -->
