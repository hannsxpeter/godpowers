# lib/ - Runtime Library

This directory contains the JavaScript runtime modules that support Godpowers
validation, routing, workflow execution, state management, observability, and
package-level integrations.

## Core state and intent

| Module | Purpose |
|--------|---------|
| `state.js` | Read, initialize, validate, and write `.godpowers/state.json`. |
| `state-views.js` | Generate managed markdown views such as `.godpowers/PROGRESS.mdx` and Godpowers-owned per-tier `STATE.md` files from `state.json`. |
| `state-advance.js` | Mutate one tracked state step through locking and generated state view refresh. |
| `state-lock.js` | Coordinate state writes with a lock file. |
| `intent.js` | Read and validate `intent.yaml` from project roots or `.godpowers/`. |
| `frontmatter.js` | Parse shared markdown YAML frontmatter for skills, agents, Pillars, checkpoints, and design specs. |
| `checkpoint.js` | Create and inspect resumable checkpoint artifacts. |
| `feature-awareness.js` | Detect and refresh existing-project awareness after runtime upgrades. |
| `code-intelligence.js` | Detect optional `ast-grep`, `sg`, and LSP tooling for structural search, rewrite, and diagnostics guidance. |
| `host-capabilities.js` | Detect host guarantees for shell, git, npm, agent spawning, optional code intelligence, extension authoring, and suite dry-runs. |
| `repo-doc-sync.js` | Detect and refresh mechanical repository documentation surfaces. |
| `repo-surface-sync.js` | Detect structural drift across commands, routes, packages, agents, workflows, recipes, extensions, and release policy. |
| `route-quality-sync.js` | Detect symbolic route spawns, unresolved agent targets, and untyped contextual route exits. |
| `recipe-coverage-sync.js` | Detect missing high-frequency intent recipe coverage. |
| `release-surface-sync.js` | Detect release-facing drift across badges, release notes, changelog, package checks, and release checklist policy. |
| `dogfood-runner.js` | Run deterministic messy-repo scenarios against migration, host, extension, and suite release behavior. |
| `budget.js` | Read and enforce configured budget controls. |
| `cost-tracker.js` | Track token and cost estimates from event streams. |
| `atomic-write.js` | Write load-bearing files through temp-file validation and atomic rename. |
| `fs-async.js` | Promise-based file read/write helpers for non-blocking runtime paths. |
| `sync-fs.js` | Shared project-relative read/write/exists/readJson helpers for the `*-sync` modules. |
| `sync-check.js` | Shared check-builder (`addCheck`/`makeAddCheck`) and file-lister for the `*-sync` modules. |

## Events and observability

| Module | Purpose |
|--------|---------|
| `events.js` | Append structured runtime events. |
| `event-reader.js` | Read and aggregate event streams. |
| `otel-exporter.js` | Export Godpowers events in an OpenTelemetry-shaped format. |
| `runtime-audit.js` | Audit runtime health and expected project state. |
| `blind-compare.js` | Prepare unlabeled A/B screenshot pairs with a sealed role assignment; enforce verdict-before-unseal ordering and verdict immutability. |
| `runtime-test.js` | Provide runtime checks used by package tests. |
| `evidence.js` | Enforced producer of executed/attested verification records, the state.json rollup, gate events, reflections, memory, lessons, and outcome loops. |
| `evidence-import.js` | Import an existing `.mythify/` ledger into `.godpowers/ledger/`. |
| `work-report.js` | Render the verification play-by-play from the evidence ledger. |
| `adoption-metrics.js` | Derive adoption and outcome metrics from event streams. |
| `change-metrics.js` | Derive the loop accepted-change rate (accepted vs rejected changes) from the event ledger. |
| `learning-metrics.js` | Derive learning-loop counts (lessons recorded and recalled) from the event ledger; observability only, with the accepted-change rate alongside labeled correlation, not causation. |
| `improvement-proposals.js` | Human-gated prompt-change pipeline: draft a patch against a frozen prompt surface, escalate it into the review queue at staged severity, and record the human decide verdict; never applies a patch itself. |
| `loop-config.js` | Loop parameter registry: single home for fast-loop knobs (repair attempts, outcome budget, freshness windows) with per-project overrides in intent.yaml loop-params, edited through /god-budget with a logged reason. |
| `repair-integrity.js` | Test-integrity counter-metric for the autonomous repair loop: snapshot the test surface before repair, compare after green, and mark a green SUSPECT when test files vanish, skips rise, or coverage floors drop. |
| `outcome-metrics.js` | Derive time, cost, intervention, resume, deployment, and rollback outcomes from event evidence. |
| `self-project-truth.js` | Block release when Godpowers source, state, Pillars, roadmap provenance, or lifecycle artifacts contradict. |

## Routing and execution

| Module | Purpose |
|--------|---------|
| `router.js` | Resolve user intent to skills, agents, recipes, and workflows. |
| `quarterback.js` | Entry router that classifies a prompt into a play and refuses new work when the project is on red. |
| `command-families.js` | Define UX command families, status views, decision ladders, and trigger precedence helpers. |
| `recipes.js` | Load and validate routing recipes. |
| `workflow-parser.js` | Parse workflow YAML into executable steps. |
| `workflow-runner.js` | Execute workflow steps with validation hooks. |
| `workflow-helper-groups.js` | Expand named workflow helper groups into explicit local helper names for plan visibility. |
| `agent-cache.js` | Cache agent metadata for faster routing. |
| `agent-validator.js` | Validate agent frontmatter and contracts. |
| `agent-refs.js` | Validate workflow agent references and scan skill/agent prose for phantom references. |
| `executor-repair.js` | Classify executor repair decisions as retry, decompose, prune, or escalate. |
| `skill-surface.js` | Derive slash-command metadata from the individual `skills/` files. |

## Artifact quality

| Module | Purpose |
|--------|---------|
| `artifact-map.js` | Tier gate artifact map: the per-tier required artifacts, cadence tiers (fast/managed/slow/frozen), and state steps used by dashboards, gates, and doc-count checks. (Module-local paths stay in their owning module; `state.json` is named via `state.STATE_FILE`.) |
| `artifact-linter.js` | Check artifacts for required labels, evidence, and domain precision. |
| `artifact-diff.js` | Compare artifact changes for review and release workflows. |
| `cadence-guard.js` | Slow-artifact re-bless guard: classify a stale roadmap hash as a managed version stamp or content drift, so mechanical loops escalate drift for review instead of re-stamping it. |
| `gate.js` | Run executable artifact gates for Phase 1 tier completion checks, including claimed-vs-executed attestation pairing and conditional program-design validation for Build. |
| `program-design.js` | Validate small-change skip rationales and approved medium or large program-design records before Build closes. |
| `slice-handoff.js` | Project authoritative plan, state, event, linkage, and verification evidence into a bounded resume record. |
| `maintainability-trajectory.js` | Capture deterministic report-only source, function, duplication, dependency, and cycle deltas around a slice. |
| `evolution-benchmark.js` | Run the offline six-checkpoint changeability fixture and retain deterministic machine and human evidence. |
| `findings-verdict.js` | Shared verdict authority for harden FINDINGS.mdx: one parser, two named policies (launch honors human-accepted risk, publication never does); no auditor-authored summary line satisfies a gate. |
| `have-nots-validator.js` | Check artifacts against known failure modes. |
| `prose-lint.js` | Scan inert text for seven context-sensitive prose patterns and return ordered advisory findings without dependencies or file-system writes. |
| `voice-lint.js` | Detect sycophancy and gratitude-loop filler (have-not U-14); backs the artifact linter and the shipped-prose self-dogfood. |
| `meta-linter.js` | Validate Godpowers documentation and skill metadata. |
| `story-validator.js` | Validate story artifacts and story lifecycle state. |
| `style-stats.js` | Measure the style genome: comment density, naming-casing histograms, and function-length distribution per language, so `CODEDNA.md` carries measured numbers instead of estimates. |

`have-nots-validator.js` maps prose findings to advisory U-12 warnings, which
do not block an artifact by themselves. Pattern matching can produce false
positives and miss prose that needs revision. A clean scan does not prove
correctness, human authorship, or objective quality.

Documentation defaults to direct, verified engineering language. Launch copy
may preserve an approved founder or product voice.

## Design, context, and integrations

| Module | Purpose |
|--------|---------|
| `context-writer.js` | Produce tool-specific context files. |
| `context-budget.js` | Validate explicit specialist context contracts, plan bounded loadouts, and project content-free evidence. |
| `planning-systems.js` | Detect and import legacy planning, BMAD, Superpowers, godplans, and godaudits context, including complete GP/R seed traceability and MDX-safe GA todo synchronization. |
| `sibling-artifacts.js` | Read-only consumer for the Godplans 1.1 PLAN plus pinned validator contract and canonical `.godaudits/AUDIT.json`, with lifecycle-safe GP routing, legacy context fallback, check and evidence ledgers, compliance, accepted risks, score and coverage digests, typed GA dispatch, and import staleness. |
| `source-sync.js` | Write managed Godpowers progress back to source-system companion files. |
| `design-detector.js` | Detect design-system conventions. |
| `design-spec.js` | Normalize design specifications. |
| `awesome-design.js` | Validate design guidance against awesome-design rules. |
| `browser-bridge.js` | Connect browser verification flows. |
| `agent-browser-driver.js` | Drive browser-backed agent checks. |
| `skillui-bridge.js` | Bridge skill metadata into UI surfaces. |
| `impeccable-bridge.js` | Bridge runtime checks into impeccable quality workflows. |
| `extensions.js` | Load and validate extension packs. |
| `extension-authoring.js` | Scaffold publishable extension packs with manifest, package, README, skill, agent, and workflow files. |
| `package-legitimacy.js` | Assess third-party package metadata for existence, typo risk, recency, and repository signals. |
| `pillars.js` | Manage the Pillars project-context layer (`AGENTS.md` plus routed `agents/*.md`). |
| `product-routing.js` | Select product form before composing archetype, industry, and regulatory guidance. |
| `prepublication-gate.js` | Bind public activation to a fresh hardening hash and Critical-finding check. |
| `connectors.js` | Registry, detection, and write-scope policy for external connectors (GitHub, Linear, Slack, Sentry, Notion) that loops act through by delegating to host MCP servers. |

## Repository and graph helpers

| Module | Purpose |
|--------|---------|
| `code-scanner.js` | Scan source trees for routing and quality evidence. |
| `source-grounding.js` | Check that build plans cite existing files and symbols before execution starts. |
| `cross-artifact-impact.js` | Detect relationships between changed artifacts. |
| `cross-repo-linkage.js` | Track suite-level repository relationships. |
| `drift-detector.js` | Detect context drift between artifacts and implementation. |
| `impact.js` | Summarize expected impact of proposed changes. |
| `linkage.js` | Connect artifacts, stories, and implementation files. |
| `requirements.js` | Track which PRD requirements are done, in progress, or untouched from disk evidence. |
| `multi-repo-detector.js` | Detect multi-repository workspaces. |
| `reverse-sync.js` | Reflect implementation changes back into artifacts. |
| `review-required.js` | Decide when review gates should block progress. |
| `suite-state.js` | Manage state across registered project suites. |

## Installer, dashboard, and CLI helpers

| Module | Purpose |
|--------|---------|
| `installer-core.js` | Install and uninstall the Godpowers surface for each runtime. |
| `installer-files.js` | File-copy helpers shared by the installer and its tests. |
| `installer-args.js` | Parse `bin/install.js` arguments and subcommands. |
| `cli-dispatch.js` | Dispatch local CLI helper commands such as status, quick-proof, gate, dogfood, and extension-scaffold. |
| `cli-log.js` | Shared ANSI console logger (log/success/warn/error) for the binary and CLI dispatch. |
| `text-util.js` | Small shared string helpers (the canonical `slugify`). |
| `mcp-info.js` | Render read-only MCP companion setup instructions for `npx godpowers mcp-info`. |
| `install-profiles.js` | Select smaller role-specific slash-command install surfaces. |
| `surface-profile.js` | Preview and apply runtime command surface profile switches after install. |
| `installer-runtimes.js` | Map supported runtimes to their config directories. |
| `package-identity.js` | Centralize package name, version, repository, docs, and command identity. |
| `automation-providers.js` | Detect and configure host-native automation providers. |
| `reaudit.js` | Track permission/attack-surface audit staleness and report when a loop is due for a re-audit (default 30-day cadence). |
| `dashboard.js` | Compute the next-step action brief and host guarantee line. |
| `quick-proof.js` | Render the shipped proof fixture for `godpowers quick-proof`. |

See `../ARCHITECTURE.md` for system design and `../docs/ROADMAP.md` for planned
runtime work.
