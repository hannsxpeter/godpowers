# Greenfield Artifact Coverage

> What gets created when you run `/god-mode` on a fresh project, and what's
> created lazily on demand.

## TL;DR

`/god-mode` produces **up to 12 of 16** artifact categories during the arc
(2 are conditional on UI presence). The remaining **4 capture artifacts**
are lazy: they only exist when you use those commands.

After the arc, `/god-sync` runs automatically to ensure all 16 categories
are in a consistent state (existing artifacts validated; missing capture
artifacts noted as "not-yet-created"; conditional artifacts marked
`not-required` for backend-only projects).

**How the counts relate**: there are 14 core artifact categories: 10
always-produced during the arc (PRD through Launch, Tiers 1-3) plus 4 lazy
capture artifacts. Two UI-conditional design artifacts (DESIGN.md, PRODUCT.md)
bring the total to 16 categories. The arc emits 10 of these (12 when a UI is
present). The 3 Tier-0 files (`state.json`, `PROGRESS.md`, `intent.yaml`) are
orchestration state, not counted as artifact categories.

## What `/god-mode` creates (3 orchestration state files plus up to 12 arc artifacts)

These are produced sequentially as the arc progresses:

| Tier | Sub-step | Artifact path | Created by | Conditional? |
|------|----------|---------------|------------|---|
| 0 | Orchestration | `.godpowers/state.json` | god-orchestrator | always |
| 0 | Orchestration | `.godpowers/PROGRESS.mdx` | god-orchestrator | always |
| 0 | Orchestration | `.godpowers/intent.yaml` (v0.5+) | god-orchestrator | always |
| 1 | PRD | `.godpowers/prd/PRD.mdx` | god-pm | always |
| 1 | Architecture | `.godpowers/arch/ARCH.mdx` + `adr/` | god-architect | always |
| 1 | Roadmap | `.godpowers/roadmap/ROADMAP.mdx` | god-roadmapper | always |
| 1 | Stack | `.godpowers/stack/DECISION.mdx` | god-stack-selector | always |
| 1 | **Design** | `DESIGN.md` (project root, Google Labs spec) | god-designer | **UI projects only** |
| 1 | **Product** | `PRODUCT.md` (project root) | impeccable teach | **UI + impeccable installed** |
| 2 | Repo | `.godpowers/repo/AUDIT.mdx` + repo source | god-repo-scaffolder | always |
| 2 | Build | `.godpowers/build/PLAN.mdx` + `.godpowers/state.json` + code | god-planner + god-executor | always |
| 3 | Deploy | `.godpowers/state.json` deploy evidence | god-deploy-engineer | always |
| 3 | Observe | `.godpowers/state.json` observe evidence | god-observability-engineer | always |
| 3 | Harden | `.godpowers/harden/FINDINGS.mdx` | god-harden-auditor | always |
| 3 | Launch | `.godpowers/state.json` launch evidence | god-launch-strategist | always |

Detection of UI presence is automatic via `lib/design-detector.js`
(reads STACK + package.json + filesystem signals). Backend-only
projects skip Design and Product tiers with `not-required` status.

Plus the run-level artifact:

| Path | Created by |
|------|------------|
| `.godpowers/runs/<id>/events.jsonl` (v0.5+) | All agents emit events here |

## What's lazy (4 capture artifacts)

These exist only when you use them. Empty placeholder files would be noise.

| Artifact | Created when | Created by |
|----------|--------------|------------|
| `.godpowers/backlog/BACKLOG.mdx` | first `/god-add-backlog` | god-orchestrator |
| `.godpowers/seeds/<id>.mdx` | first `/god-plant-seed` | god-orchestrator |
| `.godpowers/todos/TODOS.mdx` | first `/god-add-todo` or `/god-note` | god-orchestrator |
| `.godpowers/threads/<name>.mdx` | first `/god-thread new` | god-orchestrator |

When `/god-reconcile` runs, missing capture artifacts return status
`not-yet-created`. This is graceful, not a failure.

## What's lazy beyond the arc

These exist after their workflow runs:

| Artifact | Created by | When |
|----------|------------|------|
| `.godpowers/postmortems/<id>/POSTMORTEM.mdx` | god-incident-investigator | After /god-postmortem |
| `.godpowers/spikes/<slug>/SPIKE.mdx` | god-spike-runner | After /god-spike |
| `.godpowers/migrations/<slug>/MIGRATION.mdx` | god-migration-strategist | After /god-upgrade |
| `.godpowers/features/<slug>/PRD.mdx` | god-pm (feature-mode) | After /god-feature |
| `.godpowers/explore/<slug>.mdx` | god-explorer | After /god-explore |
| `.godpowers/discussions/<topic>.mdx` | god-explorer | After /god-discuss |
| `.godpowers/learnings/<milestone>/LEARNINGS.mdx` | god-orchestrator | After /god-extract-learnings |
| `.godpowers/sprints/sprint-<n>/PLAN.mdx` + `RETRO.md` | god-orchestrator + god-retrospective | After /god-sprint |
| `.godpowers/SYNC-LOG.mdx` | god-updater | After /god-sync (any sync run) |
| `.godpowers/HYGIENE-REPORT.mdx` | god-orchestrator | After /god-hygiene |
| `.godpowers/AUDIT-REPORT.mdx` | god-auditor | After /god-audit |
| `.godpowers/HANDOFF.mdx` | god-orchestrator | After /god-pause-work |
| `.godpowers/YOLO-DECISIONS.mdx` | god-orchestrator | When --yolo auto-resolves a pause |

## What `/god-mode --yolo` does about sync

After Tier 3 completes (Launch), `god-orchestrator` ALWAYS runs `/god-sync`
to ensure final consistency. This applies regardless of flags:

```
/god-mode                  -> arc + final /god-sync
/god-mode --yolo           -> arc + final /god-sync (auto-applied, no pause)
/god-mode --conservative   -> arc + final /god-sync (with confirmation)
/god-mode --with-hygiene   -> arc + final /god-sync PLUS hygiene check
```

The mandatory final sync ensures:
- All 10 produced artifacts pass their have-nots
- 4 capture artifacts noted as "not-yet-created" (gracefully)
- SYNC-LOG.md gets the arc completion entry
- state.json reflects final tier statuses

This is true for every full-arc run, including autonomous --yolo runs. The
sync step does NOT pause under --yolo: it auto-applies the consistency
checks since they're mechanical.

## Coverage levels

| Coverage | What it means | When it applies |
|----------|---------------|-----------------|
| **Full coverage** (14/14) | All artifacts exist, all sync'd | Active mature project that's used capture commands |
| **Arc coverage** (10/14) | All Tier 0-3 artifacts exist, capture artifacts not yet used | Just-completed `/god-mode` run |
| **Partial coverage** (varies) | Some tiers complete, others pending | Mid-arc or paused |
| **Pre-init** (0/14) | No `.godpowers/` directory | Fresh directory, before `/god-init` |

`/god-status` reports current coverage. `/god-reconcile` checks against
existing artifacts and treats missing ones gracefully.

## Why lazy capture is correct

We don't pre-create empty BACKLOG.md / TODOS.md / etc. because:

1. **No noise**: an empty file in your project is visual clutter.
2. **Honest signal**: file presence means "user has used this".
3. **Reconciler handles it**: `/god-reconcile` returns `not-yet-created`
   gracefully when checking against missing artifacts.
4. **No-op cost**: if you never use `/god-add-todo`, you never need
   TODOS.md.

If you prefer eager creation, you can pre-create them manually. The system
won't complain.

## Implications for /god-feature mid-arc

When you run `/god-feature` during a `/god-mode` arc (mid-development):

1. `/god-reconcile` runs first (all 14 core artifacts plus runtime and repository surfaces)
2. For not-yet-created artifacts: status is `not-yet-created` (no impact)
3. For created artifacts: status is `present`, `missing-requirement`,
   `needs-delta`, etc.
4. Reconciler returns recommendation
5. Feature work executes
6. `/god-sync` runs at the end (updates touched artifacts; no-ops on
   not-yet-created ones)

The lazy capture artifacts simply don't participate until they exist. They
join the reconciliation loop the moment they're created.

## See also

- [Architecture Map](../ARCHITECTURE-MAP.md) - file structure and connections
- [Command Flows](command-flows.md) - per-command E2E
- [Arc Integrations](arc-integrations.md) - cross-workflow patterns
- [Recipes](recipes.md) - scenario reference
