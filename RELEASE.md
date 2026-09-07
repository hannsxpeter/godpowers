# Godpowers 6.4.0 Release

> Status: Release candidate, publication pending
> Date: 2026-09-07

- [DECISION] Godpowers 6.4.0 adds adaptive run selection so the current host model can choose which existing workflow is useful for an ordinary request.
- [DECISION] The release retains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes.
- [DECISION] The core package contains 117 runtime library modules and keeps zero root production, optional, or peer dependencies.
- [DECISION] The repository contains 117 focused test scripts and 54 core reference documents.
- [DECISION] The root package-content check reports 659 files; this release adds no command, agent, runtime module, or dependency.
- [DECISION] Root `godpowers` and the read-only `@godpowers/mcp` companion declare version 6.4.0, with minimum Node.js versions 18 and 20 respectively.

## Adaptive Run Selection

- [DECISION] The current host model assesses intended task, observed scope, risk, and uncertainty before calling `lib/command-families.selectRunApproach`.
- [DECISION] Ordinary questions and assessments can finish directly in chat without a selector agent, planning artifact, or automatic state initialization.
- [DECISION] A known mechanical edit can use the existing fast path only when scope is bounded, risk is low, uncertainty is low, and the command limits apply.
- [DECISION] Other changes and bugs use focused existing workflows with their required verification and review; whole-project objectives can recommend the full workflow.
- [DECISION] Explicit commands retain their documented contracts, prerequisites, and execution authority, including explicit-only full orchestration and approval-required shipping.
- [DECISION] Conditional steps can be omitted when their conditions do not apply, and valid existing context, plans, and executed evidence can be reused.
- [DECISION] Selection begins with the current host model and reasoning effort; a supported, authorized profile may choose another exposed model.

## Dependency And Documentation Repairs

- [DECISION] The debugger returns its fix uncommitted, and the caller requires independent Stage 1 and Stage 2 review before committing.
- [DECISION] Development-only transitive dependencies `fast-uri` and `qs` were updated to 3.1.7 and 6.16.0 within their existing ranges to resolve the current npm advisories.
- [DECISION] The full dependency audit reports zero vulnerabilities after those two updates, and the production live advisory check is clean.
- [DECISION] Public docs distinguish the current source candidate from the last published release and explain adaptive selection, context budgets, and their limits.
- [DECISION] Project requirements, architecture, roadmap, Pillars, and release evidence are reconciled for this feature before publication.

## Verification And Publication

- [DECISION] The final local `npm run release:check` passed 121 commands with 3,298 reported checks, 94.71 percent line coverage, 80.81 percent branch coverage, and 97.32 percent function coverage.
- [DECISION] The release gate passed official skill validation, Pillars conformance, the per-file coverage floor across 115 modules, 140 self-project truth checks, production and live advisory checks, evidence drift, and root/MCP package checks at 659 and 8 files.
- [DECISION] The separate static lint pass completed 35 checks, and the full dependency audit reports zero vulnerabilities.
- [DECISION] Final Stage 1 review passed, and two independent Stage 2 safety cases passed with level-5 executed evidence across packaged code, installed Claude/Codex instructions, caller order, YAML, shell, and Python/JSON consumers.
- [DECISION] The canonical release gate record is `v-20260907041649849-3b53f98ce728`, and the final full dependency audit record is `v-20260907042336654-aa98a28dc65a`; both sanitized evidence projections were accepted.
- [DECISION] The fresh prepublication check passed at `2026-09-07T04:24:06.425Z` against hardening revision `sha256:0632acf3a6c99059fd484faf0afe049af7567ba6d5f908c66e407da6a2df83d4` with zero unresolved or accepted Critical findings.
- [DECISION] Original independent review records and event chains are retained under `.godpowers/runs/2026-09-07T03-58-45-030Z-2759fa3b/reviews/` with their original execution provenance.
- [OPEN QUESTION] PR and merged-main CI, npm provenance publication, registry integrity, and isolated published behavior must complete for 6.4.0; owner: release maintainer; due: before release closeout.
- [DECISION] The last published root and MCP pair remains 6.3.0 until the 6.4.0 provenance workflow publishes and verifies the new pair.
- [DECISION] The existing `@godpowers/operations-pack@0.1.0` is unchanged and is not republished by this release.

## Upgrade And Limits

- [DECISION] No state migration, artifact migration, command rename, or production dependency change is required.
- [DECISION] After publication, run `npx godpowers@6.4.0 --codex --global --profile=core` or the equivalent flag for the host and profile you already use, then start a fresh session to load the updated instructions.
- [DECISION] Existing running tasks are not retroactively modified by publishing or installing this release.
- [DECISION] The host model supplies the assessment; the helper validates categories and routing, but cannot prove the model's scope or risk judgment correct.
- [DECISION] Context caps limit supplied context per dispatch, and the release makes no total-spend guarantee or measured comparative token-savings claim.
- [DECISION] Version 6.3.0 remains the rollback reference for this candidate.
