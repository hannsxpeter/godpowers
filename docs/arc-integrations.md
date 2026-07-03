# Deep Workflow Integrations

> How 13 executable workflows, 44 intent recipes, and 120 slash commands
> compose, hand off, and trigger each other across a project's full lifecycle.

The workflows are not isolated. They form a connected graph that follows real
project lifecycles: greenfield -> steady state -> incident -> recovery ->
back to steady. This document walks every meaningful integration path.

---

## The Lifecycle Graph (high level)

```
                              [User has an idea]
                                       |
                                       v
                          ┌────────/god-explore────────┐
                          |  (optional pre-init        |
                          |   ideation, time-boxed)    |
                          └─────────────┬──────────────┘
                                        |
                                        v
                                  /god-init
                                  (mode + scale)
                                        |
                              ┌─────────┴──────────┐
                              |                    |
                 Mode A: Greenfield     Mode B: Gap-fill
                              |                    |
                              v                    v
                       /god-mode (full-arc)   [Detect existing
                              |                artifacts; skip
                              |                done tiers]
                              |                    |
                              v                    v
                    [Tier 1: PRD->ARCH->ROADMAP->STACK]
                              |
                              v
                    [Tier 2: REPO->BUILD]
                              |
                              v
                    [Tier 3: DEPLOY->OBSERVE->HARDEN->LAUNCH]
                              |
                              | (optional --with-hygiene runs
                              |  /god-hygiene at end)
                              |
                              v
                       [STEADY STATE]
                              |
            ┌─────────────────┼─────────────────┐
            |                 |                 |
            v                 v                 v
        /god-feature     /god-hotfix      /god-refactor
        /god-spike       /god-postmortem  /god-upgrade
        /god-docs        /god-update-deps /god-hygiene
        /god-audit       /god-debug       /god-dogfood
            |                 |                 |
            └─────────────────┼─────────────────┘
                              v
                     [back to steady state]
```

---

## Integration 1: /god-mode -> Steady State Hand-off

**Trigger**: /god-mode (full-arc) Launch tier completes successfully.

**What happens**:
1. god-orchestrator marks all tiers `done` in state.json
2. lifecycle-phase transitions: `in-arc` -> `steady-state-active`
3. Orchestrator emits transition message listing 11 ongoing workflows
4. PROGRESS.mdx gets a footer pointing to /god-feature, /god-hotfix, etc.

**State changes**:
```
state.json:
  lifecycle-phase: in-arc -> steady-state-active
  tiers.tier-3.launch.status: pending -> done

events.jsonl:
  workflow.complete  attrs={workflow: full-arc, exit: success}
  state.transition   attrs={from: in-arc, to: steady-state-active}
```

**Next likely commands**: any of /god-feature, /god-hygiene, /god-update-deps.

---

## Integration 2: /god-feature -> Existing Project Tiers

**Trigger**: User runs /god-feature with `.godpowers/` already initialized.

**Skips**:
- /god-init (already initialized)
- /god-stack (existing stack used)
- /god-repo (already scaffolded)

**Re-uses**:
- Existing PRD as base (mini-PRD appends to features/<slug>/PRD.md)
- Existing ARCH unless feature requires architectural delta
- Existing deploy pipeline

**Adds**:
- features/<feature-slug>/PRD.md
- features/<feature-slug>/ARCH-DELTA.md (if needed)
- New build slices in build/PLAN.md
- New harden findings (scoped to new code only)

**Pause points**:
- If the feature needs a new architectural component: spawns god-architect
  with mode=delta-only
- If the feature touches harden-critical code: god-harden-auditor runs

---

## Integration 3: /god-hotfix -> /god-postmortem (48h trigger)

**Trigger chain**:
```
/god-hotfix completes
   |
   v
god-orchestrator schedules postmortem with due=48h
   |
   v
state.json: lifecycle-phase = post-incident-pending
events.jsonl: postmortem.scheduled attrs={due: ISO 8601 +48h}
   |
   v
   [48 hours pass]
   |
   v
SessionStart hook detects post-incident-pending state
   |
   v
Hook prints: "REQUIRED: /god-postmortem within 48 hours
              for incident <id>"
   |
   v
User runs /god-postmortem
   |
   v
god-incident-investigator runs:
   - Build timeline from events.jsonl
   - Identify root cause + class-of-bug
   - Draft action items with owners + due dates
   - Update runbooks via god-docs-writer
   |
   v
state.json: lifecycle-phase = steady-state-active (transition back)
events.jsonl: postmortem.complete
```

**Why this matters**: hotfix without postmortem is a have-not (PM-08).
The system enforces the pairing.

**Carve-out**: if user explicitly skips with `/god-skip postmortem --reason "..."`,
audit trail shows the skip but no automatic re-trigger.

---

## Integration 4: /god-update-deps -> /god-upgrade (for majors)

**Trigger**: god-deps-auditor finds major version bumps.

**Routing logic**:
```
god-deps-auditor classifies each outdated dep:
   |
   ├── Critical CVE     -> handled in /god-update-deps (security)
   ├── Patch update     -> handled in /god-update-deps (batched)
   ├── Minor update     -> handled in /god-update-deps (per-package)
   └── Major update     -> DEFERRED, route to /god-upgrade
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                            One /god-upgrade per major bump
```

**Output**:
```
.godpowers/deps/AUDIT.mdx (from /god-update-deps):

## Deferred to /god-upgrade
| Package | Current | Target | Recommended workflow |
|---------|---------|--------|---------------------|
| react | 17.x | 18.x | /god-upgrade |
| node | 18.x | 20.x | /god-upgrade |
```

**User then runs**:
```
/god-upgrade
> What's the migration target?
> "React 17 -> React 18"
```

**Why**: major bumps are mini-migrations. Should not be batched. Should
have expand-contract pattern. /god-upgrade enforces this.

---

## Integration 5: /god-spike -> /god-feature (when conclusive)

**Trigger**: god-spike-runner produces a recommendation.

**Decision tree**:
```
SPIKE.md status:
   |
   ├── resolved + recommend "proceed"
   |     -> Suggest /god-feature with the recommendation
   |     -> User accepts: /god-feature (with spike findings as input)
   |     -> User declines: archive spike
   |
   ├── resolved + recommend "do not proceed"
   |     -> Document why; archive
   |     -> No follow-up
   |
   ├── inconclusive
   |     -> Suggest follow-up /god-spike with narrower question
   |     -> User runs another spike OR drops the question
   |
   └── time-boxed-out
         -> Honest report
         -> Suggest narrower spike or accept uncertainty
```

**Critical rule**: spike code MUST NOT merge to main. Even if recommended
"proceed", the feature is rebuilt cleanly via /god-feature, not by
elevating spike code.

This prevents the "throwaway code becomes production code" antipattern
that's a common have-not (SP-05).

---

## Integration 6: /god-refactor -> Test Coverage Gap-Fill -> Refactor Slices

**Trigger**: User runs /god-refactor on legacy code with insufficient test
coverage.

**Two-phase response**:

**Phase 1: Coverage check**
```
god-explorer scopes the refactor
   |
   v
god-auditor runs in test-coverage mode:
   - Walk affected surface
   - Compute coverage
   - If < threshold: PAUSE
```

**Phase 2: User decision**
```
PAUSE: Test coverage on affected surface is 32%. Refactor without tests
       is high-risk for regression.

Options:
  A: Add tests first (routes to /god-add-tests scoped to affected surface)
  B: Proceed with refactor anyway (logged as accepted-risk)
  C: Cancel refactor

Default: A (add tests first)
```

**If A**: god-planner plans test-only slices. god-executor adds tests.
THEN god-planner re-plans the refactor slices.

**If B**: log accepted-risk to state.json, proceed.

**If C**: cancel; state unchanged.

---

## Integration 7: /god-postmortem -> Action Items -> /god-feature/etc

**After postmortem completes**:
```
.godpowers/postmortems/<id>/POSTMORTEM.mdx contains action items
   |
   v
For each P0 action item:
   |
   ├── If "fix bug X": route to /god-feature or /god-debug
   ├── If "add monitoring for Y": route to /god-observe (re-run)
   ├── If "update runbook Z": route to /god-docs
   └── If "audit similar code": route to /god-audit + /god-feature
```

**Action items get cross-referenced**: each item appears in
.godpowers/todos/TODOS.mdx with priority and source link to the postmortem.

User runs /god-check-todos -> sees postmortem items -> selects one ->
appropriate workflow spawns.

---

## Integration 8: /god-hygiene -> Composite of Three Audits

**Trigger**: User runs /god-hygiene (manually or scheduled).

**Three sub-audits in parallel**:
```
                  /god-hygiene
                       |
       ┌───────────────┼───────────────┐
       |               |               |
       v               v               v
   god-auditor    god-deps-       god-docs-writer
   (artifact      auditor         (verify-only)
    quality)      (no updates)
       |               |               |
       v               v               v
  AUDIT-REPORT.md  deps/AUDIT.md   docs/UPDATE-LOG.md
       |               |               |
       └───────────────┼───────────────┘
                       v
              god-orchestrator composes
              HYGIENE-REPORT.md
                       |
                       v
              Suggested actions (prioritized)
```

**Composite report includes**:
- Health score (composite 0-100)
- Top action across all three audits
- Per-category drill-down
- Schedule for next hygiene check

**Why this matters**: hygiene is the "how is the project doing?" command.
One slash command, three perspectives, one prioritized action list.

---

## Integration 9: /god-upgrade -> Multiple Sub-workflows

**The most complex integration**. /god-upgrade orchestrates 5 phases:

```
/god-upgrade
   |
   v
Phase 1: Strategy (god-migration-strategist)
   - Reads upstream changelog
   - Assesses risk per breaking change
   - Drafts MIGRATION.md
   |
   | gates on: test coverage sufficient?
   |
   ├── No: route to Phase 1.5
   |
   v
Phase 1.5: Test coverage gap-fill (god-planner + god-executor)
   - Plan test-only slices
   - Execute (TDD on tests themselves)
   - Verify coverage > threshold
   |
   v
Phase 2: Expand (god-executor)
   - Introduce new version alongside old
   - Add abstraction layer
   - Tests cover both paths
   |
   v
Phase 3: Migrate slices (LOOP)
   For each slice:
   - god-executor migrates
   - god-spec-reviewer + god-quality-reviewer
   - god-deploy-engineer with feature flag (1-10-50-100)
   - god-observability-engineer monitors metrics
   - 24h watch window
   - If metrics regress: rollback this slice, investigate
   - If clean: next slice
   |
   v
Phase 4: Contract (god-executor)
   - Verify 100% on new path
   - Remove old code
   - Atomic commit
```

**This is `/god-mode`-level complexity, but for a different purpose**:
greenfield builds new; upgrade migrates existing without breaking.

---

## Integration 10: /god-audit -> /god-redo on Failures

**When /god-audit finds failures**:
```
.godpowers/AUDIT-REPORT.mdx contains:
  PRD: 75% (2 have-nots failing)
  ARCH: 100%
  ROADMAP: 90% (1 have-not failing)

User runs /god-next or sees recommendations:
  "PRD scored 75%. Run /god-redo prd to address 2 failures
   before continuing downstream work."

User runs /god-redo prd
   |
   v
god-orchestrator:
   - Marks PRD as in-flight
   - Marks downstream tiers (ARCH, ROADMAP, STACK, etc.) also in-flight
     (they consumed the broken PRD)
   - Re-spawns god-pm with the failure feedback
   |
   v
god-pm fixes the issues
   |
   v
Once PRD passes: orchestrator re-runs downstream tiers
   |
   v
Eventually back to steady state
```

**Why**: a failing upstream invalidates downstream. The system enforces
the cascade.

---

## Integration 11: Workstream Branching and Merging

**Use case**: Two engineers working on parallel features.

**Setup**:
```
Engineer A: /god-workstream new feature-x
Engineer B: /god-workstream new feature-y
```

**State**:
```
.godpowers/
  workstreams/
    main/
      state.json (steady state)
    feature-x/
      state.json (in-arc, building feature)
    feature-y/
      state.json (in-arc, building feature)
```

**Each workstream has its own**: state, events, build PLAN, slices.

**Merge** (when feature-x ships):
```
/god-workstream merge feature-x
   |
   v
1. Verify feature-x has no incomplete sub-steps
2. Spawn god-spec-reviewer + god-quality-reviewer on the full diff
3. If pass: merge to main, archive feature-x state
4. If fail: report findings, no merge
```

**Conflict resolution**: if feature-x and feature-y both touch the same
files, the second to merge gets a conflict. /god-workstream surfaces this.

---

## Integration 12: Extension Activation Path

**Lazy activation**: extension files don't load until invoked.

```
User types: /god-soc2-audit
   |
   v
AI tool checks installed skills
   |
   ├── Skill found at extensions/security-pack/skills/god-soc2-audit.md
   |
   v
Skill loads (lazy: only this skill, not the whole pack)
   |
   v
Skill spawns god-soc2-auditor agent
   (lazy: only this agent loads, not all 3)
   |
   v
Agent reads SOC2 reference content
   (lazy: only what's needed)
   |
   v
Agent runs audit, writes findings
```

**Why lazy**: a user with security-pack + launch-pack + data-pack
installed has 10 extra skills, 10 extra agents, but none of them load
into context until invoked. Zero cost when unused.

---

## Integration 13: --yolo Across Workflows

**Default behavior**: --yolo flag passed to god-orchestrator propagates to
all spawned agents.

**Per-workflow handling**:
```
/god-mode --yolo
   |
   v
god-orchestrator runs with yolo=true
   |
   ├── god-auditor called with mode=preflight for brownfield/bluefield
   |   -> Writes .godpowers/preflight/PREFLIGHT.mdx
   |   -> Auto-follows safest recommended route
   |   -> Logs route choice to YOLO-DECISIONS.mdx
   |
   ├── god-pm called with yolo=true
   |   -> Auto-picks default at every pause
   |   -> Logs to YOLO-DECISIONS.mdx
   |
   ├── god-architect called with yolo=true
   |   -> Same pattern
   |
   ├── god-stack-selector called with yolo=true
   |   -> Auto-picks the lower-lock-in option on ties
   |
   ├── god-planner called with yolo=true (spawns the build workers)
   |   -> god-executor with yolo=true: still TDD-strict (TDD never bypassed)
   |   -> god-spec-reviewer / god-quality-reviewer: still independent
   |
   └── god-harden-auditor called with yolo=true
       -> Critical findings STILL pause (the carve-out)
```

**The --yolo carve-outs are Critical security findings and impossible
preflight routing contradictions**. Critical security findings always pause.
Preflight only pauses when repo evidence cannot support any safe next route.

**For other workflows**:
- /god-hotfix --yolo: skips review pauses but TDD still enforced
- /god-refactor --yolo: skips coverage threshold pause (proceeds at risk)
- /god-upgrade --yolo: skips per-slice metric pauses (rolls 1->100% instead of staged)

---

## Integration 14: Capture System (todos, notes, backlog, seeds)

These don't fire workflows directly; they capture intent for later routing.

```
                User mid-flow
                     |
                     v
        ┌────────────┼────────────┐
        |            |            |
        v            v            v
   /god-note   /god-add-todo  /god-add-backlog  /god-plant-seed
   (zero-      (with priority)  (long-term)    (with trigger
    friction)                                    condition)
        |            |            |                  |
        v            v            v                  v
   notes/      todos/        backlog/         seeds/<id>.md
   NOTES.md    TODOS.md      BACKLOG.md
        |            |            |                  |
        |            v            |                  |
        |     /god-check-todos   |                  |
        |     (review + route)   |                  |
        |            |            |                  |
        |            v            |                  |
        |     [routes to right    |                  |
        |      workflow based     |                  |
        |      on todo nature]    |                  |
        |                         v                  |
        |                /god-add-backlog            |
        |                (promote to active)         |
        |                                            v
        |                              /god-plant-seed check
        |                              (when triggers fire,
        |                               surface idea)
        |
        v
   /god-note promote <n>  -> promotes note to todo
```

**Why this exists**: real users have ideas mid-flow. Capturing without
breaking flow is the entire point. Routing happens later when convenient.

---

## Integration 15: Mode B Specific Routing

**When user runs /god-mode in an existing codebase**:

```
god-orchestrator detects: package.json + src/ + tests/ exist
   |
   v
Mode = B (gap-fill)
   |
   v
For each canonical artifact path: check if exists
   |
   ├── PRD missing  -> ask user about the product, then /god-prd
   ├── ARCH missing -> after PRD, /god-arch
   ├── REPO done    -> mark imported, skip /god-repo
   ├── BUILD partial-> /god-status to clarify; user fixes manually
   ...
   |
   v
Run only the missing tiers
   |
   v
Treat existing codebase as committed work; treat existing artifacts
as `imported` (status flag)
```

**Critical**: don't overwrite existing artifacts in Mode B without explicit
user confirmation. The user's existing PRD wins; we don't replace it.

---

## Sequence: A Realistic Project Year

Combining all integrations into one timeline:

```
Day 0:    /god-init (Mode A, scale=medium)
Day 0-3:  /god-mode (full-arc)
          - Pauses 5 times for human-only decisions
          - Ships V1 to production

Day 7:    /god-hygiene (first weekly check; clean)

Day 14:   /god-feature "Add CSV export"
          - Mini-PRD, no ARCH delta needed
          - 3 build slices, 3 atomic commits
          - Soft launch behind feature flag

Day 18:   PRODUCTION INCIDENT
          - /god-hotfix
          - god-debugger finds root cause in 25 min
          - Regression test + minimal fix
          - Two-stage review (compressed)
          - Expedited deploy
          - Postmortem scheduled for Day 20

Day 20:   /god-postmortem
          - god-incident-investigator builds timeline
          - Identifies class-of-bug: missing input validation
          - Action items P0: audit all input validation
          - Routes to: /god-feature "audit + fix input validation"

Day 21-25: /god-feature for the input validation work

Day 30:   /god-hygiene
          - deps audit shows 2 majors behind
          - Suggests /god-upgrade for each

Day 31-40: /god-upgrade for React 17->18
          - god-migration-strategist plans
          - Test gap-fill (3 days)
          - Expand phase
          - Migrate 8 slices (1 wk with metric watch)
          - Contract phase
          - 100% on new version

Day 60:   First /god-extract-learnings
          - Captures decisions, lessons, patterns from Q1

Day 90:   /god-soc2-audit (security-pack extension)
          - Found 2 significant deficiencies
          - Routed to /god-feature for remediation

Day 100:  /god-show-hn (launch-pack extension)
          - Drafted post
          - Launched at 9 AM ET Tuesday
          - 4-hour engagement window
          - 23 comments, 1 follow-up post

[steady state continues]
```

Every workflow has a place in this lifecycle. No workflow exists in
isolation.

---

## Summary: The Connection Graph in One Pattern

Every workflow follows the same shape:

```
1. Skill loads (thin)
2. Skill spawns specialist agent(s) in fresh context(s)
3. Agent reads upstream artifacts + state.json
4. Agent does focused work
5. Agent writes artifact to .godpowers/<tier>/
6. Skill verifies (artifact exists, have-nots pass)
7. Skill updates state.json + events.jsonl
8. Local helpers refresh visible state when directly triggered:
   - checkpoint sync
   - repo documentation sync
   - repo surface sync
   - host capability detection
   - dogfood runner when requested
   - named helper groups, expanded into explicit plan helpers
9. Skill suggests next workflow based on:
   - State of disk
   - Lifecycle phase
   - Outcome of this workflow
   - User intent (if disambiguation needed)
```

This is the universal pattern. 13 executable workflows, 44 recipes, 120 slash
commands, and 40 agents. One coherent system.
