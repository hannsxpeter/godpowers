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
- [DECISION] The package name is `godpowers`, and the current repository version is `6.1.0`.
- [DECISION] The primary audience is solo founders and small engineering teams using AI coding tools who need accountable production workflow discipline without enterprise process.
- [DECISION] The product promise is one slash-command arc from idea to hardened, observable, launch-ready software with traceable artifacts on disk.
- [DECISION] Godpowers uses a pure-skill model where `npx godpowers` installs runtime files and in-tool slash commands perform work.
- [DECISION] The native context layer is Pillars: root `AGENTS.md` plus routed `agents/*.md` files.
- [DECISION] Workflow state lives in `.godpowers/` and is authoritative for Godpowers command resumes.

## Decisions

(none)

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
- Related artifact: `RELEASE.md`.
- Rule: keep this pillar aligned when these artifacts change durable context truth.

### Extracted durable signals

From `RELEASE.md`:
- [DECISION] Godpowers 6.1.0 adds a shared post-draft prose audit, a pure advisory scanner, and universal non-blocking U-12 findings without changing the existing three-label, substitution, or blocking artifact checks.
- [DECISION] The public surface contains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes; this release adds, removes, or renames none of those surfaces.
- [DECISION] The core package contains 113 runtime library modules, supports Node.js 18 or newer, and keeps zero production dependencies.
- [DECISION] The read-only `@godpowers/mcp` companion shares version 6.1.0 and requires Node.js 20 or newer.
- [DECISION] The repository contains 111 focused test scripts, and the current root package-content check reports 646 files.
- [DECISION] `references/shared/VOICE.md` now runs one post-draft audit after the draft's meaning, requirements, and evidence are settled.
- [DECISION] The audit checks each claim for a named actor, action or decision, mechanism or source, observable effect, and reader action when one is needed.
- [DECISION] The audit preserves requirements, verified facts, code terms, quotations, and user-approved tone; it does not replace the three-label rule or substitution test.

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
- [DECISION] Evidence generated at: `2026-08-19T06:22:48.578Z`.
- [DECISION] Source version: `6.1.0`.
- [DECISION] Source hash `.godpowers/prd/PRD.mdx`: `sha256:7ac0f025625e6a182f31b0014dec0f2985e5791f1aa99b50dfa69db06e68aec2`.
- [DECISION] Source hash `.godpowers/arch/ARCH.mdx`: `sha256:ea1a27cfdcf250b7fd990d08cf7a0c9dc4b125f333f1490f3605b1f7a6834189`.
- [DECISION] Source hash `.godpowers/stack/DECISION.mdx`: `sha256:e235b1b722f545a8907036c811ed52d68d90222978d2f2a37b4da1abb821473d`.
- [DECISION] Planning completion is backed by passing PRD, design not-required, architecture, roadmap, and stack gates.
- [DECISION] Build, shipping, steady-state, advanced, provenance-extension, harness-quality, and prose-quality completion are backed by 47 linked requirements, the recorded final release gate for the published baseline, and the current source's focused Stage 1, Stage 2, and hardening passes.
- [DECISION] 2026-08-19: Added completed source increment M-prose-quality-hardening for P-MUST-30 through P-MUST-35 after the focused 31-test suite plus independent specification, quality, and hardening reviews passed, with package and full release gates required before publication.
<!-- godpowers:pillar-sync:end -->
