---
pillar: arch
status: present
always_load: false
covers: [architecture, runtime model, state model, workflows, agents]
triggers: [architecture, workflow, state, router, agent, runtime]
must_read_with: [context, repo]
see_also: [quality, deploy]
---

## Scope

- [DECISION] This pillar captures architectural context for Godpowers.

## Context

- [DECISION] Runtime architecture is implemented by source-controlled skills, routes, workflows, specialist contracts, schemas, and dependency-free Node.js helpers.

## Decisions

- [DECISION] Godpowers uses a pure-skill runtime where slash-command skills spawn specialist agents inside the host AI coding tool.
- [DECISION] The CLI surface stays narrow: installer and uninstall flows, read-only status and next-route helpers, automation status and setup planning, dogfood fixtures, and extension scaffolding.
- [DECISION] Routing decisions are stored in `routing/*.yaml`.
- [DECISION] Workflow plans are stored in `workflows/*.yaml` and planned by `lib/workflow-runner.js`.
- [DECISION] Workflow plans can expose visible local helpers such as `repo-doc-sync`, `repo-surface-sync`, `host-capabilities`, `source-sync-back`, and `checkpoint-sync`.
- [DECISION] `lib/state-lock.js` provides cooperative advisory locking through `.godpowers/state.json`.
- [DECISION] Existing `.godpowers` projects refresh runtime feature awareness through `lib/feature-awareness.js`.
- [DECISION] `ARCHITECTURE.md` owns the architecture audit playbook for disconnected commands, actions, and workflows.
- [DECISION] `ARCHITECTURE-MAP.md` renders the same audit as a graph from skills to routes, agents, workflows, recipes, docs, and package checks.
- [DECISION] `ARCHITECTURE-MAP.md` keeps a complete core command supplement so all 124 shipped skills appear in the human-readable map.
- [DECISION] Workflow plans use canonical helper IDs such as `source-sync-back` and `pillars-sync-plan`, while `/god-sync` output may show the shorter aliases `source-sync` and `pillars-sync`.
- [DECISION] Godaudits 2.x interoperability reads `.godaudits/AUDIT.json` as canonical machine state, imports explicit check outcomes, evidence metadata, compliance, accepted risks, open questions, score caps, coverage, findings, and typed GA tasks, and uses generated or legacy AUDIT.mdx only as a fallback.
- [DECISION] Godplans 1.1 interoperability treats `.godplans/PLAN.mdx` plus the pinned executable `.godplans/validate-plan.sh` as one contract, mirrors structural validation without executing repository shell during import, blocks GP dispatch outside `approved` or `executing`, and requires the official validator to pass immediately before work.
- [DECISION] `lib/prose-lint.js` stays inside the existing artifact-quality boundary as a dependency-free inert-text scanner with no I/O, bounded sanitized excerpts, and warning-only U-12 integration through `lib/have-nots-validator.js`.
- [DECISION] `references/building/BLAST-RADIUS.md` is the single Stage 2 safety-case protocol consumed by `/god-review`, `/god-build`, `god-executor`, `god-quality-reviewer`, and the orchestrator runbook.
- [DECISION] `god-executor` proposes a candidate safety fact and focused proof but does not grade its own work; `god-quality-reviewer` independently verifies or replaces the candidate and owns the Stage 2 verdict.
- [DECISION] `lib/impact.js` remains a static candidate generator with unproven maximum-level-2 metadata, while the existing evidence ledger remains the executed-proof authority.
- [DECISION] `lib/evidence.resolveReviewEvidence` adds a read-only sanitized projection over unchanged verification records and additive record-ID and record-digest gate-event bindings.
- [DECISION] Bounded changes receive 1 Stage 2 safety case; changes crossing at least 3 boundary classes or at least 2 high-impact classes receive at least 2 independent fresh-context safety cases before reconciliation.
- [DECISION] The blast-radius design adds no command, route, recipe, workflow, specialist type, production dependency, evidence store, or state writer.
- [DECISION] The current executable audit status is fresh for repo surface, route quality, recipe coverage, and workflow planning.

## Rules

(none)

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] Runtime behavior depends on host AI tools exposing skill and agent capabilities consistently.
- [HYPOTHESIS] Local helper work must stay visible in closeouts so automatic work does not become hidden orchestration.
- [HYPOTHESIS] A future Godplans validator hash requires an explicit Godpowers compatibility update so new shell bytes cannot become trusted silently.
- [HYPOTHESIS] A prose rule can become blocking only after release-candidate precision evidence and a maintainer-approved override design justify changing ADR-009.

## Touchpoints

- [DECISION] Architecture decisions synchronize from `.godpowers/arch/ARCH.mdx` through the managed section below.

## Gaps

(none)

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/arch/ARCH.mdx`.
- Rule: keep this pillar aligned when these artifacts change durable arch truth.

### Extracted durable signals

From `.godpowers/arch/ARCH.mdx`:
- [DECISION] A developer invokes Godpowers inside an AI coding host, which loads installed skills and specialist agents from the host-specific runtime directory.
- [DECISION] Godpowers reads and writes project-local Pillars, `.godpowers` state, planning artifacts, source files, and verification evidence.
- [DECISION] GitHub Actions and npm are external release services reached only after explicit user authority and identity-bound release gates.
- [DECISION] Context: AI coding sessions end, compact, and move between hosts.
- [DECISION] Decision: `.godpowers/state.json` is authoritative and generated views derive from it.
- [DECISION] Rationale: A new session can verify state without trusting conversation memory.
- [DECISION] Flip point: Replace JSON state only if a portable store offers atomic local reads, offline operation, and deterministic export with lower complexity.
- [DECISION] Consequence: State writers must refresh generated views and checkpoints.
<!-- godpowers:pillar-sync:end -->
