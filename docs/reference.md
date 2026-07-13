# Godpowers Reference

Complete command, agent, and artifact reference for v5.3.1.

## Slash commands (122 total)

The 122 total is 121 `god-*` commands plus the `/god` natural-language front
door (a thin router that classifies intent rather than doing work itself).

### Command families
All 120 commands remain direct entry points, but the user-facing map starts
with likely next moves and families:

| Family | Purpose |
|---|---|
| start | Start or import a project. |
| continue | Understand state and choose the next move. |
| build | Plan, implement, test, and ship product work. |
| verify | Check artifacts, code, runtime behavior, and release readiness. |
| operate | Deploy, observe, harden, launch, and respond in production. |
| maintain | Keep artifacts, docs, dependencies, context, and repo surfaces current. |
| capture | Save thoughts, tasks, backlog items, seeds, and learnings. |
| recover | Undo, repair, restore, skip, or diagnose broken state. |
| extend | Install, inspect, test, remove, or author extension packs. |
| collaborate | Coordinate people, workstreams, suites, sprints, and pull requests. |
| configure | Tune settings, budgets, cache, profiles, help, and version info. |

`/god-help` shows a compact state-aware view. `/god-help <family>` shows the
matching leaf commands. `/god-help all` shows the full catalog.

### Decision ladders
For common ambiguous intents, Godpowers chooses the smallest fitting command:

| Intent | Ladder |
|---|---|
| Capture | `/god-note`, `/god-add-todo`, `/god-add-backlog`, `/god-plant-seed` |
| Work size | `/god-fast`, `/god-quick`, `/god-story`, `/god-feature`, `/god-build`, `/god-debug`, `/god-hotfix` |
| Verification | `/god-lint`, `/god-standards`, `/god-review`, `/god-test-runtime`, `/god-audit`, `/god-hygiene`, `/god-preflight`, `/god-dogfood` |

### Verb dispatchers
The default `core` install starts with first-run guidance, the front door,
surface control, and verb dispatchers: `/god-first-run`, `/god-demo`, `/god`,
`/god-surface`, `/god-init`, `/god-plan`, `/god-build`, `/god-fix`,
`/god-build`, `/god-fix`, `/god-ship`, `/god-sync`, and `/god-undo`. These commands route to existing leaf commands
through routing metadata and do not remove direct shortcuts from the `full`
profile.

`/god-status` is the continue hub. `/god-progress`, `/god-status --lifecycle`,
`/god-status --locate`, and `/god-next` remain direct shortcuts for narrower
views. `/god-lifecycle` and `/god-locate` remain full-profile deprecated
compatibility aliases for one minor release.

### Installer profile journeys
Profiles reduce the installed command surface without changing runtime
behavior:

| Journey | Profile |
|---|---|
| I want the basics | `core` |
| I build products | `builder` |
| I maintain Godpowers or mature repos | `maintainer` |
| I coordinate suites | `suite` |
| I want everything | `full` |

### Surface discipline
New commands should not be the default response to a usability gap. First try a
family card, decision ladder, profile journey, recipe, typed route outcome, or
documentation change. Add a new public command only when a case study, canary,
or repeated user journey proves that existing paths cannot express the need.
[DECISION] Phase 5 uses [Surface Contraction Evidence](surface-contraction.md)
to map proof-campaign command usage after installer defaults changed.

### Outcome metrics
Quick Proof and adoption canary reports track commands to first signal, next
command, missing artifacts, host gaps, and whether status plus next produce
recommendation signals. Longer runs use `/god-metrics`, `/god-trace`, and
`/god-cost` for duration, pauses, retries, and cost.

### Front door
- `/god` - Free-text intent matcher. Maps to a recipe and proposes the right command.
- `/god-first-run` - Guide the first 10 minutes with one recommendation at a time.
- `/god-demo` - Run the shipped sandbox proof without modifying the current project.
- `/god-next` - Pre-flight + post-flight routing. Suggests next command from state.
- `/god-status` - Re-derive project state from disk.
- `/god-status --lifecycle` - Show project phase and fitting workflows.
- `/god-status --locate` - Orient a fresh AI session from checkpoint, handoff, and disk evidence.
- `/god-progress` - Deliverable progress: which requirements and roadmap increments are done, in progress, or not started. Refreshes `.godpowers/REQUIREMENTS.mdx`.
- `/god-plan` - Route planning intent to PRD, design, architecture, roadmap, stack, or reconstruction.
- `/god-fix` - Route bug and outage intent to debug or hotfix, including typed open godaudits GA remediation tasks from canonical `.godaudits/AUDIT.json`.
- `/god-ship` - Route shipping intent to deploy, observe, or launch.
- `/god-capture` - Route notes, todos, backlog items, and seeds.
- `/god-extend` - Route extension authoring, install, inspection, removal, and testing.
- `/god-automation-status` - Show host automation provider support.
- `/god-automation-setup` - Prepare opt-in automation setup.
- `/god-surface` - Preview or apply a runtime command surface profile after install.
- `/god-migrate` - Detect legacy planning, BMAD, Superpowers, godplans, and godaudits context, import seeds, and sync back progress.

### Installer CLI helpers
- `godpowers status --project .` - Render the shared dashboard from disk state.
- `godpowers next --project .` - Render the dashboard and show the recommended next command.
- `godpowers quick-proof --project .` - Render the shipped proof fixture with host guarantees; the project path scopes host detection, not fixture evidence.
- `godpowers quick-proof --project . --inspect-project` - Inspect current-project state explicitly through a read-only proof view.
- `godpowers state advance --step=prd --status=done --project .` - Update one tracked state step and regenerate managed state views.
- `godpowers gate --tier=prd --project .` - Check a tier artifact gate and exit non-zero when blocking evidence is missing.
- `godpowers verify "<cmd>" --substep tier-2.build --claim "<claim>" --project .` - Run a command as executed verification: append an exit-code-backed record to `.godpowers/ledger/verifications.jsonl`, roll the latest verdict into `state.json` `verification.commands[]`, emit `gate.pass`/`gate.fail`, and exit non-zero when the command fails. Use `--attest --claim "<claim>" --evidence "<text>"` to record a self-reported attestation instead.
- `godpowers can-close --substep tier-2.build --project .` - Read-only check of the strict close gate (`evidence.canClose`): exit zero only when the substep has the evidence to close (executable-gated tiers need a passing executed record since they went in-flight; other tiers accept an attested record). Used by the orchestrator before advancing a substep to done.
- `godpowers route "<prompt>" --project .` - Quarterback entry router (read-only). Classifies the prompt into a play (recover, resume, recovery, brownfield, research, review, full, feature, or trivial) with a next command, ceremony level, and verification strategy. Refuses new work on a red latest verdict or unresolved Critical findings, and right-sizes ceremony so a one-line fix does not open an arc.
- `godpowers report --since last --project .` - Verification play-by-play from the evidence ledger since the last report, with an Attention section for unverified records. Advances a report cursor at `.godpowers/ledger/reports/cursor.json` unless `--peek` is given. Use `--since all` for the full history.
- `godpowers reflect --action "<what was attempted>" --outcome success|partial|failure --observation "<what happened>" --next "<next action>" [--root-cause "<cause>"] [--lesson "<lesson>"] [--substep <id>] --project .` - Record a structured reflection to `.godpowers/ledger/reflections.jsonl` after a significant action or failure, so course corrections rest on recorded observations.
- `godpowers memory set|get|list|clear [<key>] [<value>] [--category fact|decision|discovery|state] --project .` - Read and write durable key/value memory at `.godpowers/ledger/memory.json`. `set` upserts a key, `get` reads one, `list` shows all (optionally by category), and `clear` removes a key or all entries.
- `godpowers lesson add|list "<lesson>" [--tags a,b] [--scope project|global] --project .` - Record or list reusable lessons. `add` appends to `.godpowers/ledger/lessons.jsonl` (or `~/.godpowers/lessons.jsonl` with `--scope global`); a reflection with a lesson auto-records one tagged `auto-reflected`.
- `godpowers outcome start|check|stop|status <name> [--goal "<text>"] [--verify "<cmd>"] [--budget N] [--substep <id>] [--reason "<text>"] --project .` - Bounded retry loop at `.godpowers/ledger/outcomes/<slug>/`. `start` sets a goal, verifier, and budget; `check` runs the verifier (recording the executed verdict to the main ledger too), appends an iteration, and marks the outcome succeeded, failed (budget exhausted), or still active; `stop` ends it; `status` shows the goal and iterations.
- `godpowers import-ledger [--from <path to .mythify>] --project .` - One-time, best-effort import of an existing Mythify `.mythify/` ledger into `.godpowers/ledger/`: verifications (rebinding plan/step to arc/substep), reflections, memory, lessons, and outcomes. Records are appended; no state rollup and no gate events.
- `godpowers mcp-info --project .` - Show read-only MCP companion setup instructions without loading the MCP SDK.
- `godpowers automation-status --project .` - Show automation provider support.
- `godpowers automation-setup --project .` - Show a reviewed setup and execution plan.
- `godpowers dogfood` - Run built-in messy-repo dogfood scenarios.
- `godpowers demo --project .` - Show the shipped sandbox proof.
- `godpowers surface --profile=builder --codex --global --dry-run` - Preview a runtime surface profile switch.
- `godpowers surface --profile=builder --codex --global --apply` - Apply a runtime surface profile switch.
- `godpowers extension-scaffold --name=@scope/pack --output=.` - Create a publishable extension pack skeleton.
- `godpowers status --project . --brief` - Render only the action brief, host guarantee, status, and next route.
- `godpowers status --project . --json` - Emit machine-readable dashboard state.
- `npx godpowers --profile=core|builder|maintainer|suite|full` - Install a smaller role-specific slash-command surface.
- `npx godpowers --minimal` - Install the `core` profile.

Dashboard status uses workflow progress from `.godpowers/state.json` tracked
steps. Audit, hygiene, remediation, and launch-readiness scores are separate
metrics and should be labeled separately in closeouts.

### MCP companion
`@godpowers/mcp` is an optional first-party companion package. It owns the MCP
SDK dependency, while the main `godpowers` package remains dependency-free at
runtime.

The companion exposes nine read-only tools: `status`, `next`, `gate_check`,
`lint_artifact`, `trace_requirement`, `work_report`, `change_metrics`, `route`,
and `verification_history`. Mutating tools such as state advance, verify,
artifact writes, and route edits are intentionally absent; external write
actions are delegated to host connectors via `/god-connect`, so the MCP surface
stays read-only and verification stays on the CLI and orchestrator path.

Run `godpowers mcp-info --project .` for host setup instructions. Codex
registration is written only when `godpowers-mcp setup --host=codex --project=. --write` is invoked explicitly.

Build and review commands enforce request-trace discipline. Executors state
assumptions, public behavior, expected files, and verification before editing.
Reviewers block scope creep, speculative flexibility, unrelated cleanup, and
diff churn that cannot be traced to the request or slice plan.

### Lifecycle (Tier 0)
- `/god-init` - Initialize a Godpowers project. Detects mode (A/B/C/D) and scale.
- `/god-mode` - Full autonomous arc orchestrator (idea to hardened production).

### Planning tier (Tier 1)
- `/god-discuss` - Adaptive Socratic discussion before planning.
- `/god-explore` - Open-ended Socratic ideation.
- `/god-list-assumptions` - Surface assumptions before they cement.
- `/god-prd` - Write Product Requirements Document.
- `/god-arch` - Design system architecture.
- `/god-roadmap` - Sequence work into milestones.
- `/god-stack` - Pick the technology stack.
- `/god-design` - DESIGN.md / PRODUCT.md lifecycle (Google Labs spec + impeccable).
- `/god-design-impact` - Predict impact of a proposed DESIGN.md change.
- `/god-org-context` - Bluefield org-level context (standards, conventions, infra).

### Building tier (Tier 2)
- `/god-repo` - Scaffold a production-grade repository.
- `/god-build` - Build the milestone (TDD, waves, two-stage review).
- `/god-add-tests` - Generate tests for existing code based on UAT criteria.

### Shipping tier (Tier 3)
- `/god-deploy` - Set up deploy pipeline.
- `/god-observe` - Wire observability + SLOs.
- `/god-launch` - Launch the product (gated on harden).
- `/god-harden` - Adversarial security review.

### Beyond greenfield
- `/god-feature` - Add a feature to an existing project.
- `/god-hotfix` - Urgent production bug fix (skips planning).
- `/god-refactor` - Safe refactor with strict TDD (no behavior change).
- `/god-spike` - Time-boxed research with throwaway POC.
- `/god-postmortem` - Post-incident investigation.
- `/god-upgrade` - Framework / version migration (expand-contract).
- `/god-docs` - Documentation work (verified against code).
- `/god-update-deps` - CVE-aware incremental dependency updates.
- `/god-hygiene` - Composite health check (audit + deps + docs).
- `/god-tech-debt` - Assess + prioritize debt across 8 categories.

### Story-file workflow (fine-grained slices)
- `/god-story` - Write a STORY.md (smaller than /god-feature).
- `/god-stories` - List all STORY.md files grouped by status.
- `/god-story-build` - Implement a single story.
- `/god-story-verify` - Run story's acceptance criteria as headless browser tests.
- `/god-story-close` - Mark a story done after build + verify.

### Mode D (multi-repo suites)
- `/god-suite-init` - Register a multi-repo suite (siblings, byte-identical files).
- `/god-suite-status` - Show all repos' status side-by-side.
- `/god-suite-sync` - Propagate byte-identical files across all repos.
- `/god-suite-patch` - Coordinated change touching multiple repos.
- `/god-suite-release` - Coordinate a release across siblings.

### Linkage + propagation
- `/god-scan` - Manually trigger a full reverse-sync of the codebase.
- `/god-link` - Manually add or remove a code-artifact link.
- `/god-sync` - Sync all affected artifacts after feature work.
- `/god-review-changes` - Walk REVIEW-REQUIRED.mdx interactively.
- `/god-reconcile` - Comprehensive reconciliation across all impacted artifacts.
- `/god-reconstruct` - Reverse-engineer planning artifacts from existing code.
- `/god-migrate` - Convert adjacent planning-system context (including sibling `.godplans/PLAN.mdx` and canonical `.godaudits/AUDIT.json`) into Godpowers prep and seed artifacts, with open GA tasks synchronized to managed todos.

### Verification
- `/god-lint` - Mechanical validation against have-nots catalog.
- `/god-standards` - Artifact standards check (substitution + three-label + have-nots).
- `/god-test-runtime` - Headless browser verification (design audit + flow assertions).
- `/god-dogfood` - Run messy-repo dogfood scenarios for migration, host, extension, and suite readiness.
- `/god-preflight` - Read-only intake audit before arc-ready and pillars.
- `/god-audit` - Score existing artifacts against all have-nots, cross-referencing prior `.godaudits/AUDIT.json` score, coverage, findings, and remediation state when present.
- `/god-agent-audit` - Validate every agents/*.md against the agent contract.

### Recovery
- `/god-undo` - Revert last operation via reflog.
- `/god-redo` - Re-run a tier or sub-step that already completed.
- `/god-rollback` - Walk back a tier; move downstream artifacts to trash.
- `/god-restore` - Recover files from `.godpowers/.trash/`.
- `/god-repair` - Fix drift between `state.json` and disk state.
- `/god-skip` - Skip a tier or sub-step with an audited reason.
- `/god-locate` - Deprecated compatibility alias for `/god-status --locate`.
- `/god-lifecycle` - Deprecated compatibility alias for `/god-status --lifecycle`.
- `/god-context-scan` - Detect drift between session mental model and disk.
- `/god-smite` - Hard reset of the project's dependency cache.
- `/god-doctor` - Diagnose install and project state; report fixes.

### Observability
- `/god-logs` - View `events.jsonl` as a readable timeline.
- `/god-metrics` - Per-tier durations, pause and error counts.
- `/god-trace` - Filter one run by tier for a deep dive.
- `/god-cost` - Token + dollar spend report; live vs estimated split.
- `/god-budget` - View / set context budgets per agent and tier.
- `/god-cache-clear` - Invalidate the agent-output cache.
- `/god-export-otel` - Export `events.jsonl` to an OTLP/JSON collector
  (Honeycomb, Datadog, Jaeger, Tempo).

### Knowledge + intelligence
- `/god-map-codebase` - Parallel codebase analysis.
- `/god-intel` - Query / refresh codebase intel.
- `/god-archaeology` - Deep code archaeology for brownfield projects.
- `/god-graph` - Build, query, and inspect the project knowledge graph.
- `/god-thread` - Persistent context threads.
- `/god-extract-learnings` - Capture decisions / lessons / patterns.

### Capture
- `/god-add-todo` - Capture as todo with priority.
- `/god-check-todos` - List and route todos.
- `/god-note` - Zero-friction idea capture.
- `/god-add-backlog` - Add to long-term backlog.
- `/god-plant-seed` - Forward-looking idea with trigger condition.

### Process / team
- `/god-sprint` - Sprint plan / status / retro.
- `/god-party` - Multi-persona collaboration session.
- `/god-pause-work` - Save context handoff.
- `/god-resume-work` - Restore from handoff.
- `/god-workstream` - Parallel workspace management.

### Roadmap maintenance
- `/god-roadmap-check` - Deprecated compatibility command in the full profile only. Prefer `/god-reconcile`.
- `/god-roadmap-update` - Update roadmap after feature work.

### Context + configuration
- `/god-context` - Manage fenced section in AGENTS.md / CLAUDE.md / GEMINI.md / etc.
- `/god-settings` - View / modify intent.yaml settings.
- `/god-surface` - Preview or apply a runtime command surface profile.
- `/god-set-profile` - Switch model profile.

### Utility
- `/god-fast` - Trivial inline edit (no agents, no plans).
- `/god-quick` - Small task with TDD discipline, skip optional gates.
- `/god-debug` - 4-phase systematic debug.
- `/god-review` - Two-stage code review (spec + quality).
- `/god-pr-branch` - Clean PR branch (filter .godpowers/ commits).
- `/god-build-agent` - Generate custom specialist agent.
- `/god-help` - Discoverable contextual help; shows compact guidance by default and the full catalog through `/god-help all`.
- `/god-version` - Print installed Godpowers version and capability summary.

### Extensions
Pack management:
- `/god-extension-scaffold` - Create a publishable extension pack skeleton.
- `/god-extension-add` - Install an extension pack from a local dir or npm.
- `/god-extension-list` - Show all installed packs.
- `/god-extension-info` - Manifest + capabilities of one installed pack.
- `/god-extension-remove` - Uninstall a pack.
- `/god-test-extension` - Contract tests against a pack before publishing.

First-party packs on npm:
- `@godpowers/security-pack` - SOC 2, HIPAA, PCI auditors
- `@godpowers/launch-pack` - Show HN, Product Hunt, Indie Hackers, OSS strategists
- `@godpowers/data-pack` - ETL, ML feature, dashboard specialists

## Specialist agents (40 total)

### Tier 0 - Orchestration
- `god-orchestrator` - Autonomous arc runner (Quarterback).
- `god-coordinator` - Mode D peer for multi-repo coordination.
- `god-org-context-loader` - Bluefield org-context reader.

### Tier 1 - Planning agents
- `god-pm` - PRD writer.
- `god-architect` - System designer.
- `god-roadmapper` - Work sequencer.
- `god-stack-selector` - Tech stack picker.
- `god-designer` - DESIGN.md + PRODUCT.md lifecycle owner.
- `god-design-reviewer` - Two-stage design gate (spec + quality).
- `god-explorer` - Pre-init Socratic ideator.

### Tier 2 - Building agents
- `god-repo-scaffolder` - Repo bootstrap.
- `god-planner` - Build slice planner.
- `god-executor` - TDD-enforced implementer with request-trace discipline.
- `god-spec-reviewer` - Stage 1 code review for spec compliance and scope.
- `god-quality-reviewer` - Stage 2 code review for quality, simplicity, and surgicality.
- `god-storyteller` - STORY.md writer.

### Tier 3 - Shipping agents
- `god-deploy-engineer` - Deploy pipeline.
- `god-observability-engineer` - SLOs + runbooks.
- `god-launch-strategist` - Launch copy.
- `god-harden-auditor` - OWASP walker (Critical blocks launch).
- `god-browser-tester` - Headless browser runtime verification.

### Workflow specialists
- `god-spike-runner` - Time-boxed POC builder.
- `god-automation-engineer` - Approved host automation setup.
- `god-migration-strategist` - Expand-contract migrations.
- `god-docs-writer` - No-lying docs (verified against code).
- `god-deps-auditor` - CVE-aware dep updates.
- `god-debugger` - 4-phase systematic debug.
- `god-incident-investigator` - Postmortems with action items.
- `god-retrospective` - Sprint retrospectives.
- `god-debt-assessor` - Technical debt assessor.

### Brownfield specialists
- `god-archaeologist` - Deep code archaeology.
- `god-reconstructor` - Reverse-engineer planning artifacts.
- `god-reconciler` - Cross-artifact reconciliation.
- `god-greenfieldifier` - Convert a greenfield audit into a brownfield/bluefield migration plan.

### Meta
- `god-auditor` - Have-nots scorer.
- `god-standards-check` - Artifact discipline gate.
- `god-updater` - Reverse-sync runner.
- `god-context-writer` - AI-tool context fenced section manager.
- `god-roadmap-reconciler` - Legacy compatibility adapter for roadmap overlap checks.
- `god-roadmap-updater` - Roadmap update after work.

## Native Pillars context

Every Godpowers project is also a Pillars project. Commands load
`agents/context.md` and `agents/repo.md` first, then route task-specific
pillar files by frontmatter triggers, `must_read_with`, and `see_also`.

```
AGENTS.md              Pillars loading protocol plus Godpowers managed fence
agents/context.md      Always-loaded project identity and invariants
agents/repo.md         Always-loaded repository layout and naming
agents/stack.md        Technology choices and version constraints
agents/arch.md         System boundaries and architecture decisions
agents/data.md         Data model, migrations, queries, and storage
agents/api.md          API contracts and request/response shapes
agents/ui.md           Visual UI, components, and design tokens
agents/auth.md         Identity, sessions, roles, and access control
agents/quality.md      Testing, errors, style, and naming
agents/deploy.md       Environments, promotion, rollback, and release process
agents/observe.md      Logs, metrics, tracing, alerts, and runbooks
```

Existing `.godpowers` projects are Pillar-ized on resume and sync. Current
Godpowers artifacts become managed source references in the relevant pillar
files, with labeled decisions, hypotheses, and open questions extracted when
available.

## Artifact paths

```
.godpowers/
  state.json               Machine-readable project state
  PROGRESS.mdx              Generated tier status view
  REQUIREMENTS.mdx          Deliverable ledger (requirements done / in progress / not started, from /god-progress)
  intent.yaml              Project intent
  links/                   Requirement-to-code linkage map
  prep/INITIAL-FINDINGS.md Godpowers init scan and suggested next rationale
  prep/IMPORTED-CONTEXT.md Optional legacy planning / Superpowers / BMAD preparation context

  prd/PRD.md               Product Requirements
  domain/GLOSSARY.md       Domain vocabulary and resolved ambiguities
  design/DESIGN.md         Early UI and product-experience design spec when required
  design/PRODUCT.md        Strategic product file when required
  arch/ARCH.md             Architecture
  arch/adr/                ADRs
  roadmap/ROADMAP.md       Sequenced work
  stack/DECISION.md        Tech decisions
  repo/AUDIT.md            Repo scaffold audit
  build/PLAN.md            Build slices
  build/STATE.md           Generated build state view
  deploy/STATE.md          Generated deploy state view
  observe/STATE.md         Generated observability state view
  launch/STATE.md          Generated launch state view
  harden/FINDINGS.md       Security findings

  stories/STORY-*.md       Fine-grained slices
  postmortems/<id>/POSTMORTEM.md
  spikes/<slug>/SPIKE.md
  migrations/<slug>/MIGRATION.md
  features/<slug>/PRD.md

  links/                   Bidirectional artifact-to-code map (two JSON files)
  REVIEW-REQUIRED.mdx       Pending propagation reviews

  codebase/                Codebase intelligence (mappers + archaeology)
  todos/TODOS.md
  notes/NOTES.md
  backlog/BACKLOG.md
  seeds/<id>.md
  threads/<name>.md

  suite/                   Mode D multi-repo config + version table

  runs/<id>/events.jsonl   Per-run event log
  log                      Reflog
  .trash/                  Recoverable deletions

  YOLO-DECISIONS.mdx        Auto-decisions log
  HANDOFF.mdx               Pause/resume context
  AUDIT-REPORT.md          /god-audit output
  HYGIENE-REPORT.md        /god-hygiene composite
```

## CLI

Install, profile switching, and read-only helper commands. Slash commands
remain the primary project workflow surface.

```
npx godpowers --claude --global    Install for Claude Code
npx godpowers --all                Install for all 15 runtimes
npx godpowers surface --profile=core --codex --global --dry-run
npx godpowers demo --project=.
npx godpowers status --project=.
npx godpowers verify "npm test" --substep tier-2.build --claim "tests pass" --project=.
npx godpowers --uninstall          Remove
npx godpowers --migrate            One-shot upgrade
npx godpowers --help               Help
```

Supported runtimes (15): Claude, Codex, Cursor, Windsurf, Gemini, OpenCode,
Copilot, Augment, Trae, Cline, Kilo, Antigravity, Qwen, CodeBuddy, Pi.
T3 Code inherits from the underlying agent (Codex / Claude / OpenCode).

Codex installs include matching `god-*.toml` metadata beside each
`agents/god-*.md` file so specialist agents can be exposed as spawnable Codex
agent types when the runtime reloads its agent registry.

Spawning is platform-neutral at the skill layer. Commands say to spawn the
named `god-*` specialist through the host platform's native agent mechanism.
Claude Code, Codex, Cursor, Windsurf, Gemini, OpenCode, Copilot, Augment,
Trae, Cline, Kilo, Antigravity, Qwen, CodeBuddy, and Pi may expose that
mechanism differently. The installed Markdown agent contract is the portable
source; Codex TOML is the adapter for Codex's registry.

## Schemas

JSON Schema files at `schema/`:
- `intent.v1.yaml.json` - intent.yaml structure
- `state.v1.json` - state.json structure
- `events.v1.json` - events.jsonl event vocabulary
- `workflow.v1.json` - workflow YAML structure
- `routing.v1.json` - routing config structure

## See also

- [Getting Started](getting-started.md)
- [Concepts](concepts.md)
- [Change Propagation](change-propagation.md)
- [Linkage](linkage.md)
- [Validation](validation.md)
- [Have-Nots Catalog](../references/HAVE-NOTS.md)
- [Architecture](../ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Inspiration](../INSPIRATION.md)
