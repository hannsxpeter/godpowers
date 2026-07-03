# Product Requirements Document

> Reconstructed from the shipped Godpowers v2.1.1 codebase via `/god-reconstruct`.
> Every sentence is labeled `[DECISION]`, `[HYPOTHESIS]`, or `[OPEN QUESTION]`.
> Functional requirements carry stable ids (P-MUST-NN / P-SHOULD-NN / P-COULD-NN)
> that map to the code that implements them.

## Problem Statement

[DECISION] AI coding agents like Claude Code can write code, but a single prompt
cannot carry a project from raw idea to hardened production without losing the
plan, skipping review, or forgetting what was already decided across sessions.

[DECISION] Teams that adopt Claude Code hit 3 recurring failures: the agent
narrates progress it did not actually make, the agent re-asks questions it
already answered, and the produced artifacts (PRD, architecture, code) drift out
of sync with each other within days.

[HYPOTHESIS] A disk-authoritative workflow that re-derives state from files on
every turn, gates every artifact against named failure modes, and traces each
requirement to the code that satisfies it will remove most of that drift.

## Target Users

[DECISION] Primary: solo founders and small engineering teams (1 to 5 people)
who use Claude Code or a compatible agent CLI daily and want to ship a real
product, not a prototype, without hiring a separate planning function.

[DECISION] Secondary: engineers inheriting a brownfield repository who need to
reconstruct planning artifacts, map technical debt, and onboard an AI agent onto
existing code without rewriting it from scratch.

## Success Metrics

[DECISION] Within 30 minutes of a fresh install, a first-time user can run one
command (`/god-mode`) and reach a committed, test-green vertical slice, measured
on the shipped dogfood fixtures.

[DECISION] At least 95 percent of declared requirements trace to implementing
code after a build, measured by the linkage coverage percentage that the
Godpowers dashboard reports.

[DECISION] Zero release-gate test failures across the 40-plus checks in the
Godpowers release suite before any version is published, measured by
`scripts/run-tests.js`.

## Functional Requirements

> Each requirement carries a stable id and maps to a primary implementing file.

### MUST (V1 launch blockers)
- P-MUST-01 [DECISION] Run a full idea-to-production project autonomously through tiered specialist agents -- Acceptance: `/god-mode` advances every tier and pauses only for genuine human decisions.
- P-MUST-02 [DECISION] Hold project state on disk and re-derive it every turn, never from agent memory -- Acceptance: state.json plus PROGRESS.md are authoritative and a stale agent claim cannot override disk.
- P-MUST-03 [DECISION] Detect project mode (greenfield, brownfield, audit, suite) and scale automatically -- Acceptance: detection runs on init without the user naming a mode.
- P-MUST-04 [DECISION] Author a Product Requirements Document that passes substitution and three-label tests -- Acceptance: every PRD sentence is labeled and every requirement has acceptance criteria.
- P-MUST-05 [DECISION] Design system architecture with C4 structure and Architecture Decision Records -- Acceptance: ARCH.md records load-bearing decisions with rationale.
- P-MUST-06 [DECISION] Sequence work into ordered delivery increments with observable completion gates -- Acceptance: ROADMAP.md groups requirements into increments with explicit dependencies.
- P-MUST-07 [DECISION] Select a technology stack with scored candidates and flip points -- Acceptance: DECISION.md ranks options and names lock-in cost.
- P-MUST-08 [DECISION] Scaffold a production-grade repository with CI, linting, and required docs -- Acceptance: the scaffold contains no placeholder TODO files.
- P-MUST-09 [DECISION] Build features test-first in parallel waves of vertical slices -- Acceptance: each slice lands with a failing-then-passing test and an atomic commit.
- P-MUST-10 [DECISION] Review every slice in two independent stages before commit -- Acceptance: spec review and quality review each run in a fresh context and both must pass.
- P-MUST-11 [DECISION] Gate every artifact against a catalog of named failure modes (have-nots) -- Acceptance: an artifact that trips a have-not is repaired or blocked, not shipped.
- P-MUST-12 [DECISION] Lint planning artifacts mechanically for unlabeled prose, empty no-gos, and missing owners -- Acceptance: the linter reports zero errors on a passing PRD.
- P-MUST-13 [DECISION] Maintain a bidirectional map between requirement ids and the code files that implement them -- Acceptance: the linkage map resolves a requirement id to its files and the reverse.
- P-MUST-14 [DECISION] Scan code for linkage signals and update the map after build work -- Acceptance: reverse-sync records new requirement-to-code links from annotations and tests.
- P-MUST-15 [DECISION] Detect drift between artifacts and code and surface it for review -- Acceptance: code referencing a removed requirement id is flagged to REVIEW-REQUIRED.md.
- P-MUST-16 [DECISION] Render a disk-derived dashboard of phase, progress, and the single next action -- Acceptance: `/god-status` names its runtime source and never reports progress from memory.
- P-MUST-17 [DECISION] Route free-text intent to the right command sequence via recipes -- Acceptance: a phrase like "production down" matches the hotfix recipe.
- P-MUST-18 [DECISION] Suggest the next command from disk state with a one-line reason -- Acceptance: `/god-next` computes a route without re-asking what the project is.
- P-MUST-19 [DECISION] Report deliverable progress: which requirements and increments are done, in progress, or not started -- Acceptance: `/god-progress` writes a REQUIREMENTS.md checklist derived from the linkage map.
- P-MUST-20 [DECISION] Pause and resume work across sessions without losing context -- Acceptance: a checkpoint restores the current tier, step, and held decisions on a new session.
- P-MUST-21 [DECISION] Install across Claude Code, Codex, Cursor, Windsurf, Gemini, and other agent tools -- Acceptance: one installer writes the correct skill and agent layout per host.
- P-MUST-22 [DECISION] Run an adversarial security review against the OWASP Top 10 before launch -- Acceptance: a Critical finding blocks launch until fixed.

### SHOULD (V1 if time permits)
- P-SHOULD-01 [DECISION] Set up a deploy pipeline that promotes the same artifact with tested rollback -- Acceptance: staging and production deploy the identical build. -- Validation: a rollback drill restores the prior version.
- P-SHOULD-02 [DECISION] Wire observability with SLOs tied to product success metrics -- Acceptance: each alert maps to an SLO and a runbook. -- Validation: a synthetic breach pages with an actionable runbook.
- P-SHOULD-03 [DECISION] Produce launch readiness: landing copy, Open Graph cards, and a launch runbook -- Acceptance: the Open Graph card renders and the runbook covers D-7 to D+7. -- Validation: a preview tool shows the rendered card.
- P-SHOULD-04 [DECISION] Run steady-state feature, hotfix, and refactor workflows after launch -- Acceptance: `/god-feature` reconciles against existing artifacts before building. -- Validation: a feature run updates PRD, ROADMAP, and linkage together.
- P-SHOULD-05 [DECISION] Detect host capability and report full, degraded, or unknown runtime guarantees -- Acceptance: the dashboard states the host guarantee on every closeout. -- Validation: a degraded host downgrades the guarantee line.
- P-SHOULD-06 [DECISION] Verify a running app against acceptance criteria with a headless browser -- Acceptance: runtime verification checks the rendered app, not just a TCP port. -- Validation: a broken page produces a runtime finding.
- P-SHOULD-07 [DECISION] Import context from GSD, BMAD, and Superpowers and sync progress back -- Acceptance: imported planning signals enter as hypotheses, not as truth. -- Validation: a sync-back writes Godpowers progress into the source system.

### COULD (post-V1)
- P-COULD-01 [HYPOTHESIS] Coordinate a multi-repository suite with byte-identical file sync (Mode D).
- P-COULD-02 [HYPOTHESIS] Configure host-native scheduled automation after explicit user consent.
- P-COULD-03 [HYPOTHESIS] Export traces and metrics through an OpenTelemetry-compatible pipeline.
- P-COULD-04 [HYPOTHESIS] Run time-boxed research spikes that build a minimal proof and then stop.

## Non-Functional Requirements

| Category | Requirement | Source |
|----------|-------------|--------|
| Portability | Run inside 10-plus agent tools from one install | [DECISION] |
| Integrity | Disk state is the single source of truth on every turn | [DECISION] |
| Quality | Release suite of 40-plus checks passes before publish | [DECISION] |
| Safety | Level-4 actions (deploy, money, broad deps) never auto-run | [DECISION] |
| Traceability | At least 95 percent requirement-to-code coverage after build | [HYPOTHESIS] |

## Scope and No-Gos

### In scope for V1
- Idea-to-production orchestration with specialist agents
- Disk-authoritative state, linkage, and deliverable tracking
- Multi-tool installation and host capability awareness

### Explicitly NOT in scope
- [DECISION] Godpowers does not host or run the user's production infrastructure; it sets up pipelines but does not operate servers.
- [DECISION] Godpowers does not replace the underlying agent runtime; it orchestrates Claude Code and compatible tools rather than reimplementing them.
- [DECISION] Godpowers does not auto-execute irreversible Level-4 actions (deploying to production, moving money, broad dependency upgrades) without explicit user approval.

## Appetite

[DECISION] Time budget: Godpowers is a continuously released project; the current
2.x line ships on a rolling cadence rather than a single fixed deadline.

[DECISION] Technical constraints: the user-facing surface stays slash-command
based across every supported host, and runtime logic stays in plain Node.js with
no required build step.

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Should deliverable status ever be hand-overridable, or always derived? | hprincivil | 2026-06-30 | Derived by default; increment Status may be set to done |
| Should the self-ledger track per-requirement test coverage, not just code links? | hprincivil | 2026-07-31 | |

---

## Have-Nots Checklist

Before declaring done, verify:
- [x] No sentence is unlabeled
- [x] Problem statement fails substitution test
- [x] Target user is specific (not "developers")
- [x] Every success metric has a number AND timeline
- [x] Every functional requirement has a stable id (P-MUST-NN / P-SHOULD-NN / P-COULD-NN)
- [x] Every requirement has acceptance criteria
- [x] No-gos section is non-empty
- [x] Every open question has owner AND due date
