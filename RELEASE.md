# Godpowers 6.1.0 Release

> Status: Release candidate
> Date: 2026-08-19

- [DECISION] Godpowers 6.1.0 adds a shared post-draft prose audit, a pure
  advisory scanner, and universal non-blocking U-12 findings without changing
  the existing three-label, substitution, or blocking artifact checks.
- [DECISION] The public surface contains 124 slash commands, 41 specialist agents,
  13 workflows, and 45 recipes; this release adds, removes, or renames
  none of those surfaces.
- [DECISION] The core package contains 113 runtime library modules, supports
  Node.js 18 or newer, and keeps zero production dependencies.
- [DECISION] The read-only `@godpowers/mcp` companion shares version 6.1.0 and
  requires Node.js 20 or newer.
- [DECISION] The repository contains 111 focused test scripts, and the current
  root package-content check reports 646 files.

## Shared Prose Contract

- [DECISION] `references/shared/VOICE.md` now runs one post-draft audit after
  the draft's meaning, requirements, and evidence are settled.
- [DECISION] The audit checks each claim for a named actor, action or decision,
  mechanism or source, observable effect, and reader action when one is needed.
- [DECISION] The audit preserves requirements, verified facts, code terms,
  quotations, and user-approved tone; it does not replace the three-label rule
  or substitution test.
- [DECISION] Godpowers-specific before-and-after pairs cover artifact decisions,
  technical explanations, and public launch copy.

## Advisory Scanner And Validation

- [DECISION] `lib/prose-lint.js` is a dependency-free CommonJS scanner that
  treats input as inert text and returns ordered findings without file-system
  writes, network access, subprocesses, or dynamic evaluation.
- [DECISION] Seven context-sensitive rules cover filler, vague attribution,
  stacked hedging, stock framing, inflated phrasing, empty conclusions, and
  dense sentences.
- [DECISION] Each finding contains a rule id, line, column, sanitized excerpt,
  explanation, and review suggestion; excerpts stop at 160 characters.
- [DECISION] `lib/have-nots-validator.js` maps scanner findings to universal
  U-12 warnings, and U-12 warnings never increase an artifact's error count.
- [DECISION] Existing artifact errors retain their blocking severities, and
  the npm package guard explicitly requires `lib/prose-lint.js`.

## Output-Specific Review

- [DECISION] The documentation specialist favors direct factual explanations,
  exact repository names, verified commands, concrete behavior, runbook steps,
  and preserved evidence language.
- [DECISION] The launch specialist may retain approved founder or product voice,
  positioning, and channel constraints while operational status and
  engineering evidence remain direct and neutral.
- [DECISION] Both specialists treat U-12 findings as human review prompts and
  preserve the shared audit's meaning, evidence, and tone boundaries.
- [DECISION] `INSPIRATION.md` acknowledges the pstack unslop skill as an
  influence on the scan, targeted rewrite, meaning and tone preservation, and
  final self-audit sequence.
- [DECISION] No upstream prose, rule catalog, code, fixture, or result is
  vendored, and no runtime dependency on the pstack plugin exists.

## Safety And Parser Hardening

- [DECISION] The scanner masks opening YAML frontmatter, matching backtick or
  tilde fences, inline code, Markdown link destinations, and marked bad, avoid,
  or wrong examples before applying prose rules.
- [DECISION] Fence closing requires the same delimiter character, at least the
  opener's length, and whitespace-only trailing content; indentation and CRLF
  behavior have focused regressions.
- [DECISION] Double-backtick spans may contain a single backtick, and adversarial
  unique delimiter runs stay inside the focused 250-millisecond p95 limit.
- [DECISION] Finding excerpts replace terminal control bytes before formatting,
  which keeps artifact reports safe for terminal display.

## Advisory Boundaries

- [DECISION] U-12 is advisory and non-blocking; a finding does not authorize an
  automatic rewrite or prove that the original sentence is wrong.
- [DECISION] The scanner matches sentence patterns rather than standalone word
  bans, so concrete technical uses of `surface`, `harness`, `primitive`,
  `robust`, and `leverage` remain valid.
- [DECISION] Pattern matching can produce false positives or miss prose that
  needs revision; a clean scan does not prove that text is human-authored,
  correct, or objectively good.
- [DECISION] Masking handles the documented Markdown structures but is not a
  complete Markdown parser, so human judgment remains the final authority for
  prose changes.

## Validation

- [DECISION] Independent Stage 1 specification review, Stage 2 quality review,
  and scoped hardening review passed for the prose-quality feature.
- [DECISION] `node scripts/test-prose-lint.js` passes 31 of 31 focused tests.
- [DECISION] `node scripts/test-artifact-linter.js` passes 73 of 73 tests.
- [DECISION] `node scripts/static-check.js` passes 35 of 35 checks and reports
  zero prose warnings across 233 shipped Markdown and MDX files.
- [DECISION] `node scripts/test-voice-lint.js` passes 11 of 11 tests.
- [DECISION] The current package-content check reports 646 root package files
  and includes `lib/prose-lint.js` in the required payload.
- [DECISION] The feature-branch full release gate passes every test command in
  83 seconds with 94.68 percent line coverage and zero production dependency
  vulnerabilities.
- [DECISION] Pull-request CI, merged-main CI, the tag workflow, registry
  verification, and the isolated published-install check remain pending and
  are not claimed by this release candidate.

## Upgrade

- [DECISION] After publication, install the root CLI with
  `npm install -g godpowers@6.1.0` or run it with `npx godpowers@6.1.0`.
- [DECISION] Root CLI users need no state migration, artifact migration,
  command rename, or production dependency change for this upgrade.
- [DECISION] MCP users must run Node.js 20 or newer before upgrading
  `@godpowers/mcp` to 6.1.0; the root CLI retains Node.js 18 support.
- [DECISION] Existing automation may continue treating artifact errors as its
  blocking signal because the new U-12 findings remain warnings.

## Pending Publication Evidence

- [OPEN QUESTION] Pull-request number, review state, and CI run remain pending.
  Owner: release operator. Due: before merge.
- [OPEN QUESTION] Clean-main full release-gate and pre-publication evidence
  remain pending. Owner: release operator. Due: before tag creation.
- [OPEN QUESTION] Merge commit and merged-main CI run remain pending. Owner:
  release operator. Due: before tag publication.
- [OPEN QUESTION] Annotated tag identity and provenance workflow run remain
  pending. Owner: release operator. Due: before npm promotion.
- [OPEN QUESTION] Root and MCP registry integrity, shasums, and `latest` tag
  verification remain pending. Owner: release operator. Due: before marking
  this release published and verified.
- [OPEN QUESTION] GitHub Release URL and isolated exact-version install checks
  remain pending. Owner: release operator. Due: before replacing this section
  with completed publication evidence.
