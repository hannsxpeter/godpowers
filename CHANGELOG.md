# Changelog

All notable changes to Godpowers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2026-05-22

Request-trace review guardrails.

### Added
- Added request-trace discipline to `god-executor`: assumptions, public
  behavior, expected files, and verification command must be explicit before
  implementation.
- Added scope and request-trace review checks to `god-spec-reviewer` so
  unplanned touched files, speculative flexibility, and unrelated churn block
  review before quality review begins.
- Added a simplicity and surgicality dimension to `god-quality-reviewer` so
  overcomplicated but technically correct code does not pass review.
- Added `request-trace-review` to runtime feature awareness for upgraded
  projects.

### Changed
- `/god-build` and `/god-review` docs now describe the narrow-diff guardrails
  as part of existing workflows instead of introducing a new command.
- README, reference docs, roadmap, architecture, quality pillar, release notes,
  package metadata, and lockfile now align to `2.0.1`.

### Guardrails
- The public command surface stays frozen; the change strengthens existing
  executor and reviewer contracts.
- Reviewers now reject speculative abstraction, unrelated cleanup, and diff
  churn that cannot be traced to the user request, slice plan, failing test, or
  implementation-caused cleanup.

## [2.0.0] - 2026-05-16

Executable proof release.

### Added
- Added `npx godpowers quick-proof --project=.` as a read-only CLI helper that
  renders a shipped fixture with real `.godpowers/state.json`, computed next
  action, missing-artifact visibility, and current host guarantees.
- Added `lib/quick-proof.js` and `fixtures/quick-proof/` so the first-user
  proof loop is packaged, deterministic, and testable.
- Added `docs/quick-proof.md`, `docs/proof-transcript.md`, and
  `docs/adoption-canary.md` so onboarding, proof evidence, and real-world
  canary work share one connected story.
- Added `scripts/run-adoption-canary.js` to clone an external repository and
  capture CLI-verifiable trust signals: quick proof, dashboard status, and next
  route output.
- Added `scripts/verify-published-install.js` to verify the published npm
  artifact after release, including quick proof, dashboard status, Claude
  install, and Codex metadata install.

### Changed
- README now leads with executable proof, starter command paths, runtime
  expectations, and the accountable AI development thesis.
- Release checklist now includes published install verification through the
  registry artifact instead of only the local checkout.
- Package contents checks now require `lib/quick-proof.js` and the shipped
  quick-proof fixture state.
- Context and quality pillars now treat quick proof, adoption canary, and
  published-install verification as durable repository truth.

### Guardrails
- `npm run test:quick-proof` verifies README links, quick proof docs,
  transcript evidence, release checklist wiring, adoption canary wiring, local
  links, and forbidden character rules.
- `npm run release:check` includes the quick-proof test and package payload
  verification.
- The adoption canary harness does not replace host slash-command execution.
  It captures CLI-verifiable signals and clearly leaves `/god-preflight`,
  `/god-audit`, and `/god-reconstruct` to the AI coding host.

## [1.6.24] - 2026-05-16

Strict background release readiness.

### Added
- Added the `strict-release-readiness` automation template so delegated or
  scheduled release checks fail closed when any required release surface is
  unchecked, stale, missing, untested, or inconsistent with the intended
  version.
- Added a required release-surface manifest for root docs, docs, agents,
  skills, routing, workflows, schema, templates, references, hooks, lib,
  scripts, tests, fixtures, GitHub workflows, package metadata, npm latest,
  git tag state, GitHub release state, CI, publish workflow, and local install
  state.

### Changed
- `/god-automation-setup` now recommends `strict-release-readiness` for
  background release checks and keeps the narrower `release-readiness`
  template reserved for quick manual checks.
- The release maintenance recipe now routes background-release setup through
  `/god-automation-setup` with an explicit no-publish guardrail.
- Auto-invoke visibility docs now classify strict release readiness as a
  read-only, fail-closed Level 2 automation candidate.
- The release checklist now names every folder and published surface that must
  be checked before packaging, tagging, pushing, releasing, or publishing.

### Guardrails
- Added behavioral coverage that verifies the strict release readiness
  template exists, is fail-closed, refuses file mutation, and names every
  required release surface.
- The strict readiness template may report blockers and exact next commands,
  but it must not modify files, stage, commit, tag, push, create a GitHub
  release, publish to npm, delete files, clear caches, or change installs.

## [1.6.23] - 2026-05-16

Full repository audit, release gate hardening, and documentation repair.

### Added
- Added `.planning/2026-05-16-surface-sync-status.md` to record the current
  `.github/workflows`, `.planning`, and `agents` sync status without rewriting
  historical planning evidence.
- Expanded `god-reconciler` and `god-updater` contracts so repo docs, repo
  surface, runtime feature awareness, source-system sync-back, host capability,
  and dashboard refresh are checked and reported as part of the same loop.
- Documented the audited source scan across root docs, `.github`, `.godpowers`,
  `.planning`, agents, docs, examples, extensions, fixtures, hooks, lib,
  references, routing, schema, scripts, skills, templates, tests, and workflows.

### Changed
- Release workflows now run `npm run release:check` before publishing the root
  package or first-party extension packs.
- `prepublishOnly` now runs the full release gate instead of only `npm test`.
- `/god-reconcile`, `/god-mode`, the orchestrator, agent specs, and roadmap
  now describe the expanded local sync surfaces consistently.
- Version, badge, roadmap, architecture, user-support, and reference surfaces
  now align to 1.6.23.

### Fixed
- Repaired stale 1.6.19 and 1.6.22 current-version claims in runtime docs.
- Removed literal forbidden dash and emoji characters from primary source
  files while preserving validator coverage through Unicode escape sequences.
- Repaired release documentation drift around package contents, route quality,
  recipe coverage, release-surface checks, dogfood, host guarantees, extension
  authoring, and Mode D suite release dry-runs.

### Guardrails
- Primary source scan now covers 639 tracked plus untracked source files and
  verifies zero forbidden dash characters, zero emoji characters, zero invalid
  JSON files, zero CRLF files, zero missing final newlines, and zero zero-byte
  files.
- `npm run release:check` remains the one-command release gate before commit,
  tag, npm publish, and GitHub release creation.

## [1.6.22] - 2026-05-16

Dogfooding, host guarantees, extension authoring, and suite release dry-runs.

### Added
- Added `lib/dogfood-runner.js`, `/god-dogfood`, and `npx godpowers dogfood`
  for deterministic messy-repo dogfood scenarios.
- Added `fixtures/dogfood/` scenarios for half-migrated GSD import,
  degraded and full host guarantees, extension scaffolding, and Mode D suite
  release dry-run planning.
- Added `lib/host-capabilities.js` and dashboard host guarantee reporting for
  full, degraded, and unknown runtime capability states.
- Added compact dashboard rendering with `npx godpowers status --brief`.
- Added `lib/extension-authoring.js` and
  `npx godpowers extension-scaffold --name=@scope/pack --output=.`.
- Added Mode D suite release dry-run planning through
  `suiteState.planRelease`.

### Changed
- Release-surface sync now requires dogfood, host capability, and extension
  authoring test gates.
- Repo-surface sync now checks dogfood runner presence, test wiring, and
  required fixture manifests.
- Package payload checks now include dogfood fixtures and the new runtime
  helpers.
- README, architecture, reference, release checklist, and runtime docs now
  document dogfood, host guarantees, extension authoring, and suite dry-runs.

### Guardrails
- Dogfood runs copy fixtures into temporary directories before executing.
- Host capability detection does not require network access.
- Extension scaffolding does not overwrite existing files unless requested.
- Suite release dry-runs return planned writes and impacted dependents without
  mutating sibling repositories.

## [1.6.21] - 2026-05-16

Dashboard compression, trace guardrails, and suite release readiness.

### Added
- Added dashboard action briefs so `/god-status`, `/god-next`, and CLI status
  output show the recommended command, reason, readiness, and top blockers
  before the detailed check list.
- Added release-surface checks that verify dogfood, extension publish, Mode D
  suite, and installer smoke tests remain wired into the release gate.
- Added repo-surface suite readiness checks for Mode D helper, docs, tests,
  and suite command route coverage.

### Changed
- Route-quality sync now requires every agent-spawning route to declare both
  `agent.start` and `agent.end` trace events.
- `/god-init`, `/god-roadmap-update`, and `/god-sync` route metadata now
  declare the missing `agent.start` trace event.

### Guardrails
- Spawn observability, release dogfooding, extension readiness, suite
  readiness, and onboarding compression are now checked by executable tests
  instead of remaining documentation-only goals.

## [1.6.20] - 2026-05-16

Automation surface closeout and release guardrails.

### Added
- Added `lib/route-quality-sync.js` to detect symbolic route spawns,
  unresolved agent targets, and unapproved contextual route exits.
- Added `lib/recipe-coverage-sync.js` to detect missing high-frequency intent
  recipes for release maintenance, docs drift, context refresh, story work, and
  automation setup.
- Added `lib/release-surface-sync.js` to detect release-facing drift across
  badges, changelog, release notes, package guards, release checklist policy,
  and package lock version.
- Added recipe routes for release maintenance, context refresh, story work, and
  automation setup.

### Changed
- `/god-party` routing now uses `built-in` as the primary owner and declares
  selectable specialist personas under `parallel-spawns`.
- `/god-story-build` routing now uses `god-planner` as primary and declares
  executor plus reviewer agents as secondary spawns.
- `lib/router.js` now includes conditional `parallel-spawns` in spawned-agent
  resolution.
- Repo surface sync now includes route-quality, recipe-coverage, and
  release-surface checks.

### Guardrails
- Route quality checks now block symbolic spawn tokens, unresolved specialist
  targets, unapproved contextual exits, and durable-writing routes without
  standards coverage.
- Release surface checks now require package, lockfile, README badge,
  changelog, release notes, release checklist, and package payload guards to
  agree before publish.

## [1.6.19] - 2026-05-16

Repository surface sync and status truth closeout.

### Added
- Added `lib/repo-surface-sync.js` to detect structural drift across command
  routing, package payload rules, agent handoffs, workflow metadata, recipe
  routes, extension packs, and release policy checks.
- Added `docs/repo-surface-sync.md` with auto-invoke, auto-spawn, and guardrail
  behavior.
- Added behavioral tests for missing route detection, explicit route stub
  creation, sync logging, package checks, agent handoff checks, and current
  repo freshness.

### Changed
- `/god-sync`, `/god-docs`, `/god-doctor`, `/god-status`, and `/god-mode` now
  document repo surface sync behavior.
- Dashboard proactive checks now include a repo surface status line.
- Feature awareness now records `repo-surface-sync` as a known runtime feature.
- Package contents checks now require `lib/repo-surface-sync.js`.
- README, release notes, command flows, release checklist, command reference,
  and runtime docs now describe repo surface sync.

### Guardrails
- Detection is read-only by default.
- Safe apply can create missing routing stubs only when `fixRouting` is
  explicitly enabled.
- Agent, workflow, recipe, extension, and release-policy ambiguity routes to
  scoped specialists instead of being rewritten blindly.

## [1.6.17] - 2026-05-16

Autonomous repository documentation sync.

### Added
- Added `lib/repo-doc-sync.js` to detect and refresh mechanical repository
  documentation claims.
- Added `docs/repo-doc-sync.md` with auto-invoke, auto-spawn, Pillars, and
  arc-ready closeout behavior.
- Added behavioral tests for stale repo docs detection, safe mechanical sync,
  sync logging, Pillars planning, and adjacent autonomous sync recommendations.
- Added missing `/god-export-otel` routing metadata.

### Changed
- `/god-sync`, `/god-docs`, `/god-doctor`, `/god-status`, and `/god-mode` now
  document repo documentation sync behavior.
- The dashboard proactive docs check now uses `lib/repo-doc-sync.detect`.
- Package contents checks now require `lib/repo-doc-sync.js` and
  `routing/god-export-otel.yaml`.
- Release and contribution docs now describe repo documentation sync as part of
  release readiness.

### Guardrails
- Detection is read-only by default.
- Safe apply is limited to mechanical version, badge, and count claims.
- Narrative changelog, release, contribution, support, and security policy
  changes route to `god-docs-writer` or the maintainer.

## [1.6.16] - 2026-05-16

Feature awareness for existing Godpowers projects.

### Added
- Added `lib/feature-awareness.js` to detect stale project awareness after a
  Godpowers runtime upgrade.
- Added state recording for the current Godpowers feature set so existing
  projects can tell whether their context has learned about new capabilities.
- Added behavioral tests for feature-awareness detection, safe state refresh,
  AI-tool context refresh, migration suggestions, and `god-greenfieldifier`
  escalation.

### Changed
- `AGENTS.md` context refresh now advertises `/god-sync`, `/god-migrate`, and
  `/god-context refresh` so AI tools opening an existing project see the new
  migration and awareness commands.
- `/god-doctor`, `/god-context`, `/god-sync`, and `/god-mode` now document the
  feature-awareness auto-invoke path for existing `.godpowers` projects.
- `state.v1.json` now accepts the `godpowers-features` awareness record.

### Guardrails
- Detection is read-only by default.
- The apply path writes only safe state metadata and managed context fences.
- Ambiguous planning-system evidence is reported as a scoped
  `god-greenfieldifier` recommendation instead of being converted blindly.

## [1.6.15] - 2026-05-16

Planning-system migration and sync-back.

### Added
- Added `lib/planning-systems.js` to detect GSD, BMAD, and Superpowers
  planning context and convert useful signals into Godpowers prep and seed
  artifacts.
- Added `lib/source-sync.js` to write current Godpowers progress back into
  managed companion files for imported planning systems.
- Added `/god-migrate` as the explicit command for planning-system detection,
  import, sync-back, and specialist escalation when migration evidence is
  ambiguous.
- Added `docs/planning-system-migration.md` with detection signals, import
  mapping, sync-back destinations, conflict rules, and return-path guidance.
- Added behavioral tests for GSD, BMAD, Superpowers, imported seed artifacts,
  state recording, and idempotent sync-back.

### Changed
- `/god-init` now auto-invokes planning-system import when GSD, BMAD, or
  Superpowers evidence is detected.
- `/god-sync` now auto-invokes source-system sync-back when `state.json`
  records enabled source systems.
- `reverse-sync` now includes source-system sync-back in its runtime result.
- `state.v1.json` now records imported source systems, import hashes,
  sync-back hashes, conflict counts, and sync-back policy.

### Guardrails
- Imported planning context remains `[HYPOTHESIS]` until confirmed by the user
  or a Godpowers artifact.
- Existing Godpowers artifacts are preserved unless the user explicitly forces
  overwrite.
- Source-system files are not rewritten outside Godpowers-owned fences or
  companion files.
- Low-confidence or conflicting imports route to `god-greenfieldifier` for a
  controlled migration plan.

## [1.6.14] - 2026-05-16

Approved automation setup execution.

### Added
- Added `god-automation-engineer`, a specialist agent for approved host-native
  automation setup.
- Added automation execution-plan metadata to `lib/automation-providers.js`.
- Added gated automation state recording helpers:
  `buildAutomationRecord(...)` and `recordAutomation(...)`.
- Added tests for host tool execution plans, complex setup delegation, and
  post-success automation recording.

### Changed
- `/god-automation-setup` now distinguishes simple direct host tool calling
  from complex setup that should spawn `god-automation-engineer`.
- Setup plans now show method, action, host tool availability, specialist
  agent routing, and the state file written after success.
- Automation docs now explain that CLI commands are deterministic and
  read-only, while slash-command hosts can use LLM tool calling after approval.

### Guardrails
- `.godpowers/automations.json` is written only after host setup succeeds.
- Complex, write-capable, background-agent, scriptable-scheduler, or uncertain
  setup routes through `god-automation-engineer`.

## [1.6.13] - 2026-05-16

Host automation provider discovery and opt-in setup planning.

### Added
- Added `lib/automation-providers.js`, a shared provider detector for
  host-native automation support.
- Added `godpowers automation-status --project .` and
  `godpowers automation-setup --project .` for opt-in automation support.
- Added `/god-automation-status` and `/god-automation-setup` slash commands.
- Added `docs/automation-providers.md` with provider classes, safe templates,
  and approval rules.
- Added automation provider tests covering provider classification, active
  automation config, setup-plan rendering, and CLI JSON output.

### Changed
- The dashboard engine now reports automation support when host-native
  automation providers are available.
- The installer help now documents automation-status and automation-setup as
  first-class read-only helper commands.
- Godpowers command guidance now recommends automation setup when provider
  support exists and no approved automation template is active.

### Guardrails
- Automation setup is opt-in only. Godpowers must not create schedules,
  routines, background agents, API triggers, or CI workflows during install.
- Default automation templates are read-only and must not commit, push,
  publish, deploy, clear reviews, accept Critical security findings, or access
  provider dashboards without explicit user approval.

## [1.6.12] - 2026-05-16

Executable dashboard CLI and shared runtime status engine.

### Added
- Added `lib/dashboard.js`, a shared executable engine for project status,
  progress percentage, tier position, planning visibility, proactive checks,
  open items, and recommended next command.
- Added `godpowers status --project .` for human, CI, and host-runtime status
  checks outside the slash command layer.
- Added `godpowers next --project .` for direct next-action routing from disk
  state.
- Added `--json` output for the new status and next commands.
- Added dashboard behavioral tests, CLI status and next tests, and git
  porcelain parsing tests.

### Changed
- `/god-status`, `/god-next`, `/god-mode`, and `god-orchestrator` now point to
  the shared dashboard engine when local runtime execution is available.
- The installer help now documents status and next as first-class commands.
- Release documentation now names the executable dashboard contract instead of
  treating progress visibility as Markdown-only guidance.

### Fixed
- Fixed git porcelain parsing so leading-space worktree entries such as
  ` M README.md` do not clip filenames in dashboard output.

### Validation
- Added tests prove dashboard computation, dashboard rendering, CLI JSON
  output, proactive review suggestions, and staged path reporting.

## [1.6.11] - 2026-05-16

Auto-invoke visibility and platform-neutral spawning patch.

### Added
- Added a core auto-invoke visibility rule requiring Godpowers to show when it
  automatically runs a command, spawns an agent, or calls a local runtime
  helper.
- Added a proactive auto-invoke policy with four levels: read-only
  suggestions, visible local helpers, bounded specialist agent spawns, and
  explicit-approval-only actions.
- Added proactive checks to `/god-next`, `/god-status`, and God Mode closeouts
  so users can see checkpoint, review, sync, docs, runtime, security,
  dependency, and hygiene opportunities without asking.
- Added docs drift, runtime verification, and review queue guidance for
  proactive closeouts.
- Added `docs/auto-invoke-visibility.md` as a local design note for the
  auto-invoke policy.

### Changed
- Replaced Claude-specific "Task tool" spawning wording in high-traffic skills
  with platform-neutral host-agent spawning language.
- Clarified that Claude, Codex, Cursor, Windsurf, Gemini, OpenCode, Copilot,
  Augment, Trae, Cline, Kilo, Antigravity, Qwen, CodeBuddy, and Pi may expose
  specialist spawning differently while sharing the same Markdown agent
  contracts.
- Updated the Codex installer path to replace skill directories before copying
  `SKILL.md`, preventing stale nested files from older install shapes.
- `/god-sync`, `/god-scan`, `god-updater`, and `god-orchestrator` now describe
  local sync helpers separately from spawned agents.

### Guardrails
- Production launch, guessed staging URLs, provider dashboards, credentials,
  destructive repair, review clearing, Critical security acceptance, git
  staging, commits, pushes, packages, releases, and npm publishing still require
  explicit user intent.
- If a host platform cannot provide a true fresh-context spawn, Godpowers must
  say so instead of pretending a background agent ran.

## [1.6.10] - 2026-05-16

Progress visibility and plain-language closeout patch.

### Added
- Added a core user-facing vocabulary rule: visible output should say
  "project run", "workflow", "phase", "current step", or "current milestone"
  instead of unexplained internal "arc" jargon.
- Added `Planning visibility` blocks to status, next-step, God Mode, and
  orchestrator closeout guidance. These blocks surface PRD status, roadmap
  status, current milestone, and completion basis when those artifacts exist or
  are expected.

### Changed
- Reworded installer, session-start, `/god`, `/god-mode`, lifecycle, status,
  routing, workflow, and specialist guidance to use plain project-run language
  in user-visible text.
- Checkpoint and session-start summaries now display lifecycle `in-arc` as
  "in progress" while preserving the internal state key for compatibility.
- God Mode completion guidance now ends with current status, planning
  visibility, open items, and a concrete next recommendation.

### Guardrails
- Internal workflow names and state constants such as `full-arc.yaml` and
  `in-arc` remain unchanged for compatibility.
- The patch changes guidance and display wording only. It does not add slash
  commands, specialist agents, workflows, recipes, schemas, or public artifact
  formats.

## [1.6.9] - 2026-05-16

Proposal closeout patch. Makes Godpowers end exploratory, diagnostic, audit,
status, lifecycle, and decision-support answers with concrete choices instead
of leaving the user to infer the next action.

### Added
- Added a core Proposal Closeout rule requiring a `Proposition:` block when
  Godpowers gives a recommendation, proposal, exploratory plan, diagnostic
  report, status report, audit report, lifecycle report, reconciliation report,
  or decision-support response without directly launching work.
- Added proposition closeouts to `/god`, `/god-next`, `/god-status`,
  `/god-lifecycle`, `/god-locate`, `/god-context-scan`, `/god-preflight`,
  `/god-doctor`, `/god-audit`, `/god-hygiene`, `/god-standards`, and
  `/god-agent-audit`.
- Added proposition closeouts to proposal-heavy planning and analysis commands:
  `/god-discuss`, `/god-explore`, `/god-list-assumptions`, `/god-refactor`,
  `/god-spike`, `/god-tech-debt`, `/god-archaeology`, `/god-map-codebase`,
  `/god-reconstruct`, `/god-design-impact`, `/god-reconcile`, and
  `/god-roadmap-check`.

### Changed
- Proposal-style outputs now mirror the clearer GSD pattern: implement a small
  slice, implement the full route, discuss more, inspect status, or run
  `/god-mode` only when that is safe.
- `/god-next` and `/god-status` now explicitly distinguish partial progress,
  full autonomous continuation, discussion, and inspection choices.
- Diagnostic commands now avoid recommending broad automation when blockers or
  disk-state inconsistencies make that unsafe.

### Guardrails
- Pure completion commands can still use their normal `Suggested next` line
  after a verified artifact is produced.
- `/god-mode` is not offered as a blanket answer when a blocker, failing gate,
  manual repair, or unresolved ambiguity should be addressed first.
- The patch changes guidance only. It does not add slash commands, specialist
  agents, workflows, recipes, schemas, or public artifact formats.

## [1.6.8] - 2026-05-16

Staging deferral patch. Keeps Godpowers moving through local and CI-verifiable
shipping work instead of pausing early for a deployed staging URL.

### Changed
- `god-orchestrator` now treats deployed staging verification as deferred by
  default when no live target URL is evidenced and the user did not request
  staging.
- `/god-mode`, `/god-deploy`, and `/god-launch` now ask for
  `STAGING_APP_URL` only when the user explicitly requests staging, invokes
  deployed verification, or reaches final project sign-off.
- Deploy, observe, and launch specialists now record missing deployed access in
  `.godpowers/deploy/WAITING-FOR-EXTERNAL-ACCESS.md` while continuing through
  local and CI-verifiable gates.

### Guardrails
- Godpowers still never invents staging or production domains from names,
  brands, titles, or common TLDs.
- Provider keys, dashboards, DNS tokens, production secrets, and admin consoles
  are requested only after a named scripted check proves that exact access is
  needed.
- Final sign-off can still run deployed smoke immediately when the user
  provides `STAGING_APP_URL=<deployed staging origin>`.

## [1.6.7] - 2026-05-16

Progress visibility patch. Makes Godpowers easier to follow while preserving
the stable 1.6 command surface.

### Added
- Added `lib/state.progressSummary`, `orderedSubSteps`, and
  `renderProgressLine` so commands can report percentage complete, completed
  step count, total step count, and current step number from state.json.
- Added checkpoint frontmatter fields for `progress-pct`,
  `progress-complete`, `progress-total`, and `current-step`.
- Added `CHECKPOINT.md` sections for recent work and what happens next.
- Added a Step Narration Protocol for `god-orchestrator` so visible
  tier/sub-step work gets compact "Next step" and "Step result" cards.
- Added `/god-mode`, `/god-next`, `/god-status`, and `/god-locate` guidance
  for progress, path-ahead, recent work, and next-action summaries.
- Added `PROGRESS.md` template sections for the current step plan and recent
  step results.
- Added root `AGENTS.md` Pillars Protocol guidance so coding agents know which
  project context and workflow-state files are authoritative.
- Added installer coverage for `--local` Codex installs.
- Added regression coverage for progress math, checkpoint progress rendering,
  checkpoint progress preservation, and checkpoint step summaries.

### Changed
- Package publication now allowlists `agents/god-*.md` instead of the entire
  `agents/` directory so local Pillars files do not enter the npm payload.
- Package contents checks now fail when non-specialist files under `agents/`
  would be included in the npm package.
- The installer now resolves local runtime destinations when `--local` is used
  and only installs specialist agent files matching `god-*.md`.

### Guardrails
- This patch does not add slash commands, specialist agents, workflows,
  recipes, schemas, or public artifact formats.
- Progress percentages are derived from disk state, not conversation memory.
- Optional or intentionally skipped steps count as complete when their state
  is `imported`, `skipped`, or `not-required`.

## [1.6.6] - 2026-05-16

Non-God-Mode handoff privacy patch. Extends the display-safe handoff pattern
from `/god-mode` to other orchestrator entrypoints.

### Added
- Added private handoff guidance for `/god-init` before it spawns
  `god-orchestrator`.
- Added private handoff guidance for `/god-suite-init`,
  `/god-suite-release`, and `/god-suite-patch` before they spawn
  `god-coordinator`.
- Added `god-coordinator` guidance for display-safe per-repo
  `god-orchestrator` spawns.
- Added regression coverage for non-`/god-mode` handoff entrypoints.

### Changed
- `god-orchestrator` now documents handoff files from `/god-init`,
  `god-coordinator`, or any other caller, not only `/god-mode`.
- `/god-hygiene` routing no longer lists `god-orchestrator` as a secondary
  spawn because the skill only runs the three hygiene audits.

### Guardrails
- This patch does not add slash commands, agents, workflows, recipes, schemas,
  or public artifact formats.
- The handoff change affects transcript hygiene only. It does not weaken
  release-truth gates or per-repo Quarterback ownership.

## [1.6.5] - 2026-05-16

God Mode handoff privacy patch. Keeps the 1.6 command surface stable while
making Codex-spawned `god-orchestrator` runs display a small safe pointer
instead of detailed orchestration payloads.

### Added
- Added a private `.godpowers/runs/<run-id>/ORCHESTRATOR-HANDOFF.md` handoff
  pattern for `/god-mode` orchestration context.
- Added `god-orchestrator` instructions to read handoff files before planning
  or mutation and keep handoff contents out of the visible transcript.
- Added regression coverage proving agent validation ignores non-specialist
  Pillars files under `agents/`.

### Changed
- `/god-mode` now spawns `god-orchestrator` with only a display-safe project
  root, flags, and handoff file path.
- Agent validation and smoke tests now inspect `agents/god-*.md` specialist
  files while allowing Pillars context files like `agents/context.md` and
  `agents/repo.md` to coexist.

### Guardrails
- This patch does not add slash commands, agents, workflows, recipes, schemas,
  or public artifact formats.
- `--yolo` still respects safe-sync and Critical harden blockers. The handoff
  change affects transcript hygiene, not gate policy.

## [1.6.4] - 2026-05-16

Release gate propagation patch. Keeps the 1.6 command surface stable while
making the safe sync and Critical harden gates apply to direct commands,
`/god-mode`, and `/god-mode --yolo`.

### Added
- Added executable router support for `no-critical-findings`.
- Added safe-sync prerequisites to `/god-observe`, `/god-harden`,
  `/god-launch`, and `/god-mode`.
- Added regression tests proving safe sync blocks direct Tier 3 commands and
  `/god-mode`.
- Added regression tests proving `/god-launch` blocks unresolved Critical
  harden findings and allows passed harden gates.

### Changed
- `god-orchestrator` now explicitly evaluates router prerequisites before
  command dispatch instead of relying only on structural tier order.
- `/god-mode --yolo` now documents safe sync and unresolved Critical harden
  findings as release-truth gates that cannot be bypassed.
- Generated routing metadata now preserves per-prerequisite auto-complete
  commands so future generated Tier 3 routes keep the safe sync gate.

### Guardrails
- This patch does not add slash commands, agents, workflows, recipes, schemas,
  or public artifact formats.
- `--yolo` can still auto-pick defaults, but it cannot auto-accept unresolved
  release truth blockers.

## [1.6.3] - 2026-05-16

Safe sync routing patch. Keeps the 1.6 command surface stable while making
`/god-next` and `/god-deploy` honor unresolved release sync blockers before
Tier 3 work.

### Added
- Added router detection for `.godpowers/sync/SAFE-SYNC-PLAN.md`.
- Added router detection for checkpoint text that marks safe sync as a
  blocking red gate.
- Added `safe-sync-clear` prerequisite support for routing files.
- Added regression tests for safe sync plan blockers, checkpoint blockers,
  deploy prerequisites, and resolved safe sync plans.

### Changed
- `/god-next` now suggests `/god-reconcile Release Truth And Safe Sync` before
  `/god-deploy` when safe sync remains unresolved.
- `/god-deploy` now advertises the safe sync reconcile command as its
  auto-complete route when the gate is red.

### Guardrails
- This patch does not add slash commands, agents, workflows, recipes, schemas,
  or public artifact formats.
- The blocker clears only when `.godpowers/sync/SAFE-SYNC-DONE.md` or
  `.godpowers/sync/SAFE-SYNC-RESOLVED.md` exists.

## [1.6.2] - 2026-05-16

Codex agent metadata compatibility patch. Keeps the public command surface
stable while making installed Godpowers specialist agents spawnable in Codex
sessions that require per-agent TOML metadata.

### Added
- Added Codex agent metadata generation during `--codex` installs. Every
  `agents/god-*.md` file now gets a matching `god-*.toml` file with name,
  description, sandbox mode, and developer instructions.
- Added install smoke coverage that verifies all 39 Godpowers agents receive
  Codex metadata.
- Added `--all` installer coverage for all 15 supported runtimes, including
  Claude Code, Codex, and Pi.

### Changed
- Codex runtime support now declares its agent metadata behavior explicitly in
  the installer instead of relying on an inline special case.
- Non-Codex runtimes keep their existing markdown agent install format.

### Guardrails
- This patch does not add slash commands, agents, workflows, recipes, schemas,
  or public artifact formats.
- The Codex metadata is generated from the existing agent markdown specs so the
  Godpowers agent source of truth stays in `agents/*.md`.

## [1.6.1] - 2026-05-15

Release hardening patch. Keeps the 1.6 domain precision surface stable while
making package publication, release checks, and CI verification harder to drift.

### Added
- Added `npm run release:check`, which runs the full test suite, audit checks,
  and package contents verification.
- Added `scripts/check-package-contents.js` to assert that the npm payload
  includes load-bearing runtime files and excludes local-only development files.
- Added `docs/RELEASE-CHECKLIST.md` for versioning, verification, package
  surface, tag, npm provenance, and post-release cleanup.
- Added an explicit plan-mode E2E smoke test for the `/god-mode` full-arc
  workflow against the `todo-app` fixture.

### Changed
- CI now uses `npm ci`, runs audit checks, runs the E2E smoke path explicitly,
  and keeps package checks aligned with local npm scripts.
- Test documentation now describes the current runtime and E2E smoke coverage
  instead of stale scaffold-only plans.
- Runtime and reference README files now describe the implemented modules and
  reference files instead of placeholder future work.
- Package tarballs are ignored by git, and package contents checks reject
  generated tarballs.
- The release script now pushes the git tag and relies on the tag-triggered
  GitHub Actions npm publish workflow for provenance.

### Guardrails
- This patch does not add new slash commands, agents, workflows, recipes, or
  schemas.
- The 1.6 domain glossary behavior remains unchanged.
- Future npm publishes should use the tag-triggered GitHub workflow unless a
  documented emergency requires a manual fallback.

## [1.6.0] - 2026-05-15

Domain precision release. Adds a Godpowers-native vocabulary layer so fuzzy or
overloaded project language is clarified before it enters PRD, architecture,
roadmap, stack, docs, or lint artifacts.

### Added
- Added `.godpowers/domain/GLOSSARY.md` as preparation context for canonical
  terms, avoided aliases, relationships, example dialogue, source notes, and
  unresolved ambiguities.
- Added `templates/DOMAIN-GLOSSARY.md`.
- Added domain glossary have-nots DG-01 through DG-05.
- Added mechanical linter coverage for missing avoided aliases,
  implementation details in glossaries, unresolved ambiguities without owner or
  due date, relationships using undefined terms, and behavior-heavy
  definitions.

### Changed
- `/god-discuss` now runs domain grilling during next-phase scoping.
- `god-explorer` now inspects code or docs before asking the user when repo
  evidence can answer a domain question.
- PM, architect, roadmapper, stack selector, and docs writer agents now read
  `.godpowers/domain/GLOSSARY.md` when present.
- Architecture guidance now limits ADR creation to choices that are hard to
  reverse, surprising without context, and based on a real tradeoff.
- Public release metadata, package version, and README badge now point to
  1.6.0.
- Release history now has a `v1.6.0` git tag matching the published npm
  package.

### Guardrails
- The domain glossary is preparation context only. It does not replace PRD,
  ARCH, ROADMAP, STACK, docs, or Pillars files.
- The glossary stores domain language, not implementation details or technical
  scratch notes.
- Unresolved vocabulary ambiguity must remain explicit as an open question with
  owner and due date.

## [1.5.0] - 2026-05-14

Preflight intake release. Adds a read-only front gate before Godpowers applies
arc-ready direction, pillars scoring, archaeology, reconstruction, or refactor
work to projects with prior context.

### Added
- Added `/god-preflight`, a read-only intake audit that writes
  `.godpowers/preflight/PREFLIGHT.md`.
- Added preflight scoring lenses for arc-ready, pillars, Godpowers,
  ready-suite, refactor risk, and suite signals.
- Added preflight mode to `god-auditor`.

### Changed
- Brownfield workflows now run preflight before archaeology.
- Bluefield workflows now run org context, then preflight, before the
  constrained arc begins.
- `/god-mode --yolo` now auto-runs preflight for brownfield and bluefield,
  follows the safest recommended route, and logs that choice to
  `.godpowers/YOLO-DECISIONS.md`.
- Public release metadata, package version, and README badge now point to
  1.5.0.

### Guardrails
- Greenfield workflows skip preflight unless explicitly requested.
- Preflight is read-only and does not create PRDs, architecture docs, pillar
  reports, refactor patches, or source-code changes.
- `--yolo` still pauses for Critical security findings and impossible preflight
  routing contradictions.

## [1.0.0] - 2026-05-14

Stable 1.0 release. Promotes the shipped Godpowers surface to the stable 1.0
line so real users can adopt it without the project moving under them.

### Added
- Added 1.0 release notes and public adoption language.
- Added greenfield Pillars seeding so new Godpowers projects write the project
  name into `agents/context.md` during initialization.

### Changed
- Bumped the package and public documentation version to 1.0.0.
- Generated `AGENTS.md` now names Godpowers first, then explains that Pillars is
  the native project context layer and `.godpowers/` remains the workflow state
  and artifact layer.
- Release documentation now frames the project as stable for real-world use
  rather than pre-launch expansion.
- The release script now checks the installer version through `package.json`,
  matching the dynamic installer implementation.

### Frozen
- Public slash-command, agent, workflow, routing, recipe, and schema surfaces are
  frozen except for critical fixes and adoption feedback.
- New command families, schema churn, and Pillars format changes are deferred
  until adoption produces evidence.

## [0.15.18] - 2026-05-14

Native Pillars context release. Makes Pillars the default project context
layer for Godpowers projects and keeps existing `.godpowers` artifacts aligned
with portable `agents/*.md` pillar files.

### Added
- Added `lib/pillars.js` for Pillars detection, initialization, load-set
  routing, existing-project Pillar-ization, artifact sync planning, and
  semantic signal extraction from labeled Godpowers artifacts.
- Added `scripts/test-pillars.js` and `npm run test:pillars` to cover the
  `agents/` collision risk, Pillars initialization, routed load sets,
  existing `.godpowers` conversion, artifact-to-pillar sync, `--yolo`
  auto-apply behavior, and restricted-character sanitization.

### Changed
- `/god-init`, `/god-mode`, `/god-context`, and `/god-sync` now treat every
  Godpowers project as a Pillars project by default.
- Existing `.godpowers` projects are Pillar-ized on resume or sync, with PRD,
  ARCH, STACK, ROADMAP, BUILD, DEPLOY, OBSERVE, HARDEN, DESIGN, and PRODUCT
  artifacts linked into relevant pillar files.
- `/god-feature`, `/god-build`, `/god-review`, PRD, architecture, roadmap,
  orchestrator, and updater flows now document Pillars-first context loading.
- Under `/god-mode --yolo`, durable artifact changes auto-apply managed
  pillar sync sections and log the decision.

## [0.15.17] - 2026-05-12

Greenfieldification release. Turns the brownfield and bluefield simulation
audit into a controlled artifact migration instead of a passive report.

### Added
- Added `god-greenfieldifier`, a Tier 0 agent that writes
  `.godpowers/audit/GREENFIELDIFY-PLAN.md`, classifies audit findings, pauses
  before risky canonical artifact rewrites, and then updates affected artifacts
  after approval.

### Changed
- Brownfield arc now runs greenfieldification after the greenfield simulation
  audit and before steady-state handoff.
- Bluefield arc now runs greenfieldification after the greenfield simulation
  audit and before PRD.
- `/god-mode`, `god-orchestrator`, and `/god-audit` now document that the
  simulation audit must be acted on through a thorough, approval-gated artifact
  migration.

## [0.15.16] - 2026-05-11

Greenfield simulation audit release. Adds a preparation audit to brownfield
and bluefield arcs so they can compare existing evidence or org constraints
against the canonical Godpowers greenfield process.

### Changed
- Brownfield arc now runs a greenfield simulation audit after archaeology,
  reconstruction, debt assessment, and normal artifact audit.
- Bluefield arc now runs a greenfield simulation audit after org-context and
  before PRD so downstream planning can inherit org constraints intentionally.
- `god-auditor` now documents `mode: greenfield-simulation`, writing
  `.godpowers/audit/GREENFIELD-SIMULATION.md` without rewriting planning
  artifacts.

## [0.15.15] - 2026-05-11

Transcript hygiene release. Keeps God Mode orchestration scaffolding out of the
normal user-visible transcript.

### Changed
- Added a User-Visible Transcript Contract to `/god-mode` and
  `god-orchestrator`.
- God Mode now explicitly hides raw Task input, "Hard instructions", spawned
  agent prompts, complete file loadout lists, and internal routing metadata from
  the user-facing transcript.
- Private rules that affect a pause must be translated into the smallest
  user-facing question instead of exposing the underlying prompt.

## [0.15.14] - 2026-05-11

Origin evidence release. Prevents `/god-mode --yolo` from inventing staging,
preview, or production domains during shipping closure.

### Changed
- Added an Origin Evidence Rule to the Shipping Closure Protocol: deployed
  origins must come from user input, env/config, deployment config, CI variable
  references, IaC output, hosting CLI output, or deployment docs that explicitly
  label the URL as owned and current.
- Deploy and launch instructions now forbid guessing domains from product name,
  repo name, package name, README title, brand name, or common TLDs.
- Full-arc workflow metadata now marks deploy and launch closure as requiring
  evidence-backed origins and forbidding inferred domains.

## [0.15.13] - 2026-05-11

Access ladder release. Tightens `/god-mode --yolo` shipping closure so keys,
API tokens, dashboards, admin consoles, and provider access are requested only
when a concrete check proves they are needed.

### Changed
- Added an External Access Ladder to the Shipping Closure Protocol: ask first
  for the deployed staging origin, run the real staging smoke command, then ask
  for one additional access item only when the next named check requires it.
- Deploy, observability, launch, and full-arc instructions now cap blocked
  shipping pauses to one new external access item unless a single command
  genuinely requires several values together.
- God Mode now treats provider keys and API tokens as last-mile inputs, not
  upfront rollout prerequisites.

## [0.15.12] - 2026-05-11

Shipping closure release. Prevents `/god-mode --yolo` from stopping with broad
staging/provider checklists.

### Changed
- Added a Shipping Closure Protocol for deploy, observe, harden, and launch:
  verify a real environment when reachable, otherwise create local or
  CI-verifiable automation, then pause only for one exact external access
  bundle.
- Deploy, observability, and launch agents now treat missing provider access as
  `waiting-for-external-access` with a concrete artifact instead of a generic
  next-step checklist.
- Full-arc workflow metadata now records closure behavior for missing external
  access.

## [0.15.11] - 2026-05-11

God Mode resume release. Fixes `/god-mode --yolo` prompting for a project
description when durable Godpowers state already exists.

### Changed
- `/god-mode` now treats existing `.godpowers` state as a resume signal and
  rehydrates intent from checkpoint, state, progress, intent, prep, and tier
  artifacts before asking the user anything.
- The orchestrator now documents that asking "what do you want to build?" in a
  brownfield repo with existing Godpowers artifacts is a routing bug.

## [0.15.10] - 2026-05-11

God Mode continuity release. Makes red verification output repair work inside
the same autonomous arc instead of a terminal summary.

### Changed
- `/god-mode` now treats failed tests, lint, typecheck, build, or check commands
  as repairable work and enters an autonomous repair loop before declaring the
  arc complete.
- Build completion now requires test, lint, and typecheck/check commands to be
  green when those commands exist.
- `/god-mode --yolo` now auto-runs repair loops, with Critical security findings
  remaining the only unconditional pause.
- Roadmap and build planning language now uses Godpowers delivery increments
  instead of preserving imported methodology terminology.

## [0.15.9] - 2026-05-11

Early design planning release. Lets UI and product-experience projects shape
DESIGN.md before architecture.

### Changed
- `/god-init` now records UI and product-experience signals in
  `.godpowers/prep/INITIAL-FINDINGS.md`.
- `/god-prd`, `/god-next`, and `/god-mode` now route to `/god-design` after
  PRD and before `/god-arch` when UI or product-experience signals are found.
- `/god-design` now requires PRD, not stack, so DESIGN.md can inform
  architecture, roadmap, and stack instead of arriving after them.
- Architecture, roadmap, and stack routing and agents now read DESIGN.md and
  PRODUCT.md when present.

## [0.15.8] - 2026-05-11

Init preparation release. Documents what Godpowers found before PRD, next-step
routing, or the full autonomous arc starts.

### Added
- `/god-init` now always creates `.godpowers/prep/INITIAL-FINDINGS.md` with
  codebase shape, framework and tooling signals, tests, CI, docs, AI-tool
  instructions, detected methodology systems, risks, and the suggested next
  command rationale.
- `/god-prd`, `/god-next`, and `/god-mode` now read initial findings before
  choosing or producing the next Godpowers artifact.
- Architecture, roadmap, and stack agents now read initial findings alongside
  imported planning context when present.

### Documented
- The full recent init preparation flow is now documented together:
  automatic AI-tool context for explicit `god init`, quiet context writes,
  GSD / Superpowers / BMAD import into `IMPORTED-CONTEXT.md`, and direct
  Godpowers repo findings in `INITIAL-FINDINGS.md`.

## [0.15.7] - 2026-05-11

Planning import release. Lets `/god-init` preserve useful context from nearby
planning systems without making those systems authoritative.

### Added
- `/god-init` now detects GSD, Superpowers, BMAD, and similar planning context
  during project preparation.
- Added `.godpowers/prep/IMPORTED-CONTEXT.md` as a non-authoritative
  preparation artifact for imported product, delivery, architecture, and stack
  signals.
- PRD, architecture, roadmap, and stack agents now read imported context when
  present and treat it as hypothesis-level supporting evidence.

## [0.15.6] - 2026-05-11

Quiet init release. Keeps `/god-init` focused on the next useful command while
context setup happens in the background.

### Changed
- `/god-init` now treats the Godpowers context writer as background setup and
  suppresses file-by-file narration unless the context write fails.
- `/god-init` completion now prints only the suggested next command line:
  `/god-prd` for requirements, or `/god-mode` for the full autonomous arc.
- `/god-context` commands remain explicit and still report their context-file
  changes.

## [0.15.5] - 2026-05-11

Godpowers init UX release. Makes explicit command invocation behave like
project setup instead of asking an obvious follow-up.

### Changed
- `god init` and `/god-init` now automatically write the Godpowers AI-tool
  context fence after initialization.
- Generic init triggers such as "start a project" and "initialize" still ask
  once before writing AI-tool instruction files.

## [0.15.4] - 2026-05-11

Codex command discovery release. Installs Godpowers commands in the directory
shape Codex loads as individual skills.

### Fixed
- Codex installs now write each command as `~/.codex/skills/<command>/SKILL.md`,
  so commands like `/god-next`, `/god-status`, and `/god-init` show up as
  separate Codex skills instead of only exposing the umbrella `godpowers`
  skill.
- Codex uninstall now removes those command directories while preserving
  unrelated user skills.

### Tests
- Added installer smoke coverage for Codex skill-directory installs and
  uninstalls.

## [0.15.3] - 2026-05-11

Documentation refresh release. Aligns the public docs, architecture map,
roadmap, command examples, and extension examples with the shipped v0.15
surface.

### Changed
- Updated command and agent counts across README, reference docs, roadmap,
  architecture docs, and command examples.
- Documented the installed runtime root path convention for routing, recipes,
  workflows, and runtime modules.
- Refreshed extension examples to match first-party pack versions and current
  Godpowers engine compatibility.

## [0.15.2] - 2026-05-11

Runtime hardening release. Fixes packaging and workflow edge cases found by
a deep audit, then locks them behind regression tests and pack publish gates.

### Fixed
- Installed `/god`, `/god-next`, `/god-help`, `/god-standards`, and
  `/god-version` now point agents at the installed `godpowers-runtime`
  bundle when the user is not inside the repository checkout.
- Installer now copies `package.json` into `godpowers-runtime`, so installed
  OTel exports report the real Godpowers version instead of `0.0.0`.
- Linkage scans now replace stale scanner-owned links instead of only adding
  new links. Manual links are preserved, and legacy maps without source
  metadata are migrated safely.
- `checkpoint.recordFact()` now preserves existing actions instead of wiping
  the checkpoint action history.
- Context writer now reads root-level `mode` and `scale`, matching the
  canonical `state.json` shape produced by `lib/state.js`.
- Event hash chains now stay valid when an event line is larger than 4KB.
- Extension reinstall now clears the old installed pack directory first, so
  deleted files do not remain active after reinstall.
- Installer uninstall now removes all installed data/runtime directories,
  including workflows, schema, routing, and `godpowers-runtime`.

### Tests
- Added regression coverage for stale linkage cleanup, checkpoint action
  preservation, root-level mode/scale context rendering, large event hash
  chains, installed OTel version metadata, runtime bundle guidance in installed
  skills, extension reinstall cleanup, and uninstall cleanup.
- Extension pack publish gate now verifies package peer dependency ranges
  match the manifest and include the current Godpowers version.

## [0.15.1] - 2026-05-11

Metadata + documentation polish. No code changes.

### Changed
- `package.json` description rewritten from tagline to searchable
  one-liner: explains what godpowers is and lists the AI tools it
  runs in. Improves npm registry discoverability.
- `package.json` keywords expanded 10 -> 25. Adds variants like
  `ai-agent`, `ai-orchestration`, specific tool names
  (`claude-code`, `windsurf`, `gemini`, `copilot`), and artifact
  taxonomy (`prd`, `architecture`, `roadmap`, `specialist-agents`).
- `docs/reference.md`: catalogue gap closed. The 23 skills shipped
  in v0.13 - v0.15 are now indexed (recovery, observability, the
  OTel exporter, extension management). Index now matches the 104
  skill files on disk.
- `README.md`: clean Install section without scaffold disclaimers.
- `docs/ROADMAP.md`: v0.16 and v1.0 sections rewritten in a tighter,
  goal-focused tone.

## [0.15.0] - 2026-05-11

Distribution release. Godpowers and its three first-party packs are
now publishable to npm with supply-chain provenance. OTel exporter
turns events.jsonl into something a real observability backend can
consume. Cost tracker distinguishes live (provider-reported) from
estimated (heuristic) per-call token counts.

### Added (cost-tracker live integration)
- `cost.recorded` events now carry `source: 'live' | 'estimated'`.
  Live = AI tool surfaced real per-call token counts from the
  provider API; estimated = orchestrator's heuristic byte-based
  count.
- `lib/cost-tracker.recordModelCall(handle, attrs)`: canonical entry
  point for AI tools with real usage data. Tags `source: 'live'`
  automatically.
- `lib/cost-tracker.isStrictLive(projectRoot, runIds?)`: returns
  `{strict, live_calls, estimated_calls, total_calls}` to drive CI
  gates.
- `aggregate()` splits `totals` into `live_calls / live_usd /
  live_tokens` and `estimated_*`.
- `formatReport()` breaks the Spent line into Live and Estimated
  sublines.
- `/god-cost --strict`: exit non-zero if any in-scope record is
  estimated. Wire into CI once live reporting is reliable.

### Added (OTel exporter)
- `lib/otel-exporter.js`: converts a run's events.jsonl into
  OTLP/JSON ResourceSpans and (optionally) POSTs to an OTLP HTTP
  collector. No external deps; uses Node's built-in http/https.
- Event -> span mapping: `workflow.run` + `workflow.complete` form
  the root span; `agent.start` + `agent.end` (matched by span_id)
  become child spans parented to the root; other named events
  (`cost.recorded`, `gate.fail`, `error`, `decision.route`,
  `tool.call`) attach as span events; `error` or `gate.fail`
  flips parent span status to ERROR.
- Honors `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` (takes precedence),
  `OTEL_EXPORTER_OTLP_ENDPOINT` (with `/v1/traces` auto-appended),
  and `OTEL_EXPORTER_OTLP_HEADERS` (comma-separated `k=v` for auth
  like `x-honeycomb-team=...`).
- New skill `/god-export-otel`: opt-in; nothing exports until
  invoked. Supports `--run-id`, `--all`, `--endpoint`, `--stdout`,
  `--service-name`.

### Added (first-party packs publishable as npm packages)
- Each pack ships its own `package.json` with the scoped name,
  `publishConfig.access=public`, `files` allowlist, and
  `peerDependencies.godpowers`:
  - `@godpowers/security-pack` (SOC 2, HIPAA, PCI-DSS auditors)
  - `@godpowers/launch-pack` (Show HN, Product Hunt, Indie Hackers,
    OSS release strategists)
  - `@godpowers/data-pack` (ETL, ML features, dashboards)
- Each pack starts at `0.1.0`, decoupled from the godpowers root
  version.
- Manifest engines fix: `>=1.0.0 <2.0.0` (impossible while godpowers
  is on 0.x) -> `>=0.14.0 <2.0.0`.

### Added (distribution)
- `.github/workflows/publish.yml`: tag-triggered publish. On a `v*`
  tag push, runs the full test suite as a gate, then `npm publish
  --provenance --access public` using `${{ secrets.NPM_TOKEN }}`.
- `.github/workflows/publish-pack.yml`: workflow_dispatch entry
  point. Pick `security-pack`, `launch-pack`, or `data-pack` from
  the GitHub Actions UI to publish that pack to npm after bumping
  its `package.json` version.
- CHANGELOG remains human-curated; `npm version minor` + push tags
  is the release procedure.

### Tests
- 9 new tests for `source: 'live' | 'estimated'` cost-tracker
  behavior, `recordModelCall()`, `isStrictLive()`, and aggregate
  splits (35 total in `test-cost-saver.js`).
- 15 new tests for the OTel exporter, including a real in-process
  HTTP collector verifying POST, content-type, path, body, and
  auth-header propagation.
- 43 new tests for extension-pack publish readiness across all
  three first-party packs: package.json well-formed, name+version
  match manifest, `npm pack --dry-run` succeeds, tarball includes
  required files, tarball excludes node_modules / .git / tests.
- Full suite now 36 test suites, 1864+ behavioral tests.

## [0.14.0] - 2026-05-11

The big release. Workflow runtime is now executable, locks and
checkpoints are wired into the orchestrator, a full token cost saver
ships, on/off budget shortcut for casual users, GitHub Actions CI,
and npm publish prep.

### Added (lock + checkpoint wiring)
- `lib/state-lock.js`: acquire / release / peek / isStale / reclaim /
  withLock. Reentrant; scope-based conflict; stale-lock reclaim;
  withLock guarantees release on thrown error.
- `lib/checkpoint.syncFromState`: one-call orchestrator helper that
  rebuilds CHECKPOINT.md from state.json + events.jsonl tail.
- 28 artifact-producing skills gained `## Locking` sections that
  document the contract for end users.
- `agents/god-orchestrator.md`: new Concurrency section that wires
  lock acquisition + CHECKPOINT auto-update into every sub-step.

### Added (token cost saver)
- `lib/cost-tracker.js`: per-call cost recording + per-tier /
  per-agent / per-model aggregation. Built-in pricing table for
  major models (Claude / GPT / Gemini / O-series). recordCost /
  recordCacheHit / recordCacheMiss / aggregate / formatReport /
  priceTokens.
- `lib/agent-cache.js`: opt-in agent-output cache keyed by
  sha256(agent + version + sorted inputs + state-hash). TTL-bounded.
  Sharded storage. Cache hits emit `cache.hit` with savings_usd.
- `lib/context-budget.js`: per-agent budget planner. Reads required /
  optional context from agent frontmatter; loads under cap; emits
  `budget.exceeded` when required alone overflows.
- `schema/intent.v1.yaml.json`: new `budgets` block with
  `default-max-tokens`, `model-profile` (cheap / standard /
  expensive), `cache`, `cache-ttl-hours`, per-agent overrides.
- `lib/events.js`: 4 new event names (`cost.recorded`, `cache.hit`,
  `cache.miss`, `budget.exceeded`).
- 3 new skills: `/god-cost` (spend + savings report), `/god-budget`
  (view + set budgets), `/god-cache-clear` (invalidate cache).
- `lib/budget.js`: applyOn / applyOff / set / read / summary so
  `/god-budget --on` and `--off` work as one-shot toggles.
- `agents/god-orchestrator.md`: new "Cost-conscious agent dispatch"
  section wiring cache check, context-budget loadout, model selection
  by profile, and cost recording into every spawn.

### Added (v0.14 workflow runtime)
- `lib/workflow-runner.js`: listWorkflows + loadByName + plan +
  writePlan + readPlan. Reads workflows/*.yaml via
  lib/workflow-parser; computes dependency-ordered waves; serializes
  plans to .godpowers/runs/<id>/plan.yaml.
- `/god-mode --workflow=<name>` and `/god-mode --plan` flags added.
- All 13 workflows/*.yaml had their "NOT YET AUTHORITATIVE" header
  replaced with "Authoritative (v0.14+)".

### Added (release engineering)
- `.github/workflows/ci.yml`: matrix on Node 18/20/22; runs npm test
  on every PR + main push. Separate `package` job runs npm pack
  --dry-run and verifies bin entry + CHANGELOG has a current entry.
- `package.json` files array: routing/, workflows/, extensions/,
  INSPIRATION.md added (previously missing -> would have shipped a
  broken package). prepublishOnly runs the full test suite before
  any npm publish.
- npm pack --dry-run: 364KB tarball / 1.1MB unpacked / 439 files.

### Tests
- 34 suites (was 30 at v0.13.0), 1863 passing (was 1764). +99.
- New: test-state-lock.js (21), test-cost-saver.js (26),
  test-budget-onoff.js (13), test-workflow-runner.js (12).

### Changed
- bin/install.js VERSION: 0.13.0 -> 0.14.0
- package.json version: 0.13.0 -> 0.14.0

## [0.13.0] - 2026-05-10

Context-rot protection (the major new feature), extension runtime, and
observability readers. Ships earlier-than-roadmapped observability
because it cost very little once events.jsonl already existed.

### Added (context-rot protection)
- `lib/checkpoint.js`: read/write/append API for `.godpowers/CHECKPOINT.md`,
  the disk-authoritative "where you are" pin. Frontmatter holds id,
  project, mode, mode-d-suite, lifecycle, current-tier, current-substep,
  last-action, last-actor, last-update, facts-hash. Markdown body holds
  Where-you-are + Last actions (up to 20) + Held facts (up to 10) +
  Next suggested command + "if you are a new session" guide.
- `skills/god-locate.md`: orient a new chat session or new AI tool against
  disk reality. Reads CHECKPOINT + state.json + events.jsonl tail +
  reflog + intent.yaml. Single-screen output. Replaces guesswork when
  switching tools or returning to a project.
- `skills/god-context-scan.md`: detect drift between the AI's stated mental
  model and disk. The defensive cousin of /god-status. Use in long
  sessions before commits. Surfaces hallucinated facts and stale memory.
- `lib/events.js`: hash chain on events.jsonl. Each event includes
  `prev` = sha256 of the previous line (or `genesis` for the first).
  New `verifyChain(file)` detects any truncation / tampering /
  reordering. Cheap; cryptographically tamper-evident audit log.
- `hooks/session-start.sh`: now prefers CHECKPOINT.md over PROGRESS.md
  when present. Prints the "Where you are" + Next-suggested sections
  for instant orientation.

### Added (v0.13 extension runtime)
- `schema/extension-manifest.v1.json`: schema for extension manifests
  (apiVersion, kind, metadata.name + version, engines.godpowers SemVer
  range, provides {agents,skills,workflows,have-nots}, activation rules).
- `lib/extensions.js`: install / list / info / remove + SemVer range
  matcher (exact, ^X.Y.Z, ~X.Y.Z, >=, <, compound). Capability handshake
  rejects install when engines.godpowers doesn't include the running
  godpowers version.
- 5 new skills: `/god-extension-add`, `/god-extension-list`,
  `/god-extension-info`, `/god-extension-remove`, `/god-test-extension`.

### Added (v0.15 observability, shipped early)
- `lib/event-reader.js`: timeline / metrics / trace / summarize over
  events.jsonl. Pairs agent.start with agent.end to compute durations.
  Aggregates per-tier counts, durations, pauses, errors. Reads one run
  or all runs in the project.
- 3 new skills: `/god-logs`, `/god-metrics`, `/god-trace`.

### Tests
- 27 -> 30 test suites; 1629 -> roughly 1670 passing.
- New: scripts/test-checkpoint.js (16), scripts/test-extensions.js (19),
  scripts/test-event-reader.js (9).
- All existing tests still pass; the events hash chain didn't break
  anything because emit() was always single-line append.

### Changed
- bin/install.js VERSION: 0.12.0 -> 0.13.0
- package.json version: 0.12.0 -> 0.13.0

## [0.12.0] - 2026-05-10

Mode D (multi-repo suites), agent discipline, story-file workflow, Pi + T3
support, and routing sweep. Test suite at 1415 passing across 22 suites.

### Added (Mode D - multi-repo suites)
- `agents/god-coordinator.md`: Tier-0 peer agent for cross-repo coordination
- `lib/suite-state.js`: Mode D suite registration + version table
- `lib/meta-linter.js`: cross-repo lint for byte-identical files
- `skills/god-suite-init.md`: register siblings + shared standards
- `skills/god-suite-status.md`: side-by-side repo status
- `skills/god-suite-sync.md`: byte-identical file propagation
- `skills/god-suite-patch.md`: coordinated multi-repo change
- `skills/god-suite-release.md`: release coordination across siblings
- `references/shared/multi-repo-suite-layout.md`

### Added (agent discipline - phase 17)
- `lib/agent-validator.js`: validates every agents/*.md against the agent
  contract (frontmatter, required sections, output schema)
- `skills/god-agent-audit.md`: `/god-agent-audit` runs the validator

### Added (story-file workflow - phase 18)
- `lib/story-validator.js`: parses + validates STORY.md files
- `agents/god-storyteller.md`: STORY.md writer
- `skills/god-story.md`: write a new story
- `skills/god-stories.md`: list stories by status
- `skills/god-story-build.md`: implement a story
- `skills/god-story-verify.md`: run acceptance criteria as headless tests
- `skills/god-story-close.md`: close after build + verify

### Added (runtime support)
- Pi (earendil-works/pi) support in installer (`--pi` flag, ~/.pi/skills/)
- T3 Code (pingdotgg/t3code) transparent support via underlying agent
- Cross-tool Agent Skills standard at .agents/skills/

### Added (brownfield depth)
- `agents/god-archaeologist.md`: deep code archaeology
- `agents/god-reconstructor.md`: reverse-engineer planning artifacts
- `agents/god-reconciler.md`: cross-artifact reconciliation
- `agents/god-debt-assessor.md`: technical-debt scorer
- `skills/god-archaeology.md`, `god-reconstruct.md`, `god-reconcile.md`,
  `god-tech-debt.md`

### Changed (routing sweep + integration)
- Phase 13: routing sweep + beyond-arc skill linkage participation
- Phase 14: documentation surface for runtime / linkage / design
- Phase 15: runtime heuristic improvements (parseFlow verb coverage)
- Audit-driven fixes: closed 4 misconnections + disconnections between
  beyond-arc workflows and linkage / reverse-sync

### Documentation
- `INSPIRATION.md`: single canonical acknowledgement of prior-art
- Doc deck refreshed to current state (82 skills, 38 agents, v0.11+)

### Tests
- 22 test suites, 1400+ passing (was 18 suites, 1235 at 0.11.0)

## [0.11.0] - 2026-05-10

Major release. Production-ready validation, full design pipeline, and
runtime verification. 18 commits since 0.4.0; full test suite at 1235
passing across 18 suites.

### Added (validation foundation)
- `lib/have-nots-validator.js`: 11 mechanical have-nots checks (em/en
  dash, emoji, unlabeled paragraphs, phantom references, future dates,
  generic claims, PRD/ARCH structure violations)
- `lib/artifact-linter.js`: per-artifact orchestrator with detectType,
  lintFile, lintAll, formatReport, aggregate
- `lib/artifact-diff.js`: regression detection between artifact versions
- `skills/god-lint.md`: `/god-lint` mechanical validation
- `references/HAVE-NOTS.md` integrated into linter

### Added (exemplars and antipatterns parity)
- `examples/saas-mrr-tracker/` complete UI project (PRD/ARCH/ROADMAP/STACK/DESIGN)
- `examples/cli-tool/` backend-only project (PRD/ARCH/ROADMAP/STACK)
- `references/planning/ROADMAP-ANTIPATTERNS.md`
- `references/planning/STACK-ANTIPATTERNS.md`
- `references/building/BUILD-ANTIPATTERNS.md`
- `references/shipping/{DEPLOY,OBSERVE,HARDEN,LAUNCH}-ANTIPATTERNS.md`
- `references/design/{DESIGN-ANATOMY,DESIGN-ANTIPATTERNS}.md`

### Added (design foundation - integrations)
- `lib/design-detector.js`: UI presence detection across 24+ frameworks
- `lib/design-spec.js`: Google Labs design.md parser + linter (frontmatter
  schema, section order, token resolution, WCAG contrast)
- `lib/impeccable-bridge.js`: detect-and-delegate to Impeccable's 23 commands
- `lib/awesome-design.js`: 71-site catalog from VoltAgent's awesome-design-md
- `lib/skillui-bridge.js`: SkillUI fallback for sites not in catalog
- `agents/god-designer.md`: lifecycle owner of DESIGN.md + PRODUCT.md
- `agents/god-design-reviewer.md`: two-stage gate (spec + quality)
- `skills/god-design.md`: 26 subcommands bridging impeccable + catalog + skillui
- `routing/god-design.yaml`
- `templates/DESIGN.md`

### Added (linkage + propagation)
- `lib/linkage.js`: bidirectional artifact-to-code map with 7 stable ID types
  (P-MUST/SHOULD/COULD-NN, ADR-NNN, C-{slug}, M-{slug}, S-{slug}, token paths, D-{slug})
- `lib/code-scanner.js`: 6 discovery mechanisms (annotations, filenames,
  imports, style-system, test descriptions, manual)
- `lib/drift-detector.js`: design token drift, stack version drift, ARCH
  container drift
- `lib/impact.js`: forward propagation (artifact change -> affected code)
- `lib/cross-artifact-impact.js`: 6 rule classes for artifact-to-artifact impact
- `lib/review-required.js`: REVIEW-REQUIRED.md + REJECTED.md managers
- `lib/reverse-sync.js`: code -> artifact fenced footer appender
  (PRD/ARCH/ROADMAP/STACK/DESIGN)
- `skills/god-design-impact.md`: what-if analysis
- `skills/god-review-changes.md`: walk REVIEW-REQUIRED.md
- `skills/god-scan.md`: manual reverse-sync
- `skills/god-link.md`: manual link entry

### Added (runtime verification - headless)
- `lib/browser-bridge.js`: headless-only browser launch (cascade:
  agent-browser preferred, Playwright fallback)
- `lib/agent-browser-driver.js`: vercel-labs/agent-browser CLI wrapper
- `lib/runtime-audit.js`: design verification on rendered DOM (computed
  styles vs DESIGN.md tokens, real-DOM WCAG contrast)
- `lib/runtime-test.js`: PRD acceptance criteria as user-flow assertions
- `agents/god-browser-tester.md`
- `skills/god-test-runtime.md`

### Added (light-impeccable - 7 design domain references)
- `references/design/TYPOGRAPHY.md` (~140 lines)
- `references/design/COLOR.md` (~145 lines)
- `references/design/SPATIAL.md` (~110 lines)
- `references/design/MOTION.md` (~120 lines)
- `references/design/INTERACTION.md` (~150 lines)
- `references/design/RESPONSIVE.md` (~125 lines)
- `references/design/UX-WRITING.md` (~130 lines)

### Added (ai-tool context)
- `lib/context-writer.js`: AGENTS.md / CLAUDE.md / GEMINI.md / .cursor/ /
  .windsurf/ / others fenced section manager (11 AI tools detected)
- `agents/god-context-writer.md`
- `skills/god-context.md`

### Added (front-door)
- `skills/god.md`: free-text intent matcher

### Changed
- `god-orchestrator.md`: extended Quarterback responsibilities;
  detection-driven Tier 1 routing; mid-arc DESIGN/PRODUCT change
  detection; extended critical-finding gate (drift, lint errors,
  design-review BLOCK, validator errors); explicit YOLO behavior table
- `god-updater.md`: now calls reverse-sync.run on /god-sync
- `lib/state.js`: schema additions (tier-1.design, tier-1.product,
  linkage slot, yolo-decisions array)

### Documentation
- `docs/change-propagation.md`: forward + reverse + cross-artifact propagation
- `docs/linkage.md`: stable IDs, 6 discovery mechanisms, drift detection
- `.planning/2026-05-10-production-ready-and-design.md`: comprehensive plan
- `.planning/dogfood-001-results.md`: end-to-end validation results

### Tests
- 18 test suites, 1235 passing, 0 failing (was 4 suites, ~360 tests at 0.4.0)
- All new tests behavioral, not just structural

### External integrations (5; all detect-and-delegate, none vendored)
- Google Labs design.md (format spec)
- Impeccable (design intelligence; 7 domain refs + 23 commands + 27 anti-patterns)
- VoltAgent awesome-design-md (71-site curated catalog)
- SkillUI (static analysis fallback for arbitrary URLs)
- vercel-labs/agent-browser + Playwright (runtime verification backends)

## [0.8.1] - 2026-05-09

### Changed
- Automatic mode detection across `/god-init` and `/god-mode`: greenfield /
  brownfield / bluefield decided invisibly from disk signals (package.json,
  source dirs, org-context markers). Users no longer need to know the
  jargon; the system asks plain-English clarifying questions only when
  signals are ambiguous.

## [0.8.0] - 2026-05-09

### Added (brownfield + bluefield support)
- `agents/god-archaeologist.md`: deep code archaeology (history, decisions,
  conventions, risks, tribal knowledge) beyond `/god-map-codebase`
- `agents/god-reconstructor.md`: reverse-engineers PRD / ARCH / ROADMAP /
  STACK from existing code so brownfield projects can use full
  reconciliation
- `agents/god-debt-assessor.md`: 8-category debt assessment with P0-P3
  prioritization (code, design, dependency, security, test, doc,
  operational, knowledge)
- `agents/god-org-context-loader.md`: bluefield support for org-level
  shared standards, conventions, infrastructure, libraries
- Skills: `/god-archaeology`, `/god-reconstruct`, `/god-tech-debt`,
  `/god-org-context`

## [0.7.3] - 2026-05-09

### Added
- Greenfield artifact coverage: `/god-mode` reliably creates the 10 core
  artifacts across Tier 0-3 sub-steps. The 4 capture artifacts (BACKLOG,
  SEEDS, TODOS, THREADS) remain lazy by design (created only when used).
- Mandatory final sync: `/god-mode` always runs `/god-sync` at end of arc
  regardless of flags (`--yolo`, `--conservative`, `--with-hygiene`).

## [0.7.2] - 2026-05-09

### Added (comprehensive multi-artifact reconciliation)
- Extended reconciliation from roadmap-only to all 13 impacted artifacts:
  PRD, ARCH, ROADMAP, STACK, REPO, DEPLOY, OBSERVE, HARDEN, LAUNCH,
  BACKLOG, SEEDS, TODOS, THREADS
- New skills: `/god-reconcile` (before feature work), `/god-sync` (after)
- Cross-artifact divergence detection (e.g. PRD/roadmap moving-target,
  STACK drift vs lock files)

## [0.7.1] - 2026-05-09

### Added (roadmap reconciliation loop)
- `agents/god-roadmap-reconciler.md`: classifies user intent vs ROADMAP.md
  with 6 verdicts (already-done, in-progress, enhancement,
  prerequisite-needed, new, ambiguous)
- `agents/god-roadmap-updater.md`: keeps ROADMAP.md as a living artifact
  after feature work; detects PRD divergence
- Skills: `/god-roadmap-check`, `/god-roadmap-update`

## [0.7.0] - 2026-05-09

### Added (recipes as programmatic input)
- `schema/recipe.v1.json`: structured recipe definition with triggers
  (intent-keywords + state-conditions), decision-tree, sequences, default
- 33 structured recipes at `routing/recipes/<recipe>.yaml` covering
  starting, feature-addition, production, maintaining, recovering,
  collaborating, knowledge categories
- Agents consult recipes for fuzzy intent decisions (no longer just human docs)

## [0.6.0] - 2026-05-09

### Added (unified decision engine + routing + standards gates)
- `schema/routing.v1.json`: JSON Schema for routing definitions
  - Prerequisites (required + recommended) with auto-complete commands
  - Execution (spawns, secondary-spawns, reads, writes)
  - Standards (substitution-test, three-label-test, have-nots,
    gate-on-failure)
  - Success-path + failure-path
- Standards gates between command stages (artifact discipline runs
  independent of the producing agent)

## [0.5.0] - 2026-05-09

### Added (reference content depth)
- 12 substantive per-tier reference documents at `references/`:
  - `planning/PRD-ANATOMY.md`, `PRD-ANTIPATTERNS.md`
  - `planning/ARCH-ANATOMY.md`, `ARCH-ANTIPATTERNS.md`
  - `planning/ROADMAP-ANATOMY.md`, `STACK-ANATOMY.md`
  - `building/BUILD-VERTICAL-SLICES.md`, `BUILD-WAVES.md`
  - `shipping/DEPLOY-PATTERNS.md`, `OBSERVE-SLO-EXAMPLES.md`,
    `HARDEN-OWASP-WORKSHEETS.md`
  - `orchestration/MODE-DETECTION.md`, `SCALE-DETECTION.md`
  - `shared/GLOSSARY.md`, `ORCHESTRATORS.md`
- Each with worked examples, antipattern catalogs, concrete guidance

## [0.4.0] - 2026-05-09

### Added
- **god-mode lifecycle awareness**:
  - god-orchestrator now has explicit Post-Launch Transition phase
  - After `/god-mode` (full-arc), project enters STEADY STATE
  - Steady-state hand-off message lists all 11 ongoing workflows
  - New flag `/god-mode --with-hygiene` runs audit + deps + docs verification
  - `/god-mode --yolo --with-hygiene` enables autonomous hygiene (still pauses on Critical CVEs)
- **2 new lifecycle slash commands**:
  - `/god-hygiene`: composite health check (audit + deps + docs)
  - `/god-lifecycle`: shows project phase and contextually appropriate workflows
- **v0.5 scaffolding**:
  - `schema/intent.v1.yaml.json`: JSON Schema for godpowers.yaml (intent)
  - `schema/state.v1.json`: JSON Schema for state.json (facts)
  - `schema/events.v1.json`: OpenTelemetry-shape event vocabulary
  - `lib/README.md`: planned runtime modules with target versions
  - `docs/RFC/0002-workflow-yaml-v1.md`: workflow language design
- **Distribution prep**:
  - `.npmignore` excludes dev files from npm package
  - `package.json` repository, homepage, bugs fields populated
  - `scripts/release.sh`: tag + publish flow with verification
- **First-party extension scaffold**:
  - `extensions/security-pack/manifest.yaml`
  - `extensions/security-pack/agents/god-soc2-auditor.md`
  - `extensions/security-pack/skills/god-soc2-audit.md`
  - `extensions/security-pack/README.md`
  - Demonstrates extension shape for v0.8 implementation
- **Integration test scaffold**:
  - `tests/README.md`: three-layer test strategy
  - `tests/integration/README.md`: planned end-to-end tests with record/replay
  - Fixture project layout designed for v0.5 implementation

- **8 new workflow slash commands** for real-world scenarios beyond greenfield:
  - `/god-feature`: Add a feature to an existing project
  - `/god-hotfix`: Urgent production bug fix (skips planning, expedited deploy)
  - `/god-refactor`: Safe refactor with strict TDD (no behavior change)
  - `/god-spike`: Time-boxed research with throwaway POC
  - `/god-postmortem`: Post-incident investigation (root cause + class-of-bug)
  - `/god-upgrade`: Framework/version migration (expand-contract pattern)
  - `/god-docs`: Write/update docs verified against code
  - `/god-update-deps`: CVE-aware incremental dependency updates
- **5 new specialist agents**:
  - `god-incident-investigator`: Postmortems with action items + runbook updates
  - `god-spike-runner`: Time-boxed POC with honest findings
  - `god-migration-strategist`: Incremental migrations with rollback per slice
  - `god-docs-writer`: No-lying docs verified against code
  - `god-deps-auditor`: CVE-aware dependency updates with bisect-able commits
- **5 new templates** for workflow artifacts:
  - `templates/POSTMORTEM.md`
  - `templates/SPIKE.md`
  - `templates/MIGRATION.md`
  - `templates/DOCS-UPDATE-LOG.md`
  - `templates/DEPS-AUDIT.md`
- **HAVE-NOTS.md catalog extended** with new failure modes for each new
  artifact type (PM-01..PM-08, SP-01..SP-05, MG-01..MG-07, DC-01..DC-05,
  DP-01..DP-06)
- **Architecture design documents**:
  - `ARCHITECTURE.md`: 16-section canonical design for v1.0 (pure-skill model)
  - `docs/RFC/0000-research-brief.md`: Synthesized research informing the design
  - `docs/RFC/0001-state-model-v1.md`: First detailed RFC
  - `docs/ROADMAP.md`: v0.4 -> v1.0 implementation plan

### Changed
- `package.json` bumped to 0.4.0 (was stuck on 0.3.0 despite v0.4 work)
- `install.js` VERSION constant bumped to 0.4.0
- `/god-next` routing extended to suggest workflows based on user intent
  (feature add, hotfix, refactor, etc.) when project is in steady state
- README "Other Workflows" section added to command table
- SessionStart hook updated to suggest new workflows for ambient discovery
- Smoke test PAIRS extended to verify 8 new skill-to-agent routings
- Each new agent references its template for structural starting point

### Architecture decisions (documented, not yet implemented)
- v0.5+ will introduce three load-bearing artifacts: intent.yaml + state.json
  + events.jsonl
- v0.6 will add forward-only recovery (`/god-undo`, `/god-rollback`)
- v0.7 will add OTel-shape observability
- v0.8 will add the skill pack ecosystem
- v1.0 will freeze schemas

## [0.3.0] - 2026-05-09

### Added
- **Critical fixes**:
  - Installer now copies `references/` directory (HAVE-NOTS catalog and
    per-tier reference content) so agents can find it in production
  - `--uninstall` flag now actually removes Godpowers from the target runtime
  - Install verification message lists how many commands and agents were
    installed and shows exact next steps
  - Templates explicitly referenced from each tier agent (god-pm references
    PRD.md, god-architect references ARCH.md, etc.)
- **Mode B (gap-fill) implementation**:
  - god-orchestrator now scans existing artifacts on disk
  - Detects which tiers have passing artifacts and skips them
  - Uses codebase signals (package.json, CI configs, test dirs) to detect
    partial progress
- **Documentation**:
  - CHANGELOG.md (this file)
  - CONTRIBUTING.md
  - SECURITY.md
  - Per-tier reference subdirectories with placeholder content

### Changed
- `package.json` version bumped from 0.1.0 to 0.3.0 (was stuck on first commit)
- Mode D (multi-repo) downgraded from "supported" to "future work" until real
  implementation lands
- Smoke test em/en-dash check rewritten to use Python instead of buggy bash
  byte-class regex (false-positives on UTF-8 multi-byte chars starting with 0xE2)
- `/god-init` skill now spawns god-orchestrator for mode/scale detection
  instead of duplicating the logic
- `/god-audit` skill now explicitly spawns god-auditor agent

### Fixed
- Smoke test no longer false-positives on block characters or other Unicode
  starting with 0xE2

## [0.2.1] - 2026-05-09

### Added
- Build phase orchestration explicit in god-orchestrator (4-agent chain per
  slice: god-planner -> god-executor -> god-spec-reviewer -> god-quality-reviewer)
- `--yolo` flag flows through to specialist agents with documented defaults
- Critical-finding carve-out: god-harden-auditor never auto-resolves Critical
  findings even with `--yolo`
- 13 routing checks, 1 build-phase check, 6 YOLO handling checks, 1 carve-out
  check added to smoke test

### Fixed
- /god-mode could stall on Build phase (orchestrator didn't reference reviewers)
- /god-mode --yolo could pause at specialist agent pause conditions
  (specialists didn't know about --yolo)

## [0.2.0] - 2026-05-09

### Added
- 6 artifact templates in `templates/` (PRD, ARCH, ROADMAP, STACK, PROGRESS,
  HARDEN-FINDINGS) with embedded have-nots checklists
- `references/HAVE-NOTS.md` consolidated catalog with 115 named failure modes
- 7 new runtimes in installer: Trae, Cline, Kilo, Antigravity, Qwen, CodeBuddy, Pi
  (15 total)
- 9 new slash commands:
  - `/god-fast` - trivial inline edits
  - `/god-quick` - TDD-discipline tasks below /god-build threshold
  - `/god-explore` - Socratic ideation pre-init
  - `/god-pause-work` - context handoff
  - `/god-resume-work` - context restoration
  - `/god-workstream` - parallel workspace management
  - `/god-sprint` - sprint plan/status/retro
  - `/god-party` - real multi-persona collaboration
  - `/god-build-agent` - custom specialist agent generator
- 2 new agents: `god-explorer`, `god-retrospective`
- Mode A/B/C/D detection logic in god-orchestrator
- Scale detection (trivial/small/medium/large/enterprise)
- YOLO-DECISIONS.md emission for `--yolo` runs
- `hooks/pre-tool-use.sh` safety hook

## [0.1.0] - 2026-05-09

### Added
- Initial release
- 17 slash commands (skills/) as thin orchestrators
- 16 specialist agents (agents/) in fresh contexts
- SessionStart hook
- Installer for 8 AI coding tool runtimes
- Smoke test and skill validation infrastructure
- README, AGENTS.md, LICENSE
