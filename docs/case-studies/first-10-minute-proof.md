# First 10 Minute Proof Case Study

- [DECISION] This case study documents the shipped Quick Proof fixture and the CLI signals a new user can verify before trusting a full Godpowers run.
- [DECISION] The case study uses only repository-local evidence so every claim can be checked without private credentials or a live AI host.
- [HYPOTHESIS] This is the right first public case study because it makes the adoption promise inspectable before asking users to run a long autonomous workflow.
- [OPEN QUESTION] The first external repository case study is still needed after this local proof. Owner: maintainer. Due: before the next public confidence claim.

## Starting Situation

- [DECISION] A new user wants to know whether Godpowers adds accountability beyond a normal AI coding prompt.
- [DECISION] The user has not yet committed to a full `/god-mode` run.
- [DECISION] The useful first signal is not completed product work. The useful first signal is whether Godpowers can read state, name missing artifacts, recommend the next command, and report host guarantees.

## Commands Run

```bash
npx godpowers quick-proof --project=. --brief
npx godpowers status --project=fixtures/quick-proof/project --brief
npx godpowers next --project=fixtures/quick-proof/project --brief
```

## Evidence Produced

- [DECISION] Disk state is present at `fixtures/quick-proof/project/.godpowers/state.json`.
- [DECISION] The Quick Proof fixture reports `/god-prd` as the next command because prep exists but no PRD artifact is complete.
- [DECISION] The fixture names `.godpowers/prd/PRD.md` as a missing artifact instead of claiming the planning phase is complete.
- [DECISION] Host capability reporting is separate from fixture state, so degraded agent spawning does not get hidden inside a successful local proof.

## Outcome Metrics

| Metric | Result |
|---|---|
| Commands to first signal | 1 |
| CLI signals captured | quick-proof, status, next |
| Disk state source | `fixtures/quick-proof/project/.godpowers/state.json` |
| Expected next command | `/god-prd` |
| Missing planning artifact surfaced | `.godpowers/prd/PRD.md` |
| Host guarantee visible | yes |

## Before And After

| Before Godpowers proof | After Godpowers proof |
|---|---|
| A user sees a large command surface and must infer where to start. | A user sees the smallest proof command and one recommended next action. |
| A normal prompt may claim progress without durable state. | The fixture shows state on disk and a missing artifact by path. |
| Host behavior can be vague. | The proof reports host guarantees as a separate line. |
| The next step can feel like guesswork. | `/god-next` derives a concrete recommendation from disk state. |

## What This Does Not Prove

- [DECISION] This case study does not prove that a real external repository completed a full arc.
- [DECISION] This case study does not prove that every supported AI coding host provides fresh-context agent spawning.
- [DECISION] This case study does not prove product-market demand.
- [DECISION] Those claims require the Adoption Canary runbook and an external repository case study.

## Follow-Up Proof Loop

- [DECISION] Run the Adoption Canary against one small external repository.
- [DECISION] Capture the same outcome metrics: commands to first signal, host level, first next command, first missing artifact, resume artifact, and one confusing first-10-minute moment.
- [DECISION] Update README or Quick Proof only when the case study exposes a concrete onboarding gap.
