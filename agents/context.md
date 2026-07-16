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
- [DECISION] The package name is `godpowers`, and the current repository version is `5.6.0`.
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
- [HYPOTHESIS] Documentation drift risk is high because the public surface includes 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [HYPOTHESIS] Adoption risk also concentrates around whether executable gates, dogfood, host guarantees, extension authoring, and suite release dry-runs behave consistently across supported hosts.

## Touchpoints

- [DECISION] Durable product truth is synchronized from the PRD, roadmap, and authoritative state through the managed source section below.

## Gaps

- [OPEN QUESTION] Which external messy repository should become the first full host-run adoption case study after `5.5.0`? Owner: maintainer. Due: before the next broad product proof claim.

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `RELEASE.md`.
- Related artifact: `docs/ROADMAP.md`.
- Rule: keep this pillar aligned when these artifacts change durable context truth.

### Extracted durable signals

From `RELEASE.md`:
- [DECISION] Godpowers 5.5.0 is the Arc-Ready and Pillars conformance release.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.5.0.
- [DECISION] Product routing selects one of six forms before applying product archetype, industry, or regulatory overlays.
- [DECISION] Each product form carries a distinct vertical slice and completion-evidence contract, so web assumptions do not leak into API, CLI, mobile, data, or infrastructure work.
- [DECISION] OWASP hardening uses the 2025 Web Top 10 and routes supply-chain failures plus exceptional-condition handling as first-class checks.
- [DECISION] Public activation requires `.godpowers/launch/PREPUBLICATION.mdx`, bound to the exact hardening findings hash, authoritative hardening timestamp, and Critical count.
<!-- godpowers:pillar-sync:end -->
