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
- [DECISION] The package name is `godpowers`, and the current repository version is `2.4.3`.
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
- [HYPOTHESIS] Documentation drift risk is high because the public surface includes 112 slash commands, 40 specialist agents, 13 workflows, and 42 intent recipes.
- [HYPOTHESIS] Adoption risk also concentrates around whether dogfood, host guarantees, extension authoring, and suite release dry-runs behave consistently across supported hosts.

## Gaps

- [OPEN QUESTION] Which external messy repository should become the first full host-run adoption case study after `2.4.3`? Owner: maintainer. Due: before the next broad product proof claim.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: proposed for review.
- Related artifact: `README.md`.
- Related artifact: `docs/ROADMAP.md`.
- Related artifact: `docs/adoption-canary.md`.
- Rule: keep this pillar aligned when these artifacts change durable context truth.
<!-- godpowers:pillar-sync:end -->
