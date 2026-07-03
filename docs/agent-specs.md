# Agent Specifications

> Canonical per-agent specification: triggers, inputs, outputs, consumers,
> artifact awareness, handoff protocol. Single source of truth.

For per-agent prose instructions: see `agents/<name>.md`.
For per-command routing: see `<runtimeRoot>/routing/<command>.yaml`.
For workflow DAGs: see `<runtimeRoot>/workflows/<workflow>.yaml`.

This document is the cross-reference: who reads what, who writes what,
who hands off to whom.

---

## Spec format

Each agent has these fields:

| Field | Meaning |
|---|---|
| **Triggers** | Skills, recipes, or workflows that spawn this agent |
| **Inputs** | Artifacts/state this agent READS |
| **Outputs** | Artifacts this agent WRITES |
| **Downstream consumers** | Agents that READ this agent's output later |
| **Artifact awareness** | Other artifacts this agent KNOWS ABOUT for context (without modifying) |
| **Handoff** | How this agent returns control (success / pause / fail) |
| **Standards check** | Whether god-standards-check runs after this agent |

---

## Tier 0: Orchestration agents

### god-orchestrator

| Field | Value |
|---|---|
| **Triggers** | `/god-mode`, `/god-init` (delegated), `/god-mode --yolo` |
| **Inputs** | User intent, `.godpowers/state.json`, `.godpowers/PROGRESS.mdx`, optional `.godpowers/intent.yaml`, optional legacy planning / Superpowers / BMAD context |
| **Outputs** | `.godpowers/state.json` (mode + scale), `.godpowers/PROGRESS.mdx`, `.godpowers/prep/INITIAL-FINDINGS.mdx`, optional `.godpowers/prep/IMPORTED-CONTEXT.mdx` |
| **Downstream consumers** | All other agents read state.json |
| **Artifact awareness** | All 14 artifact categories (it routes to specialists) |
| **Handoff** | Spawns specialists in tier order; awaits their return; pauses for legitimate human-only decisions |
| **Standards check** | N/A (orchestrator triggers checks for others) |

### god-router (built-in)

| Field | Value |
|---|---|
| **Triggers** | `/god-next`, called internally by skills before execution |
| **Inputs** | `<runtimeRoot>/routing/<command>.yaml`, `.godpowers/state.json` |
| **Outputs** | Routing decision (returned to caller, not written to disk) |
| **Downstream consumers** | Calling skill |
| **Artifact awareness** | All routing definitions, lifecycle phases |
| **Handoff** | Returns next-recommended command + alternatives |

---

## Tier 1: Planning agents

### god-pm

| Field | Value |
|---|---|
| **Triggers** | `/god-prd`, `/god-feature` (mini-PRD mode), `/god-mode` (via orchestrator), reconciliation if PRD missing |
| **Inputs** | User intent, `.godpowers/intent.yaml`, optional `.godpowers/domain/GLOSSARY.mdx`, optional `.godpowers/prep/INITIAL-FINDINGS.mdx`, optional `.godpowers/prep/IMPORTED-CONTEXT.mdx`, `templates/PRD.mdx` |
| **Outputs** | `.godpowers/prd/PRD.mdx` + `.godpowers/prd/PRD.meta.json` |
| **Downstream consumers** | god-architect, god-roadmapper, god-launch-strategist, god-observability-engineer (reads NFRs), god-reconciler |
| **Artifact awareness** | Domain glossary, initial findings, and imported preparation context are supporting evidence only, never source of truth |
| **Handoff** | Returns when PRD passes have-nots P-01..P-15. Pauses for ambiguous problem space, missing domain knowledge, conflicting requirements. |
| **Standards check** | YES (substitution + three-label + 15 have-nots) |

### god-architect

| Field | Value |
|---|---|
| **Triggers** | `/god-arch`, `/god-feature` (delta mode), `/god-mode` |
| **Inputs** | `.godpowers/prd/PRD.mdx`, optional `.godpowers/domain/GLOSSARY.mdx`, optional `.godpowers/prep/INITIAL-FINDINGS.mdx`, optional `.godpowers/prep/IMPORTED-CONTEXT.mdx`, `templates/ARCH.mdx` |
| **Outputs** | `.godpowers/arch/ARCH.mdx`, `.godpowers/arch/adr/<n>-<title>.mdx` |
| **Downstream consumers** | god-roadmapper, god-stack-selector, god-planner, god-deploy-engineer, god-harden-auditor |
| **Artifact awareness** | PRD requirements, NFRs, optional org-context.yaml (bluefield), domain glossary, imported preparation context as supporting evidence |
| **Handoff** | Returns when ARCH passes have-nots A-01..A-13. Pauses on tied architectures, human-constraint flip points. |
| **Standards check** | YES |

### god-roadmapper

| Field | Value |
|---|---|
| **Triggers** | `/god-roadmap`, `/god-mode`, `/god-roadmap-update` (legacy) |
| **Inputs** | `.godpowers/prd/PRD.mdx`, `.godpowers/arch/ARCH.mdx`, optional `.godpowers/domain/GLOSSARY.mdx`, optional `.godpowers/prep/INITIAL-FINDINGS.mdx`, optional `.godpowers/prep/IMPORTED-CONTEXT.mdx`, `templates/ROADMAP.mdx` |
| **Outputs** | `.godpowers/roadmap/ROADMAP.mdx` |
| **Downstream consumers** | god-planner, god-reconciler |
| **Artifact awareness** | PRD requirements, ARCH dependency edges, domain glossary, imported milestones and stories as supporting evidence |
| **Handoff** | Returns when ROADMAP passes have-nots R-01..R-10. Pauses on capacity unknown, ambiguous ordering. |
| **Standards check** | YES |

### god-stack-selector

| Field | Value |
|---|---|
| **Triggers** | `/god-stack`, `/god-mode` |
| **Inputs** | `.godpowers/arch/ARCH.mdx`, optional `.godpowers/domain/GLOSSARY.mdx`, optional `.godpowers/org-context.yaml` (bluefield constraint), optional `.godpowers/prep/INITIAL-FINDINGS.mdx`, optional `.godpowers/prep/IMPORTED-CONTEXT.mdx` |
| **Outputs** | `.godpowers/stack/DECISION.mdx` |
| **Downstream consumers** | god-repo-scaffolder, god-planner, god-deploy-engineer |
| **Artifact awareness** | ARCH NFRs, ADRs, org constraints if bluefield, domain glossary, imported stack signals as supporting evidence |
| **Handoff** | Returns when DECISION passes have-nots S-01..S-05. Pauses on within-10% ties, high-lock-in choices. |
| **Standards check** | YES |

### god-explorer

| Field | Value |
|---|---|
| **Triggers** | `/god-explore`, `/god-discuss`, `/god-list-assumptions`, `/god-refactor` (scoping mode) |
| **Inputs** | User intent (free-form), optional existing artifacts, optional `.godpowers/domain/GLOSSARY.mdx` |
| **Outputs** | `.godpowers/explore/<slug>.mdx` OR `.godpowers/discussions/<topic>.mdx`, optional `.godpowers/domain/GLOSSARY.mdx` |
| **Downstream consumers** | god-pm (uses clarified problem statement), god-planner (uses scoped refactor) |
| **Artifact awareness** | Whatever artifacts exist for context, plus canonical domain terms and ambiguities |
| **Handoff** | Returns clarified framing or surfaced assumptions |
| **Standards check** | NO (output is exploration, not a tier artifact) |

---

## Tier 2: Building agents

### god-repo-scaffolder

| Field | Value |
|---|---|
| **Triggers** | `/god-repo`, `/god-mode` |
| **Inputs** | `.godpowers/stack/DECISION.mdx`, optional `.godpowers/org-context.yaml` |
| **Outputs** | `.godpowers/repo/AUDIT.mdx` + repo source files (package.json, CI, lint, README, etc.) |
| **Downstream consumers** | god-planner (knows the structure), god-executor (writes into the structure), god-deploy-engineer (uses CI config) |
| **Artifact awareness** | Stack decision, org standards |
| **Handoff** | Returns when AUDIT.md exists and CI passes on empty scaffold. Have-nots RP-01..RP-08. |
| **Standards check** | YES |

### god-planner

| Field | Value |
|---|---|
| **Triggers** | `/god-build`, `/god-feature`, `/god-refactor`, `/god-quick`, `/god-upgrade` (test gap-fill mode) |
| **Inputs** | `.godpowers/roadmap/ROADMAP.mdx`, `.godpowers/arch/ARCH.mdx`, `.godpowers/stack/DECISION.mdx`, optional existing `.godpowers/build/PLAN.mdx` |
| **Outputs** | `.godpowers/build/PLAN.mdx` (vertical slices grouped into waves) |
| **Downstream consumers** | god-executor (one slice per spawn), god-spec-reviewer (reads slice plan) |
| **Artifact awareness** | Roadmap milestones, ARCH dependencies, stack tooling |
| **Handoff** | Returns when PLAN.md is complete (slices have tests-first sequences, dependencies, verification criteria) |
| **Standards check** | NO (PLAN.md is internal coordination, not a deliverable) |

### god-executor

| Field | Value |
|---|---|
| **Triggers** | god-orchestrator (per slice during /god-build), `/god-feature`, `/god-refactor`, `/god-hotfix`, `/god-upgrade`, `/god-add-tests`, `/god-update-deps` |
| **Inputs** | One slice plan from `.godpowers/build/PLAN.mdx`, relevant ARCH excerpts, stack DECISION |
| **Outputs** | Source code, test files, regression tests (in repo, not .godpowers/) |
| **Downstream consumers** | god-spec-reviewer, god-quality-reviewer |
| **Artifact awareness** | Just the slice plan and immediate context (FRESH context per slice; doesn't see other slices) |
| **Handoff** | Returns to orchestrator with tests, checks, changed files, request-trace evidence, and follow-up cleanup noticed but not touched. DOES NOT commit. Reviewers must pass first. Have-nots B-01..B-12. |
| **Standards check** | NO (reviewers serve this purpose) |

### god-spec-reviewer

| Field | Value |
|---|---|
| **Triggers** | god-orchestrator after god-executor completes a slice; `/god-review` |
| **Inputs** | The slice plan, PRD acceptance criteria, the code god-executor wrote, and request-trace evidence |
| **Outputs** | PASS or FAIL verdict (returned to orchestrator), findings if FAIL |
| **Downstream consumers** | god-quality-reviewer (only if PASS) |
| **Artifact awareness** | Slice plan, PRD requirements |
| **Handoff** | If FAIL: returns to orchestrator, which returns slice to god-executor with feedback, including scope creep or unrelated churn. If PASS: orchestrator spawns god-quality-reviewer. |
| **Standards check** | This IS the standards check (stage 1) |

### god-quality-reviewer

| Field | Value |
|---|---|
| **Triggers** | god-orchestrator after god-spec-reviewer passes; `/god-review` |
| **Inputs** | The code god-executor wrote (independent of god-spec-reviewer's reasoning) |
| **Outputs** | PASS or FAIL verdict (returned to orchestrator), findings if FAIL |
| **Downstream consumers** | god-orchestrator (commits if both PASS) |
| **Artifact awareness** | Just the code. Does NOT see other slices. |
| **Handoff** | If FAIL: orchestrator returns to god-executor, including any overcomplication, speculative abstraction, or surgicality failure. If PASS: orchestrator commits the slice atomically. |
| **Standards check** | This IS the standards check (stage 2) |

---

## Tier 3: Shipping agents

### god-deploy-engineer

| Field | Value |
|---|---|
| **Triggers** | `/god-deploy`, `/god-mode`, `/god-hotfix` (expedited mode), `/god-refactor` (gradual rollout mode), `/god-upgrade` (per-slice with metric gating) |
| **Inputs** | `.godpowers/arch/ARCH.mdx`, `.godpowers/stack/DECISION.mdx`, `.godpowers/state.json` build evidence, optional `.godpowers/org-context.yaml` |
| **Outputs** | `.godpowers/state.json` deploy evidence, CI/CD config files, optional deploy access bundle |
| **Downstream consumers** | god-observability-engineer (uses pipeline for deploy events), god-launch-strategist (verifies deploy is healthy) |
| **Artifact awareness** | ARCH topology, stack hosting choice, build artifacts |
| **Handoff** | Returns when deploy state evidence is complete and rollback procedure has been tested. Have-nots D-01..D-08. |
| **Standards check** | YES |

### god-observability-engineer

| Field | Value |
|---|---|
| **Triggers** | `/god-observe`, `/god-mode`, `/god-hotfix` (verify-symptom-resolved mode) |
| **Inputs** | `.godpowers/prd/PRD.mdx` (success metrics -> SLOs), `.godpowers/arch/ARCH.mdx`, `.godpowers/state.json` deploy evidence, optional `.godpowers/org-context.yaml` |
| **Outputs** | `.godpowers/state.json` observability evidence, alert configs, dashboard configs, runbooks |
| **Downstream consumers** | god-launch-strategist (verifies metrics ready before launch) |
| **Artifact awareness** | PRD success metrics, deploy pipeline, org observability stack |
| **Handoff** | Returns when observability state evidence is complete. Have-nots OB-01..OB-08. |
| **Standards check** | YES |

### god-harden-auditor

| Field | Value |
|---|---|
| **Triggers** | `/god-harden`, `/god-mode`, `/god-feature` (scope-to-new-code mode) |
| **Inputs** | Code, `.godpowers/state.json` deploy evidence, optional `.godpowers/org-context.yaml` (org-specific security standards) |
| **Outputs** | `.godpowers/harden/FINDINGS.mdx` |
| **Downstream consumers** | god-launch-strategist (BLOCKED on Critical findings) |
| **Artifact awareness** | Full codebase, deploy config |
| **Handoff** | Returns FINDINGS.md. If Critical: BLOCKS launch (even with --yolo). Have-nots H-01..H-11. |
| **Standards check** | YES (with carve-out: Critical findings always pause regardless of --yolo) |

### god-launch-strategist

| Field | Value |
|---|---|
| **Triggers** | `/god-launch`, `/god-mode`, `/god-feature` (feature-flag-rollout mode) |
| **Inputs** | `.godpowers/prd/PRD.mdx`, `.godpowers/harden/FINDINGS.mdx` (must have NO unresolved Criticals) |
| **Outputs** | `.godpowers/state.json` launch evidence, landing copy, OG cards, channel-specific messaging, D-7..D+7 runbook |
| **Downstream consumers** | (end of arc; no downstream consumers within Godpowers; users consume launch artifacts externally) |
| **Artifact awareness** | PRD positioning, harden findings, optional extension packs (Show HN, PH, IH, OSS) |
| **Handoff** | Returns when launch state evidence is complete. Pauses on brand voice / final headline (legitimate human-only). Have-nots L-01..L-08. |
| **Standards check** | YES |

---

## Beyond-arc agents

### god-debugger

| Field | Value |
|---|---|
| **Triggers** | `/god-debug`, `/god-hotfix` (Phase 1) |
| **Inputs** | Bug description, code, recent commits |
| **Outputs** | Regression test, fix commit |
| **Downstream consumers** | god-spec-reviewer + god-quality-reviewer (review the fix) |
| **Artifact awareness** | Code + git history |
| **Handoff** | Returns when regression test passes and full test suite is green |
| **Standards check** | NO (bug fixes have their own discipline: 4-phase systematic debug) |

### god-incident-investigator

| Field | Value |
|---|---|
| **Triggers** | `/god-postmortem` |
| **Inputs** | Logs, events.jsonl (if v0.5+), git log, hotfix commit, optional HANDOFF.md |
| **Outputs** | `.godpowers/postmortems/<id>/POSTMORTEM.mdx` |
| **Downstream consumers** | god-docs-writer (updates runbooks based on findings), action items routed to other workflows |
| **Artifact awareness** | Whole project history; all artifacts; runbooks |
| **Handoff** | Returns POSTMORTEM.md with class-of-bug + action items. Have-nots PM-01..PM-08. |
| **Standards check** | YES |

### god-spike-runner

| Field | Value |
|---|---|
| **Triggers** | `/god-spike` |
| **Inputs** | The specific question + time-box |
| **Outputs** | `.godpowers/spikes/<slug>/SPIKE.mdx` + throwaway POC code |
| **Downstream consumers** | god-pm (if user proceeds: SPIKE.md informs feature PRD) |
| **Artifact awareness** | Just the question; minimal context |
| **Handoff** | Returns when time-boxed. Recommends proceed / reject / follow-up spike. Have-nots SP-01..SP-05. |
| **Standards check** | YES (SPIKE.md must have evidence, not just claims) |

### god-migration-strategist

| Field | Value |
|---|---|
| **Triggers** | `/god-upgrade` |
| **Inputs** | Migration target (from -> to), `.godpowers/state.json` build evidence, upstream changelog |
| **Outputs** | `.godpowers/migrations/<slug>/MIGRATION.mdx` |
| **Downstream consumers** | god-planner (test gap-fill), god-executor (per-slice migration), god-deploy-engineer (gradual rollout), god-observability-engineer (metric watch) |
| **Artifact awareness** | Code surface, test coverage, upstream release notes |
| **Handoff** | Returns MIGRATION.md with phased plan. Have-nots MG-01..MG-07. |
| **Standards check** | YES |

### god-docs-writer

| Field | Value |
|---|---|
| **Triggers** | `/god-docs`, `/god-postmortem` (runbook updates), `/god-hygiene` (verify-only mode) |
| **Inputs** | Code + existing docs |
| **Outputs** | Updated docs (README, CONTRIBUTING, runbooks), `.godpowers/docs/UPDATE-LOG.mdx` |
| **Downstream consumers** | (humans reading docs) |
| **Artifact awareness** | Whole codebase |
| **Handoff** | Returns when all docs verified against code. Have-nots DC-01..DC-05. |
| **Standards check** | YES |

### god-deps-auditor

| Field | Value |
|---|---|
| **Triggers** | `/god-update-deps`, `/god-hygiene` |
| **Inputs** | `package.json` / `pyproject.toml` / `Cargo.toml` / etc., lockfiles |
| **Outputs** | `.godpowers/deps/AUDIT.mdx` |
| **Downstream consumers** | god-executor (applies patch/minor updates), `/god-upgrade` (for major bumps) |
| **Artifact awareness** | Stack decision (knows what's in scope), security advisories |
| **Handoff** | Returns AUDIT.md with classified updates. Have-nots DP-01..DP-06. |
| **Standards check** | YES |

### god-retrospective

| Field | Value |
|---|---|
| **Triggers** | `/god-sprint retro` |
| **Inputs** | Sprint PLAN.md, build/STATE.md, git log, events.jsonl |
| **Outputs** | `.godpowers/sprints/sprint-<n>/RETRO.mdx` |
| **Downstream consumers** | god-roadmapper (next sprint plan informed by retro) |
| **Artifact awareness** | Sprint context |
| **Handoff** | Returns RETRO.md with specific action items + owners + due dates |
| **Standards check** | YES |

### god-auditor

| Field | Value |
|---|---|
| **Triggers** | `/god-preflight`, `/god-audit`, `/god-hygiene`, called by orchestrator before tier transitions for gate checks, called by god-architect/etc. before they run (verify upstream passes have-nots) |
| **Inputs** | Any artifact in `.godpowers/<tier>/`; for preflight mode, repo structure, org context, docs, tests, CI, deploy, and agent instruction signals |
| **Outputs** | `.godpowers/preflight/PREFLIGHT.mdx` (preflight) OR `.godpowers/AUDIT-REPORT.mdx` (full audit) OR PASS/FAIL verdict (gate check) |
| **Downstream consumers** | Orchestrator (for routing decisions), tier agents (for gate checks) |
| **Artifact awareness** | All 157 have-nots; all tier artifact contracts; preflight lens for arc-ready, pillars, Godpowers, suite, and refactor risk |
| **Handoff** | Returns score per artifact + prioritized remediation. |
| **Standards check** | This IS the standards check |

### god-standards-check

| Field | Value |
|---|---|
| **Triggers** | Auto-spawned by orchestrating skill after artifact-producing agent completes; `/god-standards` (manual) |
| **Inputs** | Just-produced artifact + applicable have-nots list (from routing config) |
| **Outputs** | PASS / FAIL / PARTIAL verdict + findings |
| **Downstream consumers** | Orchestrating skill (decides whether to proceed) |
| **Artifact awareness** | Just the artifact; rules from references/HAVE-NOTS.md |
| **Handoff** | gate-on-failure: pause-for-user / auto-fix / warn / block (per routing config) |
| **Standards check** | This IS the standards check |

---

## Brownfield agents

### god-archaeologist

| Field | Value |
|---|---|
| **Triggers** | `/god-archaeology`, brownfield-arc workflow |
| **Inputs** | Whole codebase + git history |
| **Outputs** | `.godpowers/archaeology/REPORT.mdx` |
| **Downstream consumers** | god-reconstructor (richer reconstruction with archaeology in hand), god-debt-assessor (debt mapped to archaeological findings) |
| **Artifact awareness** | Whole codebase, git log, comments, READMEs |
| **Handoff** | Returns REPORT.md with history, decisions, conventions, risks, tribal knowledge |
| **Standards check** | YES (specific have-nots for archaeology) |

### god-reconstructor

| Field | Value |
|---|---|
| **Triggers** | `/god-reconstruct`, brownfield-arc workflow |
| **Inputs** | Whole codebase + optional archaeology REPORT.md |
| **Outputs** | `.godpowers/prd/PRD.mdx`, `.godpowers/arch/ARCH.mdx`, `.godpowers/roadmap/ROADMAP.mdx`, `.godpowers/stack/DECISION.mdx`, `.godpowers/RECONSTRUCTION-LOG.mdx` (all with confidence levels) |
| **Downstream consumers** | god-auditor (scores reconstruction), all downstream tier agents (treat reconstructed artifacts as starting point) |
| **Artifact awareness** | Whole codebase + archaeology output |
| **Handoff** | Returns reconstructed artifacts with prominent warnings. Recommends stakeholder review. |
| **Standards check** | YES (per-tier have-nots, plus reconstruction-specific) |

### god-debt-assessor

| Field | Value |
|---|---|
| **Triggers** | `/god-tech-debt`, brownfield-arc workflow |
| **Inputs** | Whole codebase + optional archaeology REPORT.md |
| **Outputs** | `.godpowers/tech-debt/REPORT.mdx` |
| **Downstream consumers** | Various: P0 items routed to /god-hotfix, /god-update-deps, /god-upgrade, /god-feature |
| **Artifact awareness** | Whole codebase, dependency state, security advisories |
| **Handoff** | Returns REPORT.md with P0/P1/P2/P3 prioritization + specific remediation commands |
| **Standards check** | YES |

---

## Bluefield agents

### god-org-context-loader

| Field | Value |
|---|---|
| **Triggers** | `/god-org-context`, bluefield-arc workflow |
| **Inputs** | User input OR auto-detected org standards |
| **Outputs** | `.godpowers/org-context.yaml` |
| **Downstream consumers** | god-stack-selector (constrains tech choices), god-architect (constrains infrastructure), god-deploy-engineer (uses org platform), god-observability-engineer (uses org stack), god-harden-auditor (uses org standards) |
| **Artifact awareness** | Org-level standards, shared libraries, shared services |
| **Handoff** | Returns org-context.yaml. Surfaces constraints to user. |
| **Standards check** | YES |

---

## Reconciliation / sync agents

### god-reconciler

| Field | Value |
|---|---|
| **Triggers** | `/god-reconcile`, auto-invoked by feature-addition recipes |
| **Inputs** | All 14 core artifact categories (graceful for missing) plus repo docs, repo surface, feature awareness, source sync-back, and host capability |
| **Outputs** | Multi-dimensional verdict (returned to caller, optionally written to .godpowers/reconciliation/) |
| **Downstream consumers** | Orchestrating skill (decides preflight commands), god-updater (knows what to update post-work) |
| **Artifact awareness** | ALL core artifacts plus local runtime and repository surfaces |
| **Handoff** | Returns status verdicts per artifact and surface plus synthesis recommendation |
| **Standards check** | YES (verifies its own thoroughness) |

### god-updater

| Field | Value |
|---|---|
| **Triggers** | `/god-sync`, auto-invoked at end of feature-addition recipes, mandatory at end of /god-mode |
| **Inputs** | Reconciliation verdict (or re-runs reconciliation), changed files, trigger type, recent commits |
| **Outputs** | Updates to any/all core artifacts, local sync logs, feature awareness, source-system summaries, and `.godpowers/SYNC-LOG.mdx` (append-only) |
| **Downstream consumers** | (no specific consumers; this is the closure step) |
| **Artifact awareness** | ALL core artifacts plus local runtime and repository surfaces |
| **Handoff** | Returns when all touched artifacts pass have-nots, local sync surfaces are reported, and SYNC-LOG.md is appended |
| **Standards check** | YES (per-artifact, per-tier) |

### god-roadmap-reconciler (legacy compatibility adapter)

| Field | Value |
|---|---|
| **Triggers** | Older installed `/god-roadmap-check` copies only; current routing spawns `god-reconciler` |
| **Inputs** | `.godpowers/roadmap/ROADMAP.mdx`, optional PRD |
| **Outputs** | ROADMAP portion of the `god-reconciler` verdict |
| **Downstream consumers** | Calling skill |
| **Artifact awareness** | Delegated to `god-reconciler` |
| **Handoff** | Spawns `god-reconciler` with ROADMAP-focused output |
| **Standards check** | YES |

### god-roadmap-updater (legacy, narrower scope)

| Field | Value |
|---|---|
| **Triggers** | `/god-roadmap-update` (legacy) |
| **Inputs** | `.godpowers/roadmap/ROADMAP.mdx`, change description |
| **Outputs** | Updated ROADMAP.md, Roadmap Changelog |
| **Downstream consumers** | (no specific) |
| **Artifact awareness** | ROADMAP only |
| **Handoff** | Same shape as god-updater but narrower |
| **Standards check** | YES |

---

## Cross-agent handoff diagram (Tier 1-3 happy path)

```
                         User intent
                              |
                              v
                      god-orchestrator
                       (mode + scale)
                              |
                              v
                          god-pm
                       writes prd/PRD.md
                              |
                              v
                      god-standards-check
                       (P-01..P-15)
                              |
                              v
                       god-architect
                       writes arch/ARCH.md + adr/
                              |
                              v
                      god-standards-check
                       (A-01..A-12)
                              |
                  ┌───────────┼───────────┐
                  |                       |
                  v                       v
            god-roadmapper      god-stack-selector
            roadmap/ROADMAP.md   stack/DECISION.md
                  |                       |
                  v                       v
              standards               standards
              (R-01..R-10)            (S-01..S-05)
                  |                       |
                  └───────────┬───────────┘
                              v
                     god-repo-scaffolder
                       repo/AUDIT.md + scaffold
                              |
                              v
                          standards
                          (RP-01..RP-08)
                              |
                              v
                        god-planner
                        build/PLAN.md
                              |
                              v (per slice in waves)
                        god-executor
                        (writes code, tests)
                              |
                              v
                    god-spec-reviewer (stage 1)
                       PASS / FAIL
                              |
                              v PASS
                    god-quality-reviewer (stage 2)
                       PASS / FAIL
                              |
                              v PASS
                       atomic commit
                              |
                              v (after all waves)
                  ┌───────────┼───────────┐
                  |                       |
                  v                       v
            god-deploy-engineer   god-harden-auditor
            deploy/STATE.md       harden/FINDINGS.md
                  |                       |
                  v                       v
              standards               standards
              (D-01..D-08)           (H-01..H-11)
                  |                       |
                  v                  Critical?
            god-observability       --no-->
              -engineer                     |
            observe/STATE.md                |
                  |                         |
                  v                         |
              standards                     |
              (OB-01..OB-08)                |
                  |                         |
                  └───────────┬─────────────┘
                              v
                    god-launch-strategist
                     launch/STATE.md
                              |
                              v
                          standards
                          (L-01..L-08)
                              |
                              v
                    god-orchestrator
                    runs MANDATORY /god-sync
                    (god-updater)
                              |
                              v
                      [STEADY STATE]
```

---

## Artifact awareness matrix

Which agents are aware of which artifacts (read-only, NOT including their own outputs):

| Agent | PRD | ARCH | ROADMAP | STACK | REPO | BUILD | DEPLOY | OBSERVE | HARDEN | LAUNCH | BACKLOG | SEEDS | TODOS | THREADS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| god-orchestrator | read | read | read | read | read | read | read | read | read | read | read | read | read | read |
| god-pm | (writes) | | | | | | | | | | | | | |
| god-architect | read | (writes) | | | | | | | | | | | | |
| god-roadmapper | read | read | (writes) | | | | | | | | | | | |
| god-stack-selector | | read | | (writes) | | | | | | | | | | |
| god-repo-scaffolder | | | | read | (writes) | | | | | | | | | |
| god-planner | | read | read | read | | (writes plan) | | | | | | | | |
| god-executor | | (excerpt) | | read | | (slice) | | | | | | | | |
| god-spec-reviewer | read | | | | | (slice) | | | | | | | | |
| god-quality-reviewer | | | | | | (slice) | | | | | | | | |
| god-deploy-engineer | | read | | read | | read | (writes) | | | | | | | |
| god-observability-engineer | read | read | | | | | read | (writes) | | | | | | |
| god-harden-auditor | | | | | | code | read | | (writes) | | | | | |
| god-launch-strategist | read | | | | | | | | read | (writes) | | | | |
| god-debugger | | | | | | code | | | | | | | | |
| god-incident-investigator | | | | | | code | | | | | | | | |
| god-spike-runner | | | | | | | | | | | | | | |
| god-migration-strategist | | | | read | | read | read | read | | | | | | |
| god-docs-writer | read | read | read | read | code | code | | | | | | | | |
| god-deps-auditor | | | | read | code | | | | | | | | | |
| god-explorer | (varies) | | | | | | | | | | | | | |
| god-retrospective | read | | read | | | read | | | | | | | | |
| god-auditor | read | read | read | read | read | read | read | read | read | read | | | | |
| god-standards-check | (just the artifact being checked) | | | | | | | | | | | | | |
| god-archaeologist | | | | | code+git | | | | | | | | | |
| god-reconstructor | (writes all) | | | | | | | | | | | | | |
| god-debt-assessor | | | | read | code | | | | | | | | | |
| god-org-context-loader | | | | (writes org-context) | | | | | | | | | | |
| **god-reconciler** | read | read | read | read | read | read | read | read | read | read | read | read | read | read |
| **god-updater** | read | read | read | read | read | read | read | read | read | read | read | read | read | read |

Legend:
- read = reads
- (writes) = primary output
- code = reads source code (not a `.godpowers/` artifact)
- (slice) = reads only the relevant slice/excerpt

The two agents with full awareness of all core artifacts plus runtime and repository sync surfaces are **god-reconciler** and **god-updater**. They're the meta-aware agents that close the consistency loop.

---

## Handoff protocols (canonical)

Every agent's handoff has one of these shapes:

### Shape 1: Single-output, success-only
Agent writes artifact, returns success.
Examples: god-pm, god-architect, god-roadmapper, god-stack-selector.

### Shape 2: Verdict-only, no artifact
Agent returns PASS/FAIL or routing recommendation.
Examples: god-spec-reviewer, god-quality-reviewer, god-router, god-standards-check.

### Shape 3: Composite (planner + workers)
Lead agent spawns workers, coordinates returns, atomic-commits on success.
Examples: god-planner orchestrates god-executor + reviewers per slice.

### Shape 4: Block-on-condition
Agent runs, but a finding can BLOCK downstream.
Examples: god-harden-auditor (Critical finding blocks /god-launch even with --yolo).

### Shape 5: Auto-resolve under --yolo
Agent has a documented default for each pause condition; under --yolo it picks the default and logs to YOLO-DECISIONS.md.
Examples: god-pm, god-architect, god-roadmapper, god-stack-selector, god-launch-strategist.

### Shape 6: Composition (calls other agents)
Agent spawns other agents in a deterministic sequence.
Examples: god-orchestrator (the workflow runner), /god-sync (god-updater calls god-pm/god-architect/etc. in update mode).

### Shape 7: Reconciliation
Agent reads multiple artifacts in parallel, returns multi-dimensional verdict.
Examples: god-reconciler, with god-roadmap-reconciler retained only as a compatibility adapter.

---

## Standards-check awareness

Which agents trigger god-standards-check after running:

| Agent | Standards check runs after? | Have-nots checked |
|---|---|---|
| god-pm | YES | P-01..P-15 |
| god-architect | YES | A-01..A-12 |
| god-roadmapper | YES | R-01..R-10 |
| god-stack-selector | YES | S-01..S-05 |
| god-repo-scaffolder | YES | RP-01..RP-08 |
| god-planner | NO (PLAN is internal) | -- |
| god-executor | NO (reviewers serve this) | -- |
| god-spec-reviewer | NO (this IS the standards check) | -- |
| god-quality-reviewer | NO (this IS the standards check) | -- |
| god-deploy-engineer | YES | D-01..D-08 |
| god-observability-engineer | YES | OB-01..OB-08 |
| god-harden-auditor | YES (with Critical carve-out) | H-01..H-11 |
| god-launch-strategist | YES | L-01..L-08 |
| god-debugger | NO (4-phase discipline serves this) | -- |
| god-incident-investigator | YES | PM-01..PM-08 |
| god-spike-runner | YES | SP-01..SP-05 |
| god-migration-strategist | YES | MG-01..MG-07 |
| god-docs-writer | YES | DC-01..DC-05 |
| god-deps-auditor | YES | DP-01..DP-06 |
| god-archaeologist | YES | (specific to archaeology) |
| god-reconstructor | YES | (per-tier + reconstruction) |
| god-debt-assessor | YES | (specific to debt) |
| god-org-context-loader | YES | (specific to org) |
| god-reconciler | YES (validates own thoroughness) | -- |
| god-updater | YES (per touched artifact) | (varies by tier) |
| Reviewers + auditor + standards-check | NO (these ARE checks) | -- |

---

## Summary: where to find each piece of agent behavior

| Need | Source |
|---|---|
| Per-agent prose instructions | `agents/<name>.md` |
| Per-command routing (prereqs, next, agents spawned) | `<runtimeRoot>/routing/<command>.yaml` |
| Workflow DAGs | `<runtimeRoot>/workflows/<workflow>.yaml` |
| Recipes (intent → command sequences) | `<runtimeRoot>/routing/recipes/<recipe>.yaml` |
| Have-nots catalog | `references/HAVE-NOTS.md` |
| Skill-to-agent mapping (visual) | `ARCHITECTURE-MAP.md` |
| Cross-workflow integrations | `docs/arc-integrations.md` |
| Per-command E2E flows | `docs/command-flows.md` |
| Scenario recipes (human-readable) | `docs/recipes.md` |
| **Per-agent specifications (this document)** | **docs/agent-specs.md** |
| Greenfield artifact coverage | `docs/greenfield-coverage.md` |
| Brownfield/bluefield modes | `docs/brownfield-bluefield.md` |
| Architecture decisions | `ARCHITECTURE.md` |
| Concepts and vocabulary | `docs/concepts.md` |

This document (agent-specs.md) is the single place to look up: **for any agent, who calls it, what it reads, what it writes, who reads its output, and how it hands off.**

---

## Agents added in v0.5 - v0.11 (post-initial release)

These specs cover the design, runtime, and AI-tool-context agents
added during the production-ready + design + linkage push.

### god-designer

| Field | Value |
|---|---|
| **File** | `agents/god-designer.md` |
| **Triggers** | `/god-design`, `/god-design teach`, `/god-design from <site>`, `/god-design suggest`, `/god-design refresh`, `/god-design polish [...]`, `/god-mode` Tier 1 (when UI detected) |
| **Inputs** | PRD.md (target users, register), ARCH.md (UI surface), STACK/DECISION.md (UI framework), state.json |
| **Outputs** | `DESIGN.md` (project root, Google Labs spec), `PRODUCT.md` (when impeccable installed), `.godpowers/state.json` design evidence, generated `.godpowers/design/STATE.mdx` |
| **Downstream consumers** | god-design-reviewer (gates the change), impact analysis (`lib/impact.js` runtime, not a spawned agent), god-updater (reverse-sync), repo scaffolder (token references in templates) |
| **Artifact awareness** | Reads PRD, ARCH, STACK; writes DESIGN, PRODUCT |
| **Standards check** | Validates with `lib/design-spec.lint`, `npx @google/design.md lint`, and `npx impeccable detect` (when installed) |
| **Handoff** | Returns to god-orchestrator with DESIGN.md path + validation summary; suggested next is `/god-repo` |

### god-design-reviewer

| Field | Value |
|---|---|
| **File** | `agents/god-design-reviewer.md` |
| **Triggers** | Spawned by god-design-updater BEFORE impact analysis; spawned by god-orchestrator on mid-arc DESIGN/PRODUCT change detection |
| **Inputs** | DESIGN.md diff (old vs new), PRODUCT.md (for register, brand, anti-references) |
| **Outputs** | Verdict: PASS / WARN / BLOCK; appends to `.godpowers/design/REJECTED.mdx` on BLOCK |
| **Downstream consumers** | god-design-updater (continues only on PASS or WARN); god-orchestrator (BLOCK pauses both default and --yolo as critical-finding gate trigger) |
| **Artifact awareness** | Reads PRD, PRODUCT, DESIGN |
| **Standards check** | Stage 1 (spec): impeccable critique against PRODUCT register; Stage 2 (quality): design-spec lint + impeccable audit + WCAG contrast |
| **Handoff** | Verdict + REJECTED.md path back to god-design-updater; emits `design.review-verdict` event |

### god-design-updater

| Field | Value |
|---|---|
| **File** | conceptually owned by `god-updater.md` (reverse-sync section); design-specific path lives in `lib/impact.js` + `lib/review-required.js` |
| **Triggers** | DESIGN.md or PRODUCT.md change detected (mid-arc, /god-sync, post-impeccable-command) |
| **Inputs** | DESIGN.md diff, linkage map |
| **Outputs** | Updates DESIGN.md fence footer; populates REVIEW-REQUIRED.md with affected files; emits `runtime.review-needed` events |
| **Downstream consumers** | god-design-reviewer (gates), `lib/impact.js` (computes affected files; runtime module, not a spawned agent), reverse-sync pipeline |
| **Artifact awareness** | Reads/writes DESIGN; reads PRD, ARCH; reads/writes REVIEW-REQUIRED |
| **Standards check** | Inherits god-design-reviewer's gate verdict |
| **Handoff** | After PASS/WARN verdict: continues to impact analysis -> REVIEW-REQUIRED.md -> reverse-sync. After BLOCK: aborts propagation. |

### god-browser-tester

| Field | Value |
|---|---|
| **File** | `agents/god-browser-tester.md` |
| **Triggers** | `/god-test-runtime`, `/god-build` (post-wave, optional), `/god-launch` (mandatory gate), `/god-harden` (a11y portion), `/god-design` (post-change runtime audit) |
| **Inputs** | URL (live dev server, deploy preview, or production); DESIGN.md (for design audit); PRD.md (for acceptance criteria); project root |
| **Outputs** | `.godpowers/runtime/<run-id>/audit-report.json` (design verification), `test-report.json` (functional verification), `screenshots/<page>.png`, `summary.md` |
| **Downstream consumers** | god-orchestrator (launch gate), god-updater (REVIEW-REQUIRED population), state.json runtime slot |
| **Artifact awareness** | Reads DESIGN, PRD; writes runtime reports; populates REVIEW-REQUIRED.md |
| **Standards check** | WCAG AA contrast on real DOM; component drift > 10%; P-MUST-* acceptance flow failures (all are critical-finding gate triggers) |
| **Handoff** | Returns to spawner with run ID, backend used, audit + test summaries, paths to reports; suggested next is `/god-review-changes` if findings populated |

### god-context-writer

| Field | Value |
|---|---|
| **File** | `agents/god-context-writer.md` |
| **Triggers** | `/god-context on/off/status`, `/god-init` (automatic quiet write), generic init triggers (one-time consent prompt, then quiet write), `/god-sync` (quiet auto-refresh unless never-ask) |
| **Inputs** | state.json (project name, mode, scale, linkage state), DESIGN.md and PRODUCT.md presence, detected AI tools |
| **Outputs** | Fenced sections in AGENTS.md (canonical), CLAUDE.md, GEMINI.md, .cursor/rules/godpowers.mdc, .windsurfrules, .github/copilot-instructions.md, .clinerules, .roo/, .continue/ (only when their tool is detected) |
| **Downstream consumers** | AI coding tools reading the project on cold session start |
| **Artifact awareness** | Reads state.json + .godpowers/links/; writes only inside `<!-- godpowers:begin --> ... <!-- godpowers:end -->` fences |
| **Standards check** | Detect-then-write: never creates files for tools without their config dir; never overwrites user content outside the fence; idempotent |
| **Handoff** | Returns compact success to `/god-init` and `/god-sync`; returns results summary only for explicit `/god-context` commands |

---

## Agents added in v0.12+ (suite, stories, migration, automation)

These specs cover the multi-repo suite coordinator, story decomposition,
greenfieldification, and host-automation agents added after v0.11.

### god-coordinator

| Field | Value |
|---|---|
| **File** | `agents/god-coordinator.md` |
| **Triggers** | `/god-suite-init`, `/god-suite-status`, `/god-suite-sync`, `/god-suite-release`, `/god-suite-patch` |
| **Inputs** | Suite manifest (`.godpowers/suite-config.yaml` at the hub), per-repo `state.json` files, suite operation request, optional `.godpowers/runs/<run-id>/COORDINATOR-HANDOFF.mdx` |
| **Outputs** | Suite coordination state (`lib/suite-state.refreshFromRepos`), per-repo orchestrator handoff files, suite release or sync report |
| **Downstream consumers** | Per-repo god-orchestrator (spawned for project-run work inside each repo); suite status readers |
| **Artifact awareness** | Reads per-repo state.json files; never modifies a repo's state.json directly (each orchestrator owns its own) |
| **Standards check** | Gates: per-repo orchestrator ownership, byte-identical file sync verification, suite meta-linter results (`lib/meta-linter.runAll`) |
| **Handoff** | Returns suite-level status and per-repo next actions; never bypasses individual orchestrators (the Quarterback rule holds per-repo) |

### god-storyteller

| Field | Value |
|---|---|
| **File** | `agents/god-storyteller.md` |
| **Triggers** | `/god-story`, `/god-feature --with-stories` |
| **Inputs** | User story prompt or feature decomposition; PRD.md and ARCH.md for context; optional existing STORY-*.md files to chain into (deps) |
| **Outputs** | `.godpowers/stories/<feature-slug>/STORY-<NNN>.mdx` (user story, acceptance criteria, initial slice plan) |
| **Downstream consumers** | `/god-story-build` (implements the story), `/god-story-verify`, `/god-story-close` |
| **Artifact awareness** | Reads PRD, ARCH; links stories to PRD requirement ids via `requirement:` frontmatter |
| **Standards check** | Gates: user-story format, runtime-test-friendly acceptance criteria, linkage participation |
| **Handoff** | Returns story artifact path plus suggested build or feature next step |

### god-greenfieldifier

| Field | Value |
|---|---|
| **File** | `agents/god-greenfieldifier.md` |
| **Triggers** | brownfield-arc and bluefield-arc workflows, god-orchestrator, `/god-migrate` (conditional spawn for low-confidence or conflicting imports) |
| **Inputs** | `.godpowers/audit/GREENFIELD-SIMULATION.mdx`, `.godpowers/prep/INITIAL-FINDINGS.mdx` and `IMPORTED-CONTEXT.mdx` (when present), existing canonical artifacts, `.godpowers/state.json` |
| **Outputs** | `.godpowers/audit/GREENFIELDIFY-PLAN.mdx` (written before any artifact edit), approved canonical artifact updates |
| **Downstream consumers** | god-orchestrator (resumes the arc with migrated artifacts); planning agents reading the updated canon |
| **Artifact awareness** | Reads the audit and every existing canonical artifact before recommending a rewrite; disk state is authoritative |
| **Standards check** | Gates: user approval before rewriting artifacts, state.json handoff authority, greenfieldification rules |
| **Handoff** | Returns migrated artifacts and remaining brownfield or bluefield gaps |

### god-automation-engineer

| Field | Value |
|---|---|
| **File** | `agents/god-automation-engineer.md` |
| **Triggers** | `/god-automation-setup` (after the user approves provider, template ids, cadence, and scope) |
| **Inputs** | Approved automation setup plan, host provider choice, `.godpowers/state.json`, existing `.godpowers/automations.json` |
| **Outputs** | `.godpowers/automations.json` (successful automations only), host-native automation configuration |
| **Downstream consumers** | `/god-automation-status` (reports active automations); `lib/automation-providers.js` consumers |
| **Artifact awareness** | Reads automations.json and state.json; touches only confirmed host automation surfaces, never invents OS scheduling |
| **Standards check** | Gates: explicit user approval, provider verification, no unverified background claims |
| **Handoff** | Returns successful automation ids or a hard-stop blocker (missing approval field, no callable host surface) |

---

## External integration map

5 integrations, all detect-and-delegate, none vendored:

| Integration | Source | Bridge module | Used by |
|---|---|---|---|
| Google Labs design.md | github.com/google-labs-code/design.md | `lib/design-spec.js` (we implement the parser) | god-designer, god-design-reviewer |
| Impeccable | github.com/pbakaus/impeccable | `lib/impeccable-bridge.js` | god-designer, god-design-reviewer |
| awesome-design-md | github.com/VoltAgent/awesome-design-md | `lib/awesome-design.js` (catalog metadata vendored; content lazy-fetched) | god-designer (when site reference detected) |
| SkillUI | npmjs.com/package/skillui | `lib/skillui-bridge.js` | god-designer (fallback when site not in catalog) |
| vercel-labs/agent-browser + Playwright | github.com/vercel-labs/agent-browser, microsoft/playwright | `lib/browser-bridge.js`, `lib/agent-browser-driver.js` | god-browser-tester (runtime verification) |

When external integration is absent, the system falls back to internal
references (`references/design/*` for design intelligence) or
graceful degradation (e.g., runtime verification reports
`no-backend-available` with install instructions).
