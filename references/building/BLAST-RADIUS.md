<!-- Implements: P-MUST-36, P-MUST-37, P-MUST-38, P-MUST-39, P-MUST-40, P-MUST-41, P-MUST-42, P-MUST-43 -->

# Blast Radius Safety Case

Use this protocol inside the existing Stage 2 quality review. It does not add a
command, reviewer type, evidence store, or execution authority.

## Required Inputs

- The reviewed diff and its request or slice contract
- The relevant PRD requirements, architecture decisions, and loaded Pillars
- Static candidates from `lib/impact.js`, grep, AST search, LSP references, or an import graph
- Existing dependency source, lockfiles, patches, schemas, generated targets, package manifests, and consumers that the diff can affect
- Sanitized projections from `lib/evidence.resolveReviewEvidence` for every claimed level 4 or level 5 record ID

Static analysis performs candidate discovery. It does not prove behavioral
safety. A result from `lib/impact.js`, grep, AST, LSP, or an import graph remains
an unproven boundary candidate until source tracing, an executed focused probe,
or an applicable runtime reproduction tests the named safety condition.

## Load-Bearing Safety Fact

Every pass names exactly one load-bearing safety fact: the concrete condition
that must remain true for this change to be safe. State it before summarizing
other findings, using all of these fields:

| Field | Required value |
|---|---|
| Condition | One falsifiable condition, not a general confidence statement |
| Boundary | The specific component, consumer, state field, package, or delivery boundary that depends on it |
| Consequence if false | The observable failure and its impact class |
| Evidence level | The single strongest level supported by the cited evidence |
| Evidence citation | A source location for levels 2 or 3, or an accepted sanitized resolver projection and record identity for levels 4 or 5 |

Do not split the main conclusion across several safety facts. Supporting facts
belong in the boundary inventory or risk sections. Several lower-level items
cannot be combined to claim level 4 or level 5.

## Evidence Ladder

| Level | Evidence | Review meaning |
|---|---|---|
| 1 | Reviewer assertion without a source citation | `UNPROVEN`; it cannot clear a risk |
| 2 | A specific source, dependency, schema, manifest, or `file:line` citation | `UNPROVEN`; it narrows the candidate surface |
| 3 | A traced branch or consumer path that refutes one named failure path | `UNPROVEN`; load-bearing assumptions still need execution |
| 4 | A successful focused probe executed through `npx godpowers verify` | Proven only for the exact path and inputs exercised by the probe |
| 5 | A successful runtime, installed-package, process, browser, service, host, or faithful consumer reproduction executed through `npx godpowers verify` | Proven only for the exercised delivery boundary |

Levels 1 through 3 are `UNPROVEN`. Evidence levels are ordinal descriptions,
not points, so multiple assertions, citations, traces, or agreeing reviewers
cannot be combined into a higher level.

## Boundary Inventory

Record all 10 rows before grading the safety fact. Each row needs a repository
path, lockfile entry, installed dependency source, patch, generated target,
package manifest, schema, consumer, or exact bounded search. A row may use an
evidence-backed `N/A` only when it cites an observed repository fact that makes
the boundary inapplicable.

| Boundary class | What to inspect |
|---|---|
| dependency implementation | The dependency code that actually implements the relied-on behavior |
| pinned dependency version | The lockfile or manifest version whose implementation was inspected |
| local dependency patches | Patch directories, overrides, resolutions, vendored changes, and package-manager patch metadata |
| lifecycle or ordering timing | Initialization, teardown, retry, cancellation, hooks, event ordering, and asynchronous transitions |
| serialized or public API contracts | Exported signatures, request and response shapes, stored JSON, protocol fields, and downstream field readers |
| database or disk-state fields | Schemas, migrations, persisted files, authoritative state, caches, and append-only ledgers |
| configuration or feature flags | Defaults, environment variables, config precedence, flags, and disabled paths |
| generated or installed surfaces | Templates, generated views, installer copies, host registries, and source-to-installed sync |
| npm package surfaces | Package manifests, `files`, tarball contents, entry points, bin targets, and clean-consumer installation |
| cross-language consumers | Shell, Python, Ruby, PHP, YAML, JSON, subprocess, MCP, or other non-local-language callers |

Adversarial fixtures must include a risk visible only in pinned dependency
code, a lifecycle-ordering regression, a serialized field consumer, installed
copy drift, a missing package file, and a cross-language invocation. Direct
callers alone cannot clear those cases.

## Adversarial Fixtures

These fixtures bind each beyond-direct-caller failure to the boundary that must
expose it. A reviewer must demonstrate the stated visibility rather than merely
repeat the fixture name.

| Fixture | Expected boundary | Failure visibility |
|---|---|---|
| pinned-dependency-only-risk | dependency implementation | pinned implementation differs from the source-level assumption |
| lifecycle-ordering | lifecycle or ordering timing | failure appears only after the lifecycle transition order |
| serialized-consumer | serialized or public API contracts | a downstream reader depends on the serialized field |
| installed-copy-drift | generated or installed surfaces | the installed copy differs from repository source |
| missing-package-file | npm package surfaces | the tarball omits a required runtime file |
| cross-language-invocation | cross-language consumers | a non-JavaScript caller observes the invocation contract |

## Impact Policy

Treat an `UNPROVEN` claim as high impact when failure could affect any of these
classes:

- authentication or authorization
- secrets disclosure
- state corruption or loss
- destructive action
- installer or published package failure
- public or serialized contract violation
- verification-ledger integrity

High-impact `UNPROVEN` claims make the Stage 2 FAIL. Lower-impact `UNPROVEN`
claims remain warnings and name one exact next proof: a command, fixture,
dependency trace, or runtime reproduction that can clear or confirm the claim.

## Proof Procedure

1. Write the safety fact as an exact `--claim` value and choose the smallest focused probe that can falsify it.
2. Run `npx godpowers verify "<focused probe>" --substep=<canonical-id> --claim="<safety fact>" --project=.`.
3. Select exactly one returned record ID and call `lib/evidence.resolveReviewEvidence` locally with the expected claim, exact command, canonical substep, review-window start, and latest behavior-change timestamp.
4. Require the sanitized projection to accept the record, its SHA-256 digest-bound gate event, and the event file hash chain.
5. Confirm that the executed probe exercises the code, inputs, and boundary named in the conclusion.
6. Give Stage 2 only the sanitized projection. Do not pass raw ledger records, event attributes, commands, claims, output tails, or secret-bearing arguments.
7. Cite the accepted record identity and bounded result.

A failed, timed-out, attested-only, mismatched, stale, or pre-change record
cannot clear a risk. When no suitable record exists, keep the claim `UNPROVEN`
and give the exact fresh `npx godpowers verify` invocation needed next.

## Citation Acceptance

Apply these decisions to the cited record and the reviewed-change window. The
review window starts when review of the current diff begins. The latest behavior
change is the most recent edit that can affect the safety fact.

| Record condition | Decision | Review action |
|---|---|---|
| No cited record | absent | Keep the conclusion `UNPROVEN` |
| Executed record has `verified: false` or nonzero exit | failed | Record the failed probe and do not clear the risk |
| Executed record has exit `-1` after timeout | timed-out | Record the timeout and request a bounded fresh probe |
| Record kind is not `executed` | attested-only | Keep the conclusion `UNPROVEN` |
| Claim differs from the safety fact | mismatched-claim | Request the same safety fact as the exact `--claim` value |
| Command differs from the cited verification method | mismatched-command | Request the exact focused command through `godpowers verify` |
| Substep differs from the canonical reviewed substep | mismatched-substep | Request a record for the canonical substep |
| Timestamp is before the review window started | pre-change | Request a current record for this review |
| Timestamp is inside the review window but before the latest behavior change | stale | Re-run the proof after the latest relevant edit |
| Executed record matches claim, command, canonical substep, exit 0, `verified: true`, and follows the latest behavior change | accepted | Cite the record identity and bounded result |

## Trusted Workspace Limit

The local resolver detects accidental or inconsistent mutation across the
ledger record, its digest-bound gate event, and the event hash chain inside a
trusted workspace. It does not authenticate evidence against an actor able to
rewrite all trusted files and recompute the chain. Use repository access
control, signed commits, CI provenance, and publication provenance for that
stronger threat model.

## Runtime Applicability

| Runtime-dependent | Evidenced runnable target | Outcome |
|---|---|---|
| no | no | level 5 `N/A` with observed reason |
| no | yes | level 5 `N/A` with observed reason |
| yes | yes | level 5 reproduction required |
| yes | no | Unproven Claim with owner, impact, and exact evidence needed |

Runtime reproduction is required only when lifecycle, installation, packaging,
process, browser, service, host, or faithful-consumer behavior can change the
answer and an evidenced runnable target exists. A level 4 probe does not clear
that runtime-specific path.

Record level 5 `N/A` when deterministic local transformation or static contract
evidence completely decides the fact and explain why runtime state cannot alter
the conclusion. Do not invent a target. A missing runnable target belongs under
Unproven Claims with an owner, impact, and exact evidence needed.

## Bounded And Wide Review

| Classification | Required independent passes | First-pass FAIL behavior | Final verdict timing |
|---|---|---|---|
| bounded | 1 | Preserve provisional FAIL and use it in the bounded final verdict | After the first pass |
| wide | at least 2 | Preserve provisional FAIL and still run the second pass | After reconciliation of every required pass |

Count boundary classes and high-impact classes after completing the inventory.
A change is wide when it crosses at least 3 boundary classes or at least 2
high-impact classes. Record the matched classes before requesting another pass.

A bounded change uses the normal single Stage 2 pass. A wide change receives at
least 2 independent blast-radius safety cases in fresh contexts inside Stage 2.
The second pass receives the diff, requirements, protocol, and verification
records, but not the first pass's conclusions. Reconcile differences in the
safety fact, boundary inventory, evidence grade, and risk classification by
lowering confidence or requesting proof. Reviewer agreement cannot raise an
evidence level.

## Risk Entry Schema

The three proof states use the same minimum fields so entries remain comparable,
but their allowed evidence never overlaps.

| Section | Allowed evidence | Required fields |
|---|---|---|
| Confirmed Risks | levels 4 or 5 demonstrating the failure | likelihood, impact, location or boundary, evidence level, evidence citation, verification method |
| Cleared Risks | levels 4 or 5 clearing the named failure path | likelihood, impact, location or boundary, evidence level, evidence citation, verification method |
| Unproven Claims | levels 1 through 3 only | likelihood, impact, location or boundary, evidence level, evidence citation, verification method, owner, exact next proof |

## Confirmed Risks

List only failures demonstrated by level 4 or level 5 evidence. For every entry,
record likelihood, impact, location or boundary, evidence level, ledger citation,
and verification method.

## Cleared Risks

List only named failure paths cleared by level 4 or level 5 evidence. For every
entry, record likelihood before proof, impact, location or boundary, evidence
level, ledger citation, and verification method.

## Unproven Claims

List every conclusion supported only by levels 1 through 3. For every entry,
record likelihood, impact, location or boundary, evidence level, current
citation, owner, and the exact next proof. Mark high-impact entries as blocking.

## Before Merge

- Confirm Stage 1 passed independently.
- Confirm every boundary row has evidence or an evidence-backed `N/A`.
- Confirm the one load-bearing safety fact has the strongest defensible level.
- Confirm every level 4 or 5 citation has an accepted sanitized `resolveReviewEvidence` projection.
- Confirm runtime reproduction was executed when applicable or explicitly justified as level 5 `N/A`.
- Confirm the wide threshold calculation and required fresh-context pass count.
- Confirm no blocking Confirmed Risk or high-impact `UNPROVEN` claim remains.
- Confirm every lower-impact warning states the exact next proof.

## Verdict Matrix

| Condition | Outcome |
|---|---|
| Confirmed blocking risk | Stage 2 FAIL |
| High-impact `UNPROVEN` | Stage 2 FAIL |
| Lower-impact `UNPROVEN` | Stage 2 warning with exact next proof |
| Safety case FAIL | Stage 2 FAIL regardless of quality-dimension results |
| Safety case PASS and all nine quality dimensions PASS | Stage 2 PASS after the required pass count completes |

Stage 2 passes only when the existing nine quality dimensions pass, the safety
case obeys this protocol, no confirmed blocking risk remains, and no high-impact
`UNPROVEN` claim remains. Compact large reviews only after retaining the safety
fact, every high-impact claim, the 10-row inventory, and cited proof records.
