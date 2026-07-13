# Changelog

All notable changes to Godpowers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.5.0] - 2026-07-13

Arc-Ready and Pillars conformance release. This release makes product shape,
domain composition, public activation, and project context mechanically
testable across the full Godpowers lifecycle.

### Added

- Product-form routing for web applications, APIs and services, CLIs and SDKs,
  mobile and desktop products, data and ML systems, and infrastructure or IaC.
- Four-axis domain composition across product form, archetype, industry, and
  regulatory overlays, with form-specific vertical slices and completion
  evidence.
- A hash-bound pre-publication gate that re-reads hardening evidence, records
  Critical counts and timestamps, and invalidates after any authoritative
  hardening change.
- Arc-Ready 1.1 artifact detection, read-only import, and managed sync-back
  through `.arc-ready/GODPOWERS-SYNC.md`.
- Pillars 1.1 catalog, path identity, portable matcher, nested scope,
  exclusion, dependency, budget, and official conformance-fixture support.
- Pinned official Agent Skills validation in CI and every release check.

### Changed

- OWASP hardening now follows the 2025 Web Top 10, including Software Supply
  Chain Failures and Mishandling of Exceptional Conditions.
- Specialist source contracts moved from `agents/` to `specialists/`, while
  installed host contracts retain the portable `agents/` destination.
- Repository Pillars now use the normative eight-section body, `present` or
  `stub` status, explicit cataloged absences, and new development, release, and
  privacy context.
- Arc workflows select exactly one primary product form before applying domain
  or regulatory overlays.

## [5.4.0] - 2026-07-13

Godplans 1.1 interoperability release. This release recognizes the complete
PLAN plus validator contract, enforces its lifecycle before GP execution, and
preserves the full task and requirement ledger during Godpowers migration.

### Added

- A static, non-executing mirror of the Godplans 1.1 structural validator,
  with an exact hash pin for the official 1.1.0 validator companion.
- Lifecycle-aware GP dispatch that blocks planning, closed, invalid,
  incomplete, unknown-validator, non-executable, and symlinked contracts.
- Regression coverage for validator identity, companion safety, structural
  parity, approval states, closed plans, inconsistent lifecycles, executable
  mode drift, large plans, and eligible task selection.

### Changed

- Godplans migration now treats `.godplans/PLAN.mdx` and
  `.godplans/validate-plan.sh` as one versioned contract and hashes both files
  plus validator executable mode for staleness.
- Complete contracts retain every GP task, `Reuses`, `Verify`, story
  requirement, domain requirement, phase, status, and wave instead of sampling
  the first few headings.
- Legacy or incomplete plans remain readable migration context but stay
  hypothesis-grade and cannot dispatch GP work.
- The imported build ledger now uses
  `.godpowers/prep/IMPORTED-BUILD-STATE.mdx`, leaving the generated build state
  view under its runtime owner.
- Planning, migration, preflight, doctor, context, reconciliation,
  reconstruction, orchestration, route, workflow, template, architecture, and
  reference documentation now describe the Godplans 1.1 contract.

## [5.3.1] - 2026-07-13

Godaudits 2.0 interoperability patch. This release makes the canonical JSON
audit ledger authoritative throughout Godpowers migration, remediation, and
staleness workflows while retaining generated and legacy report fallbacks.

### Added

- Regression coverage for canonical godaudits 2.x JSON detection, parsing,
  compiled score and coverage import, typed remediation dispatch, staleness,
  large audit files, generated MDX fallback, managed todo synchronization,
  migration seeds, MDX safety, non-regular source rejection, and impact
  detection.

### Changed

- Godaudits interoperability now treats `.godaudits/AUDIT.json` as canonical
  machine state, uses generated or legacy `AUDIT.mdx` only as a fallback, and
  follows the godaudits validate and render workflow after GA remediation.
- The import digest now retains check outcomes, secret-safe evidence metadata,
  compliance, accepted risks, open questions, score caps, and coverage instead
  of flattening Godaudits 2.x to findings and tasks.
- Open GA tasks now synchronize into an idempotent, severity-prioritized managed
  section in `.godpowers/todos/TODOS.mdx` without overwriting user-owned todos.

## [5.3.0] - 2026-07-13

Product trust hardening release. This release makes Godpowers' own repository
obey the disk-authoritative lifecycle contract it applies to user projects.

### Added

- A release-blocking self-project truth gate covering source versions, public
  surface counts, always-loaded Pillars, state, generated progress,
  requirements, roadmap provenance, and lifecycle artifacts.
- Event-derived user-outcome metrics for time to accepted change, recorded
  cost, manual intervention, resume success, deployment completion, and
  rollback proof, with explicit no-data output when evidence is absent.
- Explicit read-only current-project inspection for Quick Proof through
  `--inspect-project`.

### Changed

- Host guarantees now separate installed agent metadata from active-session
  evidence, and an unidentified host cannot receive a full guarantee.
- Fixture-backed Quick Proof output now states that fixture results are not
  evidence about the current project.
- The default core profile is reduced from 19 to 15 high-level commands while
  all 122 commands remain available through role and full profiles.
- PRD metrics, COULD acceptance criteria, roadmap provenance, lifecycle state,
  generated views, checkpoint, and Pillars are reconciled for the release.

## [5.2.0] - 2026-07-04

Voice gate release. Promotes the anti-sycophancy half of the 5.1 voice contract
from prose guidance to a mechanical gate: a new have-not (U-14) backed by a
phrase detector, wired into both the artifact linter and a self-dogfood check on
the framework's own shipped prose.

### Added

- `lib/voice-lint.js`: a high-precision detector for sycophancy and
  gratitude-loop filler (praising the question, thanking for the message,
  help-eagerness, hope-this-helps, forced engagement). Reusable by agents on
  their own drafted output.
- Have-not **U-14 (sycophancy or gratitude loop)** in `references/HAVE-NOTS.md`,
  wired as a universal check in `lib/have-nots-validator.js` (warning severity on
  generated artifacts) with a good/bad worked example.
- Self-dogfood gate in `scripts/static-check.js` and `scripts/test-voice-lint.js`:
  the shipped `skills/` and `agents/` prose must contain no gratitude-loop filler,
  enforced in CI. The current surface is already clean, so this locks it in.

### Changed

- Have-not count moves from 157 to 158; lib module count from 95 to 96. No public
  command, agent, workflow, or recipe surface change.

## [5.1.0] - 2026-07-04

Craft and connectors release. Adopts a set of proven agent-prompting patterns as
a shared voice and craft contract, and extends the 5.0 connector work with a
priority ladder. Additive over 5.0; no surface counts change (122 skills, 40
agents, 95 lib modules).

### Added

- `references/shared/VOICE.md`: a voice and craft contract every agent adopts,
  wired as Core Principle 15 in `SKILL.md`. It covers constraint tiers
  (Guideline / Requirement / HARD LIMIT, with the have-nots as the hard-limit
  tier), an honest anti-sycophancy voice, minimal formatting, example-driven
  rules, and silent application of memory and lessons.
- Worked good/bad example pairs on the highest-traffic have-nots (U-01
  substitution, U-02 three-label, U-05 rubber-stamp) in `references/HAVE-NOTS.md`.
- `connectors.pickConnector(capability)` in `lib/connectors.js`: a capability
  ladder that picks the highest-priority available, enabled connector and stops
  at the first match (documented in `/god-connect`).

### Changed

- `skills/god-extract-learnings.md` documents silent application of recalled
  lessons (no "based on your memory" narration), pointing at `VOICE.md`.

## [5.0.0] - 2026-07-04

Loop-native release. Godpowers becomes a first-class autonomous loop, not only a
human-launched orchestrator, and closes the three gaps surfaced by a
loop-engineering comparison: no accepted-change metric, no external write
connectors, and no permission re-audit cadence. Counts move to 122 skills, 40
agents, 13 workflows, 44 recipes, 95 lib modules; the MCP companion moves from
eight to nine read-only tools. Additive over 4.x: existing commands, artifacts,
and the direct-to-`main` workflow are unchanged.

### Added

- `/god-loop`: stand up the minimum viable loop (one automation, one skill, one
  state file, one objective gate). Refuses to wire a loop without a hard stop.
- `/god-connect`: detect and scope external connectors (GitHub, Linear, Slack,
  Sentry, Notion). Godpowers delegates every action to the host's MCP connector
  and never vendors an API client; reads are allowed by default and writes
  require an explicit per-connector opt-in in `.godpowers/connectors.json`.
- `lib/change-metrics.js`: accepted-change rate derived from the event ledger
  (accepted vs rejected changes), with a default 50% target. Surfaced through
  `/god-metrics` and the new read-only MCP `change_metrics` tool.
- `lib/connectors.js`: connector registry, host detection, and write-scope
  policy gate. Surfaced in `lib/host-capabilities.js` reporting.
- `lib/reaudit.js`: permission re-audit cadence (default 30 days), surfaced
  through `/god-harden` and a read-only `permission-reaudit` automation template.
- Event vocabulary: `change.proposed`, `change.accepted`, `change.rejected`.

### Changed

- `@godpowers/mcp` exposes nine read-only tools; `change_metrics` is added and the
  surface stays read-only (external writes are delegated to host connectors).
- `README.md` rewritten for newcomers: a two-minute on-ramp, a plain-English
  glossary, and the loop-engineering model up front.
- `/god-harden` now tracks and reports permission re-audit staleness.

## [4.0.2] - 2026-07-03

Documentation release. Completes the `.md` to `.mdx` migration in the
user-facing and shipped documentation; no code, surface, or schema change.

### Fixed

- Documentation drift: generated-view and ledger artifact names
  (`PROGRESS`, `REQUIREMENTS`, `CHECKPOINT`, `HANDOFF`, `SYNC-LOG`,
  `REVIEW-REQUIRED`, `YOLO-DECISIONS`, `LINKAGE-LOG`) now consistently use the
  canonical `.mdx` the runtime writes, across `README.md`, `SKILL.md`,
  `references/HAVE-NOTS.md`, and the `docs/` set. Foreign planning-system files
  (a legacy `.planning/REQUIREMENTS.md`) correctly stay `.md`.

### Changed

- `README.md`: the "Works with godplans and godaudits" section now links to
  `docs/planning-system-migration.md` for the full import-confidence and
  read-only-boundary rules.

## [4.0.1] - 2026-07-03

Patch release from a post-publish adversarial review of 4.0.0. No surface,
schema, or behavior change for correct inputs; counts are unchanged
(120 / 40 / 13 / 44, 92 lib modules, 157 have-nots).

### Fixed

- Managed state-view writer (`lib/state-views.js`) no longer deletes a legacy
  `.md` twin when both twins exist and the legacy holds out-of-fence content the
  `.mdx` never absorbed. The twin is retired only when its content is already
  represented in the written `.mdx`, otherwise it is left in place with a
  warning. Prevents a silent edge-case loss of human notes around a generated
  view.
- Legacy `.md`-to-`.mdx` log-absorb writes go through an atomic write
  (`lib/sync-fs.js` now uses `writeFileAtomic`), so a crash mid-migration can no
  longer leave a truncated `.mdx` that shadows and then deletes the intact `.md`.
- Prose extension drift: `SYNC-LOG`, `HANDOFF`, `CHECKPOINT`, `YOLO-DECISIONS`,
  `REVIEW-REQUIRED`, `PROGRESS`, and `STORY` artifact references in skill and
  agent operational instructions now name the canonical `.mdx` the runtime
  writes; the `god-fix` example id is corrected to the `GA-<phase><two-digits>`
  contract form.
- Doc counts: `ARCHITECTURE-MAP.md` template count (14) and test-suite count
  (80) corrected; `RELEASE.md` no longer pins a stale test-file count.

## [4.0.0] - 2026-07-03

Sibling superskill integration and mdx-first artifacts. Godpowers now detects
and imports godplans (`.godplans/PLAN.mdx`) and godaudits (`.godaudits/AUDIT.mdx`)
context, runs plan-aware arcs, and dispatches GA remediation tasks, and the
canonical `.godpowers/` artifact extension changes from `.md` to `.mdx`. No
public command/agent/workflow/recipe surface change (counts stay
120 / 40 / 13 / 44); lib module count 91 -> 92 (`lib/sibling-artifacts.js`);
have-nots catalog 156 -> 157 (U-13).

### BREAKING
- **Canonical artifact extension is now `.mdx`:** every Godpowers-owned
  `.godpowers/` artifact is written as `.mdx`. Legacy `.md` artifacts remain
  readable (reads are mdx-first with `.md` fallback via `lib/sync-fs.js`
  `resolveArtifact`/`readArtifact`), and lib-owned generated files absorb a
  legacy `.md` twin on first write. Re-run `npx godpowers install` for your
  runtimes: installed runtimes and hooks must be refreshed so they understand
  `.mdx` projects; old runtimes cannot see `.mdx` artifacts. Exemptions stay
  `.md`: root `DESIGN.md`/`PRODUCT.md`, `.godpowers/cache/`, foreign
  planning-system markers, and host pointer files.

### Added
- **godplans/godaudits interop (`lib/sibling-artifacts.js`):** read-only
  detection and parsing of `.godplans/PLAN.mdx` and `.godaudits/AUDIT.mdx`
  (GP/GA checkbox tasks, findings, R-/A- domain id mirroring), `/god-migrate`
  import seeds with GP task ids and R-<DOM>-n ids preserved verbatim,
  plan-aware arcs, `/god-fix` dispatch of open GA remediation tasks with the
  finding's Verify command as the done-check, managed
  `.godplans/GODPOWERS-SYNC.mdx` and `.godaudits/GODPOWERS-SYNC.mdx` sync-back
  companions, and import-hash staleness drift checks. Sibling files stay
  read-only except when executing plan or audit tasks under the executor rules
  embedded in PLAN.mdx/AUDIT.mdx themselves.
- **MDX-safety lint (U-13):** new have-not "MDX-unsafe artifact content" with a
  mechanical artifact-linter check, so artifact bodies that would break MDX
  compilation fail the lint instead of failing downstream tooling.

### Fixed
- **Safe-sync gate wiring:** the `.godpowers/sync/` safe-sync markers the
  router reads are now written by the documented remediation flow, so a
  detected sync plan can actually be cleared instead of permanently blocking
  Tier 3 commands.
- **Quarterback review fallback:** the review play falls back to a command
  that exists (`/god-review`) instead of the phantom `/god-code-review`.
- **References wiring:** planning anatomy/antipattern docs, building and
  shipping references, and orchestration detection guides are now pointed to
  by the agents that should consume them instead of shipping unreferenced.
- **Agent-specs completeness:** `docs/agent-specs.md` covers all 40 product
  agents (added the missing god-automation-engineer, god-coordinator,
  god-greenfieldifier, and god-storyteller sections).

## [3.14.0] - 2026-06-17

UX-audit remediation release. Drives the Godpowers UX audit (`uxaudit.md`, 11
weighted experience lenses) to zero: all 20 findings across usability, content,
information architecture, interaction, process, journeys, and trust. The changes
are backward compatible and add no new commands; they tighten the install and
dashboard surfaces, broaden the free-text router, and rewrite the front-door
docs. No public command/agent/workflow/recipe surface change (counts stay
120 / 40 / 13 / 44); lib module count unchanged at 91.

### Added
- **`docs/README.md` documentation index (IA-004):** a "Start here" section
  linking every user-facing doc and a separate "Internal and maintainer" section
  for the rest, so a reader landing in `docs/` can tell which is which.
- **`--help` "Start here" group (CNT-004):** `npx godpowers --help` now leads
  with a 6-item common-command group above two labelled advanced groups
  (ledger/evidence, workflow/tooling), mirroring the install-success copy.

### Changed
- **Install/surface argument validation (USE-001, USE-002, USE-003):** a typo'd
  bare subcommand now errors instead of silently starting a global install; an
  unknown `--profile` is a clean one-line error before any filesystem write, not
  a mid-install stack trace; `surface --runtime=<bad>` is rejected instead of
  planning an apply to a nonexistent runtime.
- **Dashboard and report display honesty (USE-004, CNT-005, CNT-006, IXD-001):**
  `status --full` shows `Phase/Step: not initialized` (not `Complete`) on an
  uninitialized project; the readiness headline reads `no blockers` instead of
  the overloaded `ready`; the empty `report` names the commands that populate
  the ledger; `next` no longer prints the recommended command a third time.
- **Free-text router accuracy (IA-001, IA-002):** broadened `intent-keywords`
  for the highest-traffic recipes so common verbs match a topical recipe (fix a
  bug, ship it, deploy, release, check progress); `classifyWorkSize` returns
  null when no small-task signal is present instead of confidently mis-sizing an
  unrelated intent as `/god-quick`.
- **Skipped-step progress honesty (JRN-002):** `progressSummary` exposes a
  `skipped` count and the dashboard progress line annotates it
  (`... 2 of 13 complete, 2 skipped`) so a run that skipped tiers no longer
  shows a silently inflated percent.
- **Close-gate honesty (PROC-001):** `can-close` output, the `canClose`
  docstring, and the orchestrator runbook now state that `can-close` is the
  advisory since-in-flight freshness check and `npx godpowers gate` is the
  mechanically enforced boundary, closing the described-gate vs gate-that-runs
  gap.
- **README front door (CNT-001, CNT-002, CNT-003):** the top fold is now
  tagline -> what/who -> Quick start (install + `/god-mode`) -> inline glossary
  -> why it exists; version-history prose moved to a one-line CHANGELOG/RELEASE
  pointer; dense proof prose became a scannable list.
- **Command descriptions (IA-003):** the worst offenders lead with the
  user-intent verb (`/god-smite` -> "Clear the dependency cache"; `/god-org-context`
  -> "Set up or read organization-level context"); the `/god-reconcile` (before,
  read-only) vs `/god-sync` (after, write-back) overlap is disambiguated.
- **Resume clarity (JRN-001):** the README states that plain `/god-mode` resumes
  from disk (no `--yolo` needed) and distinguishes `/god-resume-work`; the
  generated CHECKPOINT new-session block names the canonical arc-resume command.
- **Trust claims (TRU-001, TRU-002):** SECURITY.md softens the 7/14-day SLA to
  best-effort targets; the runtime headline no longer implies 15-way parity and
  points to the honest Runtime Expectations table.

## [3.13.2] - 2026-06-17

Maintenance release that drives a third self-audit (`codeaudit.md`) to zero: one
Medium and twelve Low findings across de-duplication, error handling, security
hardening, the test gate, and docs. No public command/agent/workflow/recipe
surface change (counts stay 120 / 40 / 13 / 44); lib module count 90 -> 91.

### Changed
- **Shared sync check-builder (ARC-001):** the four `*-sync` modules no longer
  copy-paste `addCheck`/`listFiles`; they share `lib/sync-check.js` (full
  `addCheck` for the aggregator, area-bound `makeAddCheck` for the rest).
- **Per-file coverage floor (TEST-001):** `coverage:lib` now emits a json-summary
  and `scripts/check-per-file-coverage.js` (in `release:check`) fails any lib
  module below 70% lines (excluding the two environment-bound browser drivers),
  so a single file can no longer rot while the aggregate stays green.
- **De-duplication and cleanup (QUAL-001/002/003):** removed dead helpers
  (two unused `rel()`, an unused `sha`), added `sync-fs.readTextOrNull` adopted by
  `requirements.js` (which now sources PRD/ROADMAP paths from `artifact-map`), and
  fixed a boolean/string status wart in `repo-surface-sync`.
- **Pillars delineation (ARC-002):** `pillars.js` now has section dividers
  separating the model and artifact-sync halves (a full split was deferred; the
  halves share construction functions that are public API).

### Fixed
- **Reverse-sync error visibility (ERR-001):** the requirements step now writes
  state before the ledger and surfaces a caught error as `requirementsError`
  instead of silently nulling it.

### Security
- **MCP module-name guard (SEC-001):** `requireRuntime` rejects any name that is
  not a plain lib basename (defense-in-depth).
- **YAML recursion cap (SEC-002):** `intent.cleanArrays` caps recursion depth so a
  pathologically deep file cannot overflow the stack.

### Performance
- **have-nots regex (PERF-001):** `findPositions` compiles its regex once instead
  of per line. The whole-ledger read in `evidence.readJsonl` is documented as
  bounded/acceptable with an opt-in prune noted for the future (PERF-002).

### Docs
- **Absolute README doc links (DOC-001):** `docs/` is deliberately excluded from
  the package, so the README's `docs/*` links are now absolute GitHub URLs that
  resolve on the npm page and in the tarball.

## [3.13.1] - 2026-06-16

Maintenance release that drives a full self-audit (`codeaudit.md`) to zero: one
High finding, plus the Medium and Low findings, fixed across runtime correctness,
security hardening, the test gate, documentation, and de-duplication. No public
command, agent, workflow, or recipe surface changes (counts stay 120 / 40 / 13 / 44).

### Fixed
- **Ledger record loss under concurrency (ERR-001):** `lib/evidence.js`
  `appendJsonlAtomic` did a read-modify-write of the whole ledger, so two
  concurrent `verify`/`outcome check` processes lost each other's records and
  every append was O(n). It now uses `fs.appendFileSync` (O_APPEND), mirroring
  `lib/events.js`; a concurrency regression test asserts 8 writers x 25 records
  all survive.
- **Buffer-overflow verdicts (ERR-003):** a `maxBuffer` (ENOBUFS) overflow was
  recorded as a plain command failure; it is now surfaced distinctly. The 16 MB
  cap is the named constant `MAX_OUTPUT_BYTES`.
- **Doc accuracy:** `SECURITY.md` no longer recommends the non-existent
  `npm install --verify` (use `npm audit signatures`); the stale
  `ARCHITECTURE-MAP.md` counts are regenerated and now machine-guarded.

### Security
- **Advisory hook (SEC-001):** `hooks/pre-tool-use.sh` is reframed as a
  best-effort typo guard (not a security boundary) and now normalizes whitespace
  and matches common destructive-command variants (`rm -fr`, `-r -f`, `./`
  prefix, `git push -f`/`--force-with-lease`). Covered by `scripts/test-hooks.js`.
- **Disk-sourced verifier (SEC-002):** `outcome check` now announces the verifier
  command and its `goal.json` source path before executing, so running it in an
  untrusted cloned repo cannot silently run a planted command.
- **Ledger secrets (SEC-003):** the human-readable `LEDGER-LOG.md` command echo
  masks obvious secret shapes; `SECURITY.md` documents that `.godpowers/ledger/`
  may capture command output.
- **Codex sandbox (SEC-004):** `SECURITY.md` documents the Codex
  `sandbox_mode = "workspace-write"` install default.

### Changed
- **Test gate (TEST-001/002/003):** `coverage:lib` now enforces `--branches 75`;
  new `scripts/test-runtime-audit.js` raises `runtime-audit.js` line coverage
  68.8% -> 77.8%; `scripts/test-router.js` no longer shares cumulative state and
  cleans up its temp dirs.
- **De-duplication (ARC-001/002, QUAL-001/002):** the five `*-sync` modules share
  `lib/sync-fs.js`; the ANSI logger moves to `lib/cli-log.js` and `slugify` to
  `lib/text-util.js`; `installer-args.parseArgs` is now table-driven (was a
  358-line function); `state.STATE_FILE` is the canonical state-file constant and
  `artifact-map.js`'s scope is documented accurately.
- **Re-audit follow-ups (ARC-003, QUAL-003, DOC-004/005, ERR-004, TEST-005):** a
  fresh self-audit of the above confirmed no regressions and closed the residual
  gaps: `installer-core.js` now imports the shared logger; `dashboard.js`/
  `planning-systems.js` use `sync-fs`; the `lib/README` module catalog is complete
  and guarded by a completeness check; the corrupt-state error is typed
  (`err.code = 'CORRUPT_STATE'`) instead of message-matched; and the hook tests
  assert each warning's text, not just its exit code.

## [3.13.0] - 2026-06-16

### Changed
- The default greenfield workflow (`full-arc`, run by `/god-mode`) now runs two
  more steps so the one-shot product ships audited and documented. A `code-audit`
  job (`god-debt-assessor`) runs after the build and before deploy/harden, giving
  the whole AI-generated codebase a scored audit that catches what the per-slice
  reviews could not see across files. A `docs` job (`god-docs-writer`) runs after
  harden and before launch, writing the project documentation and verifying every
  claim against the code (drift detected) before the product ships. `deploy` and
  `harden` now need `code-audit`; `launch` now needs `docs`. The plan goes from
  11 to 13 steps. No new skill, agent, workflow, or recipe surface: both jobs
  reuse agents that already exist.
- `GOD-ORCHESTRATOR-RUNBOOK` documents the new audit and docs positions in the
  greenfield arc.

## [3.12.1] - 2026-06-16

### Changed
- De-duplicated the audit lanes in `god-debt-assessor`. Its Security dimension
  now defers to `god-harden-auditor`: when `.godpowers/harden/FINDINGS.md`
  exists, score Security from harden's verdict and cite its finding IDs instead
  of re-running the OWASP walkthrough, recording a security finding only for
  something harden did not cover. Its Code Quality dimension is explicitly the
  whole-repo point-in-time read that complements, not duplicates,
  `god-quality-reviewer`'s per-slice diff review.

## [3.12.0] - 2026-06-16

### Changed
- Upgraded `god-debt-assessor` (`/god-tech-debt`) to a codeauditor-grade,
  read-only source-code audit: nine weighted dimensions scored 0-100 with grade
  bands and risk-capping, per-finding Severity/Confidence/Effort, adversarial
  verification with Suspected marking, paper-construct/theater hunting,
  root-not-leaves systemic clustering, a strengths-to-preserve section,
  calibration to maturity, a file:line + substitution evidence gate, and a
  self-contained "how to use this report" protocol for an acting agent. Keeps
  Godpowers' broader operational/knowledge debt categories as extra lenses.
  Output stays `.godpowers/tech-debt/REPORT.md`.

### Added
- Added the audit-remediation loop: a new `audit-remediate` recipe routes
  "audit and fix until clean" intent, and a `GOD-ORCHESTRATOR-RUNBOOK` section
  defines the bounded drive-to-zero loop (audit, select worst-first, fix with
  `god-debugger`, verify with an independent reviewer, bound the retries with
  `evidence.outcome`, re-audit until no Confirmed Critical/High remains). The
  can't-fake-done gate makes "clean" an evidence-backed re-audit; un-fixable
  findings pause as precise blockers instead of silent skips.

### Notes
- No new skill or agent (god-debt-assessor enhanced in place). Recipe surface
  count moves 43 to 44. The audit-remediation loop is opt-in (intent/recipe or
  an end-of-arc pass); it is not wired into the default greenfield `full-arc`.

## [3.11.0] - 2026-06-15

### Added
- Added `lib/evidence-import.js` and the `npx godpowers import-ledger [--from
  <path>]` CLI: a one-time, best-effort importer that copies an existing Mythify
  `.mythify/` ledger into `.godpowers/ledger/` (verifications rebinding
  plan/step to arc/substep, reflections, memory merged by key, lessons, and
  outcomes). Records are appended; no state rollup and no gate events.
- Exported `readJsonl` and `appendJsonlAtomic` from `lib/evidence.js` for reuse.

### Notes
- This is the final item in `docs/FUSION-ARCHITECTURE.md`. With it, the native
  fusion of Mythify's evidence engine and quarterback into Godpowers (Phases 0-3
  plus the optional importer) is complete.

## [3.10.0] - 2026-06-15

### Added
- Added three read-only MCP tools to `@godpowers/mcp` (Phase 3, the final fusion
  slice): `work_report` (wraps `lib/work-report.js`, forced peek so it never
  advances the cursor), `route` (wraps `lib/quarterback.js`, never mutates
  state), and `verification_history` (wraps `lib/evidence.js` history). All
  carry `readOnlyHint:true` via the same `requireRuntime` bridge. The companion
  now exposes eight read-only tools.

### Notes
- This release completes the native fusion of Mythify's evidence engine and
  quarterback into Godpowers across Phases 0-3 (`docs/FUSION-ARCHITECTURE.md`):
  the evidence producer, enforced close-on-evidence on the build and harden
  gates, the quarterback entry router, the work report, reflections, memory,
  lessons, outcome loops, and now the MCP read tools. Mutating verification stays
  on the CLI and orchestrator path.

## [3.9.0] - 2026-06-15

### Added
- Added `evidence.outcome.start/check/stop/status` (Phase 3), rebound from
  Mythify's `outcomes/<slug>/` store: a bounded retry loop with `goal.json` and
  `iterations.jsonl` at `.godpowers/ledger/outcomes/<slug>/`. `check` runs the
  verifier through `evidence.verify` (so the executed verdict is also written to
  the main verifications ledger and rolled up), appends an iteration, and marks
  the outcome succeeded, failed when the budget is exhausted, or still active.
- Added the `npx godpowers outcome start|check|stop|status <name> [--goal ...]
  [--verify "<cmd>"] [--budget N] [--substep <id>] [--reason ...]` CLI subcommand.

### Notes
- Outcome state lives under the ledger; `check` is the only path that mutates
  shared state, and it does so through the existing `evidence.verify` rollup. No
  existing command behavior changed.

## [3.8.0] - 2026-06-15

### Added
- Added `evidence.lesson.add/list` (Phase 3), rebound from Mythify's lessons
  store: append tagged lessons with project or global scope to
  `.godpowers/ledger/lessons.jsonl` (or `~/.godpowers/lessons.jsonl` for global).
- Added the `npx godpowers lesson add|list "<lesson>" [--tags a,b] [--scope
  project|global]` CLI subcommand.

### Changed
- `evidence.reflect()` now auto-records a project lesson tagged `auto-reflected`
  when a reflection carries a lesson, matching the upstream reflect tool. The
  reflection record itself is unchanged.

### Notes
- The lessons store is isolated: it never touches `state.json`, the
  verifications ledger, or the event stream.

## [3.7.0] - 2026-06-15

### Added
- Added `evidence.memory.set/get/list/clear` (Phase 3), rebound from Mythify's
  memory.json: a durable key/value store with categories fact, decision,
  discovery, and state at `.godpowers/ledger/memory.json`. `set` upserts by key
  and defaults the category to fact; `clear` removes one key or all entries;
  writes go through `lib/atomic-write.js`.
- Added the `npx godpowers memory set|get|list|clear [<key>] [<value>]
  [--category ...]` CLI subcommand.

### Notes
- The memory store is isolated: it never touches `state.json`, the verifications
  ledger, or the event stream. No existing command behavior changed.

## [3.6.0] - 2026-06-15

### Added
- Added `evidence.reflect()` and `evidence.reflections()` (Phase 3), rebound from
  Mythify's reflect tool: record action, outcome (success/partial/failure),
  observation, root cause, next action, and an optional lesson to
  `.godpowers/ledger/reflections.jsonl` with substep context.
- Added the `npx godpowers reflect --action "<...>" --outcome <...> --next "<...>"`
  CLI subcommand (`--observation`, `--root-cause`, `--lesson`, `--substep`
  optional).

### Changed
- Generalized the ledger jsonl append/read into shared `appendJsonlAtomic` and
  `readJsonl` helpers in `lib/evidence.js` so verifications and reflections share
  one atomic path. No change to the verifications record shape or behavior.

### Notes
- `reflect` is isolated: it never touches `state.json`, the verifications ledger,
  or the event stream. No existing command behavior changed.

## [3.5.0] - 2026-06-15

### Added
- Added `lib/work-report.js`, the chat play-by-play (Phase 3) rebound from
  Mythify's build_work_report. It reads the evidence ledger, surfaces an
  Attention section for unverified records, summarizes passed/failed/attested,
  and advances a report cursor at `.godpowers/ledger/reports/cursor.json` so a
  fresh session emits only what is new.
- Added the read-only `npx godpowers report --since last` CLI subcommand
  (`--since all` for full history, `--peek` to show without advancing the
  cursor).

### Notes
- `report` is read-only beyond the report cursor and never mutates `state.json`;
  no existing command behavior changed. This is the first Phase 3 slice; outcome
  loops, memory, lessons, reflections, and MCP read tools remain to come.

## [3.4.0] - 2026-06-15

### Added
- Added `lib/quarterback.js`, the entry-level two-layer router (Phase 2 of the
  fusion design). It composes `router.suggestNext` and `recipes.matchIntent` and
  adds the two genes Godpowers lacked at entry: refuse-on-red (never start new
  work when the latest executed verdict is red or harden findings carry an
  unresolved Critical) and proportional ceremony (a one-line fix routes to
  `/god-fast`, not an arc). The priority ladder is recover, resume, recovery,
  brownfield, research, review, full, feature, trivial; first match wins.
- Added the read-only `npx godpowers route "<prompt>"` CLI subcommand, which
  returns the chosen play with its next command, ceremony level, verification
  strategy, and an evidence block (classification, latest verdict, active arc,
  open findings). `route` never mutates state.

### Notes
- `route` is read-only and additive; no existing command behavior changed. The
  quarterback reads the evidence ledger and harden findings to decide refuse-on-red.

## [3.3.0] - 2026-06-15

### Added
- Added the `npx godpowers can-close --substep <id>` CLI subcommand, a read-only
  face over `evidence.canClose`. It exits zero only when the substep has the
  evidence to close (executable-gated tiers need a passing executed record since
  they went in-flight; other tiers accept an attested record), so skills and the
  orchestrator can shell into the strict close gate the way they already shell
  `gate` and `state advance`.

### Changed
- Wired the `GOD-ORCHESTRATOR-RUNBOOK` close loop to record executed evidence and
  confirm `can-close` is green before advancing an executable-gated sub-step to
  done. This completes the orchestrator side of the Phase 1 close-on-evidence
  path (`docs/FUSION-ARCHITECTURE.md`). No existing command behavior changed; the
  CLI addition is additive and the runbook change is prompt-level guidance.

## [3.2.0] - 2026-06-15

### Changed
- BEHAVIOR CHANGE: the `harden` gate now requires executed verification
  evidence. `lib/gate.js`'s build-only executed-evidence requirement is
  generalized to every executable-gated tier, driven by
  `evidence.EXECUTED_REQUIRED_SUBSTEPS` (`build`, `deploy`, `harden`). The
  harden gate now requires at least one passed and zero failed verification
  commands in `state.json` `verification.commands[]`, in addition to its
  no-Critical-findings check. A security tier can no longer close "done" without
  an exit-code-backed passing record. Finding ids are tier-prefixed, so the
  build tier keeps its `build-verification-*` contract and harden gains
  `harden-verification-*`.
- Updated the `god-harden` skill to record the executed security check
  (for example `npx godpowers verify "npm audit --omit=dev" --substep
  tier-3.harden`) before running the harden gate.

### Added
- Added the `tier-3.harden` state-step mapping in `lib/artifact-map.js` so the
  harden gate reads structured state evidence (matching `build`).

### Notes
- This is the first enforced close-on-evidence behavior change from the Phase 1
  fusion design (`docs/FUSION-ARCHITECTURE.md`). Projects that closed a harden
  step without a verification record must now run `godpowers verify` (or record
  an attested record where no executable check applies) before the harden gate
  passes. The build gate behavior is unchanged.

## [3.1.1] - 2026-06-15

### Added
- Added `evidence.canClose(substep)` to `lib/evidence.js`, the read-only strict
  close-gate primitive rebound from Mythify's completion rule: a substep may
  close only when evidence bound to it since it went in-flight supports the
  close. Tier-appropriate per `docs/FUSION-ARCHITECTURE.md` section 4.2:
  `build`/`deploy`/`harden` require the latest executed record to be
  `verified:true`; other substeps accept an executed pass or an attested record,
  and a failed executed record always blocks.

### Notes
- `canClose` is additive and read-only. It does not mutate state and is not yet
  wired into `gate.js` or the close path; wiring it in (the deliberate
  behavior change) is the remaining Phase 1 work tracked in
  `docs/FUSION-ARCHITECTURE.md`. No existing behavior changed in this release.

## [3.1.0] - 2026-06-15

### Added
- Added the evidence producer in `lib/evidence.js`, vendored from the Mythify
  Node engine (`mythify-mcp@3.6.3`, `verify_run`/`verify_claim`). `evidence.verify()`
  executes a command, appends an exit-code-backed record to the new append-only
  `.godpowers/ledger/verifications.jsonl`, rolls the latest verdict per command
  into `state.json` `verification.commands[]` through `lib/state.js`, and emits
  `gate.pass`/`gate.fail` to the hash-chained `runs/<id>/events.jsonl` stream.
  `evidence.verifyClaim()` records a second-class attested record that never
  rolls up.
- Added the `npx godpowers verify "<cmd>" --substep <id> --claim "<text>"` CLI
  subcommand (with `--timeout`, and `--attest`/`--evidence` for attestations),
  wired through `lib/cli-dispatch.js`.
- Added `lib/evidence/.provenance.json` recording the vendored engine's source,
  version, commit, and adaptations, plus `scripts/sync-evidence-engine.js` to
  re-pull the upstream engine, re-state the adaptations, and flag any upstream
  record-shape drift for review.
- Added `docs/FUSION-ARCHITECTURE.md`, the canonical design for transplanting
  Mythify's evidence engine and quarterback into Godpowers (Phases 0-3; this
  release lands Phase 0).

### Changed
- `state.json` `verification.commands[]` is now reliably populated by the
  evidence producer (previously specified in the schema but never written).
  This is additive: the build gate reads the same shape, no gate behavior or
  close-on-evidence logic changed (that is Phase 1).

## [3.0.2] - 2026-06-11

### Added
- Added `/god-first-run`, `/god-demo`, and `/god-surface` as concierge
  entry points for onboarding, sandbox proof, and post-install surface control.
- Added the `try-safely` recipe for users who want a proof path before
  touching their current project.
- Added `godpowers demo` and `godpowers surface` CLI helpers, including
  dry-run and apply flows for runtime profile changes.

### Changed
- Changed default command guidance from catalog-first and dashboard-first
  output to compact recommendations with `Next commands:` blocks.
- Updated `/god-help`, `/god`, `/god-next`, `/god-status`, and shared
  dashboard contracts so full catalogs and full dashboards are opt-in.
- Updated README, roadmap, reference, release notes, architecture, and Pillar
  context counts for the 120-command and 43-recipe public surface.

### Fixed
- Added package, routing, installer-profile, command-family, quick-proof, and
  surface-profile tests for the new concierge surface.
- Refreshed repo documentation sync and repo surface sync evidence after the
  new surface landed.

## [3.0.1] - 2026-06-11

### Changed
- Updated README, roadmap, reference, MCP, architecture, release checklist, and
  release notes for the 3.0.1 patch release.
- Bumped `godpowers` and `@godpowers/mcp` package metadata to 3.0.1.
- Clarified that `npm run lint` is a separate release-sensitive check rather
  than part of `npm run release:check`.

### Fixed
- Fixed architecture extension compatibility examples to match shipped
  first-party pack compatibility ranges.
- Added quick proof regression coverage for adoption canary and published
  install verification documentation links.

### Removed
- Removed the completed migration planning file from the public documentation
  tree.

## [3.0.0] - 2026-06-10

### Added
- Added `/god-plan`, `/god-fix`, `/god-ship`, `/god-capture`, and
  `/god-extend` as thin verb dispatchers over existing leaf commands.
- Added routing metadata for the new verb dispatchers so repository surface
  checks keep skills and routes aligned.

### Changed
- Changed the omitted installer profile default from `full` to `core`.
- Updated the `core` profile to install the front door, status, verb
  dispatchers, and `/god-mode` compatibility while preserving every command in
  `--profile=full`.
- Routed `/god-observe` through the `ship` verb boundary based on Phase 2 host
  proof evidence.
- Updated public docs, profile tests, command-family tests, and Phase 5
  surface evidence for the 120-command surface.

### Deprecated
- Deprecated `/god-locate` in favor of `/god-status --locate`.
- Deprecated `/god-lifecycle` in favor of `/god-status --lifecycle`.
- Added `successor` metadata to deprecated compatibility commands.

## [2.7.0] - 2026-06-10

### Added
- Added `godpowers state advance --step=<step> --status=<status> --project=.`
  as a locked state mutation helper that updates `.godpowers/state.json` and
  regenerates managed state views.
- Added generated checksummed state views for Godpowers-owned design, build,
  deploy, observe, and launch `STATE.md` files, all sourced from
  `.godpowers/state.json`.

### Changed
- Changed route prerequisites, executable gates, workflow handoffs, command
  prompts, and specialist agent contracts so Godpowers decision reads use
  `.godpowers/state.json` instead of generated markdown state views.
- Changed tier completion instructions to use `godpowers state advance` or an
  owning command wrapper instead of direct edits to `.godpowers/PROGRESS.md`.

### Fixed
- Fixed state-view drift by regenerating `.godpowers/PROGRESS.md` and
  Godpowers-owned per-tier `STATE.md` files after state mutations and replacing
  tampered managed fences on the next mutation.

## [2.6.0] - 2026-06-10

### Added
- Added the `@godpowers/mcp` companion package with read-only MCP tools for
  status, next, gate checks, artifact linting, and requirement tracing.
- Added `godpowers mcp-info --project=.` as a read-only main-package helper
  that prints setup instructions without loading the MCP SDK.
- Added MCP protocol tests that spawn the companion server over stdio, list
  tools, and call each tool against the quick-proof fixture.

### Changed
- Updated dashboard and quick-proof host guarantee output to include MCP
  availability.
- Updated `/god-status` and `/god-next` to prefer MCP tools when available and
  fall back to CLI or runtime modules otherwise.
- Updated release checks to verify the companion package protocol and package
  contents while keeping the main `godpowers` package dependency-free.

## [2.5.2] - 2026-06-10

### Added
- Added regression coverage proving an installed `godpowers-runtime` bundle can
  be used as a local npm package for `godpowers gate`.
- Added regression coverage proving build gates fail when build state records a
  failed verification command.

### Fixed
- Fixed installed runtime bundles so `godpowers-runtime` includes `bin/` next
  to `package.json`, allowing host workflows to call the documented
  `godpowers gate` command from the installed runtime package.
- Fixed the build gate so `.godpowers/build/STATE.md` fails closed when any
  verification command is recorded as failed, instead of passing because a
  different command passed.

## [2.5.1] - 2026-06-10

### Added
- Added three Codex host-run proof case studies for slugify-cli, Countdown, and
  react-github-readme-button.
- Added Phase 2 proof evidence for successful CLI and web app runs plus one
  blocked harden run with Critical dev-tooling findings preserved as a public
  blocker.

### Changed
- Updated USERS, README, roadmap, reference, architecture, release notes, and
  migration status for the Phase 2 host proof campaign.

## [2.5.0] - 2026-06-10

### Added
- Added `npx godpowers gate --tier=<tier> --project=.` for PRD, design,
  architecture, roadmap, stack, repo, build, and harden tier gates.
- Added `lib/artifact-map.js`, `lib/gate.js`, and `lib/cli-dispatch.js` so
  artifact paths, executable gates, and CLI command dispatch are tested outside
  the installer binary.
- Added gate fixtures and tests for green tier artifacts, missing artifacts,
  lint failures, harden Critical findings, build verification evidence, JSON
  shape stability, async API coverage, and CLI exit codes.

### Changed
- Updated eight tier skills and their routing metadata to require the
  executable gate before downstream work proceeds.
- Updated `/god-mode` and its runbook to run executable gates between tier
  transitions.
- Updated static checks and route-quality sync so missing gate instructions and
  missing `standards.gate-command` metadata block release readiness.

## [2.4.3] - 2026-06-09

### Added
- Added three external CLI adoption canary case studies for sindresorhus/is,
  expressjs/cors, and tinyhttp/tinyhttp with commit hashes, elapsed time,
  zero-dollar local CLI cost, pause counts, and explicit host-run gaps.
- Added a shared Godpowers Dashboard contract and shared locking contract under
  `references/shared/`.
- Added detailed runbook references for `god-orchestrator` and `/god-next`.
- Added CLI dispatch tests for status, next, quick-proof, automation, dogfood,
  extension scaffold, and unknown-command branches.
- Added `npm run coverage:lib`, enforcing a 90 percent line coverage floor for
  `lib/**/*.js` through c8.

### Changed
- Slimmed `agents/god-orchestrator.md`, `skills/god-next.md`, and
  `skills/god-status.md` into concise dispatch contracts that delegate
  long-form operational detail to references.
- Replaced repeated skill locking boilerplate with one-line pointers to the
  shared locking reference.
- Updated `npm run release:check` to run the full suite under the lib coverage
  floor before audit and package checks.
- Updated package verification to pack into a temporary directory and clean the
  generated tarball automatically.
- Marked `/god-roadmap-check` deprecated, removed it from the command-family
  presentation, and locked non-full install profiles against installing it.

### Fixed
- Removed ignored root tarball and `.DS_Store` clutter before release.

## [2.4.2] - 2026-06-09

### Added
- Added strict YAML diagnostics for the dependency-free parser, covering
  skipped malformed lines, unsafe prototype-pollution keys, and legacy empty
  array shorthand.
- Added shared markdown frontmatter parsing through `lib/frontmatter.js` and a
  static check that blocks new inline parser drift.
- Added dev-only coverage tooling through `c8` and `npm run coverage`.

### Changed
- Routing, recipe, and workflow loaders now surface strict YAML warnings with
  file and line context.
- Installer metadata, Pillars, skill validation, agent validation, checkpoint
  reads, context budgets, skill surface metadata, and DESIGN.md parsing now use
  the shared frontmatter helper.

### Fixed
- Extension manifests now fail closed on malformed YAML lines and unsafe keys
  instead of accepting partially parsed manifests.
- Removed stale root tarballs and `.DS_Store` package clutter before release.

## [2.4.1] - 2026-06-08

### Added
- Added adoption-proof outcome metrics for Quick Proof and Adoption Canary
  reports, covering commands to first signal, disk-state source, missing
  artifacts, next command, host level, and host gaps.
- Added the First 10 Minute Proof case study as a repo-verifiable public proof
  artifact before the first external repository canary.

### Changed
- Updated README and Getting Started to lead with `--profile=core` and the
  brief Quick Proof path before full autonomy.
- Updated Quick Proof, Adoption Canary, Reference, Roadmap, and Proof
  Transcript docs to separate observable adoption evidence from broader product
  claims.
- Added surface-discipline guidance so new public commands require adoption
  evidence before expanding the command surface.

### Fixed
- Package guardrails now require the adoption metrics runtime helper so the
  published package keeps Quick Proof and canary metrics available.

## [2.4.0] - 2026-06-08

### Added
- Added command-family UX metadata for start, continue, build, verify,
  operate, maintain, capture, recover, extend, collaborate, and configure
  while keeping every shipped leaf command available.
- Added capture, work-size, verification, status-view, and trigger-precedence
  helpers in `lib/command-families.js`.
- Added typed route outcome metadata for contextual, verdict-based,
  steady-state, session-end, and selection-based route exits.
- Added workflow helper groups with serialized plan expansion so closeout
  helpers can be consolidated without hiding local runtime work.

### Changed
- Updated `/god`, `/god-help`, `/god-next`, `/god-status`, README,
  reference docs, recipes, architecture docs, command-flow docs, and
  auto-invoke visibility docs to present the consolidated UX paths.
- Updated all shipped command routes with command family metadata.
- Updated repeated workflow closeout helper lists to named helper groups while
  preserving explicit expanded helpers in generated plans.
- Updated extension recipe copy to describe current extension-pack-required
  flows instead of old release annotations.

### Fixed
- Route-quality sync now requires typed outcomes for flexible route exits
  instead of accepting unexplained placeholder next routes.
- The full-arc e2e smoke test now verifies both helper groups and expanded
  local helper visibility.

## [2.3.1] - 2026-06-08

### Added
- Added `/god-extension-scaffold` as the slash-command entry point for
  extension pack authoring, with routing metadata, installer profile coverage,
  package payload checks, and front-door recipe coverage.
- Added code-intelligence host capability detection for optional `ast-grep`,
  `sg`, and LSP tooling without downgrading baseline host guarantees when those
  tools are absent.
- Added public starter-path regression checks that verify README and Quick
  Proof goal labels resolve through shipped `/god` recipes and routes.

### Changed
- Updated public surface counts to 120 slash commands and 43 intent recipes
  across release notes, reference docs, architecture maps, package metadata,
  and project Pillars.
- Tightened public front-door recipe matching for starter phrases including
  "start a product", "add a feature", "fix production", "maintain health",
  "audit an existing repo", "ship a release", and extension authoring.
- Aligned the brownfield onboarding recipe to audit reconstructed artifacts
  before tech-debt prioritization.

### Fixed
- Prevented maintainer-repository documentation drift from leaking into normal
  user project dashboards.
- Corrected Quick Proof output so fixture-backed checks render
  `--project=.` for the user project path.
- Hardened extension install, planning-system detection, and agent-cache cleanup
  around symlinked directories that point outside the trusted source tree.
- Removed phantom `god-*` examples from the extension scaffold skill prose so
  agent-reference validation stays clean.

## [2.3.0] - 2026-05-30

### Added
- Added source-grounded planning helpers so build plans can name existing files,
  existing symbols, planned new artifacts, and unchecked references before
  execution begins.
- Added package legitimacy checks for package-backed stack and dependency
  replacement decisions, covering npm existence, typo risk, staleness, and
  repository metadata.
- Added role-based installer profiles (`core`, `builder`, `maintainer`,
  `suite`, and `full`) plus `--minimal` as a compact alias for the core
  surface.
- Added atomic file-write helpers and wired them into state, checkpoint,
  requirements, linkage, source-sync, reverse-sync, and async filesystem
  persistence paths.
- Added executor repair classification for retry, decomposition, pruning, and
  escalation so failed implementation attempts leave clearer next actions.

### Changed
- Debranded legacy planning-system wording across public docs, runtime
  detection, fixtures, tests, and sync-back surfaces to keep Godpowers distinct
  from external workflow products.
- Build, executor, planner, spec-reviewer, stack-selector, and dependency
  auditor contracts now require source grounding or package legitimacy evidence
  where those checks apply.

## [2.2.1] - 2026-05-30

### Fixed
- Made `.godpowers/REQUIREMENTS.md` stable on no-op regenerations by ignoring
  generated timestamp-only changes and removing the extra blank line at EOF.
- Persisted reverse-sync deliverable summaries into `state.json.deliverables`,
  matching the documented `/god-sync` and reverse-sync behavior.
- Reconciled the Godpowers self-ledger so the shipped deliverable-progress
  feature is marked done in `.godpowers/roadmap/ROADMAP.md`,
  `.godpowers/REQUIREMENTS.md`, and `.godpowers/state.json`.

## [2.2.0] - 2026-05-30

### Added
- Deliverable progress tracking, so a project run always communicates which
  requirements are finished, which are in flight, and which are untouched:
  - `/god-progress` reports requirement and roadmap-increment status (done / in
    progress / not started, grouped by increment and priority) and refreshes a
    human-readable `.godpowers/REQUIREMENTS.md` checklist the user can open or
    share.
  - Status is derived from disk by `lib/requirements.js` (PRD requirements +
    ROADMAP increments + the linkage map + build state), so it cannot drift from
    what is actually implemented.
  - The Godpowers Dashboard (`/god-status`, `/god-next`, `/god-mode` closeout)
    gains a `Deliverable progress` section, and `/god-mode` build steps report
    requirement completion as it happens.
  - PRD functional requirements now carry stable ids (`P-MUST-NN` /
    `P-SHOULD-NN` / `P-COULD-NN`) and ROADMAP delivery increments carry
    `M-slug` ids with a per-increment `Status` and the requirement ids they
    deliver, so requirements map to increments and to implementing code.
  - `reverse-sync` and `/god-sync` refresh the ledger and cache the summary in
    `state.json.deliverables` whenever the linkage map changes.
- A `whats-done` intent recipe so phrases like "how far along are we" and
  "what's done" route to `/god-progress`.
- A reconstructed self-ledger for Godpowers itself (`.godpowers/prd/PRD.md`,
  `.godpowers/roadmap/ROADMAP.md`, `.godpowers/REQUIREMENTS.md`) via
  `scripts/reconstruct-self-ledger.js`, so the project dogfoods its own
  deliverable tracking.
- `deliverable-progress-tracking` registered in the feature-awareness set so
  existing projects learn about `/god-progress` on the next refresh.

### Changed
- Build agents thread requirement ids end to end: `god-planner` names the
  requirement ids each slice delivers and `god-executor` stamps
  `// Implements: P-...` annotations into code, which the reviewers now verify,
  so the linkage map (and therefore the ledger) populates during real builds.
- Sibling agents that produce or consume the PRD and ROADMAP
  (`god-reconstructor`, `god-roadmap-updater`, `god-roadmap-reconciler`,
  `god-greenfieldifier`, and others) now preserve stable requirement and
  increment ids and refresh the ledger.
- Reconciled documentation surface counts and version references to v2.2.0
  (111 slash commands, 41 recipes) and added `/god-progress` and
  `REQUIREMENTS.md` to command lists, artifact inventories, and the linkage doc.

## [2.1.1] - 2026-05-30

### Changed
- The context off-switch now empties the canonical `AGENTS.md` instead of
  deleting it; auto-generated pointer files (`CLAUDE.md`, `.cursorrules`, etc.)
  are still removed when only the Godpowers fence remains
  (`lib/context-writer.js`).

### Fixed
- Documentation: dropped unverifiable external impeccable rule/finding counts;
  reconciled the project-mode taxonomy (A/B/C/E primary modes, with D as the
  orthogonal multi-repo suite overlay) in `concepts.md` and `ROADMAP.md`;
  documented all `lib/` modules in `lib/README.md`; and clarified how the
  artifact-category counts relate in `greenfield-coverage.md`.

## [2.1.0] - 2026-05-30

### Security
- Fixed a command-injection vector in `lib/agent-browser-driver.js`: CLI
  arguments are now passed as an argv array with the shell disabled
  (`execFileSync`), so URLs, selectors, and eval expressions sourced from
  project content (`PRD.md`/`DESIGN.md`) or CLI flags can no longer be
  interpreted as shell syntax.
- Added prototype-pollution guards to the `intent.yaml`/manifest parser
  (`lib/intent.js`) and the router state-path reader (`lib/router.js`).
- Hardened the non-interactive installer: `npx godpowers` with no target in a
  non-TTY shell now refuses and prints guidance instead of performing a silent
  global install.
- Added path-traversal validation to `extension-scaffold` names
  (`lib/extension-authoring.js`).
- `installer-files.copyRecursive` now only reproduces symlinks that stay within
  the source tree.

### Fixed
- Guarded JSON parsing of `state.json` (`lib/state.js`) and `events.jsonl`
  (`lib/events.js`) against corrupt or partially-written files: a clear,
  actionable error or a skipped torn line instead of an uncaught crash on the
  `status`/`next`/checkpoint paths.
- Corrected the review registry path to `.godpowers/REVIEW-REQUIRED.md`
  (`lib/review-required.js`) so the dashboard and automation count review items,
  and so the off-switch no longer deletes a repo-root file.
- `agent-cache.clear` no longer deletes unparseable entries during a narrow
  (by-agent, expiry, or age) clear (`lib/agent-cache.js`).
- Reconciled documentation drift: JS-module and script counts, the
  `HAVE-NOTS.md` reference tally (now 156), linkage path naming
  (`.godpowers/links/`), phantom command/agent references in skill and agent
  prose, and stale sample output across docs and skills.

### Changed
- Data-directory and runtime-bundle installs are now a clean replace
  (`lib/installer-core.js`), so a version upgrade never leaves behind files that
  no longer ship.
- Documented the state lock's advisory, single-process semantics
  (`lib/state-lock.js`).
- Softened brittle exact-count test assertions (full-arc step/wave counts,
  core workflow count) to floors so valid workflow edits no longer break the
  gate for non-bug reasons.

### Added
- A skill/agent prose reference validator
  (`lib/agent-refs.findUnresolvedProseRefs`) wired into the agent-ref test gate,
  catching phantom `/god-*` and agent references in markdown bodies that the
  workflow `uses:` check cannot see.
- Wired have-not `A-13` (ADR inflation) into the architecture gate
  (`routing/god-arch.yaml`).

## [2.0.3] - 2026-05-26

### Added
- Added async state, intent, and workflow plan APIs as the first supported path
  away from synchronous-only runtime file I/O.
- Added executable workflow agent reference validation so `uses:
  god-agent@range` entries are checked against the current agent contract.
- Added `lib/skill-surface.js` and source-sync tests so individual skill files
  are the source of truth for slash-command metadata.

### Changed
- Migrated test files to the shared test harness and made static checks reject
  new copied harness boilerplate.
- Split installer runtime definitions, argument parsing, and install core logic
  out of `bin/install.js`.
- Moved long-form `/god-mode` operator templates into
  `references/orchestration/GOD-MODE-RUNBOOK.md`.
- Added JSDoc typedef contracts to load-bearing runtime modules.

## [2.0.2] - 2026-05-26

### Added
- Added `scripts/run-tests.js` as the maintained full-suite runner behind
  `npm test`.
- Added `scripts/static-check.js` and `npm run lint` for dependency-free
  JavaScript syntax and release-gate structure checks.
- Added dedicated YAML parser coverage for the supported dependency-free YAML
  subset.

### Changed
- Hardened `lib/intent.parseSimpleYaml` for quoted colons, quoted hashes,
  quoted commas in inline arrays, scalar arrays, object arrays, and folded
  block scalars.
- Moved installer copy helpers into `lib/installer-files.js` and preserved
  symlinks during recursive copies.
- Updated release and repo surface sync detectors to recognize delegated test
  runners instead of requiring every test filename inside `package.json`.
- Tightened budget block removal so only the top-level `budgets` block is
  removed.

### Fixed
- Rejected router `file:` checks that point outside the project root.
- Corrected the `/god-build` repository prerequisite auto-complete route from
  `/god-roadmap` to `/god-repo`.
- Aligned `SKILL.md` frontmatter version with package version `2.0.2`.

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
- Added `fixtures/dogfood/` scenarios for half-migrated legacy planning import,
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
- Added `lib/planning-systems.js` to detect legacy planning, BMAD, and Superpowers
  planning context and convert useful signals into Godpowers prep and seed
  artifacts.
- Added `lib/source-sync.js` to write current Godpowers progress back into
  managed companion files for imported planning systems.
- Added `/god-migrate` as the explicit command for planning-system detection,
  import, sync-back, and specialist escalation when migration evidence is
  ambiguous.
- Added `docs/planning-system-migration.md` with detection signals, import
  mapping, sync-back destinations, conflict rules, and return-path guidance.
- Added behavioral tests for legacy planning, BMAD, Superpowers, imported seed artifacts,
  state recording, and idempotent sync-back.

### Changed
- `/god-init` now auto-invokes planning-system import when legacy planning, BMAD, or
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
- Proposal-style outputs now mirror the clearer legacy planning pattern: implement a small
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
  legacy planning / Superpowers / BMAD import into `IMPORTED-CONTEXT.md`, and direct
  Godpowers repo findings in `INITIAL-FINDINGS.md`.

## [0.15.7] - 2026-05-11

Planning import release. Lets `/god-init` preserve useful context from nearby
planning systems without making those systems authoritative.

### Added
- `/god-init` now detects legacy planning, Superpowers, BMAD, and similar planning context
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
