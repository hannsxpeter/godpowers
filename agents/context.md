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
- [DECISION] The package name is `godpowers`, and the current repository version is `6.0.0`.
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
- Related artifact: `.godpowers/state.json`.
- Related artifact: `RELEASE.md`.
- Rule: keep this pillar aligned when these artifacts change durable context truth.

### Extracted durable signals

From `RELEASE.md`:
- [DECISION] Godpowers 6.0.0 hardens the complete coding-agent harness: verification output, specialist context, larger-change design, slice resume, maintainability interpretation, and sequential changeability evidence now have executable contracts.
- [DECISION] The public surface contains 124 slash commands, 41 specialist agents, 13 workflows, and 45 recipes; no command, specialist, workflow, or recipe was added, removed, or renamed.
- [DECISION] The core package contains 112 runtime library modules, supports Node.js 18 or newer, and keeps zero production dependencies.
- [DECISION] The read-only `@godpowers/mcp` companion shares version 6.0.0, uses the MCP v2 server package, and requires Node.js 20 or newer.
- [DECISION] The package contains 110 focused test scripts, including the new harness-quality and authorized provenance suites.
- [DECISION] `npm test -- --agent-output` retains complete child bytes in a private log while presenting bounded aggregate success or focused first-failure evidence; normal output remains unchanged without the flag.
- [DECISION] All 41 specialists declare required context, optional context, inline inputs, and a positive token cap or an explicit no-project-context contract; file sources reject symlinks and retain pinned bytes, and every loadout event path preserves complete counts but no source contents.
- [DECISION] Medium and large Build plans require a program design approved by a hash-bound `user.resolve` event, while small plans require a recorded size and skip rationale; plan text cannot authorize itself.
<!-- godpowers:pillar-sync:end -->
