# Bridge Plan: Code-First Kernel Migration

## Purpose

- [DECISION] Godpowers will migrate from prose-enforced gates to executable enforcement in releasable phases while reusing the existing `lib/` runtime as the kernel.
- [DECISION] Every phase must ship through `npm run release:check`; the migration must not use a long-lived dark branch.
- [DECISION] The markdown skill surface must keep working on all 15 host runtimes while command-capable hosts gain executable gates and MCP-capable hosts gain tool calls.
- [DECISION] The bridge is now scoped as a 10 to 12 part-time week migration for a solo maintainer, with Phase 4 treated as the highest-risk phase.
- [DECISION] No open questions remain in this plan; new uncertainty must be captured as a follow-up issue or replacement proposal.

## Baseline At v2.4.3

- [DECISION] `lib/` is the kernel: `state.js`, `dashboard.js`, `router.js`, `artifact-linter.js`, `have-nots-validator.js`, and `requirements.js` are covered by the 90 percent line ratchet in `coverage:lib`.
- [DECISION] The release gate already runs `coverage:lib` with `--check-coverage --lines 90` through `npm run release:check`.
- [DECISION] `scripts/static-check.js` already enforces that `coverage:lib` remains scoped to `lib/**/*.js` and remains part of `release:check`.
- [DECISION] `scripts/check-package-contents.js` already packs to a temp directory and removes it, so release checks no longer litter the repo root.
- [DECISION] `agents/god-orchestrator.md` is under 5 KB and `skills/god-next.md` is about 3 KB, so the largest two prompt-diet targets are already complete.
- [DECISION] `skills/god-roadmap-check.md` already carries `deprecated: true` frontmatter.
- [DECISION] `scripts/test-cli-dispatch.js` already exists and is registered in `scripts/run-tests.js`.
- [DECISION] Three CLI adoption canary case studies exist under `docs/case-studies/` for tinyhttp, sindresorhus/is, and expressjs/cors, each labeled as CLI-verifiable trust signals only.
- [DECISION] The canary reports record the remaining proof gap: no external host-run `/god-mode`, `/god-init`, or `/god-preflight` case study exists yet.
- [DECISION] Remaining open work at baseline is executable gates, host proof campaign, MCP companion package, one-directional state, surface contraction, locking-block dedup, agent contract frontmatter, and extracted CLI dispatch coverage.

## Phase 1: Executable Gates (target release 2.5.0)

- [DECISION] Define the gate contract before code: input is `--tier` and `--project`, output is JSON `{tier, verdict, artifacts, checks, findings, summary}` plus exit code 0 or 1.
- [DECISION] `artifacts` must be an array because `design` can include root `DESIGN.md`, root `PRODUCT.md`, and `.godpowers/design/STATE.md`.
- [DECISION] `checks` must list each mechanical check by stable id, status, artifact path, and reason so hosts and case studies can quote exact gate behavior.
- [DECISION] Phase 1 gates must run artifact-on-disk checks plus `lib/artifact-linter.js`; they must not call `lib/have-nots-validator.js` separately because the linter already delegates to it.
- [DECISION] Phase 1 may add only narrow tier adapters for required artifact paths, build-state evidence, repo audit evidence, and harden Critical finding detection.
- [DECISION] The `harden` gate must fail when `.godpowers/harden/FINDINGS.md` contains unresolved Critical findings or a blocked launch gate.
- [DECISION] The `build` gate must verify `.godpowers/build/STATE.md` exists and records the exact project verification commands that passed; it must not infer or run arbitrary project commands in Phase 1.
- [DECISION] The `repo` gate must verify `.godpowers/repo/AUDIT.md` exists and passes artifact lint; scaffold CI execution remains the responsibility of `/god-repo` until a later project-command detector exists.
- [DECISION] Extract or add `lib/artifact-map.js` as the shared tier-to-artifact-path source for `lib/dashboard.js`, `lib/gate.js`, and future docs.
- [DECISION] Implement `lib/gate.js` with sync and async APIs so it satisfies the existing async API static-check pattern.
- [DECISION] Extract the CLI command dispatch table from `bin/install.js` into `lib/cli-dispatch.js` before adding the `gate` subcommand, preserving the 350-line installer budget.
- [DECISION] Expand `scripts/test-cli-dispatch.js` after extraction so it covers the new `lib/cli-dispatch.js` module and the `gate` runner.
- [DECISION] Add `scripts/test-gate.js` on the shared harness, registered in `scripts/run-tests.js`.
- [DECISION] `scripts/test-gate.js` must cover green PRD, DESIGN, ARCH, ROADMAP, and STACK cases using existing `examples/` artifacts.
- [DECISION] `scripts/test-gate.js` must add minimal `fixtures/gate/` projects for repo, build, and harden because `examples/` does not currently contain those tier artifacts.
- [DECISION] `scripts/test-gate.js` must cover one red case each for missing artifact, lint failure, harden Critical finding, missing build evidence, JSON shape stability, and CLI exit code.
- [DECISION] Update the eight tier skills (`god-prd`, `god-design`, `god-arch`, `god-roadmap`, `god-stack`, `god-repo`, `god-build`, `god-harden`) so Verification instructs: run `npx godpowers gate --tier=<t> --project=.` and do not proceed on non-zero exit.
- [DECISION] `/god-mode` must run `npx godpowers gate --tier=<t> --project=.` automatically between tier transitions, after each tier skill returns and before starting the downstream tier.
- [DECISION] Routing YAML must gain an explicit `standards.gate-command` field for the eight tier commands, and `scripts/gen-routing.js`, `lib/router.js`, and `lib/route-quality-sync.js` must understand that field.
- [DECISION] Add a static check requiring every tier skill Verification section to reference `godpowers gate`.
- [DECISION] Update `SKILL.md`, `README.md`, `docs/reference.md`, and `docs/quick-proof.md` to document the gate command.
- [DECISION] Exit criteria are green suite, green `coverage:lib`, eight tier skills delegating to `gate`, `/god-mode` calling `gate` between tiers, and route quality checks recognizing `standards.gate-command`.
- [HYPOTHESIS] Phase 1 takes about one week including tests and docs.

### Phase 1 Run Status

- [DECISION] Status: complete on branch `codex/bridge-phase-1-gates-82f0` for the 2026-06-10 automation run.
- [DECISION] Completed work: added `lib/artifact-map.js`, `lib/gate.js`, `lib/cli-dispatch.js`, the `godpowers gate` CLI command, gate tests, CLI dispatch tests, routing metadata, static checks, fixture coverage, and tier skill verification instructions.
- [DECISION] Completed work: updated `/god-mode` orchestration so tier transitions run `npx godpowers gate --tier=<tier> --project=.` before continuing downstream.
- [DECISION] Completed work: updated release artifacts and public docs for version 2.5.0, including `package.json`, `package-lock.json`, `CHANGELOG.md`, `RELEASE.md`, `README.md`, `SKILL.md`, `docs/reference.md`, `docs/quick-proof.md`, `docs/validation.md`, `USERS.md`, `ARCHITECTURE.md`, and `SECURITY.md`.
- [DECISION] Verification result: `npm run test:e2e` passed.
- [DECISION] Verification result: `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: `npm run release:check` passed with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.0, and package contents verified at 534 files.
- [DECISION] Release result: PR #3 merged through the protected GitHub path on 2026-06-10 at merge commit `d19f191802cce7959344284682876747efe5f270`.
- [DECISION] Release result: `v2.5.0` was tagged and pushed to trigger the repository publish workflow.
- [DECISION] Release result: GitHub Publish to npm workflow `27282180092` passed, and npm published `godpowers@2.5.0` with provenance.
- [DECISION] Release result: GitHub release `v2.5.0` was created at `https://github.com/aihxp/godpowers/releases/tag/v2.5.0`.
- [DECISION] Verification result: the 2026-06-10 release follow-up reran `npm run release:check` locally and passed with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.0, and package contents verified at 534 files.
- [DECISION] Verification result: the 2026-06-10 release follow-up ran `npm run verify:published-install` after publish and passed against npm `godpowers@latest`.
- [DECISION] Blockers: no Phase 1 implementation blocker remains.
- [DECISION] Blockers: no Phase 1 release blocker remains.
- [DECISION] Next phase to run is Phase 2: Host Proof Campaign.

## Phase 2: Host Proof Campaign (target release 2.5.x docs patch)

- [DECISION] Phase 2 runs after Phase 1 so the case studies demonstrate enforced gates, and before Phase 5 so surface cuts use evidence.
- [DECISION] The proof campaign uses three repository slots rather than hard-coded repository names because public repository size, license, and suitability can change before the run starts.
- [DECISION] Slot A is a permissively licensed small CLI tool with fewer than 10,000 lines of source and no maintainer relationship.
- [DECISION] Slot B is a permissively licensed web app or app template with a runnable local development workflow and no maintainer relationship.
- [DECISION] Slot C is a half-finished side project supplied by a non-maintainer collaborator or selected from a permissively licensed public repository that already contains incomplete planning or TODO evidence.
- [DECISION] The maintainer must capture exact repository URL, commit SHA, license, and selection rationale in `docs/case-studies/run-a.md`, `run-b.md`, and `run-c.md` before each run begins.
- [DECISION] The recording protocol is taken from the `USERS.md` checklist: wall-clock time, `/god-cost` tokens and dollars, every pause and reason, every gate failure and repair, validation commands and results, host guarantee level, and what shipped or blocked.
- [DECISION] Run `/god-mode` inside an AI coding host on repository A without fixing Godpowers mid-run; defects go to `.godpowers/todos/` and the run continues or aborts honestly.
- [DECISION] Triage defects after each run, fix only blockers, then repeat for repositories B and C.
- [DECISION] A documented failed run is a valid deliverable when the failure is reproduced, logged, and tied to a follow-up issue.
- [DECISION] Record which slash commands each run actually invoked; Phase 5 consumes this usage evidence.
- [DECISION] Update the `USERS.md` track record section and ship a docs patch release after all three case studies exist.
- [DECISION] Exit criteria are three published host-run case studies, captured defect backlog, exact repository identity for each run, and command-usage data on disk.
- [HYPOTHESIS] Phase 2 takes about two weeks including triage between runs.

### Phase 2 Run Status

- [DECISION] Status: in progress on branch `codex/bridge-phase-2-slot-b-host-proof` for the 2026-06-10 Slot B automation run.
- [DECISION] Completed work: loaded `AGENTS.md`, required Pillars, `USERS.md`, `docs/adoption-canary.md`, and the current case-study inventory before changing docs.
- [DECISION] Completed work: selected and verified current repository identities for Slot A, Slot B, and Slot C in `docs/case-studies/run-a.md`, `docs/case-studies/run-b.md`, and `docs/case-studies/run-c.md`.
- [DECISION] Completed work: Slot A is `https://github.com/sindresorhus/slugify-cli.git` at `9d7cc5e95668085d73dd4229d8bb0365f4f32144`, MIT license, with 70 measured JavaScript source lines across `cli.js` and `test.js`.
- [DECISION] Completed work: Slot B is `https://github.com/vitejs/create-vite-app.git` at `7b1c46dab57d14abd5f36941fe867a3d45e7c6af`, MIT license, with `template-react` exposing `dev` and `build` scripts.
- [DECISION] Completed work: Slot C is `https://github.com/tastejs/todomvc.git` at `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`, MIT license, with TODO evidence in `examples/cujo/TODO.md` and `cypress/e2e/spec.cy.js`.
- [DECISION] Completed work: ran the CLI-verifiable canary harness for all three selected repositories and wrote temporary reports under `/tmp/godpowers-phase2/`.
- [DECISION] Completed work: attempted Slot A `/god-mode --brownfield --yolo` through the Codex `god-orchestrator` host subagent.
- [DECISION] Completed work: continued Slot A through the Codex `god-orchestrator` host subagent, constrained to `/tmp/godpowers-phase2/slugify-cli`.
- [DECISION] Completed work: verified existing local-runtime fallback artifacts and subagent closeout artifacts in `/tmp/godpowers-phase2/slugify-cli/.godpowers/`.
- [DECISION] Completed work: Slot A now has durable `preflight`, `prd`, `arch`, `roadmap`, `stack`, `repo`, `build`, `harden`, `deploy`, `observe`, `launch`, `PROGRESS.md`, `state.json`, `events.jsonl`, and host-run summary artifacts.
- [DECISION] Completed work: added `/tmp/godpowers-phase2/slugify-cli/.godpowers/todos/deployed-staging-origin.md` to record the only deployed-smoke blocker.
- [DECISION] Completed work: updated `docs/case-studies/run-a.md`, `docs/case-studies/run-b.md`, `docs/case-studies/run-c.md`, `docs/adoption-canary.md`, and `USERS.md` to reflect Slot A closure and Slot B as the next target.
- [DECISION] Completed work: ran Slot B `/god-mode --brownfield --yolo` through the Codex `god-orchestrator` host subagent, constrained to `/tmp/godpowers-phase2/create-vite-app-template-react`.
- [DECISION] Completed work: Slot B now has durable `preflight`, `prd`, `design`, `arch`, `roadmap`, `stack`, `repo`, `build`, `deploy`, `observe`, `harden`, `launch`, `PROGRESS.md`, `state.json`, `events.jsonl`, and host-run summary artifacts.
- [DECISION] Completed work: repaired the copied Slot B target `vite.config.js` from ESM export syntax to CommonJS export syntax after Vite 1 rc failed on Node 25.6.0 with `Cannot add property env, object is not extensible`.
- [DECISION] Completed work: updated `docs/case-studies/run-b.md`, `docs/case-studies/run-c.md`, `docs/adoption-canary.md`, `USERS.md`, and `docs/BRIDGE-PLAN.md` to reflect Slot B local host-proof closure and Slot C as the next target.
- [DECISION] Verification result: `node bin/install.js quick-proof --project=. --brief` passed.
- [DECISION] Verification result: `node bin/install.js dogfood` passed with 5 of 5 scenarios.
- [DECISION] Verification result: Slot A CLI canary passed.
- [DECISION] Verification result: Slot B CLI canary passed.
- [DECISION] Verification result: Slot C CLI canary passed.
- [DECISION] Verification result: Slot A CLI canary rerun passed and wrote `/tmp/godpowers-phase2/slugify-cli-canary-rerun.md`.
- [DECISION] Verification result: Slot A target `npm test` passed with 5 AVA tests.
- [DECISION] Verification result: Slot A target `npm audit --omit=dev --json` passed with 0 production vulnerabilities.
- [DECISION] Verification result: Slot A target `gate` commands for `prd`, `arch`, `roadmap`, `stack`, `repo`, `build`, and `harden` all exited 0 with verdict `pass`.
- [DECISION] Verification result: Slot B CLI canary rerun passed and wrote `/tmp/godpowers-phase2/create-vite-app-canary-rerun.md`.
- [DECISION] Verification result: Slot B target `npm run build` passed after the copied Vite config repair.
- [DECISION] Verification result: Slot B target `npm audit --omit=dev --json` passed with 0 production vulnerabilities.
- [DECISION] Verification result: Slot B target `npm audit --json` exited 1 with 6 High and 4 Moderate dev-tooling vulnerabilities and 0 Critical vulnerabilities.
- [DECISION] Verification result: Slot B target `gate` commands for `prd`, `arch`, `roadmap`, `stack`, `repo`, `build`, and `harden` all exited 0 with verdict `pass`.
- [DECISION] Verification result: Slot B target `node bin/install.js status --project=/tmp/godpowers-phase2/create-vite-app-template-react --brief` passed and rendered `State: complete`.
- [DECISION] Verification result: Slot B target `node bin/install.js quick-proof --project=/tmp/godpowers-phase2/create-vite-app-template-react --brief` passed.
- [DECISION] Verification result: Slot B target local dev smoke passed with `curl` checks for `/`, `/src/App.jsx`, `/src/logo.svg`, and `/node_modules/.vite_opt_cache/react.js`.
- [DECISION] Verification result: Slot B Playwright smoke loaded `http://localhost:3000/`, rendered `Hello Vite + React!`, rendered `count is: 0`, and reported only the copied template's missing `favicon.ico` 404.
- [DECISION] Verification result: Slot B run `npm run test:e2e` passed.
- [DECISION] Verification result: Slot B run `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: Slot B run `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: Slot B run `npm run test:quick-proof` passed.
- [DECISION] Verification result: Slot B run `npm run lint` passed.
- [DECISION] Verification result: Slot B run `node bin/install.js quick-proof --project=. --brief` passed.
- [DECISION] Verification result: Slot B run `node bin/install.js dogfood` passed with 5 of 5 scenarios.
- [DECISION] Verification result: Slot B run initial `npm run release:check` failed before tests because `c8` was absent from `node_modules`.
- [DECISION] Verification result: Slot B run `npm ci` installed locked dependencies with 0 vulnerabilities.
- [DECISION] Verification result: Slot B run rerun `npm run release:check` passed with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.0, and package contents verified at 534 files.
- [DECISION] Verification result: `node bin/install.js status --project=/tmp/godpowers-phase2/slugify-cli --brief` passed and rendered `State: complete`.
- [DECISION] Verification result: `node bin/install.js quick-proof --project=/tmp/godpowers-phase2/slugify-cli --brief` passed.
- [DECISION] Verification result: `node bin/install.js dogfood` rerun passed with 5 of 5 scenarios.
- [DECISION] Verification result: `npm run test:e2e` passed.
- [DECISION] Verification result: `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: `npm run test:quick-proof` passed.
- [DECISION] Verification result: initial `npm run release:check` failed before tests because `c8` was absent from `node_modules`.
- [DECISION] Verification result: `npm ci` installed locked dependencies with 0 vulnerabilities.
- [DECISION] Verification result: rerun `npm run release:check` passed with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.0, and package contents verified at 534 files.
- [DECISION] Verification result: GitHub CI run `27286969057` for PR #9 head `5dc6191` completed successfully before the final merge-status note was added.
- [DECISION] Verification result: GitHub CI run `27287260869` for PR #9 head `fc783b4` completed successfully before merge.
- [DECISION] Release result: no docs patch release, package metadata update, changelog entry, npm publish, or external package release was attempted because Phase 2 exit criteria are not met.
- [DECISION] Release result: branch `codex/bridge-phase-2-slot-a-host-proof-continuation` was pushed to `origin`.
- [DECISION] Release result: PR creation was attempted through `gh pr create` and failed with `HTTP 401: Requires authentication`.
- [DECISION] Release result: GitHub connector PR creation succeeded and opened PR #9 at `https://github.com/aihxp/godpowers/pull/9`.
- [DECISION] Release result: the first PR #9 merge attempt failed because the GitHub app connection required reauthentication.
- [DECISION] Release result: the second PR #9 merge attempt succeeded through the GitHub connector at merge commit `295744aadfa7671f819fbeb6cbd7c8aa6a48813a`.
- [DECISION] Blockers: Slot A deployed smoke remains deferred until an upstream maintainer or repository configuration provides `STAGING_APP_URL=<deployed staging origin>`.
- [DECISION] Blockers: Slot A token and dollar cost remain unclaimable because the host run did not emit `cost.recorded` events.
- [DECISION] Blockers: Slot B deployed smoke remains deferred until an upstream maintainer or repository configuration provides `STAGING_APP_URL=<deployed staging origin>`.
- [DECISION] Blockers: Slot B token and dollar cost remain unclaimable because the host run did not emit `cost.recorded` events.
- [DECISION] Blockers: Slot B dev-tooling modernization remains deferred because npm recommends a semver-major Vite upgrade outside this proof run.
- [DECISION] Blockers: Slot C has not started.
- [DECISION] Next phase to run remains Phase 2: Host Proof Campaign, starting Slot C against `examples/cujo` from `https://github.com/tastejs/todomvc.git`.

## Phase 3: MCP Companion Package (target release 2.6.0)

- [DECISION] Ship MCP as a first-party companion package named `@godpowers/mcp`, not as a production dependency of the main `godpowers` package.
- [DECISION] The main `godpowers` package remains dependency-free at runtime unless a future release explicitly changes the stack pillar.
- [DECISION] The companion package may depend on `@modelcontextprotocol/sdk`; hand-rolled JSON-RPC is out of scope.
- [DECISION] The main `godpowers` CLI may expose `godpowers mcp-info` as a read-only helper that prints setup instructions, but it must not require the MCP SDK.
- [DECISION] Version one exposes five read-side tools wrapping existing `lib/` calls: `status`, `next`, `gate_check`, `lint_artifact`, and `trace_requirement`.
- [DECISION] Mutation tools such as `state_advance`, artifact writes, and route changes stay out of MCP through the 3.0.0 release.
- [DECISION] Add a protocol-level test in the companion package that spawns the server over stdio, runs `initialize`, `tools/list`, and one `tools/call` per tool against the `fixtures/quick-proof` project.
- [DECISION] Add an opt-in installer path that writes host MCP registration only when the user explicitly requests MCP setup; automatic registration remains forbidden.
- [DECISION] Update `skills/god-status.md` and `skills/god-next.md` with one line: prefer MCP tools when available, fall back to the CLI.
- [DECISION] Surface MCP availability in the host-guarantees line of `quick-proof` and the dashboard.
- [DECISION] Exit criteria are passing protocol tests, documented package boundary, host setup instructions, and no new production dependency in the main package.
- [HYPOTHESIS] Phase 3 takes one to two weeks depending on host registration formats.

## Phase 4: One-Directional State (target release 2.7.0)

- [DECISION] Inventory every read of `.godpowers/PROGRESS.md` and per-tier `STATE.md` files across `lib/`, `skills/`, `routing/`, tests, and docs, classifying each as a decision-read, display-read, migration-read, or legacy-source-read.
- [DECISION] Migrate every decision-read to `state.json`, extending `schema/state.v1.json` where markdown carried data the JSON lacks.
- [DECISION] Keep legacy-source reads for imported planning systems such as `.planning/STATE.md`; those reads are not Godpowers state authority.
- [DECISION] Make Godpowers-owned markdown state files generated artifacts inside managed fences, reusing the existing fence pattern and adding a checksum line inside the managed fence.
- [DECISION] One module owns generated state views, named `lib/state-views.js`, and all other modules call it instead of writing generated markdown directly.
- [DECISION] Add `godpowers state advance --step=<s> --status=<status> --project=.` as a CLI mutation wrapping `lib/state.js`, `lib/state-lock.js`, and `lib/atomic-write.js`.
- [DECISION] Regenerate markdown state views after every state mutation.
- [DECISION] Update skills that instruct agents to edit `PROGRESS.md` directly so they instruct `godpowers state advance` or the owning command wrapper instead.
- [DECISION] Add a static check forbidding Godpowers decision-reads from `PROGRESS.md`, forbidding direct edits of generated views, and allowing only documented migration-read and legacy-source-read exceptions.
- [DECISION] Add a drift-impossibility test: mutate via CLI and assert markdown regeneration, then hand-edit the managed fence and assert the next state mutation overwrites it and emits a warning.
- [DECISION] Keep `god-repair` available through Phase 4 and Phase 5 as diagnostics and recovery while generated state proves itself.
- [DECISION] Mark only the state-repair portions of `god-scan` and `god-context-scan` as superseded after the generated-state tests are green.
- [DECISION] Update dogfood fixtures in the same commit so `npx godpowers dogfood` stays green.
- [DECISION] Exit criteria are no Godpowers decision-reads from markdown state, generated views with checksums, green drift-impossibility tests, and retained `god-repair` diagnostics.
- [HYPOTHESIS] Phase 4 takes two to three weeks because the current surface contains many `PROGRESS.md` and `STATE.md` references.

## Phase 5: Surface Contraction (target release 3.0.0)

- [DECISION] Phase 5 is gated on Phase 2 usage evidence, but the default direction is already decided: default install becomes the `core` profile and the long tail moves behind `--profile=full`.
- [DECISION] Define twelve verbs with argument routing: `init`, `plan`, `build`, `fix`, `review`, `ship`, `audit`, `capture`, `sync`, `undo`, `extend`, and the `/god` front door.
- [DECISION] `plan` routes to PRD, design, arch, roadmap, and stack leaves.
- [DECISION] `fix` routes to debug and hotfix leaves.
- [DECISION] `ship` routes to deploy and launch leaves.
- [DECISION] `audit` routes to status, progress, harden, deps, lifecycle, and locate views.
- [DECISION] `capture` routes to note, todo, backlog, and seed leaves.
- [DECISION] Implement verbs as thin dispatch skills routing to existing leaf skills through routing YAML; leaf skills keep working unchanged.
- [DECISION] Deprecate superseded direct commands with `deprecated: true` plus `successor` frontmatter.
- [DECISION] Fold `god-locate` and `god-lifecycle` into `god-status` flags, keep both commands callable as deprecated aliases for one minor release, and remove them from smaller profiles immediately.
- [DECISION] Flip the installer default from `full` to `core`; `--profile=full` keeps every shipped command.
- [DECISION] Update surface-parity tests to assert deprecation metadata instead of deleting coverage.
- [DECISION] Update `docs/reference.md` counts and profile descriptions in the same release.
- [DECISION] Exit criteria are default install around 15 commands, all existing commands callable through `full`, every deprecated command naming its successor, and proof-campaign usage mapped to a verb or explicit exception.
- [HYPOTHESIS] Phase 5 takes about two weeks including help-surface and docs updates.

## Phase 6: Prompt Diet Completion And Agent Contracts (ongoing)

- [DECISION] Create `references/shared/LOCKING.md` and replace copied `## Locking` blocks with a one-line pointer.
- [DECISION] Add a static check forbidding new inline Locking sections in skills and agents.
- [DECISION] Extract the shared dashboard contract from `skills/god-status.md` and `skills/god-next.md` into `references/`.
- [DECISION] Add a size-budget static check for hub skills after the shared dashboard contract is extracted.
- [DECISION] Add structured frontmatter (`inputs`, `outputs`, `gates`, `handoff`) to all 40 agents.
- [DECISION] Upgrade `/god-agent-audit` missing-contract findings from info to warning after at least 20 agents have structured contracts.
- [DECISION] Merge agents only where Phase 2 evidence shows true overlap.
- [DECISION] Extend executable coverage after `lib/cli-dispatch.js` exists so the coverage gate includes the extracted CLI command surface without forcing the installer script itself into the lib-only ratchet.
- [DECISION] Exit criteria are no copy-pasted boilerplate blocks, machine-readable agent contracts, tested CLI dispatch extraction, and documented coverage boundary.
- [HYPOTHESIS] Phase 6 takes about two weeks of slack-time work spread across the other phases.

## Cross-Cutting Rules

- [DECISION] Every phase ships through `npm run release:check`; no phase work merges red.
- [DECISION] Every new behavioral rule gets a static check in the same release that introduces the rule.
- [DECISION] Nothing is deleted until it has been deprecated for one minor version, even at zero recorded users.
- [DECISION] Defects found during the proof campaign outrank every phase except the one in flight.
- [DECISION] Security-sensitive shell execution must use argument-array process execution, never interpolated command strings.
- [DECISION] The main package must preserve the current dependency-free runtime stance unless the stack pillar is updated first.

## Sequencing And Dependencies

- [DECISION] Order is Phase 1, then Phase 2, then Phase 3 and Phase 4 in either order, then Phase 5, with Phase 6 in slack time.
- [DECISION] Phase 2 depends on Phase 1 because the proof must demonstrate enforced gates.
- [DECISION] Phase 5 depends on Phase 2 because surface contraction must cite observed usage.
- [DECISION] Phase 3 and Phase 4 are independent of each other and of Phase 5.
- [DECISION] Phase 6 work may land inside any phase only when it does not expand that phase's user-facing behavior.

## Risks

- [DECISION] Gate scope creep is mitigated by the Phase 1 rule that gates use the artifact linter plus narrow tier adapters only.
- [DECISION] Arbitrary project command execution is excluded from `gate` Phase 1 to avoid creating a security-sensitive shell surface too early.
- [DECISION] The installer line budget is protected by extracting `lib/cli-dispatch.js` before the `gate` subcommand lands.
- [DECISION] The MCP SDK dependency is isolated in `@godpowers/mcp`, not added to the main package.
- [DECISION] Dogfood fixture breakage during Phase 4 is mitigated by updating fixtures in the same commit as state changes.
- [DECISION] The 3.0.0 default-profile flip is cheapest now, while recorded production users are zero.
- [HYPOTHESIS] The proof campaign will surface defects in build-tier skills that no fixture currently catches; that outcome is evidence, not failure.

## Resolved Decisions

- [DECISION] `/god-mode` must run `gate` automatically between tiers, not only rely on skill Verification sections.
- [DECISION] MCP ships as `@godpowers/mcp` so the main package preserves its dependency-free runtime stance.
- [DECISION] MCP mutation tools stay out of scope through 3.0.0.
- [DECISION] Generated markdown state views carry checksum lines inside managed fences.
- [DECISION] `god-locate` and `god-lifecycle` fold into `god-status` flags in Phase 5 while remaining deprecated aliases for one minor release.
- [DECISION] Phase 2 repository identity is decided by slot criteria plus recorded URL, commit SHA, license, and rationale at run start, rather than hard-coding repository names in this plan.
