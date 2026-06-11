# Bridge Plan: Code-First Kernel Migration

## Purpose

- [DECISION] Godpowers will migrate from prose-enforced gates to executable enforcement in releasable phases while reusing the existing `lib/` runtime as the kernel.
- [DECISION] Every phase must ship through `npm run release:check`; the migration must not use a long-lived dark branch.
- [DECISION] The markdown skill surface must keep working on all 15 host runtimes while command-capable hosts gain executable gates and MCP-capable hosts gain tool calls.
- [DECISION] The bridge is now scoped as a 10 to 12 part-time week migration for a solo maintainer, with Phase 4 treated as the highest-risk phase.
- [DECISION] No open questions remain in this plan; new uncertainty must be captured as a follow-up issue or replacement proposal.

## Automation Coordination

- [DECISION] Automation runs must claim exactly one phase or one independent phase-scoped task in the Coordination Ledger before implementation edits begin.
- [DECISION] A claim newer than two hours blocks overlapping work unless the entry is marked `done`, `blocked`, `waiting`, or `stale`.
- [DECISION] If the next incomplete phase is actively claimed, another automation may choose an unclaimed independent task from the same phase only when it does not touch the same files.
- [DECISION] If no independent task is available, the automation must add a `waiting` ledger entry and stop before editing implementation files.
- [DECISION] Closeout must update the same ledger entry with final status, verification commands, release or publish result, remaining work, and next action.

## Coordination Ledger

| Timestamp UTC | Agent | Scope | Branch or worktree | Status | Next action |
|---|---|---|---|---|---|
| 2026-06-11T03:10:09Z | Codex 73e8 | Bridge completion re-verification | `codex/bridge-completion-reverification-73e8` in `/Users/hprincivil/.codex/worktrees/73e8/godpowers` | done | Verification: phase status scan confirmed no current incomplete bridge phase, with the historical Phase 5 partial line superseded by later Phase 5 completion; `npm ci` passed with 0 vulnerabilities; `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains; remaining work: none for the bridge plan; next action: no remaining phase work. |
| 2026-06-11T02:40:36Z | Codex 0c62 | Bridge completion re-verification | `codex/bridge-completion-reverification-0c62` in `/Users/hprincivil/.codex/worktrees/0c62/godpowers` | done | Verification: phase status scan confirmed no current incomplete bridge phase, with the historical Phase 5 partial line superseded by later Phase 5 completion; `npm ci` passed with 0 vulnerabilities; `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains; remaining work: none for the bridge plan; next action: no remaining phase work. |
| 2026-06-11T02:10:37Z | Codex bc4d | Bridge completion re-verification | `codex/bridge-completion-reverification-bc4d` in `/Users/hprincivil/.codex/worktrees/bc4d/godpowers` | done | Verification: phase status scan confirmed no current incomplete bridge phase, with the historical Phase 5 partial line superseded by later Phase 5 completion; `npm ci` passed with 0 vulnerabilities; `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains; remaining work: none for the bridge plan; next action: no remaining phase work. |
| 2026-06-11T01:40:15Z | Codex 71a9 | Bridge completion re-verification | `codex/bridge-completion-reverification-71a9` in `/Users/hprincivil/.codex/worktrees/71a9/godpowers` | done | Verification: phase status blocks and ledger show no incomplete bridge phase; first `npm run release:check` attempt stopped because local `c8` was missing; `npm ci` passed with 0 vulnerabilities; final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains; remaining work: none for the bridge plan; next action: no remaining phase work. |
| 2026-06-11T01:10:25Z | Codex bf1e | Bridge completion re-verification | `codex/bridge-completion-reverification-bf1e` in `/Users/hprincivil/.codex/worktrees/bf1e/godpowers` | done | Verification: phase status blocks and ledger show no incomplete bridge phase; first `npm run release:check` attempt stopped because local `c8` was missing; `npm ci` passed with 0 vulnerabilities; final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; post-closeout `git diff --check`, bridge-plan banned character scan, and `node scripts/test-doc-surface-counts.js` passed; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains; remaining work: none for the bridge plan; next action: no remaining phase work. |
| 2026-06-11T00:40:24Z | Codex b397 | Bridge completion re-verification | `codex/bridge-completion-reverification-b397` in `/Users/hprincivil/.codex/worktrees/b397/godpowers` | done | Verification: phase status blocks and ledger show no incomplete bridge phase; first `npm run release:check` attempt stopped because local `c8` was missing; `npm ci` passed with 0 vulnerabilities; final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains; remaining work: none for the bridge plan; next action: no remaining phase work. |
| 2026-06-11T00:10:14Z | Codex 6a72 | Bridge completion verification | `codex/bridge-completion-verification-6a72` in `/Users/hprincivil/.codex/worktrees/6a72/godpowers` | done | Verification: first `npm run release:check` attempt stopped because local `c8` was missing; `npm ci` passed with 0 vulnerabilities; final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because all bridge phases were already complete and this closeout only verified completion; remaining work: none for the bridge plan; next action: no remaining phase work. |
| 2026-06-10T23:40:04Z | Codex 1df6 | Phase 6 evidence-based agent merge | `codex/bridge-phase-6-agent-merge-1df6` in `/Users/hprincivil/.codex/worktrees/1df6/godpowers` | done | Verification: `node scripts/test-router.js`, `node scripts/static-check.js`, `node scripts/test-agent-validator.js`, `node scripts/test-repo-surface-sync.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-automation-surface-sync.js`, `node scripts/test-recipes.js`, direct route and sync recommendation probe, `npm ci`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `node scripts/validate-skills.js`, `node scripts/test-doc-surface-counts.js`, `git diff --check`, changed-file banned character scan, and `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, 0 production vulnerabilities, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because this Phase 6 slice changed internal agent routing, prompts, docs, and validation only; remaining work: none for Phase 6 or the bridge plan; next action: no remaining bridge phase work. |
| 2026-06-10T23:10:44Z | Codex 1da4 | Phase 6 CLI dispatch coverage boundary | `codex/bridge-phase-6-cli-coverage-boundary-1da4` in `/Users/hprincivil/.codex/worktrees/1da4/godpowers` | done | Verification: `node scripts/test-cli-dispatch.js`, `node scripts/static-check.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-repo-surface-sync.js`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `git diff --check`, changed-file banned character scan, `npm ci`, and `npm run release:check` passed after the first release-gate attempt found missing local `c8`; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because this was a Phase 6 coverage-boundary enforcement slice; remaining work: evidence-based agent merges; next action: run the Phase 6 evidence-based agent merge slice. |
| 2026-06-10T22:40:16Z | Codex 86bd | Phase 6 structured agent contracts | `codex/bridge-phase-6-agent-contracts-86bd` in `/Users/hprincivil/.codex/worktrees/86bd/godpowers` | done | Verification: `node scripts/test-agent-validator.js`, `node scripts/static-check.js`, `node scripts/validate-skills.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-repo-surface-sync.js`, `git diff --check`, changed-file banned character scan, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run test:audit`, `npm ci`, and `npm run release:check` passed after the first release-gate attempt found missing local `c8`; release: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because this was a Phase 6 contract and validation slice; remaining work: evidence-based agent merges and CLI dispatch coverage boundary documentation; next action: run the Phase 6 evidence-based agent merge or CLI coverage boundary slice. |
| 2026-06-10T22:10:24Z | Codex fe86 | Phase 6 locking reference pointer cleanup and static enforcement | `codex/bridge-phase-6-locking-fe86` in `/Users/hprincivil/.codex/worktrees/fe86/godpowers` | done | Verification: `node scripts/static-check.js`, `node scripts/validate-skills.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-repo-surface-sync.js`, `git diff --check`, changed-file banned character scan, `npm ci`, and `npm run release:check` passed; release: no npm publish, tag, GitHub release, or version bump attempted because this was a Phase 6 prompt-surface enforcement slice; remaining work: structured agent contracts, missing-contract severity upgrade, evidence-based agent merges, and CLI dispatch coverage boundary documentation; next action: run the Phase 6 structured agent contracts slice. |
| 2026-06-10T21:40:29Z | Codex fc18 | Phase 5 release publish closeout | `codex/bridge-phase-5-release-closeout-fc18` in `/Users/hprincivil/.codex/worktrees/fc18/godpowers` | done | Verification: `npm ci`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, local `npm run release:check`, clean-clone `bash scripts/release.sh 3.0.0`, publish workflow `27308383323`, `npm run verify:published-install`, npm registry checks for both packages, `npm exec --yes --package @godpowers/mcp@3.0.0 -- godpowers-mcp --help`, and `gh release view v3.0.0` passed; release: npm `godpowers@3.0.0`, npm `@godpowers/mcp@3.0.0`, tag `v3.0.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.0.0` are published; remaining work: none for Phase 5; next action: start Phase 6 prompt diet completion and agent contracts. |
| 2026-06-10T21:10:04Z | Codex f1f4 | Phase 5 verb dispatch and profile-default behavior slice | `codex/bridge-phase-5-verbs-profile-f1f4` in `/Users/hprincivil/.codex/worktrees/f1f4/godpowers` | done | Verification: `node scripts/test-installer-profiles.js`, `node scripts/test-surface-contraction.js`, `node scripts/test-command-families.js`, `node scripts/validate-skills.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/static-check.js`, `node scripts/test-router.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-automation-surface-sync.js`, `node scripts/test-repo-surface-sync.js`, `node scripts/test-quick-proof.js`, `npm ci`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `node scripts/test-install-smoke.js`, `node bin/install.js dogfood --json`, `npm --workspace @godpowers/mcp test`, `npm run pack:check`, `npm run pack:mcp:check`, `npm run lint`, `npm run test:audit`, and `npm run release:check` passed; PR: https://github.com/aihxp/godpowers/pull/43 merged at 2026-06-10T21:33:07Z with Node 18, Node 20, Node 22, and Package check passing; release: package metadata, `CHANGELOG.md`, `RELEASE.md`, and public docs are merged for `3.0.0`, with no npm publish, GitHub tag, or GitHub release attempted in this behavior slice; remaining work: final release verification from merged main, npm publish, tag, GitHub release, and published-install verification; next action: run Phase 5 release publish closeout from merged main. |
| 2026-06-10T20:41:06Z | Codex 5283 | Phase 5 proof-campaign usage mapping and core profile evidence boundary | `codex/bridge-phase-5-surface-evidence-5283` in `/Users/hprincivil/.codex/worktrees/5283/godpowers` | done | Verification: `node scripts/test-surface-contraction.js`, `node scripts/test-installer-profiles.js`, `node scripts/static-check.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-repo-surface-sync.js`, `node scripts/test-command-families.js`, `npm run test:quick-proof`, `npm run test:audit`, `npm run lint`, `npm ci`, and `npm run release:check` passed; release: no publish or version bump attempted because this was a Phase 5 evidence boundary slice; remaining work: implement verb dispatch skills, deprecation metadata, `god-status` flags, and installer default flip; next action: run Phase 5 verb dispatch and profile-default behavior slice. |
| 2026-06-10T20:10:49Z | Codex 205e | Phase 4 final release readiness and 2.7.0 release | `codex/bridge-phase-4-release-205e` and `codex/bridge-phase-4-release-status-205e` in `/Users/hprincivil/.codex/worktrees/205e/godpowers` | done | Verification: `npm ci`, `node scripts/test-state-advance.js`, `node scripts/test-state-views.js`, `npm --workspace @godpowers/mcp test`, `node scripts/static-check.js`, `npm run lint`, `npm run test:quick-proof`, `npm run test:audit`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run pack:check`, `npm run pack:mcp:check`, `node bin/install.js dogfood --json`, repo documentation sync, repo surface sync, release surface sync, changed-file banned character scan, local `npm run release:check`, PR #40 CI, main CI run `27303847386`, clean-clone `bash scripts/release.sh 2.7.0`, publish workflow `27304053692`, `npm run verify:published-install`, npm registry checks, MCP npm install smoke, and `gh release view v2.7.0` passed; release: npm `godpowers@2.7.0`, npm `@godpowers/mcp@2.7.0`, tag `v2.7.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v2.7.0` are published; remaining work: none for Phase 4; next action: start Phase 5 Surface Contraction. |
| 2026-06-10T19:30:18Z | Codex ba19 | Phase 4 per-tier decision-read static check and deploy, observe, launch handoff migration | `codex/bridge-phase-4-handoff-state-ba19` in `/Users/hprincivil/.codex/worktrees/ba19/godpowers` | done | Verification: `node scripts/static-check.js`, `node scripts/test-router.js`, `node scripts/test-pillars.js`, `node scripts/test-planning-systems.js`, `node scripts/test-workflow-runner.js`, `node scripts/test-state.js`, `node scripts/test-state-views.js`, `node bin/install.js dogfood --json`, `npm run lint`, `npm run test:quick-proof`, `npm run test:audit`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run pack:check`, `npm ci`, `npm run release:check`, `git diff --check`, and changed-file banned character scans passed; PR: https://github.com/aihxp/godpowers/pull/39; release: no npm publish or version bump attempted because this was a Phase 4 migration slice; remaining work: final 2.7.0 release path; next action: run Phase 4 final release readiness and 2.7.0 release. |
| 2026-06-10T19:00:11Z | Codex 6d12 | Phase 4 generated per-tier state views | `codex/bridge-phase-4-per-tier-state-views-6d12` in `/Users/hprincivil/.codex/worktrees/6d12/godpowers` | done | Verification: `node scripts/test-state-views.js`, `node scripts/test-state-advance.js`, `node scripts/test-state.js`, `node scripts/test-cli-dispatch.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:audit`, `npm run test:quick-proof`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run pack:check`, `npm ci`, `npm run release:check`, `git diff --check`, and changed-file banned character scan passed; release: no npm publish or version bump attempted because Phase 4 remains partial; remaining work: remaining per-tier static decision-read checks, dogfood fixture updates, and final 2.7.0 release; next action: run the Phase 4 per-tier decision-read static check and deploy, observe, and launch handoff migration slice. |
| 2026-06-10T18:30:23Z | Codex c3f7 | Phase 4 root progress orchestration and writer-instruction migration | `codex/bridge-phase-4-progress-writers-c3f7` in `/Users/hprincivil/.codex/worktrees/c3f7/godpowers` | done | Verification: `node scripts/static-check.js`, `node scripts/test-context-writer.js`, `node scripts/test-quick-proof.js`, `node scripts/test-state-advance.js`, `node scripts/test-state-views.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run test:audit`, `npm run test:quick-proof`, changed-file banned character scan, `npm ci`, and `npm run release:check` passed after locked dependencies were installed; release: no npm publish or version bump attempted because Phase 4 remains partial; remaining work: generated checksummed per-tier state views, dogfood fixture updates, and final 2.7.0 release; next action: run the Phase 4 generated per-tier state views slice. |
| 2026-06-10T18:20:25Z | Codex 603c | Phase 4 per-tier gate decision-read migration reconciliation | `codex/bridge-phase-4-gate-state-603c` in `/Users/hprincivil/.codex/worktrees/603c/godpowers` | stale | Parallel PR #33 merged the implementation scope first; this branch preserves non-overlapping README, validation, and skill instruction alignment after verification with `node scripts/test-gate.js`, `node scripts/static-check.js`, JSON parse smoke, `node scripts/test-state.js`, `node scripts/test-state-views.js`, `node scripts/test-cli-dispatch.js`, `npm run lint`, `npm run test:audit`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm ci`, `npm run release:check`, `git diff --check`, and changed-file banned character scans; release: no npm publish or version bump attempted because Phase 4 remains partial; remaining work and next action follow the b950 ledger entry. |
| 2026-06-10T18:02:57Z | Codex b950 | Phase 4 per-tier gate decision-read migration | `codex/bridge-phase-4-tier-gate-state-b950` in `/Users/hprincivil/.codex/worktrees/b950/godpowers` | done | Verification: `node scripts/test-gate.js`, `node scripts/test-state.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm ci`, and two `npm run release:check` runs passed after locked dependencies were installed; release: no npm publish or version bump attempted because Phase 4 remains partial; remaining work: root progress orchestration entry points, direct writer instructions, generated per-tier state views, dogfood fixture updates, and final 2.7.0 release; next action: run the Phase 4 root progress orchestration and writer-instruction migration slice. |
| 2026-06-10T17:42:48Z | Codex ef6c | Phase 4 route prerequisite decision-read migration | `codex/bridge-phase-4-route-prereqs-ef6c` in `/Users/hprincivil/.codex/worktrees/ef6c/godpowers` | done | Verification: `node scripts/test-router.js`, `node scripts/test-recipes.js`, `node scripts/test-state.js`, `node scripts/static-check.js`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm ci`, `npm run release:check`, post-closeout `npm run test:audit`, post-closeout `node scripts/static-check.js`, and changed-file banned character scan passed; release: no npm publish or version bump attempted because Phase 4 remains partial; remaining work: per-tier gate decision-read migration, generated per-tier state views, direct progress writer instruction migration, dogfood fixture updates, and final 2.7.0 release; next action: run the Phase 4 per-tier gate decision-read migration. |
| 2026-06-10T17:32:40Z | Codex 5f5e | Phase 4 state advance CLI mutation merge closeout | `codex/bridge-phase-4-state-advance-cli-382b` in `/Users/hprincivil/.codex/worktrees/382b/godpowers` | done | Verification: `node scripts/test-state-advance.js`, `node scripts/test-cli-dispatch.js`, `node scripts/test-state.js`, `node scripts/test-state-views.js`, `node scripts/test-state-lock.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm ci`, changed-file banned character scan, and `npm run release:check` passed; release: PR #29 merged through the protected GitHub path at `cf26523c49ef378ad775e1d10c08b0a616622a2e` with CI passing and no npm publish or version bump attempted because this was a merge closeout for a partial Phase 4 slice; remaining work: migrate decision reads from markdown state to `state.json`, add static decision-read checks, extend generated views beyond `PROGRESS.md`, update dogfood fixtures, and ship Phase 4 as 2.7.0; next action: run the Phase 4 decision-read migration slice. |
| 2026-06-10T17:21:48Z | Codex 382b | Phase 4 state advance CLI mutation | `codex/bridge-phase-4-state-advance-cli-382b` in `/Users/hprincivil/.codex/worktrees/382b/godpowers` | done | Verification: `node scripts/test-state-advance.js`, `node scripts/test-cli-dispatch.js`, `node scripts/test-state.js`, `node scripts/test-state-views.js`, `node scripts/test-state-lock.js`, `node scripts/static-check.js`, CLI temp-project smoke, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm ci`, changed-file banned character scan, and `npm run release:check` passed; release: not attempted for this independent Phase 4 CLI mutation slice; remaining work: migrate decision reads from markdown state to `state.json`, add static decision-read checks, extend generated views beyond `PROGRESS.md`, update dogfood fixtures, and ship Phase 4 as 2.7.0; next action: run the Phase 4 decision-read migration slice. |
| 2026-06-10T17:14:23Z | Codex 5896 | Phase 4 generated state views merge closeout | `codex/bridge-phase-4-state-views-closeout-docs-5896` in `/Users/hprincivil/.codex/worktrees/5896/godpowers` | done | Verification: `npm ci`, `node scripts/test-state-views.js`, `node scripts/test-state.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, and `npm run release:check` passed; release: no npm publish or version bump attempted for this merge-only Phase 4 closeout; remaining work: `godpowers state advance` CLI mutation and downstream Phase 4 migration slices; next action: run the Phase 4 state advance CLI mutation slice. |
| 2026-06-10T17:02:35Z | Codex b3f2 | Phase 4 generated state views foundation | `codex/bridge-phase-4-generated-state-views-b3f2` in `/Users/hprincivil/.codex/worktrees/b3f2/godpowers` | done | Verification: `node scripts/test-state-views.js`, `node scripts/test-state.js`, `node scripts/static-check.js`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm ci`, and `npm run release:check` passed after dependencies were installed; release: not attempted for this independent foundation slice; remaining work: add the `godpowers state advance` CLI mutation, migrate decision reads, add static decision-read checks, extend generated views beyond `PROGRESS.md`, update dogfood fixtures, and ship Phase 4 as 2.7.0; next action: run the Phase 4 state advance CLI mutation slice. |
| 2026-06-10T16:53:40Z | Codex 70d8 | Phase 4 markdown state read inventory | `codex/bridge-phase-4-state-inventory-70d8` in `/Users/hprincivil/.codex/worktrees/70d8/godpowers` | done | Verification: `npm run lint`, `npm run test:quick-proof`, `npm run test:audit`, and changed-doc banned character scan passed; release: not attempted for this inventory-only docs slice; remaining work: implement generated state views and migrate executable decision reads; next action: start Phase 4 generated state views. |
| 2026-06-10T16:49:00Z | Codex 46d1 | Phase 3 companion registry verification | `codex/bridge-phase-3-registry-blocker-46d1` in `/Users/hprincivil/.codex/worktrees/46d1/godpowers` | done | Verification: `gh run view 27291159615`, `npm view godpowers version dist-tags`, `npm view @godpowers/mcp version dist-tags`, `npm run verify:published-install`, `npm install --package-lock-only --ignore-scripts @godpowers/mcp@2.6.0`, `npm exec --package @godpowers/mcp@2.6.0 -- godpowers-mcp --help`, `gh release view v2.6.0`, `npm run lint`, and `npm run test:surface`; release: npm `godpowers@2.6.0`, npm `@godpowers/mcp@2.6.0`, and GitHub release `v2.6.0` are published; remaining work: none for Phase 3; next action: start Phase 4. |
| 2026-06-10T16:33:08Z | Codex e273 | Phase 3 release and publish closeout | `codex/bridge-phase-3-release-closeout-e273` and `codex/bridge-phase-3-release-status-e273` in `/Users/hprincivil/.codex/worktrees/e273/godpowers` | done | Verification: `npm --workspace @godpowers/mcp test`, `npm --workspace @godpowers/mcp run pack:check`, `node scripts/static-check.js`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, three `npm run release:check` runs, PR #23 CI, PR #25 CI, `gh run view 27291159615`, `npm run verify:published-install`, npm view for both packages, `npm exec --package @godpowers/mcp@2.6.0 -- godpowers-mcp --help`, and `gh release view v2.6.0`; release: npm `godpowers@2.6.0`, npm `@godpowers/mcp@2.6.0`, tag `v2.6.0`, and GitHub release published; remaining work: none for Phase 3; next action: start Phase 4. |
| 2026-06-10T16:12:38Z | Codex da7c | Phase 2 blocker patch release-status closeout | `codex/bridge-phase-2-release-closeout-da7c` in `/Users/hprincivil/.codex/worktrees/da7c/godpowers` | done | Verification: `gh run view 27289417888`, `npm view godpowers version dist-tags`, `npm run verify:published-install`, `gh release view v2.5.2`, `npm run lint`, and `npm run release:check`; release: npm `2.5.2` and GitHub release published; remaining work: none; next action: start Phase 3. |

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

- [DECISION] Status: complete on branch `codex/bridge-phase-2-host-proof` for the 2026-06-10 automation run.
- [DECISION] Completed work: preserved the merged Slot A host proof for `https://github.com/sindresorhus/slugify-cli.git` at `9d7cc5e95668085d73dd4229d8bb0365f4f32144`, including its local and CI-verifiable closure and deployed-smoke blocker.
- [DECISION] Completed work: selected Slot B as `https://github.com/CrazyTim/countdown.git` at `0d294e62398a7bb24faccd7b93987a4db66e195a`, verified MIT license, and captured the identity in `docs/case-studies/run-b.md` before the host run.
- [DECISION] Completed work: selected Slot C as `https://github.com/seapagan/react-github-readme-button.git` at `52a959e039d11baa8c0ad5b9df22535ae98d1d10`, verified MIT license and TODO evidence, and captured the identity in `docs/case-studies/run-c.md` before the host run.
- [DECISION] Completed work: Run A remains complete from PR #9 with a Codex `/god-mode --brownfield --yolo` host proof on slugify-cli, passing local tests, production audit, executable gates, dashboard status, quick proof, and dogfood, with no upstream source edits.
- [DECISION] Completed work: Run B completed a Codex `/god-mode --brownfield --yolo` host proof on Countdown with local browser smoke evidence, 6 of 7 requirements done, dependency audit repair through a `ws` override, passing local runtime gates, and deployed-origin verification deferred.
- [DECISION] Completed work: Run C produced a documented failed Codex `/god-mode --brownfield --yolo` host proof on react-github-readme-button, with local tests, lint, build, browser smoke, and production audit passing before the run blocked at harden on Critical dev-tooling audit findings.
- [DECISION] Completed work: updated `USERS.md`, `README.md`, `CHANGELOG.md`, `RELEASE.md`, `ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/reference.md`, `agents/context.md`, `package.json`, and `package-lock.json` for version 2.5.1 and the Phase 2 docs patch release.
- [DECISION] Defect backlog captured: Slot A deployed-smoke blocker, Slot A missing cost events, `npx-gate-noninteractive`, `dashboard-state-repair`, `CRITICAL-DEV-TOOLING-AUDIT`, and `published-gate-command-gap`.
- [DECISION] Verification result: no em dashes, en dashes, or emoji characters were found in the edited release and case-study surfaces.
- [DECISION] Verification result: `npm run lint` passed.
- [DECISION] Verification result: `npm run test:e2e` passed.
- [DECISION] Verification result: `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: `npm run release:check` passed with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.1, and package contents verified at 534 files.
- [DECISION] Verification result: `npm pack --dry-run` passed for `godpowers@2.5.1` with 534 files.
- [DECISION] Verification result: GitHub CI run `27288459252` passed for PR #11 before merge.
- [DECISION] Release result: PR #11 merged through the protected GitHub path on 2026-06-10 at merge commit `7803cafaf19f7117ce0762db1ffb645f6652433c`.
- [DECISION] Release result: `v2.5.1` was tagged and pushed to trigger the repository publish workflow.
- [DECISION] Release result: GitHub Publish to npm workflow `27288648503` passed, and npm published `godpowers@2.5.1` with provenance.
- [DECISION] Release result: `npm run verify:published-install` passed after publish and resolved npm `godpowers@latest` to version 2.5.1.
- [DECISION] Release result: GitHub release `v2.5.1` was created at `https://github.com/aihxp/godpowers/releases/tag/v2.5.1`.
- [DECISION] Blockers: no Phase 2 deliverable blocker remains.
- [DECISION] Blockers: Run A deployed smoke remains deferred until an upstream maintainer or repository configuration provides `STAGING_APP_URL=<deployed staging origin>`.
- [DECISION] Blockers: Run C has an external project blocker, `CRITICAL-DEV-TOOLING-AUDIT`, intentionally left for that project maintainer because clearing it requires development-tooling strategy expansion outside the selected host-proof slice.
- [DECISION] Next phase to run is Phase 3: MCP Companion Package.

### Phase 2 Blocker Patch Status

- [DECISION] Status: complete on branch `codex/bridge-phase-2-host-proof-run-a-56e6` for the 2026-06-10 automation run, with release-status closeout recorded on branch `codex/bridge-phase-2-release-closeout-da7c`.
- [DECISION] Completed work: preserved the merged 2.5.1 Slot A, Slot B, and Slot C evidence while keeping the code fixes from this blocker patch branch.
- [DECISION] Completed work: `lib/installer-files.js` now copies `bin/` into `godpowers-runtime`, and `scripts/test-install-smoke.js` verifies `npm exec --package <runtime> -- godpowers gate` works against an installed runtime bundle.
- [DECISION] Completed work: `lib/gate.js` now fails build gates when `.godpowers/build/STATE.md` records failed verification commands, and `scripts/test-gate.js` covers that false-pass evidence shape.
- [DECISION] Verification result: `node scripts/test-gate.js` passed before merge resolution.
- [DECISION] Verification result: `node scripts/test-install-smoke.js` passed before merge resolution.
- [DECISION] Verification result: `npm run test:e2e` passed before merge resolution.
- [DECISION] Verification result: `node scripts/test-runtime-verification.js` passed before merge resolution.
- [DECISION] Verification result: `node scripts/test-agent-browser.js` passed before merge resolution.
- [DECISION] Verification result: `node scripts/static-check.js` passed before merge resolution.
- [DECISION] Verification result: patched `lib/gate.js` failed the captured build artifact because a failed verification command was present.
- [DECISION] Verification result: a temp local Codex install successfully ran `npm exec --package <runtime> -- godpowers gate --tier=prd --project=<example> --json`.
- [DECISION] Verification result: pre-latest-main `npm run release:check` passed with `coverage:lib` at 92.9 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.1, and package contents verified at 534 files.
- [DECISION] Verification result: post-merge `node scripts/test-gate.js` passed.
- [DECISION] Verification result: post-merge `node scripts/test-install-smoke.js` passed.
- [DECISION] Verification result: post-merge `node scripts/static-check.js` passed.
- [DECISION] Verification result: post-merge `npm run test:e2e` passed.
- [DECISION] Verification result: post-merge `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: post-merge `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: post-merge `npm run release:check` passed with `coverage:lib` at 92.9 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.1, and package contents verified at 534 files.
- [DECISION] Verification result: post-latest-main 2.5.2 `npm run test:surface` passed.
- [DECISION] Verification result: post-latest-main 2.5.2 `node scripts/test-gate.js` passed.
- [DECISION] Verification result: post-latest-main 2.5.2 `node scripts/test-install-smoke.js` passed.
- [DECISION] Verification result: post-latest-main 2.5.2 `node scripts/static-check.js` passed.
- [DECISION] Verification result: post-latest-main 2.5.2 `npm run test:e2e` passed.
- [DECISION] Verification result: post-latest-main 2.5.2 `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: post-latest-main 2.5.2 `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: post-latest-main 2.5.2 `npm run release:check` passed with `coverage:lib` at 92.9 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.2, and package contents verified at 534 files.
- [DECISION] Verification result: clean release-clone `bash scripts/release.sh 2.5.2` passed its release gate before tagging.
- [DECISION] Verification result: release-status closeout confirmed GitHub Publish to npm workflow `27289417888` completed successfully for tag `v2.5.2`.
- [DECISION] Verification result: release-status closeout confirmed `npm view godpowers version dist-tags` resolved `latest` to `2.5.2`.
- [DECISION] Verification result: release-status closeout ran `npm run verify:published-install` after publish and passed against npm `godpowers@latest` version `2.5.2`.
- [DECISION] Verification result: release-status closeout confirmed GitHub release `v2.5.2` exists at `https://github.com/aihxp/godpowers/releases/tag/v2.5.2`.
- [DECISION] Verification result: release-status closeout ran `npm run lint` and passed.
- [DECISION] Verification result: release-status closeout ran `npm run release:check` after `npm ci` installed local dependencies and passed with `coverage:lib` at 92.9 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.5.2, and package contents verified at 534 files.
- [DECISION] Release result: PR #12 merged through the protected GitHub path on 2026-06-10 at merge commit `6a09a6117bfc83f7bca29402a75b2e2cf732aa1a`.
- [DECISION] Release result: `v2.5.2` was tagged and pushed to trigger the repository publish workflow.
- [DECISION] Release result: GitHub Publish to npm workflow `27289417888` passed, and npm published `godpowers@2.5.2` with provenance.
- [DECISION] Release result: `npm run verify:published-install` passed after publish and resolved npm `godpowers@latest` to version 2.5.2.
- [DECISION] Release result: GitHub release `v2.5.2` was created at `https://github.com/aihxp/godpowers/releases/tag/v2.5.2`.
- [DECISION] Blockers: no Phase 2 deliverable blocker remains.
- [DECISION] Blockers: no 2.5.2 release blocker remains.
- [DECISION] Next phase to run after this blocker patch is Phase 3: MCP Companion Package.

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

### Phase 3 Run Status

- [DECISION] Status: complete after release and registry closeout on branches `codex/bridge-phase-3-mcp`, `codex/bridge-phase-3-publish-blocker`, `codex/bridge-phase-3-release-closeout-e273`, `codex/bridge-phase-3-registry-blocker-46d1`, and `codex/bridge-phase-3-release-status-e273` for the 2026-06-10 automation runs.
- [DECISION] Completed work: added the `@godpowers/mcp` companion workspace package with a CommonJS stdio MCP server, five read-only tools, and an explicit Codex setup writer guarded by `--write`.
- [DECISION] Completed work: exposed MCP tools named `status`, `next`, `gate_check`, `lint_artifact`, and `trace_requirement`, all wrapping existing Godpowers `lib/` runtime modules without adding production dependencies to the main `godpowers` package.
- [DECISION] Completed work: added `godpowers mcp-info --project=.` as a read-only main CLI helper that prints MCP setup instructions without requiring the MCP SDK.
- [DECISION] Completed work: updated host capability reporting so dashboard and quick-proof host guarantee lines include MCP availability without changing full, degraded, or unknown host levels.
- [DECISION] Completed work: updated `/god-status` and `/god-next` to prefer MCP tools when available and fall back to the CLI or runtime modules otherwise.
- [DECISION] Completed work: updated package metadata, package lock, `CHANGELOG.md`, `RELEASE.md`, `README.md`, `docs/reference.md`, `docs/quick-proof.md`, `docs/host-capabilities.md`, `docs/mcp.md`, `docs/ROADMAP.md`, `ARCHITECTURE.md`, `SECURITY.md`, `USERS.md`, and `agents/context.md` for version 2.6.0 and the Phase 3 release surface.
- [DECISION] Completed work: PR #23 added the companion package publish step to `.github/workflows/publish.yml`, added a static release check for that step, and aligned `scripts/release.sh` with the root and companion package release path.
- [DECISION] Verification result: `npm --workspace @godpowers/mcp test` passed and covered MCP initialize, tools/list, one tools/call per tool against `fixtures/quick-proof/project`, and explicit Codex setup writes.
- [DECISION] Verification result: `npm --workspace @godpowers/mcp run pack:check` passed with the companion package payload verified at 8 files.
- [DECISION] Verification result: `npm run test:e2e` passed.
- [DECISION] Verification result: `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: repo documentation sync and repo surface sync were fresh after updating `SECURITY.md` to the 2.6.x support series.
- [DECISION] Verification result: changed files contained no em dashes, en dashes, or emoji characters.
- [DECISION] Verification result: `npm run release:check` passed with `coverage:lib` at 92.85 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 535 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: after merging latest `origin/main`, `npm --workspace @godpowers/mcp test`, `npm --workspace @godpowers/mcp run pack:check`, `node scripts/test-gate.js`, `node scripts/test-install-smoke.js`, `node scripts/static-check.js`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, and `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: after merging latest `origin/main`, `npm run release:check` passed with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 535 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: Phase 3 release closeout ran `npm --workspace @godpowers/mcp test`, `npm --workspace @godpowers/mcp run pack:check`, `node scripts/static-check.js`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, and `npm run release:check` before PR #23, and all passed.
- [DECISION] Verification result: PR #23 CI passed `Test (Node 18)`, `Test (Node 20)`, `Test (Node 22)`, and `Package check` before merge.
- [DECISION] Verification result: the final pre-tag `npm run release:check` passed at merge commit `84f5ae16f9d07367874ff0abbf597b201453e2ad` with `coverage:lib` at 92.88 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 535 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Release result: PR #18 merged through the protected GitHub path on 2026-06-10 at merge commit `f026ce8ab5e2a25168f9c1d34a3dded233e897fb`.
- [DECISION] Release result: PR #21 recorded the Phase 3 publish blocker at merge commit `e8d098c9e9bd4bd9f6c7040d3c1bda0697f421d1`.
- [DECISION] Release result: PR #23 merged the publish-hook patch through the protected GitHub path on 2026-06-10 at merge commit `84f5ae16f9d07367874ff0abbf597b201453e2ad`.
- [DECISION] Release result: PR #24 recorded companion registry verification at merge commit `8fe1ae2f505d334392c7a689a3ae1cc409e6f7d9`.
- [DECISION] Release result: `v2.6.0` was tagged on merge commit `84f5ae16f9d07367874ff0abbf597b201453e2ad` and pushed to trigger the repository publish workflow.
- [DECISION] Release result: GitHub Publish to npm workflow `27291159615` succeeded for tag `v2.6.0` with `npm run release:check`, root package publish, and companion package publish steps all green.
- [DECISION] Release result: `npm view godpowers version dist-tags --json` resolved `latest` to `2.6.0`.
- [DECISION] Release result: `npm run verify:published-install` passed after publish and resolved npm `godpowers@latest` to version `2.6.0`.
- [DECISION] Release result: `npm access get status @godpowers/mcp --registry https://registry.npmjs.org/` returned `public`.
- [DECISION] Release result: `npm view @godpowers/mcp version dist-tags --registry https://registry.npmjs.org/ --json` resolved `latest` to `2.6.0` after registry propagation.
- [DECISION] Release result: `npm install --package-lock-only --ignore-scripts @godpowers/mcp@2.6.0 --registry https://registry.npmjs.org/` passed from `/tmp`.
- [DECISION] Release result: `npm exec --package @godpowers/mcp@2.6.0 -- godpowers-mcp --help` passed from `/tmp`.
- [DECISION] Release result: GitHub release `v2.6.0` was created at `https://github.com/aihxp/godpowers/releases/tag/v2.6.0`.
- [DECISION] Blockers: no Phase 3 implementation blocker remains.
- [DECISION] Blockers: no Phase 3 release blocker remains.
- [DECISION] Next phase to run is Phase 4: One-Directional State.

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

### Phase 4 Run Status

- [DECISION] Status: complete after the 2026-06-10 inventory slice on branch `codex/bridge-phase-4-state-inventory-70d8`, the generated state views foundation slice on branch `codex/bridge-phase-4-generated-state-views-b3f2`, the generated state views merge closeout on branch `codex/bridge-phase-4-state-views-closeout-docs-5896`, the state advance CLI mutation slice on branch `codex/bridge-phase-4-state-advance-cli-382b`, the route prerequisite decision-read migration slice on branch `codex/bridge-phase-4-route-prereqs-ef6c`, the per-tier gate decision-read migration slice on branch `codex/bridge-phase-4-tier-gate-state-b950`, the root progress orchestration and writer-instruction migration slice on branch `codex/bridge-phase-4-progress-writers-c3f7`, the generated per-tier state views slice on branch `codex/bridge-phase-4-per-tier-state-views-6d12`, the deploy, observe, and launch handoff-state migration slice on branch `codex/bridge-phase-4-handoff-state-ba19`, and the final 2.7.0 release path on branches `codex/bridge-phase-4-release-205e` and `codex/bridge-phase-4-release-status-205e`.
- [DECISION] Completed work: added `docs/phase-4-state-read-inventory.md` with classified `decision-read`, `display-read`, `migration-read`, and `legacy-source-read` entries for `.godpowers/PROGRESS.md` and Godpowers-owned per-tier `STATE.md` surfaces.
- [DECISION] Completed work: identified schema gaps for initialized-project detection, generated-view metadata, build verification evidence, design state evidence, deploy evidence, observe evidence, launch evidence, and source-system migration metadata.
- [DECISION] Completed work: identified static-check targets for route prerequisites, direct `PROGRESS.md` updates, direct per-tier `STATE.md` reads, and `.planning/STATE.md` legacy-source exceptions.
- [DECISION] Completed work: added `lib/state-views.js` as the generated state view owner for `.godpowers/PROGRESS.md`, including managed fences, checksum validation, atomic writes, user-content preservation outside the fence, and tamper replacement warnings.
- [DECISION] Completed work: wired `lib/state.js` sync and async write paths to refresh generated state views after `state.json` mutations, with an opt-out for callers that need `refreshViews: false`.
- [DECISION] Completed work: added `scripts/test-state-views.js`, registered it in `scripts/run-tests.js`, and added a static check that keeps the test in the full release runner.
- [DECISION] Completed work: updated `lib/README.md` so the runtime module index names the generated state view owner.
- [DECISION] Completed work: added `lib/state-advance.js`, `godpowers state advance --step=<s> --status=<status> --project=.`, parser and dispatch wiring, focused CLI dispatch tests, focused state advance tests, and public CLI helper docs.
- [DECISION] Completed work: changed `lib/state-lock.js` so lock-only acquire, release, and reclaim writes do not refresh generated markdown views before the actual state mutation can report managed-view checksum warnings.
- [DECISION] Completed work: updated `schema/state.v1.json` so the schema accepts the existing `not-required` complete status already used by the state runtime.
- [DECISION] Completed work: added a computed initialized-project state predicate through `lib/state.js`, wired router and recipe predicates to resolve root `state.json` fields and tier fields through one helper, and kept root lifecycle route predicates working from state.
- [DECISION] Completed work: replaced route and recipe initialization checks for `/god-prd`, `/god-design`, `/god-audit`, `/god-context`, `/god-reconcile`, `/god-sync`, `/god-mode`, and the returning-after-break recipe with `state:initialized == true`, preserving the `mode-A-greenfield` escape hatch for new projects.
- [DECISION] Completed work: added router, recipe, state, and static-check coverage proving initialized route decisions no longer depend on `.godpowers/PROGRESS.md`.
- [DECISION] Completed work: migrated design and build gate authority from `.godpowers/design/STATE.md` and `.godpowers/build/STATE.md` to `.godpowers/state.json`.
- [DECISION] Completed work: added state-backed gate checks for `tier-1.design` completion status and `tier-2.build.verification.commands`, updated `lib/artifact-map.js`, extended `schema/state.v1.json` with structured verification command evidence, and added state-backed example and fixture data.
- [DECISION] Completed work: added focused gate tests proving build gates ignore markdown `STATE.md` command claims and added a static check preventing design and build gates from requiring markdown `STATE.md` artifacts again.
- [DECISION] Completed work: migrated root `SKILL.md`, root progress orchestration entry points, lifecycle, status, pause, resume, story, standards, and tier skill writer instructions so `state.json` is authoritative and `.godpowers/PROGRESS.md` is a generated human view or legacy fallback only.
- [DECISION] Completed work: changed tier completion instructions to use `npx godpowers state advance --step=<step> --status=<status> --project=.` or an owning command wrapper instead of direct generated progress view edits.
- [DECISION] Completed work: added static checks that reject direct command-skill `PROGRESS.md` writer instructions and reject command-skill `PROGRESS.md` authority reads unless they are generated-view or legacy fallback reads.
- [DECISION] Completed work: updated README, quick proof docs and tests, concepts, command-flow docs, reference docs, context writer output, and the Phase 4 inventory so user-facing examples teach `state.json` authority.
- [DECISION] Completed work: extended `lib/state-views.js` so `.godpowers/design/STATE.md`, `.godpowers/build/STATE.md`, `.godpowers/deploy/STATE.md`, `.godpowers/observe/STATE.md`, and `.godpowers/launch/STATE.md` are generated managed views with checksum lines inside the existing state-view fence.
- [DECISION] Completed work: generated per-tier views now preserve user prose outside the managed fence, render structured verification command evidence and additional state evidence fields, and refresh from both sync and async state writes.
- [DECISION] Completed work: added tamper replacement, async write, deploy evidence, state advance warning, and static ownership coverage for generated per-tier state views.
- [DECISION] Completed work: updated affected skills, agent contracts, runtime docs, reference docs, command-flow docs, validation docs, changelog, and Phase 4 inventory so generated per-tier `STATE.md` files are described as views from `state.json`.
- [DECISION] Completed work: migrated deploy, observe, and launch route metadata, workflow handoffs, command prompts, specialist agent contracts, feature sync prompts, Pillars sync, and source-system sync-back from generated per-tier state views to `.godpowers/state.json` evidence.
- [DECISION] Completed work: extended `schema/state.v1.json` with structured deploy, observe, and launch evidence fields for readiness scope, target evidence, external access deferrals, waiting artifacts, rollback evidence, SLO evidence, alert evidence, runbook evidence, and launch evidence.
- [DECISION] Completed work: added static checks that reject generated per-tier `STATE.md` route and workflow handoffs, reject direct runtime reads outside `lib/state-views.js` and focused view tests, and reject prompt instructions to direct-edit generated state views.
- [DECISION] Completed work: updated `docs/phase-4-state-read-inventory.md`, `docs/agent-specs.md`, `docs/command-flows.md`, and `docs/greenfield-coverage.md` so the documented handoff authority is `.godpowers/state.json`.
- [DECISION] Completed work: confirmed existing dogfood fixtures still pass without content changes because this slice did not alter fixture inputs or expected files.
- [DECISION] Completed work: confirmed PR #27 merged the generated state views foundation after resolving the Phase 4 inventory merge drift.
- [DECISION] Completed work: updated package metadata, package lock, `CHANGELOG.md`, `RELEASE.md`, `README.md`, `docs/ROADMAP.md`, `docs/reference.md`, `docs/mcp.md`, `packages/mcp/README.md`, `SECURITY.md`, `USERS.md`, `ARCHITECTURE.md`, and `agents/context.md` for version 2.7.0 and the Phase 4 release surface.
- [DECISION] Completed work: updated MCP setup protocol coverage so the expected setup version is derived from `packages/mcp/package.json`.
- [DECISION] Completed work: published npm `godpowers@2.7.0`, npm `@godpowers/mcp@2.7.0`, tag `v2.7.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v2.7.0`.
- [DECISION] Verification result: inventory slice `npm run lint` passed.
- [DECISION] Verification result: inventory slice `npm run test:quick-proof` passed.
- [DECISION] Verification result: inventory slice `npm run test:audit` passed with `npm audit --omit=dev`, `git diff --check`, and `npm run test:surface`.
- [DECISION] Verification result: inventory slice changed-doc banned character scan passed for `docs/BRIDGE-PLAN.md` and `docs/phase-4-state-read-inventory.md`.
- [DECISION] Verification result: `node scripts/test-state-views.js` passed.
- [DECISION] Verification result: `node scripts/test-state.js` passed.
- [DECISION] Verification result: `node scripts/static-check.js` passed.
- [DECISION] Verification result: state advance slice `node scripts/test-state-advance.js` passed.
- [DECISION] Verification result: state advance slice `node scripts/test-cli-dispatch.js` passed.
- [DECISION] Verification result: state advance slice `node scripts/test-state-lock.js` passed.
- [DECISION] Verification result: state advance slice temp-project CLI smoke passed for `node bin/install.js state advance --step=prd --status=done --project=<tmp> --json`.
- [DECISION] Verification result: `npm run test:e2e` passed.
- [DECISION] Verification result: `node scripts/test-runtime-verification.js` passed.
- [DECISION] Verification result: `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: `npm ci` passed and reported 0 vulnerabilities.
- [DECISION] Verification result: `npm run release:check` passed with `coverage:lib` at 92.94 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 536 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: state advance slice `npm run release:check` passed after `npm ci` installed local dependencies, with `coverage:lib` at 92.83 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 537 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: state advance slice changed-file banned character scan passed.
- [DECISION] Verification result: state advance merge closeout passed `node scripts/test-state-advance.js`, `node scripts/test-cli-dispatch.js`, `node scripts/test-state.js`, `node scripts/test-state-views.js`, `node scripts/test-state-lock.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm ci`, changed-file banned character scan, and `npm run release:check` with `coverage:lib` at 92.83 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, root package contents verified at 537 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: PR #29 CI passed `Test (Node 18)`, `Test (Node 20)`, `Test (Node 22)`, and `Package check` before merge.
- [DECISION] Verification result: route prerequisite slice `node scripts/test-router.js`, `node scripts/test-recipes.js`, `node scripts/test-state.js`, and `node scripts/static-check.js` passed.
- [DECISION] Verification result: route prerequisite slice `npm run test:e2e`, `node scripts/test-runtime-verification.js`, and `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: route prerequisite slice `npm ci` passed and reported 0 vulnerabilities after the first release gate attempt found missing local `c8`.
- [DECISION] Verification result: route prerequisite slice `npm run release:check` passed with `coverage:lib` at 92.83 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 537 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: route prerequisite slice post-closeout `npm run test:audit`, `node scripts/static-check.js`, and changed-file banned character scan passed.
- [DECISION] Verification result: per-tier gate slice `node scripts/test-gate.js`, `node scripts/test-state.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, and `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: per-tier gate slice `npm ci` passed and reported 0 vulnerabilities after the first release gate attempt found missing local `c8`.
- [DECISION] Verification result: per-tier gate slice `npm run release:check` passed twice after dependency installation, with the final run reporting `coverage:lib` at 92.71 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 538 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: root progress and writer-instruction slice passed `node scripts/static-check.js`, `node scripts/test-context-writer.js`, `node scripts/test-quick-proof.js`, `node scripts/test-state-advance.js`, `node scripts/test-state-views.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run test:audit`, `npm run test:quick-proof`, and changed-file banned character scan.
- [DECISION] Verification result: root progress and writer-instruction slice `npm ci` passed and reported 0 vulnerabilities after the first release gate attempt found missing local `c8`.
- [DECISION] Verification result: root progress and writer-instruction slice `npm run release:check` passed with `coverage:lib` at 92.71 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 538 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: generated per-tier state views slice passed `node scripts/test-state-views.js`, `node scripts/test-state-advance.js`, `node scripts/test-state.js`, `node scripts/test-cli-dispatch.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:audit`, `npm run test:quick-proof`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run pack:check`, `git diff --check`, and changed-file banned character scan.
- [DECISION] Verification result: generated per-tier state views slice `npm ci` passed and reported 0 vulnerabilities after the first release gate attempt found missing local `c8`.
- [DECISION] Verification result: generated per-tier state views slice `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 538 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: handoff-state migration slice passed `node scripts/static-check.js`, `node scripts/test-router.js`, `node scripts/test-pillars.js`, `node scripts/test-planning-systems.js`, `node scripts/test-workflow-runner.js`, `node scripts/test-state.js`, `node scripts/test-state-views.js`, `node bin/install.js dogfood --json`, `npm run lint`, `npm run test:quick-proof`, `npm run test:audit`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run pack:check`, `git diff --check`, and changed-file banned character scans.
- [DECISION] Verification result: handoff-state migration slice `npm ci` passed and reported 0 vulnerabilities after the first release gate attempt found missing local `c8`.
- [DECISION] Verification result: handoff-state migration slice `npm run release:check` passed with `coverage:lib` at 92.78 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.6.0, root package contents verified at 538 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: final release path passed `npm ci`, `node scripts/test-state-advance.js`, `node scripts/test-state-views.js`, `npm --workspace @godpowers/mcp test`, `node scripts/static-check.js`, `npm run lint`, `npm run test:quick-proof`, `npm run test:audit`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `npm run pack:check`, `npm run pack:mcp:check`, `node bin/install.js dogfood --json`, repo documentation sync, repo surface sync, release surface sync, changed-file banned character scan, and `git diff --check`.
- [DECISION] Verification result: final release path `npm run release:check` passed locally and in a clean clone, with `coverage:lib` at 92.78 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 2.7.0, root package contents verified at 538 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: PR #40 CI passed `Test (Node 18)`, `Test (Node 20)`, `Test (Node 22)`, and `Package check`.
- [DECISION] Verification result: main CI run `27303847386` passed on merge commit `026f7f609548278a823ab14ff6a76cc291bdb5d4`.
- [DECISION] Verification result: publish workflow `27304053692` passed with `Release gate`, root package publish, and companion package publish steps green.
- [DECISION] Verification result: npm registry checks resolved `godpowers@latest` and `@godpowers/mcp@latest` to `2.7.0`, and `npm access get status @godpowers/mcp` returned `public`.
- [DECISION] Verification result: `npm run verify:published-install` passed after publish.
- [DECISION] Verification result: `npm install --package-lock-only --ignore-scripts @godpowers/mcp@2.7.0` and `npm exec --package @godpowers/mcp@2.7.0 -- godpowers-mcp --help` passed from a temp directory.
- [DECISION] Verification result: `gh release view v2.7.0` passed after GitHub release creation.
- [DECISION] Release result: no npm publish or version bump was attempted because this was an independent Phase 4 foundation slice, not the complete 2.7.0 release.
- [DECISION] Verification result: the merge closeout passed `npm ci`, `node scripts/test-state-views.js`, `node scripts/test-state.js`, `node scripts/static-check.js`, `npm run lint`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, and `npm run release:check` with `coverage:lib` at 92.94 percent line coverage, root package contents verified at 536 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Release result: no npm publish or version bump was attempted for the state advance CLI mutation slice because Phase 4 remains partial.
- [DECISION] Release result: no npm publish or version bump was attempted for the state advance merge closeout because Phase 4 remains partial.
- [DECISION] Release result: PR #29 merged through the protected GitHub path on 2026-06-10 at merge commit `cf26523c49ef378ad775e1d10c08b0a616622a2e`.
- [DECISION] Release result: no npm publish or version bump was attempted for the route prerequisite decision-read migration slice because Phase 4 remains partial.
- [DECISION] Release result: no npm publish or version bump was attempted for the per-tier gate decision-read migration slice because Phase 4 remains partial.
- [DECISION] Release result: no npm publish or version bump was attempted for the root progress and writer-instruction slice because Phase 4 remains partial.
- [DECISION] Release result: no npm publish or version bump was attempted for the generated per-tier state views slice because Phase 4 remains partial.
- [DECISION] Release result: no npm publish or version bump was attempted for the handoff-state migration slice because this was not the final 2.7.0 release path.
- [DECISION] Release result: PR #40 merged through the protected GitHub path on 2026-06-10 at merge commit `026f7f609548278a823ab14ff6a76cc291bdb5d4`.
- [DECISION] Release result: `v2.7.0` was tagged on merge commit `026f7f609548278a823ab14ff6a76cc291bdb5d4` and pushed to trigger the repository publish workflow.
- [DECISION] Release result: GitHub Publish to npm workflow `27304053692` succeeded for tag `v2.7.0` with `npm run release:check`, root package publish, and companion package publish steps all green.
- [DECISION] Release result: `npm view godpowers version dist-tags --json` resolved `latest` to `2.7.0`.
- [DECISION] Release result: `npm view @godpowers/mcp version dist-tags --registry https://registry.npmjs.org/ --json` resolved `latest` to `2.7.0`.
- [DECISION] Release result: GitHub release `v2.7.0` was created at `https://github.com/aihxp/godpowers/releases/tag/v2.7.0`.
- [DECISION] Blockers: no blocker remains for the generated state views foundation slice, merge closeout, state advance CLI mutation slice, or route prerequisite decision-read migration slice.
- [DECISION] Blockers: no blocker remains for the per-tier gate decision-read migration slice.
- [DECISION] Blockers: no blocker remains for the root progress and writer-instruction migration slice.
- [DECISION] Blockers: no blocker remains for the generated per-tier state views slice.
- [DECISION] Blockers: no blocker remains for the handoff-state migration slice.
- [DECISION] Blockers: no Phase 4 release blocker remains.
- [DECISION] Remaining Phase 4 work: none.
- [DECISION] Next phase to run is Phase 5: Surface Contraction.

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

### Phase 5 Run Status

- [DECISION] Status: partial after the 2026-06-10 proof-campaign usage mapping and core profile evidence boundary slice on branch `codex/bridge-phase-5-surface-evidence-5283`.
- [DECISION] Completed work: added `docs/surface-contraction.md` as the repository-checked evidence boundary for mapping Phase 2 host-proof slash commands, CLI proof helpers, and current install profile counts before behavior changes.
- [DECISION] Completed work: linked the evidence boundary from `docs/reference.md` so command-surface documentation points to the Phase 5 source evidence.
- [DECISION] Completed work: added `scripts/test-surface-contraction.js` and registered it in `scripts/run-tests.js` so release checks fail if the evidence document drops proof sources, current profile counts, command mappings, or explicit exceptions.
- [DECISION] Verification result: `node scripts/test-surface-contraction.js` passed.
- [DECISION] Verification result: `node scripts/test-installer-profiles.js` passed.
- [DECISION] Verification result: `node scripts/static-check.js` passed.
- [DECISION] Verification result: `node scripts/test-doc-surface-counts.js` passed.
- [DECISION] Verification result: `node scripts/test-repo-doc-sync.js` passed.
- [DECISION] Verification result: `node scripts/test-repo-surface-sync.js` passed.
- [DECISION] Verification result: `node scripts/test-command-families.js` passed.
- [DECISION] Verification result: `npm run test:quick-proof` passed.
- [DECISION] Verification result: `npm run test:audit` passed with `npm audit --omit=dev`, `git diff --check`, and public surface count checks green.
- [DECISION] Verification result: `npm run lint` passed.
- [DECISION] Verification result: `npm ci` installed local dependencies after the first release-check attempt found `c8` missing in this worktree.
- [DECISION] Verification result: `npm run release:check` passed with `coverage:lib` at 92.78 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, root package contents verified at 538 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Release result: no npm publish, GitHub release, package version change, `CHANGELOG.md`, or `RELEASE.md` update was attempted because this slice did not ship runtime behavior or a release.
- [DECISION] Blockers: no blocker remains for this evidence boundary slice.
- [DECISION] Remaining work: implement thin verb dispatch skills and routing metadata, add deprecation metadata plus successors, fold `god-locate` and `god-lifecycle` into `god-status` flags, flip the omitted installer profile default from `full` to `core`, and update release artifacts for the 3.0.0 behavior change.
- [DECISION] Next phase task to run is Phase 5 verb dispatch and profile-default behavior slice.
- [DECISION] Status: merged and release-prepared after the 2026-06-10 verb dispatch and profile-default behavior slice on branch `codex/bridge-phase-5-verbs-profile-f1f4`.
- [DECISION] Completed work: added thin dispatch skills and routing metadata for `/god-plan`, `/god-fix`, `/god-ship`, `/god-capture`, and `/god-extend`.
- [DECISION] Completed work: changed omitted installer profiles to resolve to `core`, kept `--profile=full` as the full command surface, and verified the profile counts as `core` 16, `builder` 40, `maintainer` 48, `suite` 21, and `full` 117.
- [DECISION] Completed work: added `deprecated: true` and `successor` metadata for the folded compatibility commands and routed `god-locate` plus `god-lifecycle` through `god-status --locate` and `god-status --lifecycle`.
- [DECISION] Completed work: updated command families, installer help, public documentation, first-party extension compatibility ranges, package metadata, `CHANGELOG.md`, and `RELEASE.md` for `3.0.0`.
- [DECISION] Verification result: `node scripts/test-installer-profiles.js`, `node scripts/test-surface-contraction.js`, `node scripts/test-command-families.js`, `node scripts/validate-skills.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/static-check.js`, `node scripts/test-router.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-automation-surface-sync.js`, `node scripts/test-repo-surface-sync.js`, `node scripts/test-quick-proof.js`, `npm ci`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `node scripts/test-install-smoke.js`, `node bin/install.js dogfood --json`, `npm --workspace @godpowers/mcp test`, `npm run pack:check`, `npm run pack:mcp:check`, `npm run lint`, `npm run test:audit`, and `npm run release:check` passed.
- [DECISION] Verification result: `npm run release:check` included the full release test runner, `npm audit --omit=dev` with 0 vulnerabilities, public surface documentation checks for version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Release result: PR https://github.com/aihxp/godpowers/pull/43 merged at 2026-06-10T21:33:07Z with Node 18, Node 20, Node 22, and Package check passing, and no npm publish, GitHub tag, or GitHub release was attempted in this behavior slice.
- [DECISION] Blockers: publishing is blocked until final release verification from merged main, npm credentials, and repository release hooks are available.
- [DECISION] Remaining work: run final `3.0.0` release verification from merged main, publish the root and MCP packages, create the `v3.0.0` tag and GitHub release, and verify published installs.
- [DECISION] Next phase task to run is Phase 5 release publish closeout.
- [DECISION] Status: complete after the 2026-06-10 release publish closeout on branch `codex/bridge-phase-5-release-closeout-fc18`.
- [DECISION] Completed work: ran final release verification from merged main, verified registry credentials and repository publish secret visibility, and used a clean `main` clone to run `bash scripts/release.sh 3.0.0`.
- [DECISION] Completed work: pushed tag `v3.0.0`, let publish workflow `27308383323` publish the root and MCP packages with provenance, created GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.0.0`, and verified published installs.
- [DECISION] Verification result: `npm ci` passed and reported 0 vulnerabilities.
- [DECISION] Verification result: `npm run test:e2e`, `node scripts/test-runtime-verification.js`, and `node scripts/test-agent-browser.js` passed.
- [DECISION] Verification result: local `npm run release:check` passed with `coverage:lib` at 92.79 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version 3.0.0, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: clean-clone `bash scripts/release.sh 3.0.0` passed after the generated `node-compile-cache/` directory from `npm ci` was cleared from the temporary clone.
- [DECISION] Verification result: publish workflow `27308383323` passed from tag `v3.0.0` at commit `c951818661f57cbbabd4e9c531eb3ca99bc5da4d`.
- [DECISION] Verification result: `npm view godpowers version dist-tags --json` resolved `latest` to `3.0.0`.
- [DECISION] Verification result: `npm view @godpowers/mcp version dist-tags --registry https://registry.npmjs.org/ --json` resolved `latest` to `3.0.0`.
- [DECISION] Verification result: `npm run verify:published-install` passed against `godpowers@latest`.
- [DECISION] Verification result: `npm exec --yes --package @godpowers/mcp@3.0.0 -- godpowers-mcp --help` passed.
- [DECISION] Verification result: `gh release view v3.0.0 --repo aihxp/godpowers` passed.
- [DECISION] Release result: npm `godpowers@3.0.0`, npm `@godpowers/mcp@3.0.0`, tag `v3.0.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v3.0.0` are published.
- [DECISION] Blockers: no Phase 5 blocker remains.
- [DECISION] Remaining work: none for Phase 5.
- [DECISION] Next phase to run is Phase 6: Prompt Diet Completion And Agent Contracts.

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

### Phase 6 Run Status

- [DECISION] Status: complete after the 2026-06-10 locking reference pointer cleanup and static enforcement slice on branch `codex/bridge-phase-6-locking-fe86`, the 2026-06-10 structured agent contracts slice on branch `codex/bridge-phase-6-agent-contracts-86bd`, the 2026-06-10 CLI dispatch coverage boundary slice on branch `codex/bridge-phase-6-cli-coverage-boundary-1da4`, and the 2026-06-10 evidence-based agent merge slice on branch `codex/bridge-phase-6-agent-merge-1df6`.
- [DECISION] Completed work: verified `references/shared/LOCKING.md` exists as the shared state-lock contract.
- [DECISION] Completed work: replaced 29 inline skill `## Locking` sections with one-line shared reference pointers.
- [DECISION] Completed work: tightened `scripts/static-check.js` so skills and agents cannot add inline locking sections, while known mutating skills must keep the shared locking pointer.
- [DECISION] Completed work: added machine-readable `inputs`, `outputs`, `gates`, and `handoff` frontmatter to all 40 shipped specialist agents.
- [DECISION] Completed work: tightened `lib/agent-validator.js` so missing or invalid structured contract frontmatter is counted, validated as non-empty string arrays, and upgraded to warning severity after at least 20 agents have complete contracts.
- [DECISION] Completed work: changed output ownership validation to prefer structured `outputs` frontmatter before falling back to prose scanning for older unstructured agents.
- [DECISION] Completed work: added a static release check for complete specialist-agent structured contract coverage and updated `/god-agent-audit` documentation with the new contract warning policy.
- [DECISION] Completed work: verified `lib/cli-dispatch.js` owns the extracted command runner table while `bin/install.js` re-exports the shared dispatch table.
- [DECISION] Completed work: tightened `scripts/static-check.js` so the release gate preserves the CLI dispatch coverage boundary, including `lib/**/*.js` coverage, no `bin/` inclusion in the lib-only ratchet, installer delegation to `lib/cli-dispatch.js`, and dispatch tests that exercise both surfaces.
- [DECISION] Completed work: updated `docs/validation.md` so the documented validation model names the CLI dispatch extraction, `scripts/test-cli-dispatch.js`, and the c8 lib coverage boundary.
- [DECISION] Completed work: merged legacy roadmap-only reconciliation into `god-reconciler` because Phase 2 evidence did not record standalone `/god-roadmap-check` use, Phase 5 deprecated `/god-roadmap-check`, and `god-reconciler` already owns the integrated ROADMAP verdict.
- [DECISION] Completed work: routed `/god-roadmap-check` to `god-reconciler`, converted `agents/god-roadmap-reconciler.md` to a compatibility adapter, and updated runtime sync recommendations to point lifecycle ambiguity at `god-reconciler`.
- [DECISION] Completed work: added router and static checks that prevent active routing, sync helpers, and skill guidance from pointing back to `god-roadmap-reconciler`.
- [DECISION] Completed work: updated `docs/reference.md`, `docs/agent-specs.md`, `docs/repo-surface-sync.md`, `ARCHITECTURE-MAP.md`, `SKILL.md`, and affected skill docs so current docs name `god-reconciler` as the active owner.
- [DECISION] Verification result: `node scripts/static-check.js` passed.
- [DECISION] Verification result: `node scripts/test-agent-validator.js` passed.
- [DECISION] Verification result: `node scripts/validate-skills.js` passed.
- [DECISION] Verification result: `node scripts/test-doc-surface-counts.js` passed.
- [DECISION] Verification result: `node scripts/test-repo-doc-sync.js` passed.
- [DECISION] Verification result: `node scripts/test-repo-surface-sync.js` passed.
- [DECISION] Verification result: `git diff --check` passed.
- [DECISION] Verification result: changed-file banned character scan passed across 31 changed files.
- [DECISION] Verification result: `npm ci` passed and reported 0 vulnerabilities.
- [DECISION] Verification result: `npm run release:check` passed with `coverage:lib` at 92.79 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: structured agent contracts slice passed `node scripts/test-agent-validator.js`, `node scripts/static-check.js`, `node scripts/validate-skills.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-repo-surface-sync.js`, `git diff --check`, changed-file banned character scan across 45 changed files, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, and `npm run test:audit`.
- [DECISION] Verification result: structured agent contracts slice `npm ci` passed and reported 0 vulnerabilities after the first `npm run release:check` attempt found missing local `c8`.
- [DECISION] Verification result: structured agent contracts slice `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: CLI dispatch coverage boundary slice passed `node scripts/test-cli-dispatch.js`, `node scripts/static-check.js`, `node scripts/test-doc-surface-counts.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-repo-surface-sync.js`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `git diff --check`, and changed-file banned character scan across 3 changed files.
- [DECISION] Verification result: CLI dispatch coverage boundary slice `npm ci` passed and reported 0 vulnerabilities after the first `npm run release:check` attempt found missing local `c8`.
- [DECISION] Verification result: CLI dispatch coverage boundary slice `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Verification result: evidence-based agent merge slice passed `node scripts/test-router.js`, `node scripts/static-check.js`, `node scripts/test-agent-validator.js`, `node scripts/test-repo-surface-sync.js`, `node scripts/test-repo-doc-sync.js`, `node scripts/test-automation-surface-sync.js`, `node scripts/test-recipes.js`, direct route and sync recommendation probe, `npm ci`, `npm run test:e2e`, `node scripts/test-runtime-verification.js`, `node scripts/test-agent-browser.js`, `node scripts/validate-skills.js`, `node scripts/test-doc-surface-counts.js`, `git diff --check`, changed-file banned character scan across 18 changed files, and `npm run release:check`.
- [DECISION] Verification result: evidence-based agent merge slice `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because this slice changed prompt-surface guidance and release enforcement only.
- [DECISION] Release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted for the structured agent contracts slice because this slice changed agent metadata and validation only.
- [DECISION] Release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted for the CLI dispatch coverage boundary slice because this slice changed release enforcement and validation docs only.
- [DECISION] Release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted for the evidence-based agent merge slice because this slice changed internal agent routing, prompts, docs, and validation only.
- [DECISION] Blockers: no Phase 6 blocker remains.
- [DECISION] Remaining work: none for Phase 6.
- [DECISION] Next phase task to run: none.
- [DECISION] Bridge plan status: complete, with no remaining phase work.
- [DECISION] Closeout verification result: 2026-06-11 `npm ci` passed with 0 vulnerabilities after the first `npm run release:check` attempt found missing local `c8`.
- [DECISION] Closeout verification result: 2026-06-11 final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Closeout release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because no phase or release artifact remained to ship.
- [DECISION] Bridge automation result: no remaining phase work is available.
- [DECISION] Re-verification result: 2026-06-11 Codex b397 confirmed the phase status blocks and ledger still show no incomplete bridge phase.
- [DECISION] Re-verification result: 2026-06-11 `npm ci` passed with 0 vulnerabilities after the first `npm run release:check` attempt found missing local `c8`.
- [DECISION] Re-verification result: 2026-06-11 final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Re-verification release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains.
- [DECISION] Re-verification result: 2026-06-11 Codex bf1e confirmed the phase status blocks and ledger still show no incomplete bridge phase.
- [DECISION] Re-verification result: 2026-06-11 `npm ci` passed with 0 vulnerabilities after the first `npm run release:check` attempt found missing local `c8`.
- [DECISION] Re-verification result: 2026-06-11 final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Re-verification result: 2026-06-11 post-closeout `git diff --check`, bridge-plan banned character scan, and `node scripts/test-doc-surface-counts.js` passed.
- [DECISION] Re-verification release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains.
- [DECISION] Re-verification result: 2026-06-11 Codex 71a9 confirmed the phase status blocks and ledger still show no incomplete bridge phase.
- [DECISION] Re-verification result: 2026-06-11 `npm ci` passed with 0 vulnerabilities after the first `npm run release:check` attempt found missing local `c8`.
- [DECISION] Re-verification result: 2026-06-11 final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Re-verification release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains.
- [DECISION] Re-verification result: 2026-06-11 Codex bc4d confirmed the phase status blocks and ledger still show no current incomplete bridge phase.
- [DECISION] Re-verification result: 2026-06-11 `npm ci` passed with 0 vulnerabilities.
- [DECISION] Re-verification result: 2026-06-11 final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Re-verification release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains.
- [DECISION] Re-verification result: 2026-06-11 Codex 0c62 confirmed the phase status blocks and ledger still show no current incomplete bridge phase, with the historical Phase 5 partial line superseded by later Phase 5 completion.
- [DECISION] Re-verification result: 2026-06-11 `npm ci` passed with 0 vulnerabilities.
- [DECISION] Re-verification result: 2026-06-11 final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Re-verification release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains.
- [DECISION] Re-verification result: 2026-06-11 Codex 73e8 confirmed the phase status blocks and ledger still show no current incomplete bridge phase, with the historical Phase 5 partial line superseded by later Phase 5 completion.
- [DECISION] Re-verification result: 2026-06-11 `npm ci` passed with 0 vulnerabilities.
- [DECISION] Re-verification result: 2026-06-11 final `npm run release:check` passed with `coverage:lib` at 92.77 percent line coverage, `npm audit --omit=dev` reporting 0 vulnerabilities, public surface docs matching version `3.0.0`, root package contents verified at 548 files, and `@godpowers/mcp` package contents verified at 8 files.
- [DECISION] Re-verification release result: no npm publish, tag, GitHub release, package version bump, `CHANGELOG.md`, or `RELEASE.md` update was attempted because bridge release `3.0.0` is already published and no phase work remains.

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
