# Adoption Canary

The adoption canary is the real-world proof loop for Godpowers. It exists to
answer one question before a public confidence claim: can Godpowers make sense
of a repository that did not grow inside Godpowers assumptions?

Start with the local proof case study first:
[First 10 Minute Proof Case Study](case-studies/first-10-minute-proof.md).
That page defines the baseline signals an external canary should improve on.

The first CLI-verifiable external canary set is captured in:
[sindresorhus/is](case-studies/sindresorhus-is-adoption-canary.md),
[expressjs/cors](case-studies/expressjs-cors-adoption-canary.md), and
[tinyhttp/tinyhttp](case-studies/tinyhttp-adoption-canary.md).

- [DECISION] The Phase 2 host proof campaign has selected current slots in [Run A](case-studies/run-a.md), [Run B](case-studies/run-b.md), and [Run C](case-studies/run-c.md).
- [DECISION] Run A has a completed local and CI-verifiable host proof with durable `.godpowers` artifacts on disk.
- [DECISION] Runs B and C remain selected but not started as host proofs.

## Purpose

- [DECISION] The canary validates first-user trust, not only release plumbing.
- [DECISION] The canary must exercise the same promise as Quick Proof: disk
  state, artifacts, gates, host guarantees, and a next action.
- [DECISION] The canary should produce product insight even when the technical
  run passes.
- [HYPOTHESIS] A messy external repository will reveal onboarding, vocabulary,
  runtime, and artifact-fit issues that internal fixtures cannot reveal.

## Candidate Selection

Use one of these repository classes:

| Candidate | Why it helps |
|---|---|
| Small SaaS or dashboard | Tests product planning, UI design, build slicing, deploy, and observe paths. |
| CLI or library | Tests non-UI planning, package surface, docs, and release discipline. |
| Partially planned repo | Tests reconstruction, migration, sync-back, and ambiguous source truth. |
| Existing production app | Tests hotfix, audit, harden, and risk reporting against real constraints. |

Avoid repositories that require private secrets, paid APIs, production data, or
manual enterprise approval before basic checks can run.

## Canary Runbook

Start with the CLI-verifiable canary harness:

```bash
node scripts/run-adoption-canary.js <git-url> --output=.godpowers-canary/report.md
```

This clones the external repository, renders `quick-proof`, renders `status`,
renders `next`, and writes a report. It does not replace host slash commands,
because those still require an AI coding host.

Run these in order, stopping only when a command reports a real blocker:

```text
/god-preflight
/god-audit
/god-reconstruct
/god-next
```

If the repo already has adjacent planning context, run:

```text
/god-migrate
/god-sync
/god-next
```

If the repo has an obvious small feature, run the smallest safe feature path:

```text
/god-feature
/god-build
/god-review
/god-sync
```

## Evidence To Capture

- [DECISION] Capture the host guarantee line from the first dashboard.
- [DECISION] Capture the first recommended next action and why it was chosen.
- [DECISION] Capture commands to first signal, first missing artifact, host gap
  count, and whether status plus next both rendered recommendations.
- [DECISION] Capture any term Godpowers added or should have added to
  `.godpowers/domain/GLOSSARY.md`.
- [DECISION] Capture whether `.godpowers/PROGRESS.md` and `CHECKPOINT.md`
  helped resume the run.
- [DECISION] Capture one confusing moment from the first 10 minutes, even if
  the run succeeded.
- [DECISION] Capture one product-facing improvement to README, Quick Proof, or
  the command starter paths.

## Pass Criteria

The canary passes when all of these are true:

- [DECISION] Godpowers produces or recovers disk state without relying on chat
  memory.
- [DECISION] Godpowers reports host guarantees plainly.
- [DECISION] The recommended next command is specific and justified by disk
  state.
- [DECISION] The CLI report includes outcome metrics for quick-proof, status,
  and next signals.
- [DECISION] At least one artifact, review finding, or sync finding is
  inspectable on disk.
- [DECISION] A maintainer can name one improvement to onboarding or runtime
  clarity from the run.

## Failure Criteria

The canary fails when any of these are true:

- [DECISION] Godpowers claims a phase is complete without an artifact on disk.
- [DECISION] Godpowers hides a degraded host capability.
- [DECISION] The next action is generic or unsupported by repo state.
- [DECISION] A command creates conflicting durable truth across README,
  `.godpowers/`, and `agents/*.md`.
- [DECISION] A first-time user cannot tell whether they should run `/god-next`,
  `/god-status`, or a phase command next.

## Feedback Targets

Route canary findings to the smallest matching surface:

| Finding | Update |
|---|---|
| User does not understand the promise | README intro or [quick-proof.md](quick-proof.md) |
| User does not know where to start | README starter paths or [getting-started.md](getting-started.md) |
| Runtime behavior surprises the user | Runtime expectations or [host-capabilities.md](host-capabilities.md) |
| Dashboard output is unclear | `lib/dashboard.js` and dashboard transcript examples |
| Artifact drift appears | `/god-sync`, repo sync docs, or Pillars sync rules |
| Release confidence gap appears | [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) |

## Open Decision

- [OPEN QUESTION] Should Slot B target the repository root or a copied template directory as the host proof project root? Owner: maintainer. Due: before starting Slot B.
