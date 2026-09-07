---
pillar: context
status: present
always_load: true
covers: [project identity, domain language, product promise, user outcomes]
triggers: [godpowers, slash commands, specialist agents, product context, domain]
must_read_with: [repo]
see_also: [arch, quality, deploy]
---

## Scope

- [DECISION] This pillar captures durable product context for the Godpowers repository.

## Context

- [DECISION] Godpowers is an AI-powered development system delivered as slash commands and specialist agents inside AI coding tools.
- [DECISION] The package name is `godpowers`, and the current repository version is `6.4.0`.
- [DECISION] The primary audience is solo founders and small engineering teams using AI coding tools who need accountable production workflow discipline without enterprise process.
- [DECISION] The product promise is one slash-command arc from idea to hardened, observable, launch-ready software with traceable artifacts on disk.
- [DECISION] Godpowers uses a pure-skill model where `npx godpowers` installs runtime files and in-tool slash commands perform work.
- [DECISION] The native context layer is Pillars: root `AGENTS.md` plus routed `agents/*.md` files.
- [DECISION] Workflow state lives in `.godpowers/` and is authoritative for Godpowers command resumes.

## Decisions

- [DECISION] Godpowers 6.4.0 is the current source candidate for adaptive run selection; 6.3.0 remains the latest verified publication until the authorized release transaction completes.
- [DECISION] Ordinary task assessment stays in chat and selects direct, focused, or full work from task, scope, risk, uncertainty, and existing evidence while retaining every explicit command requirement.

- [DECISION] Godpowers 6.3.0 adds product-form verification, feedback-loop debugging, deeper program design, cited why evidence, durable decision traces, and one canonical invocation policy per core route.
- [DECISION] The optional `@godpowers/operations-pack` provides issue triage and a human-only setup wizard without adding a core command or root runtime dependency.
- [DECISION] Godpowers 6.3.0 and `@godpowers/operations-pack` 0.1.0 are published and verified from merged `main` commit `c45d0473ad946fcd7c02a5706b02f51a40ed0d25`.
- [DECISION] Existing `/god-review` and `/god-build` Stage 2 review uses `references/building/BLAST-RADIUS.md` to grade exactly one load-bearing safety fact against a five-level evidence ladder and 10 boundary classes.
- [DECISION] The blast-radius behavior adds no command, route, recipe, workflow, specialist type, production dependency, evidence store, state writer, or execution authority.
- [DECISION] The npm package includes `references/building/BLAST-RADIUS.md`, and installation copies the reference into `godpowers-references/` and the installed runtime bundle through existing data-directory behavior.

## Rules

- [DECISION] Generated artifacts must label substantive sentences as `[DECISION]`, `[HYPOTHESIS]`, or `[OPEN QUESTION]`.
- [DECISION] Generated text must avoid em dashes, en dashes, and emojis.
- [DECISION] Claims must include Godpowers-specific evidence instead of generic AI tooling language.

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] User adoption risk concentrates around whether agent spawning, installed runtime metadata, and local validation behave the same across supported AI coding tools.
- [HYPOTHESIS] Documentation drift risk is high because the public surface includes 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes.
- [HYPOTHESIS] Adoption risk also concentrates around whether executable gates, dogfood, host guarantees, extension authoring, and suite release dry-runs behave consistently across supported hosts.

## Touchpoints

- [DECISION] Durable product truth is synchronized from the PRD, roadmap, and authoritative state through the managed source section below.

## Gaps

- [OPEN QUESTION] Which external messy repository should become the first full host-run adoption case study after `5.5.0`? Owner: maintainer. Due: before the next broad product proof claim.

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/prd/PRD.mdx`.
- Related artifact: `.godpowers/roadmap/ROADMAP.mdx`.
- Related artifact: `.godpowers/state.json`.
- Related artifact: `README.md`.
- Related artifact: `RELEASE.md`.
- Rule: keep this pillar aligned when these artifacts change durable context truth.

### Extracted durable signals

From `.godpowers/prd/PRD.mdx`:
- [DECISION] AI coding agents like Claude Code can write code, but a single prompt cannot carry a project from raw idea to hardened production without losing the plan, skipping review, or forgetting what was already decided across sessions.
- [DECISION] Teams that adopt Claude Code hit 3 recurring failures: the agent narrates progress it did not actually make, the agent re-asks questions it already answered, and the produced artifacts (PRD, architecture, code) drift out of sync with each other within days.
- [DECISION] Primary: solo founders and small engineering teams (1 to 5 people) who use Claude Code or a compatible agent CLI daily and want to ship a real product, not a prototype, without hiring a separate planning function.
- [DECISION] Secondary: engineers inheriting a brownfield repository who need to reconstruct planning artifacts, map technical debt, and onboard an AI agent onto existing code without rewriting it from scratch.
- [HYPOTHESIS] A disk-authoritative workflow that re-derives state from files on every turn, gates every artifact against named failure modes, and traces each requirement to the code that satisfies it will remove most of that drift.
- [DECISION] Within 30 minutes of a fresh install, a first-time user can run one command (`/god-mode`) and reach a committed, test-green vertical slice, measured on the shipped dogfood fixtures.
- [DECISION] Within 10 minutes after a build completes, at least 95 percent of declared requirements trace to implementing code, measured by the linkage coverage percentage that the Godpowers dashboard reports.
- [DECISION] For every release candidate, all release-gate checks reach zero failures within the 60-minute verification window before publication, measured by `scripts/run-tests.js` and `npm run release:check`.

From `.godpowers/roadmap/ROADMAP.mdx`:
- [DECISION] Evidence generated at: `2026-09-07T04:21:51.787Z`.
- [DECISION] Source version: `6.4.0`.
- [DECISION] Latest published version: `6.3.0`; its recorded release evidence remains historical authority for completed increments 1 through 17.
- [DECISION] P-MUST-50 and M-adaptive-run-selection have passed source completion with final Stage 1 and two independent Stage 2 reviews; the canonical full release gate passed, while the fresh hash-bound prepublication gate passed and external publication remains pending.
- [DECISION] Source hash `.godpowers/prd/PRD.mdx`: `sha256:e70d1115760aff602b49419439fbf5d968d255b4a99eaad6fceabfdf2f32b296`.
- [DECISION] Source hash `.godpowers/arch/ARCH.mdx`: `sha256:614155b58068df3e6e9a22f5fd5828e0cc46e5cfa0229dc1ae922f5cfaa36d1f`.
- [DECISION] Source hash `.godpowers/stack/DECISION.mdx`: `sha256:e235b1b722f545a8907036c811ed52d68d90222978d2f2a37b4da1abb821473d`.
- [DECISION] Published 6.3.0 planning completion is backed by its PRD, design not-required, architecture, roadmap, and stack gates; the 6.4.0 PRD, architecture, roadmap, and stack gates passed after artifact and linkage sync.

From `RELEASE.md`:
- [DECISION] Godpowers 6.4.0 adds adaptive run selection so the current host model can choose which existing workflow is useful for an ordinary request.
- [DECISION] The release retains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes.
- [DECISION] The core package contains 117 runtime library modules and keeps zero root production, optional, or peer dependencies.
- [DECISION] The repository contains 117 focused test scripts and 54 core reference documents.
- [DECISION] The root package-content check reports 659 files; this release adds no command, agent, runtime module, or dependency.
- [DECISION] Root `godpowers` and the read-only `@godpowers/mcp` companion declare version 6.4.0, with minimum Node.js versions 18 and 20 respectively.
- [DECISION] The current host model assesses intended task, observed scope, risk, and uncertainty before calling `lib/command-families.selectRunApproach`.
- [DECISION] Ordinary questions and assessments can finish directly in chat without a selector agent, planning artifact, or automatic state initialization.
<!-- godpowers:pillar-sync:end -->
