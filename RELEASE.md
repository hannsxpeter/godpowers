# Godpowers 4.0.1 Release

> Status: Ready
> Date: 2026-07-03

[DECISION] Godpowers 4.0.1 is a patch release from a post-publish adversarial review of 4.0.0. It fixes a silent edge-case data-loss path in the generated-view writer, hardens the legacy-log migration with an atomic write, and corrects `.md`/`.mdx` prose drift and stale doc counts the review surfaced.
[DECISION] There is no surface, schema, or behavior change for correct inputs. Counts are unchanged: 120 slash commands, 40 specialist agents, 13 workflows, 44 recipes, 92 lib modules, 157 have-nots. No migration is required; upgrade with `npm install -g godpowers@4.0.1` or `npx godpowers@4.0.1`.

## What's fixed in 4.0.1

- [DECISION] `lib/state-views.js`: when both a legacy `.md` twin and the canonical `.mdx` exist, the writer retires the legacy twin only when its out-of-fence content is already represented in the `.mdx`; otherwise it leaves the twin in place and warns, instead of deleting human notes the `.mdx` never absorbed. Covered by two new `scripts/test-state-views.js` cases.
- [DECISION] `lib/sync-fs.js` `write()` now uses `writeFileAtomic` (temp file plus rename), so a crash during a legacy-log absorb can no longer leave a truncated `.mdx` that shadows and then deletes the intact `.md`.
- [DECISION] Prose extension drift corrected across skills and agents: `SYNC-LOG`, `HANDOFF`, `CHECKPOINT`, `YOLO-DECISIONS`, `REVIEW-REQUIRED`, `PROGRESS`, and `STORY` operational references now name the canonical `.mdx`; the `god-fix` example id follows the `GA-<phase><two-digits>` contract form.
- [DECISION] Doc counts corrected: `ARCHITECTURE-MAP.md` template count (14) and test-suite count (80); `RELEASE.md` no longer pins a stale test-file count.

## 4.0.0 feature set (refined by this patch)

- [DECISION] Breaking artifact extension change: every Godpowers-owned `.godpowers/` artifact is written as `.mdx`. Reads are mdx-first with legacy `.md` fallback (`lib/sync-fs.js` `resolveArtifact`/`readArtifact`); lib-owned generated files absorb a legacy `.md` twin on first write. Exemptions stay `.md`: root `DESIGN.md`/`PRODUCT.md`, `.godpowers/cache/`, foreign planning-system markers, and host pointer files.
- [DECISION] godplans/godaudits interop: `lib/sibling-artifacts.js` detects and parses `.godplans/PLAN.mdx` and `.godaudits/AUDIT.mdx` (GP/GA checkbox tasks, findings, R-/A- domain id mirroring across the 18 shared domain codes), recomputing every count from the checkbox body because frontmatter counters are cached digests.
- [DECISION] Import and plan-aware arcs: `/god-migrate` imports godplans and godaudits seeds with GP task ids and R-<DOM>-n ids preserved verbatim; arcs consume the imported plan context; `/god-fix` dispatches open GA remediation tasks with the finding's evidence file:line and the GA Verify command as the done-check.
- [DECISION] Sync-back companions and read-only boundary: write-back happens only through the managed `.godplans/GODPOWERS-SYNC.mdx` and `.godaudits/GODPOWERS-SYNC.mdx` companions; sibling files stay read-only except when executing plan or audit tasks under the executor rules embedded in PLAN.mdx/AUDIT.mdx themselves.
- [DECISION] Staleness drift checks: imports record a content hash and `sibling-artifacts.staleness` compares it against the live sibling artifact, so drift surfaces as an explicit signal instead of silently stale context.
- [DECISION] MDX-safety lint: new have-not U-13 (MDX-unsafe artifact content) with a mechanical artifact-linter check.
- [DECISION] Gap fixes: the safe-sync gate's `.godpowers/sync/` markers are now written by the documented remediation flow; the quarterback review play falls back to `/god-review` instead of the phantom `/god-code-review`; unreferenced planning/building/shipping/orchestration references are wired to their consuming agents; `docs/agent-specs.md` covers all 40 product agents.

## Changes

- [DECISION] `package.json` and `packages/mcp/package.json` now publish the 4.0.1 version.
- [DECISION] One new runtime module (`lib/sibling-artifacts.js`, lib module count 91 -> 92). No public command/agent/workflow/recipe surface change.
- [DECISION] CHANGELOG, RELEASE notes, README, roadmap, reference, architecture, the architecture map, MCP docs, and the have-nots counts in concepts/validation/agent-specs now reflect 4.0.1 and the 157 have-nots.
- [DECISION] `ARCHITECTURE.md` gains section 17 documenting the sibling superskill interop contract and the artifact extension policy.
- [DECISION] `packages/mcp/README.md` documents the runtime-skew caveat: pair `@godpowers/mcp` 4.0.0 with a `godpowers` runtime at 4.0.0 or later.

## Validation

- [DECISION] `npm test` passes across all command groups (the full `scripts/run-tests.js` suite, 0 failures).
- [DECISION] The offline release gate passes: `npm run coverage:lib` (90% lines / 75% branches aggregate, per-file floors across 89 lib modules), `node scripts/check-per-file-coverage.js`, `git diff --check`, `npm run pack:check` (566 files) and `npm run pack:mcp:check` (8 files), and `npm run test:surface`. The registry-only step (`npm audit --omit=dev`) runs in the tag-triggered publish workflow's `release:check`.
- [DECISION] `node scripts/test-doc-surface-counts.js` passes public surface docs for version 4.0.1 with 120 skills, 40 agents, 13 workflows, 44 recipes, and 92 lib modules.

## Upgrade

- [DECISION] Use `npm install -g godpowers@4.0.1` or `npx godpowers@4.0.1`.
- [DECISION] Upgrading from 4.0.0 needs no re-install; this patch changes no artifact format. Upgrading from a pre-4.0 runtime still requires re-running `npx godpowers install` (or your runtime flags, e.g. `npx godpowers --claude --global`) so installed runtimes and hooks understand `.mdx` projects.
- [DECISION] Existing projects need no manual file renames: legacy `.md` artifacts remain readable, and lib-owned generated files migrate their legacy twin on first write.

## Notes

- [DECISION] The publish targets are npm `godpowers@4.0.1`, npm `@godpowers/mcp@4.0.1`, and GitHub release `https://github.com/aihxp/godpowers/releases/tag/v4.0.1`.
- [DECISION] Publishing is tag-triggered: pushing the `v4.0.1` tag runs `.github/workflows/publish.yml`, which runs `npm run release:check` and publishes both `godpowers` and `@godpowers/mcp` to npm with provenance. Do not `npm publish` by hand; the tag path carries provenance and the release gate.
