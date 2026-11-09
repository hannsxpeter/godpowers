# Plan

## Goal
Godpowers 7.1: make verification faster and more selective without weakening
it. Give agents cheap local feedback, stop re-running checks that already
passed on the same code, bound review loops, turn the "never weaken a test"
instruction into a check, and scale the ship gate to the risk of what changed.
Source: the November 2026 research review of agent verification bottlenecks
(DORA, Anthropic, OpenAI harness engineering, Nx, GitHub).

## Requirements
- R1: A `fast` check gives file-local feedback. STATE.md may declare `fast: <command>`, where `{files}` expands to the changed files, each quoted for the shell. `godpowers fast [files...]` runs it on the given files, or on the files changed since HEAD plus untracked files (deleted files and `.godpowers/` left out). It never writes the ledger. With `{files}` and nothing changed it runs nothing and exits 0. Done when: `test/fast.test.js` covers declared, undeclared, explicit files, changed files, no changes, quoting of a path with a space and a quote, and a failing command's exit code.
- R2: `verify` reuses a passing record. When the latest `verify` record of the same (redacted) command on the current tree passed, with the current fingerprint version, without `changedDuringRun` or `timedOut`, `verify` prints that it reused the record and exits 0 without running or appending. `--force` always runs. `--json` output includes `reused: true` and the record. Done when: tests cover reuse, `--force`, a failed latest run, a different command, a changed tree, and a `changedDuringRun` record.
- R3: Review rounds are bounded and incremental. Attestation records store `head` (the HEAD commit, or null). `record review` accepts repeatable `--dismiss "<finding>: <reason>"` (stored as `dismissed`, redacted, at most 20 entries of 300 characters; an error for kinds other than review). `godpowers reviews [--json]` lists the review records since the last passing one, each with verdict, short head, time, summary, and dismissed findings, plus the last passing review's head. When three or more failed rounds follow the last pass, `reviews`, `status`, and `record review --fail` say to stop and rethink the approach before another round. Done when: tests cover round counting across a pass, the three-round message, dismissals, and head capture inside and outside git.
- R4: `godpowers stats [--json]` reports from the ledger: runs of the declared check (all verify runs when none is declared) with passes, failures, timeouts, and median and maximum duration; the median time from a failing run to the next passing run of the same command; the median number of failed runs before a pass; other verify runs; waivers; reviews with passes, failures, and the longest failing streak; harden and ship counts; and the first and last record times. Done when: `test/stats.test.js` checks each number on a hand-built ledger and the empty ledger.
- R5: Documentation can change without voiding judgment records. STATE.md may declare `docs:` as `none` (nothing counts as documentation) or a comma-separated list of globs; without it the built-in documentation rule applies. The stop gate's "only documentation changed" allowance uses this setting. Every record also stores `code`, a fingerprint over the files that are not documentation. Review, harden, and ship records match the current code when either `tree` or `code` matches; verify and waive records still match only on `tree`, because checks can read documentation. Done when: tests show a review surviving a README edit, not surviving a code edit, not surviving with `docs: none`, glob settings in the stop gate, and verify still going stale after a README edit.
- R6: `godpowers tests [--base <ref>] [--json]` flags weakened tests between the base and the working tree: deleted test files, fewer test declarations in a test file, fewer assertions in a test file, and added skip or focus markers (including in untracked test files). The base defaults to the latest `v*` tag reachable from HEAD; without one and without `--base` it prints that and exits 2. It exits 1 with findings, 0 without. A ref starting with `-` or not naming a commit is refused. Done when: `test/testguard.test.js` covers each finding kind, a renamed test that is not a finding, JavaScript, Python, and Go markers, an untracked test file, the missing base, and a refused ref.
- R7: `godpowers risk [--base <ref>] [--json]` classifies the change since the base as low (only documentation and test files, or nothing), normal, or high (any path matching a built-in high-risk pattern or the STATE.md `risk:` globs), and names the paths behind the tier. Without a base the tier is high. The ship gate takes `--base`, computes the tier, and requires: low, a passing check; normal, also a passing review; high, also a passing security record (the 7.0 rule). It reports the tier and base, shows not-required records as ok with the reason, and adds a non-blocking warning listing `tests` findings when a base exists. Done when: `test/risk.test.js` and `test/gate.test.js` cover each tier, custom globs, case-insensitive matching, the missing base, and each tier's ship requirements.
- R8: Plans mark each slice as `(behavior)` or `(refactor)`. The PLAN.md template and the lint placeholder put `(behavior)` after the slice number, and prose notes flag slices without a kind. Done when: lint and prose tests cover the new template and the note.
- R9: Skills and agents use the new commands within their token budgets: `/god` decides the security pass with `godpowers risk`; `/god-build` runs `godpowers fast` after each slice and keeps refactors apart from behavior changes; `/god-review` runs `godpowers reviews` and `godpowers tests`, scopes re-reviews to the change since the last reviewed commit, passes dismissed findings, verifies each finding before fixing, stops after three failed rounds, and prefers a reviewer from a different model family; `/god-ship` follows the tiered gate and shows test warnings to the user; the shared skill names no specific model. Done when: `npm run budget` passes and `test/package.test.js` passes.
- R10: CI does less duplicate work: pull request runs cancel superseded runs of the same pull request, lint runs once, and the release check runs in parallel with the test matrix. Done when: `.github/workflows/ci.yml` shows it and the next CI run passes.
- R11: README, ARCHITECTURE.md, CHANGELOG.md, RELEASE.md, and the version (7.1.0) describe the release. Done when: `npm run release:check` passes.

## Non-goals
- Registering a hook that runs the `fast` command on every edit. Godpowers never runs a command a repository declares unless the agent or user calls the CLI; the README shows a hook users can add to their own settings.
- Remote caching, merge queues, post-merge validation, or letting CI trust `evidence.jsonl`.
- Counting stop-hook nudges in `stats` (they live in temporary session files).

## Design
- `lib/match.js` (new): `toRegExp(glob)`, `matches(globs, rel)` (case-insensitive; `**` spans segments, `*` and `?` stay within one; a glob without `/` matches the basename), `parseList(value)` for comma-separated frontmatter values.
- `lib/git.js`: `headCommit(root)`, `resolveBase(root, ref)` (validates, returns a full commit or null), `releaseBase(root)` (latest reachable `v*` tag), `changedSince(root, base)` (paths that differ from the base, untracked included), `diffSince(root, base)` (zero-context unified diff), `workingChanges(root)`; snapshots gain `codeFingerprint(files, isDoc)`.
- `lib/evidence.js`: reuse lookup, `code` and `head` fields, `dismissed`, `reviewHistory(records)`, `statusFor` matching attestations on `code`.
- `lib/stats.js`, `lib/testguard.js`, `lib/risk.js` (new). `lib/gate.js`: docs setting in the stop gate, tiered ship gate. `lib/state.js`: `fast`, `docs`, `risk` keys. `lib/cli.js`: `fast`, `reviews`, `stats`, `tests`, `risk`, `--force`, `--dismiss`, `--base`.
- Fingerprint version stays 1: `tree` is unchanged and `code` is a new optional field, so 7.0 records keep matching on `tree`.

## Slices
- [x] 1. (behavior) Ledger commands: verify reuse, review rounds and dismissals, stats (R2, R3, R4): unit tests
- [x] 2. (behavior) Fast check, documentation setting, code fingerprint (R1, R5): unit tests
- [x] 3. (behavior) Test guard, risk tiers, tiered ship gate (R6, R7): unit tests
- [x] 4. (behavior) Plan template, skills, agents, CI, docs, version 7.1.0 (R8 to R11): `npm run release:check`
- [ ] 5. (behavior) Independent review, security pass, ship gate, tag v7.1.0: `godpowers gate ship`, then the publish workflow

## Open questions
- npm credentials: the publish job has failed with E404 since 7.0.0. The user fixes them on npmjs.com (trusted publisher, or a new NPM_TOKEN secret).
