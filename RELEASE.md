# Godpowers 6.2.0 Release

> Status: Release candidate
> Date: 2026-08-19

- [DECISION] Godpowers 6.2.0 adds a blast-radius safety case to the existing
  Stage 2 review so a PASS depends on one explicit, evidence-graded safety fact
  rather than direct-caller inspection, static search, or reviewer agreement.
- [DECISION] The release candidate retains 124 slash commands and 41 specialist agents.
- [DECISION] It also retains 13 workflows and 45 recipes.
- [DECISION] The core package contains 113 runtime library modules and keeps
  zero root production, optional, or peer dependencies.
- [DECISION] The repository contains 112 focused test scripts and 54 reference
  documents.
- [DECISION] The current root package-content check reports 647 files and
  requires `references/building/BLAST-RADIUS.md` in the npm payload.
- [DECISION] The root `godpowers` package supports Node.js 18 or newer, while
  the read-only `@godpowers/mcp` companion requires Node.js 20 or newer; both
  manifests declare version 6.2.0.

## Shared Blast-Radius Protocol

- [DECISION] `references/building/BLAST-RADIUS.md` is the shared protocol used
  by the existing `/god-review`, `/god-build`, `god-executor`,
  `god-quality-reviewer`, and orchestrator contracts.
- [DECISION] Every Stage 2 safety-case pass states exactly one load-bearing
  safety fact with a falsifiable condition, affected boundary, consequence if
  false, strongest evidence level, and evidence citation.
- [DECISION] The review output keeps Confirmed Risks, Cleared Risks, and
  Unproven Claims separate so demonstrated failure, demonstrated safety, and
  unresolved assumptions cannot collapse into one confidence statement.
- [DECISION] `god-executor` may propose the candidate fact and smallest focused
  proof, but it cannot grade its own work; `god-quality-reviewer` independently
  verifies or replaces the candidate and owns the Stage 2 verdict.

## Evidence Ladder And Verdict Policy

1. [DECISION] Level 1 is a reviewer assertion without a source citation and is
   `UNPROVEN`.
2. [DECISION] Level 2 is a specific source, dependency, schema, manifest, or
   `file:line` citation and is `UNPROVEN`.
3. [DECISION] Level 3 is a traced branch or consumer path that refutes one
   named failure path and remains `UNPROVEN`.
4. [DECISION] Level 4 is a successful focused probe executed through the
   existing `npx godpowers verify` operation and proves only the exercised path
   and inputs.
5. [DECISION] Level 5 is a successful runtime, installed-package, process,
   browser, service, host, or faithful-consumer reproduction executed through
   `npx godpowers verify` and proves only the exercised delivery boundary.

- [DECISION] Evidence levels are ordinal; several assertions, citations,
  traces, or agreeing reviewers cannot combine into level 4 or level 5.
- [DECISION] Confirmed Risks require level 4 or level 5 evidence that a failure
  exists, and Cleared Risks require level 4 or level 5 evidence that the named
  failure path is safe.
- [DECISION] Every conclusion supported only by levels 1 through 3 remains
  under Unproven Claims.
- [DECISION] A high-impact `UNPROVEN` claim fails Stage 2 when failure could
  affect authentication or authorization, disclose secrets, corrupt or lose
  state, execute a destructive action, break the installer or published
  package, violate a public or serialized contract, or invalidate
  verification-ledger integrity.
- [DECISION] A lower-impact `UNPROVEN` claim remains a warning and names one
  exact command, fixture, dependency trace, or runtime reproduction needed to
  clear or confirm it.
- [DECISION] Level 5 is required only when real lifecycle, installation,
  packaging, process, browser, service, host, or faithful-consumer behavior can
  change the answer and an evidenced runnable target exists.
- [DECISION] A deterministic local conclusion records level 5 as not applicable
  with an observed reason; a runtime-dependent claim with no runnable target
  stays unproven with an owner, impact, and exact evidence needed.

## Ten Required Boundaries

- [DECISION] Every safety case records evidence or an observed not-applicable
  reason for dependency implementation, pinned dependency version, local
  dependency patches, lifecycle or ordering timing, serialized or public API
  contracts, database or disk-state fields, configuration or feature flags,
  generated or installed surfaces, npm package surfaces, and cross-language
  consumers.
- [DECISION] Six temporary-repository fixtures prove why direct callers are not
  enough: each direct-caller probe appears safe while the required boundary
  probe exposes pinned-dependency behavior, lifecycle ordering, a serialized
  consumer, installed-copy drift, a missing package file, or a cross-language
  invocation.

## Bounded And Wide Review

- [DECISION] A change is wide when it crosses at least 3 of the 10 boundary
  classes or at least 2 high-impact classes; all other changes are bounded.
- [DECISION] A bounded change records its threshold calculation and uses 1
  normal Stage 2 safety-case pass.
- [DECISION] A wide change always receives at least 2 independent blast-radius
  safety cases in fresh contexts, including when the first pass provisionally
  fails.
- [DECISION] The second reviewer receives the diff, requirements, protocol, and
  verification evidence without the first reviewer's conclusions.
- [DECISION] Reconciliation compares the safety fact, boundary inventory,
  evidence grade, and risk classification; disagreement lowers confidence or
  requests proof, and agreement never raises evidence.

## Static Candidates And Executed Evidence

- [DECISION] `lib/impact.js` remains a candidate generator and adds
  backward-compatible evidence metadata with `kind: static-candidate`,
  `status: unproven`, and `maximumLevel: 2`.
- [DECISION] Results from `lib/impact.js`, grep, AST search, LSP references, or
  import graphs remain boundary candidates until source tracing, an executed
  focused probe, or an applicable runtime reproduction tests the named safety
  condition.
- [DECISION] The existing `.godpowers/ledger/verifications.jsonl`, state
  rollup, and hash-chained gate events remain the only executed-proof path.
- [DECISION] Executed verification records keep their existing shape; gate
  events add only `verificationRecordId` and `verificationRecordDigest` for the
  new binding check.
- [DECISION] `lib/evidence.resolveReviewEvidence` is read-only and resolves one
  exact record ID against executed kind, exit 0, `verified: true`, expected
  claim, exact command, canonical substep, review-window start, and latest
  behavior-change timestamp.
- [DECISION] Acceptance also requires exactly one matching gate event, the
  expected pass or fail event name, a matching SHA-256 record digest, and a
  valid event hash chain.
- [DECISION] Failed, timed-out, attested-only, mismatched, pre-change, stale,
  duplicate, missing-event, unbound, digest-mismatched, or invalid-chain
  evidence cannot clear a risk.
- [DECISION] The resolver returns a sanitized projection with bounded record
  identity, result, comparison, freshness, event-binding, and chain-integrity
  fields; it omits raw ledger records, event attributes, claims, commands,
  stdout tails, and stderr tails from reviewer context.
- [DECISION] The resolver checks consistency inside a trusted workspace and
  does not authenticate evidence against an actor able to rewrite every
  trusted file and recompute the event chain.

## Security And Process Bounds

- [DECISION] Blast-radius adversarial fixtures launch fixed Node.js or shell
  executables with argument arrays, a 10-second timeout, and a 1 MiB output cap.
- [DECISION] A timeout or output overflow makes the fixture probe fail closed
  instead of accepting a truncated or indeterminate result.
- [DECISION] The shipped feature adds no subprocess path beyond the existing
  verification operation, no slash command, CLI operation, route, recipe,
  workflow, specialist type, production dependency, evidence store, state
  writer, hosted service, or execution authority.
- [DECISION] The npm package ships the protocol through its existing
  `references/` entry, and installation copies that tree into both
  `godpowers-references/` and the installed runtime bundle through existing
  installer behavior.

## Independent Authorship And License Boundary

- [DECISION] The load-bearing safety condition, beyond-direct-caller search,
  evidence-grading, and separated-risk concepts were influenced by pstack's
  [`blast-radius` skill](https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md),
  which is distributed under its
  [MIT license](https://github.com/cursor/plugins/blob/main/pstack/LICENSE).
- [DECISION] Godpowers authored its protocol, prose, implementation, fixtures,
  probes, and results independently; no upstream prose, code, fixture, result,
  or pstack runtime is copied, vendored, or included as an npm dependency.
- [DECISION] Any future distribution of an upstream copy or substantial
  portion must retain the upstream copyright and MIT permission notice.

## Observed Validation

- [DECISION] `node scripts/test-evidence.js` passed 33 of 33 tests.
- [DECISION] `node scripts/test-blast-radius.js` passed 18 of 18 tests.
- [DECISION] `node scripts/test-impact.js` passed 22 of 22 tests.
- [DECISION] `node scripts/test-feature-awareness.js` passed 7 of 7 tests.
- [DECISION] `node scripts/static-check.js` passed 35 of 35 checks with zero
  prose warnings across 234 scanned files.
- [DECISION] `node scripts/check-package-contents.js` passed and reported 647
  root package files.
- [DECISION] The observed full suite passed 116 commands and 3,173 tests.
- [DECISION] Independent Stage 1 specification review returned PASS.
- [DECISION] Two independent fresh-context Stage 2 safety-case reviews returned
  PASS, and their reconciliation returned PASS without treating agreement as
  evidence.
- [DECISION] The final scoped hardening review returned PASS with zero
  remaining Critical, High, Medium, or Low findings and zero high-impact
  unproven claims.
- [DECISION] These results establish the current source-review baseline only;
  release checking, prepublication evidence, merge identity, publication, and
  installed-package verification remain pending.

## Upgrade

- [DECISION] Root CLI users need no state migration, artifact migration,
  command rename, or production dependency change for 6.2.0.
- [DECISION] After publication, install the root CLI with
  `npm install -g godpowers@6.2.0` or run it with
  `npx godpowers@6.2.0`.
- [DECISION] Root CLI users continue to need Node.js 18 or newer; MCP users
  continue to need Node.js 20 or newer before upgrading
  `@godpowers/mcp` to 6.2.0.
- [DECISION] Verification records created before 6.2.0 do not have
  digest-bound gate events and cannot support new level 4 or level 5 review
  conclusions.
- [DECISION] Generate fresh proof after the latest relevant behavior change
  with the command below, then resolve that new record locally before citing it
  in Stage 2.

  ```bash
  npx godpowers verify "<focused probe>" --substep=<canonical-id> --claim="<load-bearing safety fact>" --project=.
  ```

## Pending Publication Checklist And Evidence

- [DECISION] `npm run release:check` passed for this release candidate with all
  116 commands, 3,173 tests, coverage gates, audits, self-truth checks,
  evidence-drift checks, and package checks green.
- [DECISION] `npm run release:prepublication:check` passed against the fresh
  2026-08-19T10:07:48.020Z gate record and hardening revision
  `sha256:5f65a4de4bb0ab7dcce5e7fb11c182a77345f23b2e6f75077c549ccef4ce9268`.
- [OPEN QUESTION] Pull-request CI evidence for Node.js 18, 20, and 22 plus the
  package gate has not yet been recorded. Owner: maintainer. Due: before merge.
- [OPEN QUESTION] The approved pull request and exact merged `main` commit have
  not yet been recorded. Owner: maintainer. Due: before tagging.
- [OPEN QUESTION] Annotated tag `v6.2.0` and its exact merged commit have not yet
  been recorded. Owner: maintainer. Due: before publication.
- [OPEN QUESTION] Provenance workflow, staged npm publication, exact root and
  MCP registry versions, integrity values, and promotion to `latest` have not
  yet been recorded. Owner: maintainer. Due: before publication closeout.
- [OPEN QUESTION] GitHub Release `v6.2.0` has not yet been created or verified.
  Owner: maintainer. Due: before publication closeout.
- [OPEN QUESTION] Fresh isolated installation, root CLI behavior, MCP
  executable behavior, dependency audit, registry signatures, and attestations
  have not yet been recorded. Owner: maintainer. Due: before publication
  closeout.
