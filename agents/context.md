---
pillar: context
status: active
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
- [DECISION] The package name is `godpowers`, and the current repository version is `5.3.0`.
- [DECISION] The primary audience is solo founders and small engineering teams using AI coding tools who need accountable production workflow discipline without enterprise process.
- [DECISION] The product promise is one slash-command arc from idea to hardened, observable, launch-ready software with traceable artifacts on disk.
- [DECISION] Godpowers uses a pure-skill model where `npx godpowers` installs runtime files and in-tool slash commands perform work.
- [DECISION] The native context layer is Pillars: root `AGENTS.md` plus routed `agents/*.md` files.
- [DECISION] Workflow state lives in `.godpowers/` and is authoritative for Godpowers command resumes.

## Rules

- [DECISION] Generated artifacts must label substantive sentences as `[DECISION]`, `[HYPOTHESIS]`, or `[OPEN QUESTION]`.
- [DECISION] Generated text must avoid em dashes, en dashes, and emojis.
- [DECISION] Claims must include Godpowers-specific evidence instead of generic AI tooling language.

## Watchouts

- [HYPOTHESIS] User adoption risk concentrates around whether agent spawning, installed runtime metadata, and local validation behave the same across supported AI coding tools.
- [HYPOTHESIS] Documentation drift risk is high because the public surface includes 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [HYPOTHESIS] Adoption risk also concentrates around whether executable gates, dogfood, host guarantees, extension authoring, and suite release dry-runs behave consistently across supported hosts.

## Gaps

- [OPEN QUESTION] Which external messy repository should become the first full host-run adoption case study after `5.3.0`? Owner: maintainer. Due: before the next broad product proof claim.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/prd/PRD.mdx`.
- Related artifact: `.godpowers/roadmap/ROADMAP.mdx`.
- Related artifact: `.godpowers/state.json`.
- Rule: keep this pillar aligned when these artifacts change durable context truth.

## Extracted durable signals

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
- [DECISION] Evidence generated at: `2026-07-13T05:57:20.000Z`.
- [DECISION] Source version: `5.3.0`.
- [DECISION] Source hash `package.json`: `sha256:d9184b8af2fba78e000dbf5c9e8b1c23147a6408d11d32e93848340171f73843`.
- [DECISION] Source hash `.godpowers/prd/PRD.mdx`: `sha256:239990ed2eb267c26d3de744bf318d6260bfd67463fec8e7ccccbc348fc1712c`.
- [DECISION] Source hash `.godpowers/arch/ARCH.mdx`: `sha256:ec90f0ec06d07fbc67c3b5ac22f3ae882a10d714ef230316f75823709e44642b`.
- [DECISION] Source hash `.godpowers/stack/DECISION.mdx`: `sha256:cc9e9227262d9d472fa7806fbafc9a83b8e621728c3652fae1a423a867989ce3`.
- [DECISION] Planning completion is backed by passing PRD, design not-required, architecture, roadmap, and stack gates.
- [DECISION] Build, shipping, steady-state, and advanced completion remain backed by the 33 linked requirements and the final release gate recorded in state.
<!-- godpowers:pillar-sync:end -->
