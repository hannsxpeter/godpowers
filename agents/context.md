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
- [DECISION] The package name is `godpowers`, and the current repository version is `6.2.0`.
- [DECISION] The primary audience is solo founders and small engineering teams using AI coding tools who need accountable production workflow discipline without enterprise process.
- [DECISION] The product promise is one slash-command arc from idea to hardened, observable, launch-ready software with traceable artifacts on disk.
- [DECISION] Godpowers uses a pure-skill model where `npx godpowers` installs runtime files and in-tool slash commands perform work.
- [DECISION] The native context layer is Pillars: root `AGENTS.md` plus routed `agents/*.md` files.
- [DECISION] Workflow state lives in `.godpowers/` and is authoritative for Godpowers command resumes.

## Decisions

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
- Related artifact: `RELEASE.md`.
- Rule: keep this pillar aligned when these artifacts change durable context truth.

### Extracted durable signals

From `RELEASE.md`:
- [DECISION] Godpowers 6.2.0 adds a blast-radius safety case to existing Stage 2 review with exactly one load-bearing safety fact, 10 boundary classes, and a five-level evidence ladder.
- [DECISION] The public surface contains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes; the blast-radius release adds, removes, or renames none of those surfaces.
- [DECISION] The core package contains 113 runtime library modules, supports Node.js 18 or newer, and keeps zero production dependencies.
- [DECISION] The read-only `@godpowers/mcp` companion shares version 6.2.0 and requires Node.js 20 or newer.
- [DECISION] The repository contains 112 focused test scripts, and the published package checks report 647 root files and 8 MCP files.
- [DECISION] Godpowers 6.2.0 is published from merged `main` commit `010f02dbccb17fce42107ce39d681adaa4879251`, and both exact packages resolve under `latest`.

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
- [DECISION] Evidence generated at: `2026-08-19T10:25:32Z`.
- [DECISION] Source version: `6.2.0`.
- [DECISION] Source hash `.godpowers/prd/PRD.mdx`: `sha256:9dea40aead7efc6bbd0d4e43beac0ca462fcaa2c74068da756651743e9ff8a82`.
- [DECISION] Source hash `.godpowers/arch/ARCH.mdx`: `sha256:aeb0948014460064dfad465c88c34f7617861df21622d8921524e1730b2b14d5`.
- [DECISION] Source hash `.godpowers/stack/DECISION.mdx`: `sha256:e235b1b722f545a8907036c811ed52d68d90222978d2f2a37b4da1abb821473d`.
- [DECISION] Planning completion is backed by passing PRD, design not-required, architecture, roadmap, and stack gates.
- [DECISION] Build, shipping, steady-state, advanced, provenance-extension, harness-quality, prose-quality, and blast-radius completion are backed by 55 linked requirements, the 6.2.0 full release gate, and focused executed proof, dual Stage 2, reconciliation, and hardening passes.
- [DECISION] 2026-08-19: Published M-blast-radius-safety-case for P-MUST-36 through P-MUST-43 in Godpowers 6.2.0 after focused executed proof, 2 independent fresh-context Stage 2 passes, reconciliation, final scoped hardening, full release gates, merge and tag identity, provenance publication, registry integrity, and isolated installed-package verification passed.
<!-- godpowers:pillar-sync:end -->
