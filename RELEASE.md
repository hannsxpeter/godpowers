# Godpowers 4.0.0 Release

> Status: Ready
> Date: 2026-07-03

[DECISION] Godpowers 4.0.0 is a breaking release: the canonical `.godpowers/` artifact extension changes from `.md` to `.mdx`, and Godpowers gains first-class interop with its sibling superskills godplans (`.godplans/PLAN.mdx`) and godaudits (`.godaudits/AUDIT.mdx`).
[DECISION] This is a major bump because installed runtimes must be refreshed: reads keep a legacy `.md` fallback, but pre-4.0 runtimes and hooks cannot see `.mdx` artifacts.
[DECISION] No new skill, agent, workflow, or recipe surface is added or removed. Surface counts are unchanged: 120 slash commands, 40 specialist agents, 13 workflows, 44 recipes. The lib module count is 91 -> 92 (`lib/sibling-artifacts.js`). The have-nots catalog is 156 -> 157 (U-13 MDX-unsafe artifact content).

## What's in this release

- [DECISION] Breaking artifact extension change: every Godpowers-owned `.godpowers/` artifact is written as `.mdx`. Reads are mdx-first with legacy `.md` fallback (`lib/sync-fs.js` `resolveArtifact`/`readArtifact`); lib-owned generated files absorb a legacy `.md` twin on first write. Exemptions stay `.md`: root `DESIGN.md`/`PRODUCT.md`, `.godpowers/cache/`, foreign planning-system markers, and host pointer files.
- [DECISION] godplans/godaudits interop: `lib/sibling-artifacts.js` detects and parses `.godplans/PLAN.mdx` and `.godaudits/AUDIT.mdx` (GP/GA checkbox tasks, findings, R-/A- domain id mirroring across the 18 shared domain codes), recomputing every count from the checkbox body because frontmatter counters are cached digests.
- [DECISION] Import and plan-aware arcs: `/god-migrate` imports godplans and godaudits seeds with GP task ids and R-<DOM>-n ids preserved verbatim; arcs consume the imported plan context; `/god-fix` dispatches open GA remediation tasks with the finding's evidence file:line and the GA Verify command as the done-check.
- [DECISION] Sync-back companions and read-only boundary: write-back happens only through the managed `.godplans/GODPOWERS-SYNC.mdx` and `.godaudits/GODPOWERS-SYNC.mdx` companions; sibling files stay read-only except when executing plan or audit tasks under the executor rules embedded in PLAN.mdx/AUDIT.mdx themselves.
- [DECISION] Staleness drift checks: imports record a content hash and `sibling-artifacts.staleness` compares it against the live sibling artifact, so drift surfaces as an explicit signal instead of silently stale context.
- [DECISION] MDX-safety lint: new have-not U-13 (MDX-unsafe artifact content) with a mechanical artifact-linter check.
- [DECISION] Gap fixes: the safe-sync gate's `.godpowers/sync/` markers are now written by the documented remediation flow; the quarterback review play falls back to `/god-review` instead of the phantom `/god-code-review`; unreferenced planning/building/shipping/orchestration references are wired to their consuming agents; `docs/agent-specs.md` covers all 40 product agents.

## Changes

- [DECISION] `package.json` and `packages/mcp/package.json` now publish the 4.0.0 version.
- [DECISION] One new runtime module (`lib/sibling-artifacts.js`, lib module count 91 -> 92). No public command/agent/workflow/recipe surface change.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, the architecture map, MCP docs, and the have-nots counts in concepts/validation/agent-specs now reflect 4.0.0 and the 157 have-nots.
- [DECISION] `ARCHITECTURE.md` gains section 17 documenting the sibling superskill interop contract and the artifact extension policy.
- [DECISION] `packages/mcp/README.md` documents the runtime-skew caveat: pair `@godpowers/mcp` 4.0.0 with a `godpowers` runtime at 4.0.0 or later.

## Validation

- [DECISION] `npm test` passes across all command groups (49 test files, 0 failures).
- [DECISION] The offline release gate passes: `npm run coverage:lib` (90% lines / 75% branches aggregate, per-file floors across 89 lib modules), `node scripts/check-per-file-coverage.js`, `git diff --check`, `npm run pack:check` (566 files) and `npm run pack:mcp:check` (8 files), and `npm run test:surface`. The registry-only step (`npm audit --omit=dev`) runs in the tag-triggered publish workflow's `release:check`.
- [DECISION] `node scripts/test-doc-surface-counts.js` passes public surface docs for version 4.0.0 with 120 skills, 40 agents, 13 workflows, 44 recipes, and 92 lib modules.

## Upgrade

- [DECISION] Use `npm install -g godpowers@4.0.0` or `npx godpowers@4.0.0`.
- [DECISION] Migration is required for installed runtimes: re-run `npx godpowers install` (or your runtime flags, e.g. `npx godpowers --claude --global`) so installed runtimes and hooks understand `.mdx` projects. Old runtimes cannot see `.mdx` artifacts.
- [DECISION] Existing projects need no manual file renames: legacy `.md` artifacts remain readable, and lib-owned generated files migrate their legacy twin on first write.

## Notes

- [DECISION] The publish targets are npm `godpowers@4.0.0`, npm `@godpowers/mcp@4.0.0`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v4.0.0`.
- [DECISION] Publishing is tag-triggered: pushing the `v4.0.0` tag runs `.github/workflows/publish.yml`, which runs `npm run release:check` and publishes both `godpowers` and `@godpowers/mcp` to npm with provenance. Do not `npm publish` by hand; the tag path carries provenance and the release gate.
