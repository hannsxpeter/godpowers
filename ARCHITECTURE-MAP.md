# Godpowers Architecture Map

> Visual reference for how everything connects.
> 4 layers, 112 slash commands, 40 agents, 13 workflows, 42 recipes, executable release gates.

---

## The 4-Layer Architecture

```
   Layer 1: SLASH COMMANDS (skills/)              <- User surface
   ┌─────────────────────────────────────────────┐
   │  /god  /god-mode  /god-prd  /god-arch       │
   │  /god-build  /god-feature  /god-hotfix ...   │
   └─────────────────────────────────────────────┘
                       |
                       | Each skill spawns
                       v
   Layer 2: SPECIALIST AGENTS (agents/)           <- Workers
   ┌─────────────────────────────────────────────┐
   │  god-orchestrator  god-pm  god-architect    │
   │  god-executor  god-spike-runner  god-...    │
   │     (each in fresh 200K context window)     │
   └─────────────────────────────────────────────┘
                       |
                       | Agents produce
                       v
   Layer 3: ARTIFACTS (.godpowers/)               <- Disk state
   ┌─────────────────────────────────────────────┐
   │  state.json  events.jsonl  intent.yaml      │
   │  prd/PRD.md  arch/ARCH.md  build/STATE.md   │
   │  postmortems/  spikes/  migrations/  ...    │
   └─────────────────────────────────────────────┘
                       |
                       | Validated against
                       v
   Layer 4: SCHEMAS + REFERENCES + GATES          <- Knowledge
   ┌─────────────────────────────────────────────┐
   │  schema/{intent,state,events,workflow}.json │
   │  references/HAVE-NOTS.md                    │
   │  release, route, doc, dogfood gate helpers  │
   │  references/{planning,building,...}/        │
   └─────────────────────────────────────────────┘
```

---

## Connectivity Audit Map

`ARCHITECTURE.md` owns the architecture audit playbook. This map shows the
same connectivity as a graph that can be checked by executable tests.

```
skills/*.md
    |
    v
routing/*.yaml
    |
    +--> agents/god-*.md
    |
    +--> built-in runtime helpers
    |
    v
workflows/*.yaml
    |
    v
routing/recipes/*.yaml
    |
    v
docs/command-flows.md
    |
    v
package.json + scripts/check-package-contents.js
```

### What counts as disconnected

```
Command gap:
  skill missing route
  route missing skill
  route missing standards policy
  contextual route exit missing typed outcome metadata

Action gap:
  route spawns symbolic agent token
  route references missing agent
  agent-spawning route lacks agent.start or agent.end trace event
  local helper runs without a visible owner, artifact, log, or no-op reason

Workflow gap:
  workflow cannot load or plan
  workflow helper is hidden from the serialized plan
  recipe has no slash-command route
  recipe references an unavailable command
```

### Executable audit commands

```
node scripts/test-repo-surface-sync.js
node scripts/test-automation-surface-sync.js
node scripts/test-workflow-runner.js
node scripts/test-router.js
node scripts/test-recipes.js
npm run test:audit
npm run pack:check
```

Current checked status:

```
repo-surface: fresh
route-quality: fresh
recipe-coverage: fresh
workflows: 13 loaded and planned
```

### Sync helper vocabulary

[DECISION] This map uses workflow schema names for canonical helper IDs and
keeps shorter `/god-sync` output names as aliases where users see them.

```
checkpoint-sync       -> CHECKPOINT.md refresh
dogfood-runner        -> messy-repo fixture runner
feature-awareness     -> runtime capability refresh
host-capabilities     -> host feature detection
pillars-sync-plan     -> shown as pillars-sync in /god-sync output
recipe-coverage-sync  -> recipe to command coverage check
release-surface-sync  -> release gate and package surface check
repo-doc-sync         -> public docs, badges, counts, and version check
repo-surface-sync     -> skills, routes, agents, workflows, recipes, package
route-quality-sync    -> route spawn, standards, and next-exit check
source-sync-back      -> shown as source-sync in /god-sync output
```

---

## Skill -> Agent Mapping (the spawn graph)

### Lifecycle commands
```
/god              -> built-in recipe and router front door
/god-init         -> built-in + import detection
/god-status       -> reads state.json directly
/god-next         -> built-in routing logic + action brief
/god-help         -> built-in
/god-doctor       -> built-in + scoped specialist suggestions
/god-version      -> built-in
/god-lifecycle    -> built-in (reads disk)
/god-progress     -> built-in (requirement and increment progress)
/god-dogfood      -> built-in fixture runner, specialists on failure
```

### Tier 1: Planning
```
/god-prd          -> god-pm                      writes prd/PRD.md
/god-design       -> god-designer                writes DESIGN.md + PRODUCT.md
                  -> god-design-reviewer (review)
/god-arch         -> god-architect               writes arch/ARCH.md + adr/
/god-roadmap      -> god-roadmapper              writes roadmap/ROADMAP.md
/god-stack        -> god-stack-selector          writes stack/DECISION.md
/god-discuss      -> god-explorer (mode=scoping)
/god-list-assumptions -> god-explorer (mode=assumptions)
/god-explore      -> god-explorer (mode=ideation)
```

### Tier 2: Building
```
/god-repo         -> god-repo-scaffolder         writes repo/AUDIT.md
/god-build        -> god-planner                 writes build/PLAN.md
                  -> god-executor (per slice)    writes code
                  -> god-spec-reviewer (review)
                  -> god-quality-reviewer (review)
                  -> writes build/STATE.md
/god-add-tests    -> god-executor (test-only mode)
```

### Tier 3: Shipping
```
/god-deploy       -> god-deploy-engineer         writes deploy/STATE.md
/god-observe      -> god-observability-engineer  writes observe/STATE.md
/god-launch       -> god-launch-strategist       writes launch/STATE.md
/god-harden       -> god-harden-auditor          writes harden/FINDINGS.md
```

### Beyond greenfield
```
/god-feature      -> god-pm (mini-PRD)
                  -> god-architect (delta only)
                  -> god-planner + god-executor + reviewers
                  -> god-harden-auditor (new code only)
                  -> god-launch-strategist (feature flag)

/god-hotfix       -> god-debugger (time-boxed 30m)
                  -> god-executor (minimal-fix mode)
                  -> god-spec-reviewer + god-quality-reviewer
                  -> god-deploy-engineer (expedited)
                  -> god-observability-engineer (verify)
                  -> god-orchestrator (schedule postmortem)

/god-refactor     -> god-explorer (scoping)
                  -> god-auditor (coverage check)
                  -> god-planner (refactor slices)
                  -> god-executor (behavior-preserving)
                  -> god-spec-reviewer + god-quality-reviewer
                  -> god-deploy-engineer (gradual)

/god-spike        -> god-spike-runner
                  -> writes spikes/<slug>/SPIKE.md

/god-postmortem   -> god-incident-investigator   writes postmortems/<id>/POSTMORTEM.md
                  -> god-docs-writer (runbook updates)

/god-upgrade      -> god-migration-strategist
                  -> god-planner (test gap-fill)
                  -> god-executor (per-slice with metric gating)
                  -> god-deploy-engineer (1-10-50-100 rollout)
                  -> god-observability-engineer (metric watch)

/god-docs         -> god-docs-writer             writes docs/UPDATE-LOG.md

/god-update-deps  -> god-deps-auditor            writes deps/AUDIT.md
                  -> god-executor (batched patch)
                  -> god-executor (per-package minor)
                  -> [routes major versions to /god-upgrade]
```

### Migration, awareness, and sync
```
/god-migrate      -> local planning-system import
                  -> god-greenfieldifier when import judgment is needed
/god-sync         -> god-updater
                  -> local feature-awareness, reverse-sync, source-sync-back,
                     repo-surface-sync, route-quality-sync,
                     recipe-coverage-sync, release-surface-sync,
                     repo-doc-sync, pillars-sync-plan, checkpoint-sync,
                     context-refresh
/god-context      -> god-context-writer
                  -> feature-awareness and Pillars context refresh
```

### Mode D suite commands
```
/god-suite-init    -> built-in suite registration
/god-suite-status  -> built-in suite state view
/god-suite-sync    -> god-coordinator
/god-suite-patch   -> god-coordinator
/god-suite-release -> god-coordinator + suite release dry-run planning
```

### Recovery
```
/god-undo         -> built-in (reads .godpowers/log)
/god-redo         -> built-in (resets tier status)
/god-skip         -> built-in (writes audit entry)
/god-repair       -> built-in (uses lib/state.detectDrift)
/god-rollback     -> built-in (moves to .trash/)
/god-restore      -> built-in (recovers from .trash/)
```

### Observability
```
/god-logs         -> reads runs/<id>/events.jsonl
/god-metrics      -> reads events.jsonl, computes stats
/god-trace        -> filters events by tier/agent
/god-audit        -> god-auditor (full audit mode)
/god-hygiene      -> god-auditor + god-deps-auditor + god-docs-writer
                  -> god-orchestrator (composite report)
/god-graph        -> built-in (walks all artifacts)
```

### Capture
```
/god-add-todo     -> built-in (appends todos/TODOS.md)
/god-check-todos  -> built-in + may route to workflow
/god-note         -> built-in (appends notes/NOTES.md)
/god-add-backlog  -> built-in (appends backlog/BACKLOG.md)
/god-plant-seed   -> built-in (writes seeds/<id>.md)
/god-extract-learnings -> built-in (reads phase artifacts)
```

### Knowledge / process
```
/god-thread       -> built-in
/god-map-codebase -> 4 mapper agents in parallel
/god-intel        -> reads codebase/ files
/god-sprint       -> god-retrospective (for retro subcommand)
/god-party        -> multiple persona agents in parallel
/god-pause-work   -> built-in (writes HANDOFF.md)
/god-resume-work  -> built-in (reads HANDOFF.md)
/god-workstream   -> built-in (git worktree management)
/god-debug        -> god-debugger
/god-review       -> god-spec-reviewer + god-quality-reviewer
/god-pr-branch    -> built-in (git filter)
/god-build-agent  -> built-in (template-based generation)
/god-settings     -> built-in (intent.yaml read/write)
/god-set-profile  -> built-in (intent.yaml update)
```

### Complete core command coverage supplement

[DECISION] The grouped spawn graph above shows common flows, while this
supplement keeps every current core slash command visible for drift audits.

#### Read-only, cost, and runtime maintenance
```
/god-agent-audit       -> built-in (agent contract audit)
/god-automation-setup  -> built-in + god-automation-engineer
/god-automation-status -> built-in (host automation provider status)
/god-budget            -> built-in (budget controls)
/god-cache-clear       -> built-in (cache cleanup)
/god-context-scan      -> built-in (context drift scan)
/god-cost              -> built-in (cost and token report)
/god-export-otel       -> built-in (OTel trace export)
/god-lint              -> built-in (mechanical have-nots validation)
/god-locate            -> built-in (state and artifact locator)
/god-standards         -> god-standards-check
/god-test-extension    -> built-in (extension contract test)
/god-test-runtime      -> god-browser-tester
```

#### Brownfield and planning repair
```
/god-archaeology       -> god-archaeologist
/god-org-context       -> god-org-context-loader
/god-preflight         -> god-auditor (read-only intake audit)
/god-reconcile         -> god-reconciler
/god-reconstruct       -> god-reconstructor
/god-roadmap-check     -> god-reconciler (legacy alias)
/god-roadmap-update    -> god-roadmap-updater
/god-tech-debt         -> god-debt-assessor
```

#### Design, fast paths, and linkage
```
/god-design-impact     -> built-in (DESIGN.md what-if analysis)
/god-fast              -> built-in (trivial inline edit)
/god-link              -> built-in (manual code-artifact link)
/god-quick             -> god-planner + god-executor + reviewers
/god-review-changes    -> built-in (REVIEW-REQUIRED.md walkthrough)
/god-scan              -> built-in (reverse-sync scanner)
/god-smite             -> built-in (dependency cache reset)
```

#### Extension lifecycle
```
/god-extension-scaffold -> built-in (create extension pack)
/god-extension-add     -> built-in (install extension pack)
/god-extension-info    -> built-in (extension metadata)
/god-extension-list    -> built-in (extension inventory)
/god-extension-remove  -> built-in (remove extension pack)
```

#### Story commands
```
/god-stories           -> built-in (story inventory)
/god-story             -> god-storyteller
/god-story-build       -> god-planner + god-executor + reviewers
/god-story-close       -> built-in (story closeout)
/god-story-verify      -> god-browser-tester
```

### From extensions
```
@godpowers/security-pack:
/god-soc2-audit   -> god-soc2-auditor
/god-hipaa-audit  -> god-hipaa-auditor
/god-pci-audit    -> god-pci-auditor

@godpowers/launch-pack:
/god-show-hn      -> god-show-hn-strategist
/god-product-hunt -> god-product-hunt-strategist
/god-indie-hackers -> god-indie-hackers-strategist
/god-oss-release  -> god-oss-release-strategist

@godpowers/data-pack:
/god-etl          -> god-etl-engineer
/god-ml-feature   -> god-ml-feature-engineer
/god-dashboard    -> god-dashboard-builder
```

---

## Tier Dependency Graph (gate enforcement)

```
                              Tier 0
                       [god-orchestrator]
                       (mode + scale detect)
                              |
                              v
              ┌───────── Tier 1: Planning ─────────┐
              |                                     |
              v                                     |
           [PRD]                                    |
       (god-pm)                                     |
              |                                     |
              | gates                               |
              v                                     |
        [Architecture]                              |
       (god-architect)                              |
              |                                     |
        ┌─────┴─────┐                              |
        |           |                              |
        v           v                              |
    [Roadmap]   [Stack]                           |
   (roadmapper) (stack-                           |
                 selector)                        |
        |           |                              |
        └─────┬─────┘                              |
              |                                    |
              v                                    |
              ┌───────── Tier 2: Building ─────────┤
              |                                     |
              v                                     |
           [Repo]                                   |
       (repo-scaffolder)                            |
              |                                     |
              | gates                               |
              v                                     |
           [Build]                                  |
       (planner -> executor -> spec-reviewer        |
                            -> quality-reviewer)    |
              |                                     |
              v                                     |
              ┌───────── Tier 3: Shipping ─────────┤
              |                                     |
        ┌─────┴─────┐                              |
        |           |                              |
        v           v                              |
     [Deploy]    [Harden]                          |
   (deploy-eng) (harden-auditor)                  |
        |           |                              |
        v           |                              |
     [Observe]      |                              |
   (observability)  |                              |
        |           |                              |
        |           |                              |
        |   [BLOCKS LAUNCH ON CRITICAL]            |
        |           |                              |
        |           v                              |
        |        [Launch]                          |
        |    (launch-strategist)                   |
        |           |                              |
        └───────────┴── Steady State ──────────────┘
```

---

## Agent -> Artifact Flow

| Agent | Reads | Writes |
|-------|-------|--------|
| god-orchestrator | (user intent) | state.json, PROGRESS.md, events.jsonl |
| god-pm | state.json | prd/PRD.md |
| god-architect | prd/PRD.md | arch/ARCH.md, arch/adr/ |
| god-roadmapper | prd/, arch/ | roadmap/ROADMAP.md |
| god-stack-selector | arch/ | stack/DECISION.md |
| god-repo-scaffolder | stack/ | repo/AUDIT.md, repo source files |
| god-planner | roadmap/, arch/, stack/ | build/PLAN.md |
| god-executor | build/PLAN.md (one slice) | source code, tests |
| god-spec-reviewer | code + plan | review verdict (in events.jsonl) |
| god-quality-reviewer | code (independent) | review verdict |
| god-deploy-engineer | arch/, build/ | deploy/STATE.md, CI files |
| god-observability-engineer | prd/ NFRs, arch/ | observe/STATE.md, alert configs |
| god-launch-strategist | prd/, harden/FINDINGS.md | launch/STATE.md |
| god-harden-auditor | code, deploy/ | harden/FINDINGS.md |
| god-debugger | code, recent commits | regression test, fix commit |
| god-incident-investigator | logs, events.jsonl, git log | postmortems/<id>/ |
| god-spike-runner | (the question) | spikes/<slug>/SPIKE.md |
| god-migration-strategist | (migration target) | migrations/<slug>/MIGRATION.md |
| god-docs-writer | code, existing docs | docs/, UPDATE-LOG.md |
| god-deps-auditor | package.json/lock | deps/AUDIT.md |
| god-explorer | (input idea) | explore/<slug>.md |
| god-retrospective | sprint artifacts | sprints/<n>/RETRO.md |
| god-auditor | all .godpowers/<tier>/ | AUDIT-REPORT.md |

---

## Cross-Workflow Integration Map

Workflows don't just exist; they hand off to each other.

```
                 ┌─── /god-mode (full-arc) ───┐
                 │                              │
                 v                              │
            [Steady State]                      │
                 │                              │
   ┌─────────────┼─────────────┐               │
   |             │             |               │
   v             v             v               │
 /god-       /god-        /god-               │
 feature     hotfix       refactor            │
   |             │             |               │
   |             v             |               │
   |       [48h timer]         |               │
   |             |             |               │
   |             v             |               │
   |       /god-               |               │
   |       postmortem          |               │
   |             |             |               │
   |             v             |               │
   |      [updates docs]       |               │
   |             |             |               │
   └──────┬──────┴─────────────┘               │
          |                                     │
          v                                     │
    [back to steady]<──────────────────────────┘

   /god-update-deps                   /god-upgrade
        |                                  ^
        | (for major version bumps)         |
        └──────────────────────────────────┘

   /god-spike (inconclusive)
        |
        | (suggests follow-up spike or feature)
        v
    /god-spike (narrower) OR /god-feature
```

---

## Control Flow: From User Input to Committed Artifact

```
1. User types: /god-prd
   |
   v
2. AI tool loads: skills/god-prd.md
   (reads frontmatter, matches "Triggers on:" patterns)
   |
   v
3. Skill instructs: "Spawn god-pm via Task tool"
   |
   v
4. god-pm agent starts in fresh 200K context
   (reads state.json, intent.yaml, templates/PRD.md)
   |
   v
5. Agent does work:
   - Asks user targeted questions (if needed)
   - Drafts PRD per template
   - Runs substitution test on each claim
   - Runs three-label test on each sentence
   - Checks have-nots P-01 through P-15
   |
   v
6. Agent writes: .godpowers/prd/PRD.md
   |
   v
7. Returns to skill (via Task tool result)
   |
   v
8. Skill verifies:
   - Artifact exists on disk
   - Spawns god-auditor briefly to verify have-nots
   - Updates state.json (PRD status = done)
   - Appends events.jsonl: agent.end, have-nots.check
   |
   v
9. Prints to user:
   "PRD complete: .godpowers/prd/PRD.md
    Suggested next: /god-arch"
```

---

## Pause Flow

```
                Agent hits a pause condition
                          |
                          v
                  [Check --yolo flag]
                  /                  \
              No                     Yes
              |                        |
              v                        v
         Pause for user      [Check pause type]
         (uses pause              /         \
          format)            Critical    Other
                                |          |
                                v          v
                            Pause for     Auto-pick default
                            user          Log to YOLO-DECISIONS.md
                            (carve-out)   Continue
                                |          |
                                v          v
                            User answers  Continue
                                |
                                v
                            Resume agent
```

---

## Recovery Flow

```
                 Something went wrong
                          |
                          v
                    [Diagnose]
                /         |         \
               v          v          v
          /god-status  /god-doctor  /god-audit
          (read disk)  (validate)   (score)
                          |
                          v
                    [Decide]
              /        |        \
             v         v         v
         /god-undo  /god-redo  /god-skip
         (reflog)   (re-run)   (mark+continue)
              |        |         |
              v        v         v
          [Modified files moved to .trash/]
                          |
                          v
                  [Append to log]
                          |
                          v
                  [Resume from new state]
```

---

## File Layout (the complete map)

```
godpowers/
│
├── SKILL.md                       <- Master always-on skill (loaded by AI tool)
├── AGENTS.md                      <- Agent brief
├── README.md, CHANGELOG.md, LICENSE, CONTRIBUTING.md, SECURITY.md, USERS.md
├── ARCHITECTURE.md                <- Design doc
├── ARCHITECTURE-MAP.md            <- This file
├── package.json (v2.4.3)
├── .github/workflows/              <- CI + npm publish workflows
│
├── bin/install.js                 <- CLI installer (15 runtimes)
│
├── skills/                        <- 112 slash-command skill files
│   ├── god-mode.md, god-init.md, god-prd.md, god-arch.md, ...
│   └── (one .md per slash command)
│
├── agents/                        <- 40 core specialist agents
│   ├── god-orchestrator.md, god-pm.md, god-architect.md, ...
│   └── (one .md per agent)
│
├── workflows/                     <- 13 executable workflow YAMLs
│   ├── full-arc.yaml, feature-arc.yaml, hotfix-arc.yaml, ...
│
├── templates/                     <- 15 artifact templates
│   ├── PRD.md, ARCH.md, ROADMAP.md, ...
│
├── references/
│   ├── HAVE-NOTS.md               <- 156 named failure modes (canonical)
│   ├── orchestration/             <- Mode/scale detection patterns
│   ├── planning/                  <- PRD/ARCH/ROADMAP/STACK anatomies + antipatterns
│   ├── building/                  <- Vertical slices, waves
│   ├── shipping/                  <- Deploy patterns, SLOs, OWASP worksheets
│   └── shared/                    <- Glossary, orchestrator composition
│
├── schema/                        <- 7 JSON Schemas
│   ├── intent.v1.yaml.json
│   ├── state.v1.json
│   ├── events.v1.json
│   └── workflow.v1.json
│
├── lib/                           <- Real JS runtime (76 modules)
│   ├── state.js                   <- state model + drift detection
│   ├── events.js                  <- OTel-shape event log + hash chain
│   ├── router.js                  <- command routing
│   ├── command-families.js        <- UX families, ladders, and trigger precedence
│   ├── recipes.js                 <- intent recipes
│   ├── workflow-runner.js         <- executable workflow plans
│   ├── workflow-helper-groups.js  <- named helper groups expanded in plans
│   ├── dashboard.js               <- shared status and action brief engine
│   ├── requirements.js            <- deliverable ledger (requirement/increment status)
│   ├── linkage.js                 <- requirement-to-code linkage map
│   ├── reverse-sync.js            <- scan code, refresh linkage + ledger
│   ├── dogfood-runner.js          <- messy-repo dogfood gate
│   ├── host-capabilities.js       <- host guarantee detection
│   ├── extension-authoring.js     <- extension scaffold helper
│   └── otel-exporter.js           <- OTLP/JSON export
│
├── hooks/                         <- 2 hooks
│   ├── session-start.sh           <- Loads project context on session open
│   └── pre-tool-use.sh            <- Safety guards
│
├── extensions/
│   ├── security-pack/             <- SOC2, HIPAA, PCI auditors
│   ├── launch-pack/               <- Show HN, PH, IH, OSS strategists
│   └── data-pack/                 <- ETL, ML, dashboards
│
├── fixtures/
│   └── dogfood/                   <- messy-repo dogfood scenarios
│
├── tests/
│   ├── lib/                       <- replay, fixture, runner
│   ├── fixtures/                  <- Sample projects
│   └── integration/               <- E2E test scaffolds
│
├── scripts/
│   ├── smoke.sh                   <- structural smoke checks
│   ├── validate-skills.js         <- skill content checks
│   ├── test-dogfood-runner.js     <- dogfood gate
│   ├── test-host-capabilities.js  <- host guarantee gate
│   ├── test-extension-authoring.js <- extension scaffold gate
│   ├── test-runtime.js            <- 13 unit tests for lib/
│   └── check-package-contents.js  <- npm payload gate
│
├── docs/
│   ├── getting-started.md
│   ├── concepts.md
│   ├── reference.md
│   ├── ROADMAP.md
│   ├── tutorials/first-project.md
│   └── RFC/                       <- Design discussions
│
└── .godpowers/                    <- Created per-project, not in this repo
    ├── intent.yaml                <- Hand-edited
    ├── state.json                 <- Machine-managed
    ├── runs/<id>/events.jsonl     <- OTel-shape history
    ├── prd/, arch/, roadmap/, ...
    ├── postmortems/, spikes/, migrations/
    ├── todos/, notes/, backlog/
    └── log, .trash/               <- Recovery infrastructure
```

---

## Numbers (as of v2.4.3)

| Component | Count |
|-----------|-------|
| Layers | 4 |
| Tiers | 4 (0-3) |
| Sub-steps (per tier) | 13: PRD, ARCH, ROADMAP, STACK, **DESIGN, PRODUCT**, REPO, BUILD, DEPLOY, OBSERVE, LAUNCH, HARDEN, plus orchestration |
| Slash commands | 112 |
| Specialist agents | 40 |
| Workflows (core YAMLs) | 13 |
| Intent recipes | 42 |
| Have-nots | 156 documented + 30+ mechanically validated by linter |
| Templates | 16 |
| Reference documents | 39 |
| JSON Schemas | 7 |
| **JS runtime modules** | **72** |
| **External integrations** | **5** (all detect-and-delegate; none vendored): Google Labs design.md, Impeccable, awesome-design-md, SkillUI, vercel-labs/agent-browser + Playwright |
| Hooks | 2 |
| Dogfood scenarios | 5 |
| Documentation pages | 34 under docs/ plus reference material |
| **Test suites** | **59 script files plus integration tests** |
| **Tests** | **Full behavioral suite gated by npm test** |
| Supported AI runtimes | 15+ |
| Verification axes | **3**: static (lint, design-spec, have-nots), linkage (drift, reverse-sync), runtime (headless browser audit + functional test) |
