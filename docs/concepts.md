# Godpowers Concepts

Four things to understand: the Quarterback, tiers, agents, and quality gates.

## The Quarterback

There is exactly one orchestrator: `god-orchestrator`. Think of it as the
quarterback. It reads the defense (mode + scale detection), calls the play
(spawns the right specialist for each tier sub-step), owns the playbook
(`state.json`, generated `PROGRESS.md` view, `intent.yaml`, `events.jsonl`),
and manages the clock (mandatory final sync at end of project run).

Three skills sit on the sideline and read the same playbook without calling
plays:

| Skill | Role |
|-------|------|
| `/god` | Front door. Maps free-text intent to a recipe and proposes the right command. |
| `/god-next` | Pre-flight + post-flight routing. Checks prereqs and announces what's next. |
| `/god-status` | Re-derives state from disk. Reports inconsistencies. |

These skills do not own state. They read recipes
(`<runtimeRoot>/routing/recipes/*.yaml`) and routing definitions
(`<runtimeRoot>/routing/*.yaml`) and propose commands. The
quarterback (and the agents it spawns) is the only writer to the load-bearing
artifacts.

Command families are the catalog layer above individual slash commands. They
make `/god-help` and `/god` easier to scan while keeping every leaf command as
a direct shortcut. Families cover start, continue, build, verify, operate,
maintain, capture, recover, extend, collaborate, and configure.

Some families use ladders instead of flat lists. Capture routes to note, todo,
backlog, or seed. Build routes by work size from fast to hotfix. Verify routes
from cheapest artifact lint to release dogfood. Continue treats `/god-status`
as the hub and keeps `/god-progress`, `/god-lifecycle`, `/god-locate`, and
`/god-next` as direct views.

We deliberately do not stack a meta-orchestrator above `god-orchestrator`.
Stacking orchestrators is a known anti-pattern: it creates ambiguity about
who owns state, who decides when to pause, and whose error is authoritative.
If we ever need parallel cross-tier coordination, it goes in as a peer at
Tier 0 (e.g., `god-coordinator` for Mode D), never above.

## Tiers

A development arc has 4 tiers. Each tier has sub-steps. Each sub-step has
a slash command and a specialist agent.

| Tier | Sub-steps |
|------|-----------|
| 0: Orchestration | mode detection, scale detection |
| 1: Planning | PRD, ARCH, Roadmap, Stack |
| 2: Building | Repo, Build |
| 3: Shipping | Deploy, Observe, Launch, Harden |

Each sub-step gates on the previous. You can't run /god-arch without a
passing /god-prd.

## Agents

A skill is the user-facing slash command. An agent is the specialist that
does the work. Skills are thin; agents are deep.

- `/god-prd` is a skill. It spawns `god-pm` (the agent) in a fresh context.
- `god-pm` reads state.json, intent.yaml, and prep artifacts, then writes PRD.md.
- The agent has its own context window, instructions, and have-nots checks.
- The skill verifies the agent's output and updates state through `godpowers state advance` or an owning command wrapper.

Why fresh contexts? It defeats context rot. Each agent gets a clean 200K
window with only what it needs. The orchestrator stays thin.

## Quality gates

Three mechanical tests applied to artifact-producing agents:

### Substitution test
Replace the product name with a competitor's. If the sentence still reads
true, it decides nothing.

Example that fails the test (rewrite):
> Our app is the future of project management.
> -> "the future of [project management|MRR tracking|task tracking]" works for any product

Example that passes the test (keep):
> Solo SaaS founders running between $1k and $10k MRR can't decompose
> revenue change between new customers and price increases.
> -> can't substitute another product without breaking the meaning

### Three-label test
Every sentence is exactly one of:
- `[DECISION]`: a grounded choice with rationale
- `[HYPOTHESIS]`: a testable assumption with validation plan
- `[OPEN QUESTION]`: an unresolved item with owner and due date

Anything unlabeled is theater. Rewrite.

### Domain precision
`/god-discuss` can create `.godpowers/domain/GLOSSARY.mdx` when a discussion
resolves project-specific language. The glossary stores canonical terms,
avoided aliases, relationships, example dialogue, and flagged ambiguities. It
is preparation context for PRD, ARCH, ROADMAP, STACK, and docs. It does not
replace those artifacts.

### Have-nots
157 named failure modes. ~30 are mechanical (regex-checkable);
the rest are interpretive. Examples:
- P-01: Generic problem statement (passes substitution test)
- A-04: ADR without flip point
- DG-01: Glossary term without avoided aliases
- B-01: Code before test (TDD violation)
- L-04: Silent launch (no source attribution)
- H-07: Critical finding without remediation options

The catalog: `references/HAVE-NOTS.md`.
The mechanical 30 are wired into `lib/have-nots-validator.js` and
caught by `/god-lint`.

## Three verification axes

Validation runs on three orthogonal axes:

| Axis | Catches | Speed |
|---|---|---|
| **Static** | Document-level have-nots, format violations, missing fields | < 1s |
| **Linkage** | Drift between artifacts and code; orphans; cross-artifact impact | < 5s |
| **Runtime** | Rendered styles vs design tokens; PRD acceptance flows; real-DOM contrast | 30s-2min |

Static catches form. Linkage catches lying. Runtime catches breakage.
See [validation.md](./validation.md) for the complete picture.

## Five external integrations (detect-and-delegate, none vendored)

- **Google Labs design.md** - format spec for DESIGN.md
- **Impeccable** - design intelligence (7 domain refs + 23 commands)
- **awesome-design-md** - 71-site curated catalog
- **SkillUI** - static-analysis fallback for arbitrary URLs
- **vercel-labs/agent-browser + Playwright** - runtime verification

Each is detected via `lib/<name>-detector` or `lib/<name>-bridge`.
None of their content is vendored; we delegate when present and fall
back gracefully when absent (light-impeccable internal references for
design; no-backend message for runtime).

## The three load-bearing artifacts (designed for v0.5+)

```
.godpowers/intent.yaml    INTENT   what you want (hand-edited)
.godpowers/state.json     FACTS    what was resolved (machine-managed)
.godpowers/runs/<id>/events.jsonl  HISTORY  what happened (append-only)
```

This is the Cargo + Poetry + OpenTelemetry pattern applied to AI workflows.

## Workflows

The arc isn't just "/god-mode". 13 core workflows handle different
real-world scenarios:

| Workflow | When |
|----------|------|
| full-arc | Greenfield, idea to launch |
| bluefield-arc | Org-context-constrained greenfield |
| brownfield-arc | Existing codebase, full reverse-engineering |
| feature-arc | Add feature to existing project |
| hotfix-arc | Urgent production bug |
| refactor-arc | Safe refactor, no behavior change |
| spike | Time-boxed research |
| postmortem | After-incident investigation |
| migration-arc | Framework or version migration |
| docs-arc | Documentation work |
| deps-audit | Dependency updates |
| audit-only | Score artifacts, build nothing |
| hygiene | Periodic health check |

Story-file workflow (`/god-story` family) and Mode D suite workflows
(`/god-suite-*`) layer on top of these. Each is a declarative YAML in
`workflows/`. The orchestrator reads them.

## Dashboard And Local Helpers

Every command closeout should be traceable to disk state. The dashboard reports
workflow progress, the current phase, the action brief, host guarantees, and
proactive checks for docs, repo surface, runtime, security, dependencies, and
hygiene.

Some automatic work is local helper work, not agent work. Checkpoint sync,
repo documentation sync, repo surface sync, feature awareness, host capability
detection, and dogfood fixture execution run as visible local runtime steps
when their triggers are direct. Specialist agents are reserved for bounded
work that needs judgment, such as docs drift review, design review, browser
testing, or dogfood failure triage.

## Modes

| Mode | When |
|------|------|
| A | Greenfield (no existing code, no .godpowers/) |
| B | Gap-fill or brownfield (existing project, missing or partial artifacts) |
| C | Audit-only (score existing artifacts, write nothing) |
| E | Bluefield (empty dir plus org-context.yaml; org standards apply) |

god-orchestrator detects the project mode automatically from disk signals.
Mode D is orthogonal to A/B/C/E: it marks a multi-repo suite (hub plus
siblings) and adds `god-coordinator` as a Tier-0 peer, never above, regardless
of each repo's mode.

## Pauses

Five legitimate reasons to pause for the user:
1. Ambiguous intent
2. Human-only flip-point
3. Statistical tie
4. Critical security finding
5. Brand voice

`--yolo` auto-resolves the first four. Critical security still pauses (the
one carve-out, by design).

## Recovery

Forward-only with compensation (Flyway pattern). Operations append to
`.godpowers/log` (the reflog). `/god-undo` reverts. Destructive ops move
files to `.godpowers/.trash/` (recoverable).

## Extensions

Skill packs from npm. Each declares `apiVersion: godpowers/v1` and
`engines.godpowers: "^1.0.0"`. Lazy-activated: pack files don't load until
their slash command is invoked.

First-party pack examples:
- `@godpowers/security-pack` - SOC 2, HIPAA, PCI
- `@godpowers/launch-pack` - Show HN, PH, IH, OSS
- `@godpowers/data-pack` - ETL, ML features, dashboards

Use `/god-extension-scaffold --name=@scope/pack --output=.` to create
the manifest, package, README, skill, agent, and workflow skeleton for a new
pack.

## How it composes with other AI workflow systems

Godpowers does not assume it's the only AI workflow tool installed.
It keeps its state in `.godpowers/` and never writes outside it.

`/god-init`, `/god-migrate`, and feature awareness detect legacy planning, BMAD, and
Superpowers context. Imported context becomes preparation material for native
Godpowers artifacts, while `/god-sync` can write managed companion files back
to the source system so teams can return to that workflow if needed.

See [references/shared/ORCHESTRATORS.md](../references/shared/ORCHESTRATORS.md)
for the coexistence rules and migration paths. For acknowledgement of
the prior-art that shaped godpowers, see [INSPIRATION.md](../INSPIRATION.md).
