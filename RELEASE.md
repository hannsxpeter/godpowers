# Godpowers 6.1.0 Release

> Status: Published and verified
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
- [DECISION] The final post-publication release gate passes 115 test commands
  in 81.3 seconds with 94.68 percent line coverage and zero production
  dependency vulnerabilities.
- [DECISION] Pull-request CI, merged-main CI, the tag workflow, registry
  verification, GitHub Release creation, and isolated published-install checks
  are complete.

## Upgrade

- [DECISION] Install the root CLI with
  `npm install -g godpowers@6.1.0` or run it with `npx godpowers@6.1.0`.
- [DECISION] Root CLI users need no state migration, artifact migration,
  command rename, or production dependency change for this upgrade.
- [DECISION] MCP users must run Node.js 20 or newer before upgrading
  `@godpowers/mcp` to 6.1.0; the root CLI retains Node.js 18 support.
- [DECISION] Existing automation may continue treating artifact errors as its
  blocking signal because the new U-12 findings remain warnings.

## Publication Evidence

- [DECISION] Pull request 93 passed Node.js 18, 20, and 22 plus the package gate
  in CI run 32226287260 and merged as `main` commit
  `b52c919bc3e02ff3dfae50e35c4a1fe070f0e619`.
- [DECISION] Merged-main CI run 32226644093 passed the same Node.js matrix and
  package gate against the exact merge commit.
- [DECISION] Annotated tag `v6.1.0` resolves to merge commit
  `b52c919bc3e02ff3dfae50e35c4a1fe070f0e619`.
- [DECISION] Provenance workflow 32227120049 passed release identity, the full
  release gate, and the fresh pre-publication gate; it published and verified
  the exact root and MCP pair under `release-6-1-0`, then promoted both packages
  to `latest`.
- [DECISION] Root registry integrity is
  `sha512-6Xw4aqYktmn/bZLU3JB2fYa4kY9PIgdKzKLnPgL8xOq9lTArMXz+0RC5TEw7Rv2+DZVaIBoERG5GLZ6/yyfVSQ==`
  with shasum `2300fff21af7554f29966bc577f276bcc61714dd`.
- [DECISION] MCP registry integrity is
  `sha512-MnDTK2bZjQmQuRZ0ITd2xdgeQ5aYtJ+UKCLlezOzo/w0yOQy4JVOXbJtmwh1PNVwk7HDjo6LCcjJD8bERp3SkA==`
  with shasum `ed351975f6fa662860376664455836b61aef7fa0`.
- [DECISION] A fresh isolated install resolved both exact 6.1.0 packages,
  reported zero dependency vulnerabilities, and ran the root and MCP help
  commands successfully.
- [DECISION] `npm audit signatures` verified registry signatures and
  attestations for all five packages in the isolated dependency tree.
- [DECISION] GitHub Release `v6.1.0` is published at
  `https://github.com/hannsxpeter/godpowers/releases/tag/v6.1.0`; npm remains
  the authoritative package artifact source.
