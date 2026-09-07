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
- [DECISION] `npm test -- --agent-output` keeps successful agent output within a bounded summary, stops at the first failed child, and names the private complete retained log.
- [DECISION] `npm run test:quick-proof` checks README, Quick Proof, release verification, runtime expectations, and adoption canary alignment.
- [DECISION] `npm run test:audit` runs dependency audit, `git diff --check`, and documentation surface count tests.
- [DECISION] `npm run pack:check` verifies the npm package contains required runtime files and excludes local-only files.
- [DECISION] `node scripts/test-prose-lint.js` runs the focused 31-test prose-quality suite, including rule shape, masking, control-byte sanitization, precision thresholds, performance, U-12 integration, specialist contracts, package guard, and fixed-scope self-dogfood.
- [DECISION] `node scripts/test-blast-radius.js` checks exactly one safety fact, evidence levels 1 through 5, all 10 boundary rows, six temporary-repository adversarial probes, impact-based verdicts, runtime applicability, conditional independent review, fixed public counts, package registration, and fail-closed timeout and output limits.
- [DECISION] `node scripts/test-impact.js` keeps both impact entry points backward compatible while marking static results as unproven candidates with maximum evidence level 2.
- [DECISION] `node scripts/test-evidence.js` checks exact record matching, freshness, SHA-256 digest-bound gate events, event-chain validity, altered or missing evidence rejection, and sanitized review projections.
- [DECISION] Focused 6.3.0 suites cover six verification forms, debug learning gates, deeper program design, bounded why evidence, durable decision records, newest-window projections, canonical invocation policies, route identity, and optional operations-pack safety.
- [DECISION] `npm run release:check` combines official Agent Skills validation, Pillars 1.1 behavior and conformance fixtures, per-file library coverage, the full test suite, audit checks, self-project truth checks, and package contents checks.
- [DECISION] `npm run test:self-truth` blocks stale version, public surface, lifecycle, artifact, requirement, generated progress, and roadmap provenance claims.
- [DECISION] The full test suite includes quick proof docs, repo-doc sync, repo-surface sync, automation surface sync, host capabilities, extension authoring, dogfood, Mode D, installer smoke, workflow runner, OTel, and extension publish-readiness checks.
- [DECISION] Sibling-artifact tests cover godaudits 2.x JSON authority, large canonical files, non-regular source rejection, legacy and generated MDX fallback, check and evidence ledgers, compliance, accepted risks, score caps, compiled coverage, typed GA dispatch, managed todo synchronization, MDX safety, canonical staleness, migration seeds, and remediation impact detection.
- [DECISION] Sibling-artifact tests cover the Godplans 1.1 validator identity, two-artifact completeness, static structural preflight, lifecycle dispatch gates, full GP/R seed traceability, large-plan reads, and legacy hypothesis-grade fallback.
- [DECISION] Arc-Ready leverage tests cover six product forms, four-axis domain composition, Arc artifact import and sync-back, OWASP 2025, and hash-bound pre-publication invalidation.
- [DECISION] Build and review agents enforce request-trace discipline: assumptions, public behavior, expected files, and verification command must be explicit before implementation.
- [DECISION] Reviewers block speculative flexibility, unrelated cleanup, and diff churn that cannot be traced to the user request, slice plan, failing test, or implementation-caused cleanup.
- [DECISION] Medium and large Build plans require mechanically valid program-design sections plus affirmative human or YOLO approval; small plans require explicit sizing and skip rationales.
- [DECISION] Independent quality review receives before-and-after maintainability measures with signed deltas and sample counts, but those values remain report-only for the first three release candidates.
- [DECISION] `lib/evolution-benchmark.js` runs the packaged six-checkpoint scenario without network access or model credentials and retains deterministic JSON plus Markdown evidence.
- [DECISION] The full static path scans eligible Markdown and MDX under `skills/`, `specialists/`, `agents/`, and `references/` with the dependency-free prose scanner and requires any reviewed baseline increase to be explicit.

## Decisions

(none)

## Rules

- [DECISION] `scripts/test-command-families.js` verifies direct, focused, and full selection, narrow mechanical eligibility, uncertainty escalation, and stable explicit command routing.
- [DECISION] Host model capability can influence an approach judgment but cannot waive Godpowers evidence, gate, approval, or publication requirements.

- [DECISION] Artifact linter checks must catch em or en dashes, emojis, unlabeled paragraphs, phantom references, future-dated body timestamps, and selected PRD or ARCH failures.
- [DECISION] U-12 prose findings remain advisory warnings, never automatic rewrites or proof of human authorship, and never weaken an existing blocking artifact error.
- [DECISION] CI tests Node `18`, Node `20`, and Node `22`.
- [DECISION] Full release work must keep `CHANGELOG.md`, `README.md`, `RELEASE.md`, package metadata, GitHub release notes, npm version, and local installed runtime aligned.
- [DECISION] Stage 2 blast-radius review keeps evidence levels 1 through 3 `UNPROVEN`, blocks high-impact uncertainty, and retains lower-impact uncertainty as a warning with one exact next proof.
- [DECISION] A change is wide at 3 crossed boundary classes or 2 high-impact classes and requires at least 2 independent fresh-context safety cases, including a second pass after a provisional first-pass failure; bounded changes require 1 pass.
- [DECISION] Reviewer agreement cannot raise evidence, and `lib/impact.js`, grep, AST, LSP, and import-graph results remain candidate discovery rather than behavioral proof.

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
- Related artifact: `.godpowers/roadmap/ROADMAP.mdx`.
- Rule: keep this pillar aligned when these artifacts change durable quality truth.

### Extracted durable signals

From `.godpowers/roadmap/ROADMAP.mdx`:
- [DECISION] Evidence generated at: `2026-09-07T04:21:51.787Z`.
- [DECISION] Source version: `6.4.0`.
- [DECISION] Latest published version: `6.3.0`; its recorded release evidence remains historical authority for completed increments 1 through 17.
- [DECISION] P-MUST-50 and M-adaptive-run-selection have passed source completion with final Stage 1 and two independent Stage 2 reviews; the canonical full release gate passed, while the fresh hash-bound prepublication gate passed and external publication remains pending.
- [DECISION] Source hash `.godpowers/prd/PRD.mdx`: `sha256:e70d1115760aff602b49419439fbf5d968d255b4a99eaad6fceabfdf2f32b296`.
- [DECISION] Source hash `.godpowers/arch/ARCH.mdx`: `sha256:614155b58068df3e6e9a22f5fd5828e0cc46e5cfa0229dc1ae922f5cfaa36d1f`.
- [DECISION] Source hash `.godpowers/stack/DECISION.mdx`: `sha256:e235b1b722f545a8907036c811ed52d68d90222978d2f2a37b4da1abb821473d`.
- [DECISION] Published 6.3.0 planning completion is backed by its PRD, design not-required, architecture, roadmap, and stack gates; the 6.4.0 PRD, architecture, roadmap, and stack gates passed after artifact and linkage sync.
<!-- godpowers:pillar-sync:end -->
