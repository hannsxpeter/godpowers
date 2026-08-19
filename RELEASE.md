# Godpowers 6.3.0 Release

> Status: Published and verified
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
- [DECISION] The repaired release has zero unresolved Critical, High, Medium, or Low findings; the fresh hardening artifact hash, executed evidence, and full release suite all passed before publication.

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
- [DECISION] Pull request 97, pull-request CI run 32271677551, and merged-main CI run 32272127234 passed against release commit `c45d0473ad946fcd7c02a5706b02f51a40ed0d25`.
- [DECISION] Annotated tags `v6.3.0` and `operations-pack-v0.1.0` both resolve to the exact merged release commit.
- [DECISION] Provenance workflow 32272150358 published and promoted the exact `godpowers@6.3.0` and `@godpowers/mcp@6.3.0` pair after release, prepublication, integrity, and shasum checks passed.
- [DECISION] Provenance workflow 32272475321 published `@godpowers/operations-pack@0.1.0` after merged-tag identity, pack-readiness, and fresh prepublication checks passed.
- [DECISION] GitHub Release `v6.3.0` was published at `2026-08-19T15:50:34Z` from the annotated release tag.

## Upgrade

- [DECISION] Root CLI and MCP users need no state migration, artifact migration, command rename, or production dependency change for 6.3.0.
- [DECISION] Install the release with `npm install -g godpowers@6.3.0` or run it with `npx godpowers@6.3.0`.
- [DECISION] Root CLI users continue to need Node.js 18 or newer, and MCP users continue to need Node.js 20 or newer.
- [DECISION] Existing extension packs remain compatible with the Godpowers 6.x peer range; the optional operations pack requires explicit installation.

## Publication Evidence

- [DECISION] Pull request: `https://github.com/hannsxpeter/godpowers/pull/97`.
- [DECISION] Release commit: `c45d0473ad946fcd7c02a5706b02f51a40ed0d25`, merged at `2026-08-19T15:47:11Z`.
- [DECISION] Pull-request CI: `https://github.com/hannsxpeter/godpowers/actions/runs/32271677551`.
- [DECISION] Merged-main CI: `https://github.com/hannsxpeter/godpowers/actions/runs/32272127234`.
- [DECISION] Root and MCP provenance workflow: `https://github.com/hannsxpeter/godpowers/actions/runs/32272150358`.
- [DECISION] Operations-pack provenance workflow: `https://github.com/hannsxpeter/godpowers/actions/runs/32272475321`.
- [DECISION] GitHub Release: `https://github.com/hannsxpeter/godpowers/releases/tag/v6.3.0`.
- [DECISION] npm `godpowers@6.3.0` is `latest` with integrity `sha512-pI+MKHwI17yFBc8KhS2AOa1Ny80eGnFZs3yec3071JrI8j7giP+EyP/a9Q5cyYSUwix5DjNgP/pZUukxz7SZYA==` and shasum `c6c04c6093a0cca595eb476c71f4814b8897ccd3`.
- [DECISION] npm `@godpowers/mcp@6.3.0` is `latest` with integrity `sha512-o6jz/g032LsvO5n2jH+aIW9dOejd+PwGCxe0dizY7g4qUtoUVhqkgjUo3NltNIlrjVeSVMsvyuWMoYshmS5nLg==` and shasum `cad46e61bb53b2684f95c3c07ca6a842b99fd110`.
- [DECISION] npm `@godpowers/operations-pack@0.1.0` is `latest` with integrity `sha512-2nUBwKwrBNGzEn1bCd8+BYIMix2xLHfP/zqImVHzVVj0in0JVdR+16zkyQbTA3W1sQfCLf8gIyGaNp0GpJTSfg==` and shasum `c6dcd340dfad1025366b5cbbce072acac39c53fe`.
- [DECISION] `node scripts/verify-published-install.js godpowers@6.3.0` passed Quick Proof, project inspection, status, next route, Claude installation, and Codex installation from an isolated exact-version install.
- [DECISION] The exact MCP package passed its published `--help` command, and a combined isolated install verified the root CLI, MCP executable, and operations-pack manifest.
- [DECISION] The combined exact-version install reported zero vulnerabilities; all 6 installed packages have verified registry signatures and attestations.
- [DECISION] The release tags were created from a clean `main` worktree, and every publication target resolves to the merged release commit or its exact registry artifact.
