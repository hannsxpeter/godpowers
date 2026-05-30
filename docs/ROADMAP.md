# Godpowers Implementation Roadmap

> Status: ACTIVE
> Model: Pure-skill for durable work. CLI provides install plus read-only status helpers.
> Last updated: 2026-05-30
> Current shipped: v2.2.1

This roadmap tracks releases, what's shipped, and what is frozen during the
2.0 public adoption window. Everything user-facing remains slash-command based.

---

## Shipped releases

### Current surface (v2.2.1)

What works today:
- **111 slash commands** as thin orchestrators (front door, lifecycle, planning,
  building, shipping, design, runtime, linkage, story-file, suite, recovery,
  observability, capture, knowledge, process, configuration, utility,
  automation, migration, extension management, release support)
- **40 specialist agents** in fresh contexts
- **13 executable workflows** and **41 intent recipes**
- **Deliverable progress tracking**: `/god-progress` and the
  `.godpowers/REQUIREMENTS.md` ledger report which requirements and roadmap
  increments are done, in progress, or not started, derived from the linkage map
- **15-runtime installer**: Claude, Codex, Cursor, Windsurf, Gemini, OpenCode,
  Copilot, Augment, Trae, Cline, Kilo, Antigravity, Qwen, CodeBuddy, Pi
  (with T3 Code transparently inheriting the underlying agent)
- **Executable dashboard engine**: `lib/dashboard.js` powers `/god-status`,
  `/god-next`, God Mode closeouts, `godpowers status --project .`,
  `godpowers next --project .`, and JSON status output. Rendered dashboards
  name the runtime source, label workflow progress, report host guarantees,
  support compact `--brief` output, and keep audit scores out of the workflow
  percentage.
- **Executable quick proof**: `npx godpowers quick-proof --project .` renders
  a shipped fixture with real `.godpowers/state.json`, computed next action,
  missing-artifact visibility, and host guarantees from the caller's
  environment.
- **Adoption canary harness**: `node scripts/run-adoption-canary.js <git-url>`
  clones an external repository and captures CLI-verifiable proof, dashboard,
  and next-route signals for first-user trust review.
- **Published install verifier**: `node scripts/verify-published-install.js
  godpowers@latest` checks quick proof, status, next, Claude install, and
  Codex metadata install against the registry artifact.
- **Messy-repo dogfooding**: `/god-dogfood` and `npx godpowers dogfood` run
  fixture scenarios for GSD migration, sync-back, host capabilities, extension
  authoring, and Mode D suite release dry-runs.
- **Automation provider detection**: `lib/automation-providers.js` powers
  `/god-automation-status`, `/god-automation-setup`,
  `godpowers automation-status --project .`, and
  `godpowers automation-setup --project .` without creating background work
  during install.
- **Approved automation setup execution**: `/god-automation-setup` can use
  host tool calling for simple read-only setup or spawn
  `god-automation-engineer` for complex setup, then records state only after
  the host setup succeeds.
- **Strict release readiness automation**: background release checks use the
  `strict-release-readiness` template to fail closed unless every required
  root-doc, docs, agent, skill, route, workflow, schema, template, reference,
  hook, runtime, script, test, fixture, GitHub workflow, package, registry,
  release, and install surface is checked.
- **Planning-system migration**: `/god-init` and `/god-migrate` detect GSD,
  BMAD, and Superpowers, import prep context and seed artifacts, and
  `/god-sync` writes managed sync-back companion files.
- **Feature awareness**: existing `.godpowers` projects record the current
  runtime feature set and refresh AI-tool context after upgrades.
- **Repo documentation sync**: README badges, public surface counts, release
  docs, contribution guidance, security policy checks, and Pillars planning
  are checked during sync, docs, doctor, status, and god-mode closeouts.
- **Repo surface sync**: command routing, package payloads, agent handoffs,
  workflow metadata, recipe routes, extension packs, route-quality checks,
  recipe-coverage checks, release-surface checks, and release policy checks are
  checked during sync, docs, doctor, status, and god-mode closeouts.
- **Host capability detection**: `lib/host-capabilities.js` reports full,
  degraded, or unknown guarantees for shell tools, agent spawning, extension
  authoring, and suite dry-runs.
- **Extension authoring scaffold**: `npx godpowers extension-scaffold` creates
  manifest, package, README, skill, agent, and workflow files without
  overwriting existing files by default.
- **Suite release dry-run planning**: `suiteState.planRelease` identifies
  impacted dependents and planned writes before `god-coordinator` mutates a
  Mode D suite.
- **Codex agent metadata**: all 40 Godpowers specialist agents install with
  matching TOML metadata files for Codex spawnability
- **Request-trace build and review guardrails**: executors state assumptions,
  changed public behavior, expected files, and verification before editing,
  while reviewers block speculative flexibility, unrelated cleanup, and
  untraceable diff churn.
- **Release hardening**: the full test gate is maintained in
  `scripts/run-tests.js`, static checks run through `scripts/static-check.js`,
  the dependency-free YAML subset has dedicated coverage, router file checks
  reject traversal, and installer recursive copy preserves symlinks.
- **Maintenance hardening**: installer runtime logic lives in `lib/`, workflow
  agent references validate semver ranges, test files share one harness,
  `skills/` is the executable command metadata source, and async state, intent,
  and workflow plan APIs provide the migration path away from sync-only I/O.
- **Safe-sync release truth routing**: `/god-next` and `/god-deploy` route
  unresolved safe sync gates to `/god-reconcile Release Truth And Safe Sync`
- **Direct release gate enforcement**: Tier 3 commands, `/god-mode`, and
  `/god-mode --yolo` honor safe sync and Critical harden blockers
- **Transcript-safe God Mode spawn handoff**: `/god-mode` writes detailed
  orchestration context to `.godpowers/runs/<run-id>/ORCHESTRATOR-HANDOFF.md`
  and spawns `god-orchestrator` with only a display-safe pointer
- **Transcript-safe init and suite handoffs**: `/god-init` and Mode D suite
  coordinator paths use private handoff files before orchestrator or
  coordinator spawns
- **Human-readable progress reports**: `/god-status`, `/god-locate`,
  `/god-next`, `/god-mode`, `CHECKPOINT.md`, and `PROGRESS.md` now surface
  workflow progress, current step, recent work, and what happens next
- **Proposition closeouts**: proposal, diagnostic, audit, lifecycle, status,
  reconciliation, and decision-support outputs now end with concrete next
  choices such as partial implementation, complete implementation, discussion,
  inspection, or `/god-mode` when safe
- **Mode A** (greenfield), **Mode B** (gap-fill or brownfield), **Mode C**
  (audit), **Mode E** (bluefield); plus the orthogonal **Mode D** (multi-repo
  suites with `god-coordinator` as a Tier-0 peer)
- **Three-axis verification**: static (lint), linkage (drift), runtime (headless browser)
- **Bidirectional linkage map** with 7 stable ID types
- **Reverse-sync** writing fenced "Implementation Linkage" footers
- **Native Pillars project context**: `AGENTS.md` plus routed
  `agents/*.md` pillar files created for every Godpowers project
- **Domain precision layer**: `.godpowers/domain/GLOSSARY.md` plus DG-01 through
  DG-05 linter checks for canonical terms, aliases, ambiguity, and relationships
- **Existing-project Pillar-ization**: current `.godpowers` artifacts become
  managed source references with extracted durable signals in relevant pillars
- **Conditional design pipeline**: DESIGN.md + PRODUCT.md with two-stage review
- **Five external integrations** (detect-and-delegate, none vendored): Google Labs
  design.md, Impeccable, awesome-design-md, SkillUI, vercel-labs/agent-browser + Playwright
- **Light-impeccable internal references** (7 design domain refs)
- **Story-file workflow** as a finer slice between feature and commit
- **Agent contract validation** via `lib/agent-validator.js` and `/god-agent-audit`
- **AI-tool context writer** maintaining fenced sections in AGENTS.md / CLAUDE.md /
  GEMINI.md and 11 other tool-specific paths
- Full CI suite with 59 script files, integration tests, quick proof tests,
  dogfood runner, host capability, extension authoring, Mode D, installer
  smoke, and extension-pack publish gates
- Release gate with full tests, audit checks, E2E smoke, and package contents
  verification

See [CHANGELOG.md](../CHANGELOG.md) for full release history.

---

## Stability window

### v2.1.1 - Documentation and Off-Switch Safety Patch

**Theme**: reconcile documentation and make the context off-switch safer,
without changing the public command surface.

Changed in 2.1.1:

- The context off-switch empties the canonical `AGENTS.md` instead of deleting
  it; auto-generated pointer files are still removed when only the fence remains.
- Documentation: removed unverifiable external impeccable counts, reconciled the
  project-mode taxonomy (A/B/C/E primary, D as the orthogonal suite overlay),
  documented every `lib/` module, and clarified artifact-category counts.

### v2.1.0 - Security and Drift Hardening Stable

**Theme**: keep the public command surface frozen while closing a security
vector, hardening runtime robustness, and correcting documentation drift.

Changed in 2.1.0:

- Closed a command-injection vector in the agent-browser driver (argv exec,
  shell disabled).
- Guarded runtime JSON parsing (`state.json`, `events.jsonl`) against corrupt
  or partially-written files.
- Corrected the REVIEW-REQUIRED.md path, made data-directory installs a clean
  replace, and narrowed cache/cleanup deletion scope.
- Added a skill/agent prose reference validator and softened brittle exact-count
  tests to floors.
- Reconciled documentation drift (module/script counts, linkage paths,
  HAVE-NOTS reference tally, stale sample output).

### v2.0.3 - Maintenance Hardening Stable

**Theme**: keep the public command surface frozen while reducing maintenance
risk in installer, tests, workflow metadata, God Mode docs, and runtime file
APIs.

Changed in 2.0.3:

- `bin/install.js` is a thin CLI entry point backed by installer modules in
  `lib/`.
- Test files use `scripts/test-harness.js`, and static checks reject copied
  harness boilerplate.
- Workflow `uses: god-agent@range` entries are validated against the current
  agent contract.
- `lib/skill-surface.js` makes individual `skills/` files the command metadata
  source of truth.
- `skills/god-mode.md` delegates long-form operator templates to
  `references/orchestration/GOD-MODE-RUNBOOK.md`.
- State, intent, and workflow plan modules expose async APIs beside the
  existing synchronous APIs.
- Runtime modules gained JSDoc typedef contracts for public boundaries.

### v2.0.2 - Release Hardening Stable

**Theme**: keep the public command surface frozen while hardening release,
routing, parser, installer, and validation internals.

Changed in 2.0.2:

- The full test suite now runs through `scripts/run-tests.js`, with package
  and release checks reading that delegated runner.
- `npm run lint` runs dependency-free static checks through
  `scripts/static-check.js`.
- The dependency-free YAML subset has dedicated coverage for quoted colons,
  inline comments, inline arrays, object arrays, and block scalars.
- Router `file:` predicates reject absolute paths and parent traversal before
  reading project-relative files.
- Installer recursive copy handles symlinks explicitly through shared helper
  code.
- Budget YAML updates now target the top-level `budgets:` block without broad
  regex deletion.
- Root docs and validation docs describe the release gate, parser limits, and
  delegated runner contract.

### v2.0.1 - Request-Trace Review Stable

**Theme**: keep the public command surface frozen while making existing build
and review workflows narrower, clearer, and less surprising.

Changed in 2.0.1:

- `god-executor` now records assumptions, public behavior, expected files, and
  verification before implementation.
- `god-spec-reviewer` blocks scope creep and touched files that do not trace
  to the request, plan, acceptance criteria, failing test, or cleanup caused by
  the implementation.
- `god-quality-reviewer` adds a simplicity and surgicality dimension that
  blocks speculative abstraction, unrelated cleanup, and broad future-proofing.

### v2.0.0 - Executable Proof Stable

**Theme**: freeze the public API, make first-user proof executable, and let
real adoption produce the next set of changes.

Frozen in 2.0:

- Slash-command names and command families
- Specialist agent names and frontmatter shape
- Workflow YAML schema and shipped workflow names
- Routing and recipe schema names
- `.godpowers/` artifact locations
- Native Pillars context layout through `AGENTS.md` and `agents/*.md`
- Extension manifest compatibility contract for the 2.x line

Allowed during freeze:

- Critical fixes
- Documentation clarity
- Test coverage for frozen behavior
- Compatibility fixes for supported AI coding tools
- Small fixes that make documented 1.0 behavior true

Deferred until adoption feedback:

- New command families
- New lifecycle phases
- Schema format changes
- Pillars format changes
- Large extension API changes

---

## Historical releases

### v0.13.0 (shipped 2026-05-10) - Context-rot protection + extensions + observability

Shipped earlier-than-roadmapped and combined:

- **Context-rot protection** (new): `lib/checkpoint.js`,
  `.godpowers/CHECKPOINT.md`, `/god-locate`, `/god-context-scan`,
  events.jsonl hash chain, SessionStart hook prefers CHECKPOINT
- **Extension runtime**: `lib/extensions.js`, schema/extension-manifest.v1.json,
  `/god-extension-add/list/info/remove`, `/god-test-extension`,
  SemVer capability handshake. Scaffolds in `extensions/` are now
  installable. Pack publishing to npm is part of v0.14 distribution.
- **Observability readers**: `lib/event-reader.js`, `/god-logs`,
  `/god-metrics`, `/god-trace`. OTel exporter + cost tracking remain
  for v0.14 / v0.15.

### v0.14.0 (shipped 2026-05-11) - Workflow runtime + cost saver + locks + CI

Shipped:

- **Workflow runtime**: `lib/workflow-runner.js` reads
  `workflows/*.yaml` and computes dependency-ordered plans. All 13
  workflow YAMLs are now authoritative (no longer documentation-only).
  `/god-mode --workflow=<name>` and `--plan` flags added.
- **Lock + checkpoint wiring**: `lib/state-lock.js` (acquire / release /
  reclaim / withLock), `lib/checkpoint.syncFromState` (per-sub-step
  pin refresh). Orchestrator agent wired to acquire-mutate-release
  and refresh CHECKPOINT.md on every sub-step.
- **Token cost saver**: `lib/cost-tracker.js` + `lib/agent-cache.js` +
  `lib/context-budget.js` + `lib/budget.js`. New skills: `/god-cost`,
  `/god-budget` (+ `--on` / `--off` one-shot toggles), `/god-cache-
  clear`. Schema `intent.v1.yaml.json` gains a `budgets` block.
- **GitHub Actions CI**: matrix on Node 18/20/22; full test suite on
  every PR + main push. Separate package job verifies npm pack
  cleanliness.
- **npm publish prep**: `files` array fixed (routing/, workflows/,
  extensions/, INSPIRATION.md were missing); `prepublishOnly` now runs
  `npm run release:check` before any publish. Tarball: 364KB / 439 files.

### v0.15.0 (shipped 2026-05-11) - Distribution + OTel + first-party packs

`godpowers@0.15.x` is live on npm with sigstore provenance:
https://www.npmjs.com/package/godpowers

- **`npm install -g godpowers`** or `npx godpowers --claude --global`
  now works against the public registry (no git clone needed)
- **Tag-triggered publish workflow**: `.github/workflows/publish.yml`
  runs the full test suite then `npm publish --provenance --access
  public` on every `v*` tag push. Version bumps are manual
  (`npm version minor`), CHANGELOG is human-curated.
- **First-party packs are publish-ready** but the `@godpowers` npm org
  must be created before they can ship. Once the org exists, three
  workflow_dispatch runs publish all three packs at `0.1.0`.
- **OTel exporter** for events.jsonl: `lib/otel-exporter.js` plus the
  `/god-export-otel` skill. Maps workflow.run + agent.start/end to
  OTLP spans; cost.recorded / gate.fail / error attach as span events.
  Honors `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS`
  (for Honeycomb / Datadog auth). No external deps.
- **Cost-tracker live integration**: `cost.recorded` events now carry
  `source: 'live' | 'estimated'`. New `recordModelCall(handle, attrs)`
  is the canonical entry point for AI tools surfacing real per-call
  token counts. `/god-cost --strict` exits non-zero if any in-scope
  record is estimated (CI gate once live reporting is wired).
- **First-party packs publishable**:
  - `@godpowers/security-pack` (SOC2, HIPAA, PCI auditors)
  - `@godpowers/launch-pack` (Show HN, Product Hunt, Indie strategists)
  - `@godpowers/data-pack` (ETL, ML features, dashboards)

  Each pack ships its own `package.json` with `publishConfig.access=public`
  and `peerDependencies.godpowers`. The
  `.github/workflows/publish-pack.yml` workflow_dispatch action
  publishes a single pack after a version bump.

### v0.15.1 (shipped 2026-05-11) - Metadata + documentation polish

Shipped:

- npm registry metadata improved: searchable description and expanded
  keywords for AI agents, orchestration, coding tools, and artifact taxonomy.
- `docs/reference.md` indexed the commands added across v0.13 to v0.15.
- README install copy and roadmap wording were tightened.

### v0.15.2 (shipped 2026-05-11) - Runtime hardening + pack gate

Shipped:

- Installed `/god`, `/god-next`, `/god-help`, `/god-standards`, and
  `/god-version` now resolve runtime modules through
  `<tool-config-dir>/godpowers-runtime` when not running inside the repo.
- Installer copies `package.json` into `godpowers-runtime`, so installed OTel
  exports report the real package version.
- Linkage scans now replace stale scanner-owned links while preserving manual
  links.
- Checkpoint facts preserve action history; context writer reads the canonical
  root-level `mode` and `scale` from `state.json`.
- Event hash chains remain valid for large event lines.
- Extension reinstalls clear old pack contents before copying the new pack.
- Pack publish gate now checks peer dependency ranges against manifest
  engines and uses a private npm cache for dry-run packing.

Deferred to a later release:

- **Telemetry: opt-in, off-by-default** - separate trust/privacy design
  pass; what questions we want to answer with the data should precede
  the wire format.

### Post-1.0 adoption work

The 1.0 line freezes the public surface. The next work should come from
adoption evidence:

- **Record/replay integration tests**. Capture a greenfield `/god-mode`
  run end-to-end as a fixture, then replay it to validate that the
  orchestrator behaves the same across model versions.
- **Examples directory expansion**. Add real fixture projects beyond the
  current golden artifacts.
- **Telemetry opt-in design pass**. Decide first what questions we want
  answered, then ship the wire.
- **Documentation site at godpowers.dev**. Built from `docs/`.
- **Migration helper from v0.x projects**. One command that explains and
  applies the current Pillars plus `.godpowers` layout.
- **External extension adoption**. Collect third-party pack examples, publish
  author friction reports, and grow marketplace compatibility cases from real
  use.

---

## Post-1.0

| Idea | Status |
|------|--------|
| Subprocess plugins (any language) | RFC-0008 |
| Workflow visualization (DAG renderer) | Slash command renders ASCII |
| LLM cost optimization (model routing) | Research |
| Cross-organization pack marketplace | Post-1.0 |
| Native binary distribution (not just npm) | If demand exists |

---

## CLI surface (stable)

The CLI stays minimal. These commands are stable and supported:

```bash
npx godpowers                    # Interactive install (defaults to claude --global)
npx godpowers --claude --global  # Install for specific runtime
npx godpowers --all              # Install for all 15 runtimes
npx godpowers --uninstall        # Remove
npx godpowers --migrate          # One-shot upgrade
npx godpowers status --project . # Render dashboard from disk state
npx godpowers next --project .   # Recommend the next route from disk state
npx godpowers dogfood            # Run built-in messy-repo scenarios
npx godpowers extension-scaffold --name=@scope/pack --output=.
npx godpowers --help             # Show install help
```

All other operations are slash commands inside the AI tool.

---

## Freeze discipline

| Version | Explicit non-goals |
|---------|-------------------|
| v1.0 | No new features without adoption evidence |
| v1.0 | No schema churn |
| v1.0 | No command family expansion |
| All | No broad `godpowers` CLI beyond install, read-only status, fixture dogfood, and extension scaffolding. Slash commands remain primary. |

Discipline: a release that does too much is a release that ships late.
