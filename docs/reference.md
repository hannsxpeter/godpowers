# Godpowers Reference

Complete command, agent, and artifact reference for v2.0.1.

## Slash commands (110 total)

### Front door
- `/god` - Free-text intent matcher. Maps to a recipe and proposes the right command.
- `/god-next` - Pre-flight + post-flight routing. Suggests next command from state.
- `/god-status` - Re-derive project state from disk.
- `/god-automation-status` - Show host automation provider support.
- `/god-automation-setup` - Prepare opt-in automation setup.
- `/god-migrate` - Detect GSD, BMAD, and Superpowers context, import seeds, and sync back progress.
- `/god-lifecycle` - Show project phase and contextually appropriate workflows.

### Installer CLI helpers
- `godpowers status --project .` - Render the shared dashboard from disk state.
- `godpowers next --project .` - Render the dashboard and show the recommended next command.
- `godpowers quick-proof --project .` - Render the shipped proof fixture with host guarantees.
- `godpowers automation-status --project .` - Show automation provider support.
- `godpowers automation-setup --project .` - Show a reviewed setup and execution plan.
- `godpowers dogfood` - Run built-in messy-repo dogfood scenarios.
- `godpowers extension-scaffold --name=@scope/pack --output=.` - Create a publishable extension pack skeleton.
- `godpowers status --project . --brief` - Render only the action brief, host guarantee, status, and next route.
- `godpowers status --project . --json` - Emit machine-readable dashboard state.

Dashboard status uses workflow progress from `.godpowers/state.json` tracked
steps. Audit, hygiene, remediation, and launch-readiness scores are separate
metrics and should be labeled separately in closeouts.

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
- `/god-review-changes` - Walk REVIEW-REQUIRED.md interactively.
- `/god-reconcile` - Comprehensive reconciliation across all impacted artifacts.
- `/god-reconstruct` - Reverse-engineer planning artifacts from existing code.
- `/god-migrate` - Convert adjacent planning-system context into Godpowers prep and seed artifacts.

### Verification
- `/god-lint` - Mechanical validation against have-nots catalog.
- `/god-standards` - Artifact standards check (substitution + three-label + have-nots).
- `/god-test-runtime` - Headless browser verification (design audit + flow assertions).
- `/god-dogfood` - Run messy-repo dogfood scenarios for migration, host, extension, and suite readiness.
- `/god-preflight` - Read-only intake audit before arc-ready and pillars.
- `/god-audit` - Score existing artifacts against all have-nots.
- `/god-agent-audit` - Validate every agents/*.md against the agent contract.

### Recovery
- `/god-undo` - Revert last operation via reflog.
- `/god-redo` - Re-run a tier or sub-step that already completed.
- `/god-rollback` - Walk back a tier; move downstream artifacts to trash.
- `/god-restore` - Recover files from `.godpowers/.trash/`.
- `/god-repair` - Fix drift between `state.json` and disk state.
- `/god-skip` - Skip a tier or sub-step with an audited reason.
- `/god-locate` - Orient a fresh AI session from CHECKPOINT.md + state.
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
- `/god-roadmap-check` - Check if intent overlaps existing roadmap.
- `/god-roadmap-update` - Update roadmap after feature work.

### Context + configuration
- `/god-context` - Manage fenced section in AGENTS.md / CLAUDE.md / GEMINI.md / etc.
- `/god-settings` - View / modify intent.yaml settings.
- `/god-set-profile` - Switch model profile.

### Utility
- `/god-fast` - Trivial inline edit (no agents, no plans).
- `/god-quick` - Small task with TDD discipline, skip optional gates.
- `/god-debug` - 4-phase systematic debug.
- `/god-review` - Two-stage code review (spec + quality).
- `/god-pr-branch` - Clean PR branch (filter .godpowers/ commits).
- `/god-build-agent` - Generate custom specialist agent.
- `/god-help` - Discoverable contextual help; lists skills grouped by tier.
- `/god-version` - Print installed Godpowers version and capability summary.

### Extensions (runtime since v0.13, packs on npm since v0.15)
Pack management:
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

### Meta
- `god-auditor` - Have-nots scorer.
- `god-standards-check` - Artifact discipline gate.
- `god-updater` - Reverse-sync runner.
- `god-context-writer` - AI-tool context fenced section manager.
- `god-roadmap-reconciler` - Roadmap overlap detection.
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
  PROGRESS.md              Tier status
  intent.yaml              Project intent
  state.json               Project state
  prep/INITIAL-FINDINGS.md Godpowers init scan and suggested next rationale
  prep/IMPORTED-CONTEXT.md Optional GSD / Superpowers / BMAD preparation context

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
  build/STATE.md           Build progress
  deploy/STATE.md          Deploy pipeline
  observe/STATE.md         Observability
  launch/STATE.md          Launch artifacts
  harden/FINDINGS.md       Security findings

  stories/STORY-*.md       Fine-grained slices
  postmortems/<id>/POSTMORTEM.md
  spikes/<slug>/SPIKE.md
  migrations/<slug>/MIGRATION.md
  features/<slug>/PRD.md

  linkage.json             Bidirectional artifact-to-code map
  REVIEW-REQUIRED.md       Pending propagation reviews

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

  YOLO-DECISIONS.md        Auto-decisions log
  HANDOFF.md               Pause/resume context
  AUDIT-REPORT.md          /god-audit output
  HYGIENE-REPORT.md        /god-hygiene composite
```

## CLI

Install-only. Everything else is slash commands.

```
npx godpowers --claude --global    Install for Claude Code
npx godpowers --all                Install for all 15 runtimes
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
