---
name: god-spike
description: |
  Time-boxed research spike. Builds a minimal proof of concept to answer one
  specific technical question, documents findings, then stops. Spike code
  does NOT merge to main; it answers a question, then either gets deleted or
  rewritten cleanly in a real feature workflow.

  Triggers on: "god spike", "/god-spike", "research spike", "prototype",
  "proof of concept", "POC", "explore feasibility"
---

# /god-spike

Time-boxed research spike.

## When to use

- You have a specific technical question to answer
- A 1-day proof of concept would resolve it
- You don't want to commit to building until you know more

Examples:
- "Can our existing schema handle multi-tenancy?"
- "Will this third-party API meet our latency budget?"
- "Does the new framework let us delete the auth middleware?"

## When NOT to use

- The question is too broad ("should we use GraphQL?"): narrow it first via
  /god-explore
- You already know the answer: just /god-feature it
- Time-box would exceed 3 days: that's a feature, scope it down

## Setup

Ask the user:
- The specific question (one sentence)
- The time-box (default: 1 day)
- What evidence would answer it (so the spike knows what to measure)

## Orchestration

### Phase 1: Run the spike (god-spike-runner)
Spawn **god-spike-runner** in fresh context with:
- The exact question
- The time-box
- The success criteria

The agent:
- Builds the smallest possible proof
- Hard-codes inputs, no real interface
- Measures or tests as needed
- Documents findings honestly

### Phase 2: No further phases
- No build pipeline
- No deploy
- No observe
- No harden
- No launch

The spike answers a question. That's it.

## After the Spike

The user reviews the SPIKE.md and decides:
- **Proceed**: route to /god-feature with the spike's recommendation
- **Reject**: archive the spike, document why
- **Follow-up spike**: another /god-spike with a narrower question

## On Completion

```
Spike complete: .godpowers/spikes/<question-slug>/SPIKE.mdx

Time-boxed: [N hours]
Time spent: [actual]

Recommendation: [DECISION from spike]

Suggested next:
  - If proceeding: /god-feature with this recommendation
  - If rejecting: archive .godpowers/spikes/<question-slug>/
  - If unclear: /god-spike with narrower question

Next commands:
- /god-feature for the smallest proven slice: Run the smallest safe next step.
- /god-feature with the full recommendation: Run the full recommended path.
- /god-discuss the remaining uncertainty: Resolve the open question before continuing.
- /god-mode only if this spike unblocks the full project run: Run the full autonomous project workflow when it fits.

REMINDER: spike code is throwaway. Do NOT merge to main.
```

## Have-Nots

Spike FAILS if:
- Built a feature instead of a proof
- No measurable evidence in findings
- "It depends" with no decision support
- Spike code merged to main
- Time-boxed exceeded without escalation

## Linkage and reverse-sync

Per Phase 13 of the production-ready plan, this workflow participates
in the linkage system:

- On completion of any code change, `lib/reverse-sync.run(projectRoot)`
  is called via god-updater. This:
  - Scans new/modified code for linkage annotations (// Implements: P-MUST-NN, etc.)
  - Updates `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
  - Detects drift via `lib/drift-detector`
  - Appends fenced footers to PRD/ARCH/ROADMAP/STACK/DESIGN
  - Surfaces drift findings to REVIEW-REQUIRED.md

- Stable IDs MUST be used in artifact deltas (P-MUST-NN, ADR-NNN,
  C-{slug}, M-{slug}, S-{slug}, D-{slug}, token paths). The scanner
  picks them up automatically via comment annotations.

- For UI work: agent-browser audit may run as part of /god-build
  post-wave or /god-launch gate (see `/god-test-runtime`).

- Findings flow into the standard REVIEW-REQUIRED.md walkthrough
  via `/god-review-changes`.
