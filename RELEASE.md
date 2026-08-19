# Godpowers 6.3.0 Release

> Status: Release candidate
> Date: 2026-08-19

- [DECISION] Godpowers 6.3.0 adds explicit evidence and authority contracts to runtime verification, debugging, program design, archaeology, durable decision history, and command routing.
- [DECISION] The release retains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes.
- [DECISION] The core package contains 117 runtime library modules and keeps zero root production, optional, or peer dependencies.
- [DECISION] The repository contains 117 focused test scripts and 54 core reference documents.
- [DECISION] The root package-content check reports 659 files, including the new dependency-free validators and the optional operations pack publication surface.
- [DECISION] The root `godpowers` package supports Node.js 18 or newer, while the read-only `@godpowers/mcp` companion requires Node.js 20 or newer; both manifests declare version 6.3.0.

## Engineering Evidence Contracts

- [DECISION] `/god-test-runtime` now selects one material verification profile for CLI, SDK, API, UI, service, or library products and rejects incomplete or generic completion evidence.
- [DECISION] Existing `test-only`, `audit-only`, and `a11y-only` runtime modes remain available and keep their previous identifiers.
- [DECISION] `/god-debug` requires an executed deterministic reproduction before hypothesis formation, requires a changed prediction after each failed hypothesis, and stops repeated tests that produce no new information.
- [DECISION] Medium and large program designs now name callers and dependents, design pressures, at least two distinct alternative shapes, one selected shape, and a rule that returns the work to planning after the same design deviation occurs twice.
- [DECISION] `/god-archaeology --why <target>` validates bounded cited evidence from independent source categories, calibrates confidence, rejects contradictions and unknowns, and leaves default archaeology unchanged when `--why` is absent.

## Durable Decisions And Invocation Authority

- [DECISION] `decision.recorded` extends the existing event vocabulary with a bounded allowlisted record for the decision, reason, cited evidence, result, and constrained metadata.
- [DECISION] The writer, generic emitter, and reader share one validator, reject secret-bearing fields and provider tokens, and reject HTTPS authority credentials, every query string, and unsafe fragments without echoing rejected values.
- [DECISION] `/god-trace --decisions` verifies and parses one immutable snapshot per selected run, returns `{ items, integrityFailures }`, retains the newest bounded decision and run windows, and does not claim authentication, full recomputation detection, or tail-truncation detection from the local hash chain.
- [DECISION] Every one of the 124 canonical route files declares one policy from `explicit-only`, `suggestible`, `auto-local`, `auto-bounded`, or `approval-required`.
- [DECISION] Router loading and route-quality checks derive command identity from canonical filenames and reject route metadata spoofing, duplicate commands, and noncanonical route YAML.
- [DECISION] External, destructive, dependency, recovery, and release actions remain approval-required.

## Optional Operations Pack

- [DECISION] `@godpowers/operations-pack` version 0.1.0 adds issue-triage and human-only setup skills without adding a core command or root runtime dependency.
- [DECISION] Issue triage verifies the complete item, recommends exactly one category and one state, and waits for explicit maintainer approval before any tracker mutation or separately approved story creation.
- [DECISION] The setup wizard inspects the repository first, verifies exact URLs and repository authority, statically checks generated Bash, keeps secrets off command arguments, rejects tracked environment destinations, and requires exact `YES` for irreversible steps.
- [DECISION] The shell helpers validate keys and values, quote environment values, preserve existing files, publish through temporary replacement, clean up on failure, and propagate filtering, write, permission, and rename errors.

## Independent Authorship And License Boundary

- [DECISION] Product-form verification, bounded why evidence, and architecture-pressure ideas were informed by the MIT-licensed pstack skills linked from `INSPIRATION.md`.
- [DECISION] Feedback-loop debugging, deeper program design, alternative shapes, issue triage, and setup guidance were informed by the MIT-licensed Matt Pocock engineering skills linked from `INSPIRATION.md`.
- [DECISION] Godpowers independently authored every validator, contract, template, fixture, test, and result; no upstream prose, code, template, fixture, or result is copied or vendored, and neither source is a runtime dependency.

## Release Hardening

- [DECISION] The OWASP Web Top 10:2025 walkthrough found one Critical workflow-input boundary, two High filesystem and remote-target boundaries, and three Medium fail-closed, recovery-integrity, and resource-bound groups; every finding was repaired before publication.
- [DECISION] Manual extension-pack inputs now cross into Bash only through environment variables, then pass an explicit pack allowlist and strict SemVer validation before identity checks or npm credentials are available.
- [DECISION] Event history stays under the selected project root, rejects linked run paths, and caps snapshots at 8 MiB and 50,000 lines.
- [DECISION] SkillUI validates remote targets but never passes a URL or remote repository location to the external CLI; remote forms fail closed and require an already reviewed local directory because subprocess redirects and DNS answers cannot be pinned.
- [DECISION] Unknown route prerequisite predicates fail closed, and the four named non-prefixed predicates used by core routes now have explicit behavior.
- [DECISION] Verification profiles, debug feedback records, recursive scans, and event snapshots enforce bounded collection, depth, node, byte, and line limits.
- [DECISION] Root and MCP recovery publication compares registry `dist.integrity` and `dist.shasum` to the exact packed candidates before either package can be promoted to `latest`.
- [DECISION] The repaired release has zero unresolved Critical, High, Medium, or Low findings; publication remains gated on a fresh hardening artifact hash, executed evidence, and the full release suite.

## Observed Validation

- [DECISION] Product-form verification passed 10 of 10 focused tests.
- [DECISION] Debug feedback-loop validation passed 18 of 18 focused tests.
- [DECISION] Program-design validation passed 14 of 14 focused tests, with the integrated gate suite also passing 28 of 28.
- [DECISION] Why-evidence validation passed 11 of 11 focused tests.
- [DECISION] Event writing and decision projection passed 25 of 25 tests each.
- [DECISION] Invocation-policy, router, and automation-surface suites passed 7 of 7, 47 of 47, and 17 of 17 tests.
- [DECISION] SkillUI remote-target validation passed 27 of 27 focused tests, including HTTP, internal, metadata, mixed-address, public-URL, and public-repository rejection before dispatch.
- [DECISION] Operations-pack tests passed 7 of 7, extension publication readiness passed 81 of 81, static checks passed 35 of 35, and package contents passed at 659 files.
- [DECISION] Every implementation slice passed an independent Stage 1 specification review and Stage 2 quality review after adversarial repairs.
- [DECISION] `npm run release:check` passed 121 commands and 3,290 tests with 94.70 percent line coverage, 80.75 percent branch coverage, and 97.32 percent function coverage.
- [DECISION] The release gate also passed official skill validation, Pillars conformance, per-file coverage, zero-vulnerability production audit, live advisory checks, the 140-check self-project truth gate, evidence drift, the 659-file root package check, and the 8-file MCP package check.
- [DECISION] The final harden gate passed with one executed-backed release command, all ten OWASP rows cited to ledger evidence, and no warning or error finding.
- [DECISION] The fresh pre-publication gate passed against hardening revision `sha256:69bd088dc44e405b144536bd51701088bb0da7d5e2200685e9b3e13be7403f5f` with zero unresolved or accepted Critical findings.
- [HYPOTHESIS] Pull-request and merged-main CI identities, annotated tags, registry integrity, GitHub Release, and isolated install evidence will be recorded after publication gates complete.

## Upgrade

- [DECISION] Root CLI and MCP users need no state migration, artifact migration, command rename, or production dependency change for 6.3.0.
- [DECISION] Install the release with `npm install -g godpowers@6.3.0` or run it with `npx godpowers@6.3.0` after registry publication completes.
- [DECISION] Root CLI users continue to need Node.js 18 or newer, and MCP users continue to need Node.js 20 or newer.
- [DECISION] Existing extension packs remain compatible with the Godpowers 6.x peer range; the optional operations pack requires explicit installation.

## Publication Evidence

- [OPEN QUESTION] Record the pull request, merged-main commit, CI runs, annotated tags, provenance workflows, registry integrity values, GitHub Release, isolated install results, and final clean-main status after publication; owner: Godpowers maintainer.
