---
pillar: quality
status: active
always_load: false
covers: [tests, linting, validation, release gates, artifact checks]
triggers: [test, lint, validation, audit, release, package, check]
must_read_with: [repo]
see_also: [security, deploy]
---

## Scope

- [DECISION] This pillar captures quality gates for Godpowers changes.

## Commands

- [DECISION] `npm test` is the required full verification command.
- [DECISION] `npm run test:quick-proof` checks README, Quick Proof, release verification, runtime expectations, and adoption canary alignment.
- [DECISION] `npm run test:audit` runs dependency audit, `git diff --check`, and documentation surface count tests.
- [DECISION] `npm run pack:check` verifies the npm package contains required runtime files and excludes local-only files.
- [DECISION] `npm run release:check` combines the full test suite, audit checks, and package contents checks.
- [DECISION] The full test suite includes quick proof docs, repo-doc sync, repo-surface sync, automation surface sync, host capabilities, extension authoring, dogfood, Mode D, installer smoke, workflow runner, OTel, and extension publish-readiness checks.
- [DECISION] Build and review agents enforce request-trace discipline: assumptions, public behavior, expected files, and verification command must be explicit before implementation.
- [DECISION] Reviewers block speculative flexibility, unrelated cleanup, and diff churn that cannot be traced to the user request, slice plan, failing test, or implementation-caused cleanup.

## Standards

- [DECISION] Artifact linter checks must catch em or en dashes, emojis, unlabeled paragraphs, phantom references, future-dated body timestamps, and selected PRD or ARCH failures.
- [DECISION] CI tests Node `18`, Node `20`, and Node `22`.
- [DECISION] Full release work must keep `CHANGELOG.md`, `README.md`, `RELEASE.md`, package metadata, GitHub release notes, npm version, and local installed runtime aligned.

## Watchouts

- [HYPOTHESIS] The full test suite is intentionally broad and can surface unrelated drift from docs, packaging, workflows, routing, and installer behavior.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: proposed for review.
- Related artifact: `docs/ROADMAP.md`.
- Rule: keep this pillar aligned when these artifacts change durable quality truth.
<!-- godpowers:pillar-sync:end -->
