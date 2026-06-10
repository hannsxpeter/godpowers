# E2E Command Flows

> Per-command flow showing prerequisites, execution, subagent spawning,
> standards check, success path, and endoff.
>
> Source of truth: `<runtimeRoot>/routing/<command>.yaml` files. This document
> is the human-readable view.

---

## How to read this document

Each command has:
1. **Trigger phrases**: what user inputs match
2. **Family**: the user-facing command family for help and routing UX
3. **Prerequisites**: what must be done first (with auto-complete options)
4. **Execution**: what spawns, what's read, what's written
5. **Standards check**: artifact discipline gates
6. **Success path**: what to do next on success, including typed outcome when flexible
7. **Failure path**: what to do on errors or have-not failures
8. **Endoff**: state changes and events emitted

---

## /god-init (Tier 0: Orchestration)

**Trigger phrases**: "god init", "/god-init", "start a project", "new project"

**Prerequisites**: none (entry point)
- Recommended: /god-explore if user idea is fuzzy

**Execution**:
- Spawns: `god-orchestrator` (mode + scale detection)
- Spawns: `god-context-writer` quietly for explicit `god init` or `/god-init`;
  asks once before quiet spawning for generic init triggers
- Reads: user intent from chat
- Writes:
  - `.godpowers/PROGRESS.md`
  - `.godpowers/state.json`
  - `.godpowers/intent.yaml`
  - `.godpowers/prep/INITIAL-FINDINGS.md`
  - `.godpowers/prep/IMPORTED-CONTEXT.md` when legacy planning, Superpowers, BMAD, or
    similar planning context is detected

**Standards check**: none (no artifacts produced yet)

**Success path**: print only
`Suggested next: /god-prd for requirements, or /god-mode for the full autonomous arc.`

**Failure path**: `/god-doctor`

**Endoff**:
- `state.tier-0.orchestration.status = done`
- Events: `orchestrator.spawn`, `artifact.created`, `agent.end`
- Lifecycle: `pre-init -> in-arc`

---

## /god-prd (Tier 1: Planning)

**Trigger phrases**: "god prd", "/god-prd", "write the prd", "product requirements"

**Prerequisites (REQUIRED)**:
- [DECISION] `state:initialized` must pass from `.godpowers/state.json`.
  - Auto-complete: `/god-init`
  - Human-required: yes (asks before running)

**Recommended (NOT required)**:
- `/god-explore` if intent is vague
- `/god-discuss` if scope unclear

**Execution**:
- Spawns: `god-pm` (in fresh context)
- Secondary spawns: `god-auditor` (for verification)
- Reads:
  - `.godpowers/intent.yaml`
  - `.godpowers/prep/INITIAL-FINDINGS.md` if present
  - `.godpowers/prep/IMPORTED-CONTEXT.md` if present
  - `templates/PRD.md` (structural starting point)
- Writes:
  - `.godpowers/prd/PRD.md`
  - `.godpowers/prd/PRD.meta.json`

**Standards check**:
- Substitution test: REQUIRED
- Three-label test: REQUIRED
- Have-nots: P-01 through P-15
- Gate-on-failure: pause-for-user
- Spawned: `god-standards-check` (independent, fresh context)

**Success path**: `/god-arch` (design the architecture)

**Failure path**:
- Have-nots fail: re-run `/god-prd` with feedback
- Pause: relay to user with options A/B/Default
- Error: `/god-doctor`

**Endoff**:
- `state.tier-1.prd.status = done`
- Events: `agent.start`, `artifact.created`, `have-nots.check`, `agent.end`

---

## /god-arch (Tier 1: Planning)

**Trigger phrases**: "god arch", "/god-arch", "design architecture", "system design"

**Prerequisites (REQUIRED)**:
- `state:tier-1.prd.status == done`
  - Auto-complete: `/god-prd`
- `have-nots-pass:prd`
  - Auto-complete: `/god-prd` (re-run with feedback)

**Execution**:
- Spawns: `god-architect`
- Reads:
  - `.godpowers/prd/PRD.md`
  - `.godpowers/prep/INITIAL-FINDINGS.md` if present
  - `.godpowers/prep/IMPORTED-CONTEXT.md` if present
  - `templates/ARCH.md`
- Writes:
  - `.godpowers/arch/ARCH.md`
  - `.godpowers/arch/adr/`

**Standards check**:
- Substitution test, three-label test
- Have-nots: A-01 through A-12
- Gate-on-failure: pause-for-user

**Success path**: `/god-roadmap`
- Alternative: `/god-stack` (if stack not decided yet)

**Failure path**:
- Have-nots fail: re-run with feedback
- Error: `/god-doctor`

**Endoff**: `state.tier-1.arch.status = done`

---

## /god-roadmap (Tier 1: Planning)

**Prerequisites**: `state:tier-1.arch.status == done` -> auto: `/god-arch`

**Execution**:
- Spawns: `god-roadmapper`
- Reads: PRD, ARCH, optional initial findings, optional imported preparation context,
  `templates/ROADMAP.md`
- Writes: `.godpowers/roadmap/ROADMAP.md`

**Standards**: have-nots R-01 through R-10

**Success path**: `/god-stack`

**Endoff**: `state.tier-1.roadmap.status = done`

---

## /god-stack (Tier 1: Planning)

**Prerequisites**: `state:tier-1.arch.status == done` -> auto: `/god-arch`

**Execution**:
- Spawns: `god-stack-selector`
- Reads: ARCH, optional initial findings, and optional imported preparation
  context
- Writes: `.godpowers/stack/DECISION.md`

**Standards**: have-nots S-01 through S-05

**Success path**: `/god-repo`

**Endoff**: `state.tier-1.stack.status = done`

---

## /god-repo (Tier 2: Building)

**Prerequisites**: `state:tier-1.stack.status == done` -> auto: `/god-stack`

**Execution**:
- Spawns: `god-repo-scaffolder`
- Writes:
  - `.godpowers/repo/AUDIT.md`
  - Repo source files (package.json, CI, lint, README, etc.)

**Standards**: have-nots RP-01 through RP-08

**Success path**: `/god-build`

**Endoff**: `state.tier-2.repo.status = done`

---

## /god-build (Tier 2: Building)

**Prerequisites**:
- `state:tier-1.roadmap.status == done` -> auto: `/god-roadmap`
- `state:tier-2.repo.status == done` -> auto: `/god-repo`

**Execution** (composite, multi-agent):
- Phase 1: `god-planner` writes `.godpowers/build/PLAN.md` with vertical slices grouped into waves
- Phase 2: For each wave, for each slice in parallel:
  - Spawn `god-executor` (TDD enforced strictly)
  - Spawn `god-spec-reviewer` (independent of executor)
  - Spawn `god-quality-reviewer` (independent of spec-reviewer)
  - On both pass: atomic commit
  - On either fail: return to executor with feedback
- Writes: source code, tests, `.godpowers/build/STATE.md`

**Standards**: have-nots B-01 through B-12

**Success path**: `/god-deploy`
- Alternative: `/god-harden` (parallel-safe)

**Endoff**: `state.tier-2.build.status = done`

---

## /god-deploy (Tier 3: Shipping)

**Prerequisites**: `state:tier-2.build.status == done` -> auto: `/god-build`

**Execution**:
- Spawns: `god-deploy-engineer`
- Writes: `.godpowers/deploy/STATE.md`, CI/CD configs

**Standards**: have-nots D-01 through D-08

**Success path**: `/god-observe`

**Endoff**: `state.tier-3.deploy.status = done`

---

## /god-observe (Tier 3: Shipping)

**Prerequisites**: `state:tier-3.deploy.status == done` -> auto: `/god-deploy`

**Execution**:
- Spawns: `god-observability-engineer`
- Writes: `.godpowers/observe/STATE.md`, alert configs, dashboards

**Standards**: have-nots OB-01 through OB-08

**Success path**: `/god-harden`

**Endoff**: `state.tier-3.observe.status = done`

---

## /god-harden (Tier 3: Shipping)

**Prerequisites**: `state:tier-2.build.status == done` -> auto: `/god-build`

**Execution**:
- Spawns: `god-harden-auditor`
- Writes: `.godpowers/harden/FINDINGS.md`

**Standards**: have-nots H-01 through H-11

**Blocks-on**:
- `critical-finding` -> pause-required (BLOCKS launch)

**Success path**: `/god-launch` (if no Criticals)

**Failure path**:
- Critical findings: pause for user, even with `--yolo`
- After resolve: re-run `/god-harden` to verify

**Endoff**: `state.tier-3.harden.status = done`

---

## /god-launch (Tier 3: Shipping)

**Prerequisites**:
- `state:tier-3.harden.status == done` -> auto: `/god-harden`
- `no-critical-findings` (computed from FINDINGS.md)

**Execution**:
- Spawns: `god-launch-strategist`
- Writes: `.godpowers/launch/STATE.md`, landing copy, OG cards

**Standards**: have-nots L-01 through L-08

**Success path**: STEADY STATE (transition)

**Endoff**:
- `state.tier-3.launch.status = done`
- Lifecycle: `in-arc -> steady-state-active`

---

## /god-mode (Tier 0: Composite Orchestrator)

**Prerequisites**: any of:
- [DECISION] `state:initialized` passes from `.godpowers/state.json`.
- [DECISION] `mode-A-greenfield` passes when no `.godpowers/` directory exists yet.

Auto-complete: `/god-init`

**Execution** (orchestrates everything):
- Spawns: `god-orchestrator`
- Orchestrator iterates through tiers, spawning each tier's agent in turn:
  `god-pm` -> `god-architect` -> `god-roadmapper` -> `god-stack-selector`
  -> `god-repo-scaffolder` -> `god-planner` -> `god-executor` waves
  with `god-spec-reviewer` + `god-quality-reviewer` per slice
  -> `god-deploy-engineer` -> `god-observability-engineer`
  -> `god-harden-auditor` (BLOCKS launch on Criticals)
  -> `god-launch-strategist`

**Flags**:
- `--yolo`: skip pauses except Critical security
- `--conservative`: more checkpoints
- `--with-hygiene`: add audit + deps + docs check at end
- `--from=<tier>`: resume from specific tier
- `--audit`: score only, build nothing
- `--dry-run`: plan only

**Success path**: STEADY STATE

**Endoff**: lifecycle: `in-arc -> steady-state-active`

---

## /god-feature (Tier 0: Beyond Greenfield)

**Prerequisites**:
- `state:lifecycle-phase == steady-state-active` OR `state:tier-1.arch.status == done`

**Execution**:
- Mini-PRD: `god-pm` (mode=feature-only)
- Optional ARCH delta: `god-architect` (mode=delta-only) if needed
- Build: `god-planner` + `god-executor` + reviewers (per slice)
- Harden new code: `god-harden-auditor` (mode=scope-to-new-code)
- Soft launch: `god-launch-strategist` (mode=feature-flag-rollout)
- Writes: `.godpowers/features/<slug>/PRD.md`, feature code, deploy

**Skips**: `/god-init`, `/god-stack`, `/god-repo` (already done)

**Success path**: `/god-status`

---

## /god-hotfix (Tier 0: Beyond Greenfield)

**Prerequisites**: steady-state OR active-incident

**Execution**:
- `god-debugger` (time-boxed 30 min)
- `god-executor` (mode=minimal-fix, regression test FIRST)
- `god-spec-reviewer` + `god-quality-reviewer` (compressed)
- `god-deploy-engineer` (mode=expedited)
- `god-observability-engineer` (mode=verify-symptom-resolved)
- Schedules `/god-postmortem` for 48h

**Success path**: `/god-postmortem` (REQUIRED within 48h)

**Endoff**:
- Lifecycle: `steady-state-active -> post-incident-pending`
- Events: hotfix.complete, postmortem.scheduled

---

## /god-postmortem (Tier 0: Beyond Greenfield)

**Prerequisites**: lifecycle-phase = post-incident-pending OR incident-resolved

**Execution**:
- `god-incident-investigator`
- Optional: `god-docs-writer` for runbook updates
- Writes: `.godpowers/postmortems/<id>/POSTMORTEM.md`

**Standards**: have-nots PM-01 through PM-08

**Success path**: `/god-status`

**Endoff**:
- Lifecycle: `post-incident-pending -> steady-state-active`
- Action items appended to `.godpowers/todos/TODOS.md`

---

## /god-refactor (Tier 0: Beyond Greenfield)

**Prerequisites**:
- `state:tier-2.repo.status == done`
- `tests-exist-on-affected-surface`
  - Auto-complete: `/god-add-tests` (with user confirmation)

**Execution**:
- `god-explorer` (mode=scoping)
- `god-auditor` (test coverage check)
- `god-planner` (mode=refactor-slices, behavior-preserving)
- `god-executor` per slice (TDD strict)
- `god-spec-reviewer` + `god-quality-reviewer`
- `god-deploy-engineer` (mode=gradual-rollout)

**Success path**: `/god-status`

---

## /god-spike (Tier 0: Beyond Greenfield)

**Prerequisites**: none

**Execution**:
- `god-spike-runner` (time-boxed 1d default)
- Writes: `.godpowers/spikes/<slug>/SPIKE.md`

**Standards**: have-nots SP-01 through SP-05

**Success path**:
- Resolved + recommend proceed -> `/god-feature` with the recommendation
- Inconclusive -> `/god-spike` with narrower question
- Resolved + reject -> archive

---

## /god-upgrade (Tier 0: Beyond Greenfield)

**Prerequisites**: `state:tier-2.build.status == done`

**Execution** (5 phases):
- Phase 1: `god-migration-strategist` writes plan
- Phase 2 (conditional): `god-planner` plans test gap-fill
- Phase 3 (Expand): `god-executor` introduces new alongside old
- Phase 4 (Migrate slices): `god-executor` per slice with metric gating
- Phase 5 (Contract): remove old code

**Standards**: have-nots MG-01 through MG-07

**Success path**: `/god-status`

---

## /god-update-deps (Tier 0: Beyond Greenfield)

**Prerequisites**: `state:tier-2.repo.status == done`

**Execution**:
- `god-deps-auditor` (audit only, classifies)
- For patches: batch update via `god-executor`
- For minors: per-package via `god-executor`
- For majors: defer to `/god-upgrade`

**Standards**: have-nots DP-01 through DP-06

**Success path**:
- If majors found: `/god-upgrade`
- Otherwise: `/god-status`

---

## /god-docs (Tier 0: Beyond Greenfield)

**Prerequisites**: none

**Execution**:
- `lib/repo-doc-sync.run(projectRoot)` for mechanical repository documentation claims
- `god-docs-writer`
- Writes: `.godpowers/docs/UPDATE-LOG.md`, README, docs/

**Standards**: have-nots DC-01 through DC-05

**Success path**: `/god-status`

---

## /god-sync (Tier 0: Closeout)

**Prerequisites**: initialized `.godpowers/` project

**Execution**:
- `lib/feature-awareness.run(projectRoot)` for existing-project runtime awareness
- `lib/repo-doc-sync.run(projectRoot)` for public repository documentation claims
- `lib/repo-surface-sync.run(projectRoot)` for structural repository surface drift, including route-quality, recipe-coverage, and release-surface checks
- `lib/source-sync.run(projectRoot)` when imported source systems have sync-back enabled
- `god-updater`
- Writes: `.godpowers/SYNC-LOG.md`, `.godpowers/docs/REPO-DOC-SYNC.md`, `.godpowers/surface/REPO-SURFACE-SYNC.md`, and touched artifacts

**Standards**: artifact have-nots plus visible auto-invoke reporting

**Success path**: `/god-status`

---

## /god-audit (Tier 0: Audit-only)

**Prerequisites**: [DECISION] `state:initialized` passes from `.godpowers/state.json`.

**Execution**:
- `god-auditor` (mode=full-audit)
- Writes: `.godpowers/AUDIT-REPORT.md`

**Success path**:
- Failures found: `/god-redo <tier>` for the worst-scored tier
- Clean: `/god-status`

---

## /god-hygiene (Tier 0: Composite)

**Prerequisites**: lifecycle-phase = steady-state-active

**Execution** (parallel):
- `god-auditor` (artifact quality)
- `god-deps-auditor` (audit-only)
- `god-docs-writer` (verify-only)
- Compose: `god-orchestrator`
- Writes: `.godpowers/HYGIENE-REPORT.md`

**Success path**: `/god-status` with prioritized actions

---

## Recovery commands

### /god-undo
**Prereq**: `file:.godpowers/log`
**Execution**: built-in, reads reflog, applies inverse
**Endoff**: state restored to previous, files moved to `.trash/`

### /god-redo <tier>
**Prereq**: tier exists in state.json
**Execution**: marks tier in-flight + downstream tiers in-flight
**Success path**: `/god-next` (will re-run the tier)

### /god-skip <tier> --reason="..."
**Prereq**: reason provided
**Execution**: marks tier `skipped` with reason in state.json
**Endoff**: appended to events.jsonl as `tier.skip`

### /god-repair
**Execution**: built-in, calls `lib/state.detectDrift`
**Success path**: `/god-status`

### /god-rollback <tier>
**Execution**: built-in, walks downstream tiers, moves artifacts to `.trash/`
**Success path**: `/god-status`

### /god-restore
**Prereq**: items in `.trash/`
**Execution**: built-in, recovers from trash
**Success path**: `/god-status`

---

## Meta commands

### /god-status
Reads state.json + scans disk + reports.

### /god-next
The decision engine itself. See `skills/god-next.md` for the three modes
(before, after, standalone).

### /god-help
Lists commands grouped by tier.

### /god-doctor
Diagnoses install + state, suggests fixes.

### /god-version
Prints the installed Godpowers version and capability summary.

### /god-lifecycle
Shows project phase and contextually appropriate workflows.

### /god-standards
Manual standards check on a specific artifact.

---

## Capture commands

### /god-add-todo
Append to TODOS.md with priority and source.

### /god-check-todos
List + optionally route to right workflow.

### /god-note
Append to NOTES.md without ceremony.

### /god-add-backlog
Long-term parking lot.

### /god-plant-seed
Forward-looking idea with trigger condition.

---

## Knowledge commands

### /god-thread
Persistent context threads.

### /god-map-codebase
4 parallel mappers, write to `.godpowers/codebase/`.

### /god-intel
Query codebase intelligence.

### /god-graph
Project knowledge graph.

### /god-extract-learnings
Decisions / lessons / patterns from completed phase.

---

## Process commands

### /god-sprint plan|status|retro
Sprint ceremonies (optional, scale=large+).

### /god-party
Multi-persona collaboration.

### /god-pause-work
Save HANDOFF.md.

### /god-resume-work
Load HANDOFF.md.

### /god-workstream new|list|switch|merge
Parallel worktree management.

### /god-pr-branch
Filter `.godpowers/` commits for clean PR.

### /god-build-agent
Generate custom specialist agent.

### /god-settings
View/modify intent.yaml settings.

### /god-set-profile
Switch model profile.

### /god-add-tests
Add tests to legacy code.

### /god-debug
4-phase systematic debug.

### /god-review
Two-stage code review.

### /god-fast
Trivial inline edit.

### /god-quick
Small task with TDD.

### /god-explore
Pre-init Socratic ideation.

### /god-discuss
Pre-planning discussion.

### /god-list-assumptions
Surface assumptions before they cement.

---

## Universal pattern

Every command above follows this pattern (enforced by `<runtimeRoot>/routing/<command>.yaml`):

```
1. /god-X invoked
2. Skill calls /god-next --before=/god-X (pre-flight)
3. Router checks prereqs from `<runtimeRoot>/routing/god-X.yaml`
4. Missing prereqs: prompt user, optionally run them first
5. All prereqs satisfied: skill spawns specialist agent(s)
6. Agent does work in fresh context
7. Agent writes artifact(s)
8. Skill spawns god-standards-check (if standards configured)
9. Standards pass: state.json updated, events.jsonl appended
10. Standards fail: pause for user OR auto-fix per gate-on-failure
11. Skill calls /god-next --after=/god-X
12. Router returns success-path.next-recommended
13. Router reads success-path.outcome when the route is contextual, verdict-based, steady-state, session-end, or selection-based
14. Skill prints suggestion, outcome label, reason, and allowed next commands

(All routing data is in `<runtimeRoot>/routing/<command>.yaml`.
 The decision engine is `/god-next` backed by `<runtimeRoot>/lib/router.js`.)
```

This is the universal contract. Every skill follows it. Every routing file
declares it. The decision engine enforces it.
