# Bridge Task List: Code-First Kernel Migration

## Purpose

- [DECISION] This document lists only remaining bridge work for the code-first kernel migration.
- [DECISION] Completed baseline facts and already-recorded design decisions were removed on 2026-06-11 after disk verification.
- [DECISION] A task is complete only when the named code, docs, tests, and release checks are present in this repository.
- [DECISION] Every phase must ship through `npm run release:check`.
- [DECISION] The markdown skill surface must keep working on all 15 host runtimes while command-capable hosts gain executable gates and MCP-capable hosts gain tool calls.

## Coordination

- [DECISION] Every automation run must claim exactly one task ID before editing code or docs.
- [DECISION] A claim must record timestamp, agent label, task ID, branch or worktree, status, verification command, and remaining work.
- [DECISION] A new agent must not work on a task with an active claim newer than two hours unless the claim is marked `done`, `blocked`, or `stale`.
- [DECISION] Active bridge task claims are recorded in the table below.

| Timestamp | Agent | Task ID | Branch or Worktree | Status | Verification | Remaining Work |
|---|---|---|---|---|---|---|
| 2026-06-11 00:15 EDT | codex | P1-T01 | main | done | `node scripts/test-artifact-map.js`; `node scripts/test-dashboard.js`; `node scripts/static-check.js` | none |
| 2026-06-11 00:18 EDT | codex | P1-T02 | main | done | `node scripts/test-gate.js`; `node scripts/static-check.js`; `npm test` | none |
| 2026-06-11 00:30 EDT | codex | P1-T03-P1-T18 | main | done | `node scripts/static-check.js`; `node scripts/test-gate.js`; `node scripts/test-cli-dispatch.js`; `node scripts/test-router.js`; `node scripts/test-automation-surface-sync.js`; `node scripts/test-installer-profiles.js`; `node scripts/check-package-contents.js`; `npm run release:check` | none |

## Phase 1: Executable Gates

- [DECISION] Phase 1 is complete as of 2026-06-11.
- [DECISION] The passing release verification is recorded in the coordination claim for P1-T03-P1-T18.

## Phase 2: Host Proof Campaign

- [ ] [DECISION] P2-T01: Start Phase 2 only after Phase 1 executable gates pass release checks.
- [ ] [DECISION] P2-T02: Create `docs/case-studies/run-a.md` with repository URL, commit SHA, license, and selection rationale for Slot A.
- [ ] [DECISION] P2-T03: Run `/god-mode` inside an AI coding host on repository A without fixing Godpowers mid-run.
- [ ] [DECISION] P2-T04: Record defects from repository A in `.godpowers/todos/` and continue or abort honestly.
- [ ] [DECISION] P2-T05: Triage repository A defects and fix only blockers before repository B.
- [ ] [DECISION] P2-T06: Create `docs/case-studies/run-b.md` with repository URL, commit SHA, license, and selection rationale for Slot B.
- [ ] [DECISION] P2-T07: Run `/god-mode` inside an AI coding host on repository B without fixing Godpowers mid-run.
- [ ] [DECISION] P2-T08: Triage repository B defects and fix only blockers before repository C.
- [ ] [DECISION] P2-T09: Create `docs/case-studies/run-c.md` with repository URL, commit SHA, license, and selection rationale for Slot C.
- [ ] [DECISION] P2-T10: Run `/god-mode` inside an AI coding host on repository C without fixing Godpowers mid-run.
- [ ] [DECISION] P2-T11: Record wall-clock time, `/god-cost` tokens and dollars, pauses, gate failures, repairs, validation commands, host guarantee level, and shipped or blocked outcome for each run.
- [ ] [DECISION] P2-T12: Record which slash commands each host run actually invoked.
- [ ] [DECISION] P2-T13: Update the `USERS.md` track record section after all three host-run case studies exist.
- [ ] [DECISION] P2-T14: Ship a docs patch release for the proof campaign.

## Phase 3: MCP Companion Package

- [ ] [DECISION] P3-T01: Create a first-party companion package named `@godpowers/mcp`.
- [ ] [DECISION] P3-T02: Keep `@modelcontextprotocol/sdk` isolated to the companion package.
- [ ] [DECISION] P3-T03: Add a read-only `godpowers mcp-info` CLI helper without adding the MCP SDK to the main package.
- [ ] [DECISION] P3-T04: Expose read-side MCP tools named `status`, `next`, `gate_check`, `lint_artifact`, and `trace_requirement`.
- [ ] [DECISION] P3-T05: Add protocol tests that spawn the MCP server over stdio and run `initialize`, `tools/list`, and one `tools/call` per tool against `fixtures/quick-proof`.
- [ ] [DECISION] P3-T06: Add an opt-in installer path for host MCP registration.
- [ ] [DECISION] P3-T07: Keep automatic MCP registration forbidden.
- [ ] [DECISION] P3-T08: Update `skills/god-status.md` and `skills/god-next.md` to prefer MCP tools when available and fall back to the CLI.
- [ ] [DECISION] P3-T09: Surface MCP availability in the host-guarantees line of `quick-proof` and the dashboard.
- [ ] [DECISION] P3-T10: Run protocol tests and `npm run release:check` for Phase 3.

## Phase 4: One-Directional State

- [ ] [DECISION] P4-T01: Inventory every read of `.godpowers/PROGRESS.md` and per-tier `STATE.md` files across `lib/`, `skills/`, `routing/`, tests, and docs.
- [ ] [DECISION] P4-T02: Classify each markdown state read as a decision-read, display-read, migration-read, or legacy-source-read.
- [ ] [DECISION] P4-T03: Migrate every Godpowers decision-read from markdown state to `state.json`.
- [ ] [DECISION] P4-T04: Extend `schema/state.v1.json` where markdown state carries data that JSON lacks.
- [ ] [DECISION] P4-T05: Keep legacy-source reads for imported planning systems such as `.planning/STATE.md`.
- [ ] [DECISION] P4-T06: Add managed fences and checksum lines to generated Godpowers-owned markdown state views.
- [ ] [DECISION] P4-T07: Add `lib/state-views.js` as the only module that owns generated markdown state views.
- [ ] [DECISION] P4-T08: Add `godpowers state advance --step=<s> --status=<status> --project=.` as a CLI mutation.
- [ ] [DECISION] P4-T09: Wrap `godpowers state advance` with `lib/state.js`, `lib/state-lock.js`, and `lib/atomic-write.js`.
- [ ] [DECISION] P4-T10: Regenerate markdown state views after every state mutation.
- [ ] [DECISION] P4-T11: Update skills that instruct agents to edit `PROGRESS.md` directly so they use `godpowers state advance` or the owning command wrapper.
- [ ] [DECISION] P4-T12: Add a static check forbidding Godpowers decision-reads from `PROGRESS.md`.
- [ ] [DECISION] P4-T13: Add a static check forbidding direct edits of generated state views except documented migration-read and legacy-source-read exceptions.
- [ ] [DECISION] P4-T14: Add a drift-impossibility test that mutates via CLI and asserts markdown regeneration.
- [ ] [DECISION] P4-T15: Extend the drift-impossibility test so a hand-edited managed fence is overwritten on the next state mutation and emits a warning.
- [ ] [DECISION] P4-T16: Mark only the state-repair portions of `god-scan` and `god-context-scan` as superseded after generated-state tests are green.
- [ ] [DECISION] P4-T17: Update dogfood fixtures in the same commit as state changes.
- [ ] [DECISION] P4-T18: Run `npx godpowers dogfood` and `npm run release:check` for Phase 4.

## Phase 5: Surface Contraction

- [ ] [DECISION] P5-T01: Start Phase 5 only after Phase 2 usage evidence exists.
- [ ] [DECISION] P5-T02: Define twelve verbs with argument routing: `init`, `plan`, `build`, `fix`, `review`, `ship`, `audit`, `capture`, `sync`, `undo`, `extend`, and `/god`.
- [ ] [DECISION] P5-T03: Route `plan` to PRD, design, arch, roadmap, and stack leaves.
- [ ] [DECISION] P5-T04: Route `fix` to debug and hotfix leaves.
- [ ] [DECISION] P5-T05: Route `ship` to deploy and launch leaves.
- [ ] [DECISION] P5-T06: Route `audit` to status, progress, harden, deps, lifecycle, and locate views.
- [ ] [DECISION] P5-T07: Route `capture` to note, todo, backlog, and seed leaves.
- [ ] [DECISION] P5-T08: Implement verbs as thin dispatch skills routing to existing leaf skills through routing YAML.
- [ ] [DECISION] P5-T09: Keep existing leaf skills callable through the full profile.
- [ ] [DECISION] P5-T10: Deprecate superseded direct commands with `deprecated: true` plus `successor` frontmatter.
- [ ] [DECISION] P5-T11: Fold `god-locate` and `god-lifecycle` into `god-status` flags.
- [ ] [DECISION] P5-T12: Keep `god-locate` and `god-lifecycle` callable as deprecated aliases for one minor release.
- [ ] [DECISION] P5-T13: Remove `god-locate` and `god-lifecycle` from smaller profiles.
- [ ] [DECISION] P5-T14: Flip the installer default from `full` to `core`.
- [ ] [DECISION] P5-T15: Keep `--profile=full` installing every shipped command.
- [ ] [DECISION] P5-T16: Update surface-parity tests to assert deprecation metadata.
- [ ] [DECISION] P5-T17: Update `docs/reference.md` counts and profile descriptions.
- [ ] [DECISION] P5-T18: Map proof-campaign usage to a verb or explicit exception.
- [ ] [DECISION] P5-T19: Run `npm run release:check` for Phase 5.

## Phase 6: Prompt Diet And Agent Contracts

- [ ] [DECISION] P6-T01: Add structured frontmatter fields `inputs`, `outputs`, `gates`, and `handoff` to all 40 agents.
- [ ] [DECISION] P6-T02: Upgrade `/god-agent-audit` missing-contract findings from info to warning after at least 20 agents have structured contracts.
- [ ] [DECISION] P6-T03: Merge agents only where Phase 2 evidence shows true overlap.
- [ ] [DECISION] P6-T04: Extend executable coverage after `lib/cli-dispatch.js` exists so the coverage gate includes the extracted CLI command surface.
- [ ] [DECISION] P6-T05: Keep the installer script itself outside the lib-only coverage ratchet.
- [ ] [DECISION] P6-T06: Run `npm run release:check` for each Phase 6 landing slice.

## Cross-Cutting Tasks

- [ ] [DECISION] C-T01: Add a static check in the same release as every new behavioral rule.
- [ ] [DECISION] C-T02: Keep deleted surfaces deprecated for one minor version before removal.
- [ ] [DECISION] C-T03: Treat proof-campaign defects as higher priority than every phase except the phase currently in flight.
- [ ] [DECISION] C-T04: Use argument-array process execution for security-sensitive shell work.
- [ ] [DECISION] C-T05: Preserve the main package dependency-free runtime stance unless the stack pillar changes first.

## Task Order

- [DECISION] The required order is Phase 1, then Phase 2, then Phase 3 and Phase 4 in either order, then Phase 5.
- [DECISION] Phase 6 work may land inside any phase only when it does not expand that phase's user-facing behavior.
