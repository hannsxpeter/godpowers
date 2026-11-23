# Changelog

All notable changes to Godpowers will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [7.3.0] - 2026-11-23

The npm package is now `@hxp-tools/godpowers`. The unscoped `godpowers` package
belonged to an npm account that no longer exists, so it stops at 6.3.0. The
command is still `godpowers`, and `.godpowers/`, the install folders, and the
skill names do not change. No behavior change.

### Changed

- Package name `@hxp-tools/godpowers` (`publishConfig.access` is `public`).
  Skills, agents, the AGENTS.md note, hook messages, and the docs now call
  `npx -y @hxp-tools/godpowers@7 ...`. The spec lives in one place,
  `lib/paths.js`. Existing AGENTS.md notes that name the old spec are still
  recognized (not treated as 6.x blocks), and `status` and `doctor` warn about
  them.
- `godpowers status` and `godpowers doctor` warn, read-only, when AGENTS.md
  still runs `npx -y godpowers@7`. `status` checks initialized 7.x projects and
  `doctor` checks the current folder. Neither command rewrites the file, and the
  check refuses a symlinked or non-regular AGENTS.md.
- The publish workflow reads the package name from `package.json` for its
  "already published" check.
- README rewritten as a short tour: install, the quest map (init, plan, build,
  review, harden, ship), the powers, achievements, and the ship gate. The long
  material (project files, gate rules, risk tiers, every CLI command, the
  per-edit hook, limits) moved to `docs/reference.md`.
- Original SVG graphics in `docs/assets/` (not shipped in the npm package).
- `RELEASE.md`, `SUPPORT.md`, and `USERS.md` removed. Release notes live in
  this file and on the GitHub release; support and the honest-status line moved
  into `CONTRIBUTING.md` and the README. The "no recorded production users"
  statement is unchanged.
- This file now summarizes pre-7.0 history instead of repeating it.
- `SECURITY.md` supported versions say 7.x, not 7.0.x.

### Upgrade

```bash
npx -y @hxp-tools/godpowers@7 --claude --codex --global
```

Use your hosts' flags. In Codex, open `/hooks` once if you have not trusted the
hooks. `.godpowers/` is unchanged. Replace `npx -y godpowers@7` with
`npx -y @hxp-tools/godpowers@7` in your projects' AGENTS.md by hand;
`godpowers status` tells you when one still has the old line. Claude Code plugin
users keep `godpowers@godpowers`.

## [7.2.0] - 2026-11-09

Verdicts you can paste, reviews that say who judged and how far the change
grew, a warning when the target branch moved on, descriptions that say when to
use a skill, and unattended runs. Several ideas come from tstack
(github.com/t3dotgg/tstack, MIT, by Theo Browne); see INSPIRATION.md.

### Added

- `godpowers verdict [--base <ref>] [--json]` prints a block built from the
  ledger and git: the check, review rounds and reviewer, security record, and
  open risks, for pasting unedited into a PR description or release notes. It
  judges evidence exactly like the ship gate, claims no pass while the ledger
  has integrity errors, and exits 0 whatever the evidence says (a bad `--base` exits 2).
- `record review|harden --reviewer "<name>"` stores who reviewed, redacted and
  capped at 100 characters, and never guesses. `reviews` shows it.
- `record review --base <ref>` stores the size of the change against the base
  (default: the latest `v*` tag) in the record's `diff` field. `reviews` and
  `record review` warn when the change grew by more than 25% and at least 20
  lines during review.
- `gate ship --onto <ref>` (default `origin/HEAD`, else `main`) warns, without
  blocking, when the target branch moved on in files this change also touches.
  It never fetches, so it is as fresh as the last fetch.
- Codex installs get `agents/openai.yaml` (display name, short description,
  default prompt) next to each skill's `SKILL.md`.
- `lib/verdict.js` and `lib/drift.js`.

### Changed

- Skill and agent descriptions now say when to use them. The always-loaded
  prompt fell from 957 to 605 tokens, with every trigger phrase kept.
- `/god` covers unattended work: when you are not watching, questions go
  through the host's question tool, and the run ends ready, waiting for
  approval, or blocked.
- Reviews judge severity against the goal and cut what review added beyond it.
  `/god-ship` pastes the verdict and runs the drift check.
- `statusFor` also returns `last`, the attestation record behind each judgment.

## [7.1.0] - 2026-11-09

Faster and more selective verification: cheap local feedback, no repeated
checks on unchanged code, bounded review loops, a check for weakened tests,
and a ship gate that scales with the risk of the change.

### Added

- `godpowers fast [files...]` runs the STATE.md `fast:` command on the given
  files, or on the files changed since HEAD plus untracked files. Every
  `{files}` becomes `"$@"` and the command runs as `/bin/sh -c <script>
  godpowers-fast <file>...`, so file names are arguments and never shell
  source. `{files}` is supported only as a word of its own outside quotes,
  backticks, and `$(...)` (a POSIX quote scanner decides); `"{files}"`,
  `'{files}'`, `x{files}`, a `{files}` after a `#` comment, any command with
  `${`, and the like exit 2 with a message naming the supported form, and the
  hook fails open. Use `{files}` as a plain argument; other shell positions,
  such as a redirection target, are not supported. A very long file list can exceed the
  operating system's argument limit (`E2BIG`); pass explicit files then. Names
  that start with `-` get a `./` prefix, and names with control characters or
  that resolve outside the project through a symlink are skipped. A command
  with `{files}` is not supported on Windows and exits 2 ("declare a command without it"; the hook fails open).
  The hook runs nothing when its payload names a rejected path. It prints
  `Running: <script>` and the file list on stderr and never writes the ledger.
  `fast --hook` is a handler for a PostToolUse hook that users add to their own
  settings: it reads the hook JSON from stdin, checks the edited file, stays
  silent unless the check fails, and then exits 2 with the output on stderr.
- `verify` reuses the latest passing record of the same command on unchanged
  code instead of running it again. `--force` runs it anyway. Only records this
  machine signed count: every `verify` record carries `local`, an HMAC over its
  fields and the exact command, keyed by a random key at
  `$GODPOWERS_HOME/local.key` (default `~/.godpowers/local.key`). A forged or
  copied ledger, a command whose secret redacts like another's, a ledger with
  an integrity error, or an unreadable key all mean the check runs.
- Review records store the HEAD commit and the findings the author chose not to
  fix (`record review --dismiss "<finding>: <reason>"`). `godpowers reviews`
  lists the rounds since the last pass, and after three failed rounds `reviews`,
  `status`, and `record review --fail` say to stop and rethink.
- `godpowers stats` reports check runs, median recovery time from a failing to
  a passing run, waivers, and review rounds from the ledger.
- `godpowers tests` flags deleted test files, test files that turned binary,
  fewer tests or assertions, and added skip or focus markers since the base (default: the latest `v*` tag). A
  line marked `godpowers: allow-test-change` is a deliberate change.
- `godpowers risk` classifies the change since the base as low, normal, or high
  from its paths. STATE.md `risk:` adds high-risk globs.
- STATE.md `docs:` (globs, or `none`) narrows what counts as documentation for
  the stop gate's allowance (a session that changed only documentation may stop
  without a check) and the low risk tier. It can never widen the built-in rule:
  a path is documentation only if the built-in rule says so, it is not an agent
  instruction file or a high-risk path, and a listed glob matches. A `docs:` or
  `risk:` glob that is wildcard-only, longer than 512 characters, or over the
  alternatives cap is a `lint` error, and a STATE.md with errors (also a
  duplicate key), at the base or in the working tree, gives no documentation
  allowance and a high tier. An unusable `risk:` glob keeps the risk tier high
  (`unusable risk pattern: <glob>`).
- The ship gate warns when `docs:` or `risk:` differs from the base commit's.
- Prose notes flag plan slices that have no `(behavior)` or `(refactor)` kind.

### Changed

- **Behavior change:** `gate ship` fails outside a git work tree with
  `not a git repository: evidence cannot be bound to the code`. Before, it
  passed on the latest records with a warning. The stop gate still fails open
  there.
- `verify` reuses a record only if the gates would accept it too: a locally
  signed record without the exact-command `cmd` identity (from an earlier build
  of this branch) is no longer reused.
- Every record still matches the exact code, as in 7.0: a documentation edit
  voids a review, so record it again after the last change.
- The ship gate scales with risk: it no longer requires a security record for
  normal-risk changes, or a review for low-risk ones. With no base to compare,
  the tier is high and the 7.0 rule applies. `gate ship` takes `--base` and
  warns about `tests` findings.
- File names with a newline or other control character are fingerprinted and
  listed like any other, and a changed one makes the change high risk.
  `changedSince` and `diffSince` fail in a repository without a work tree, and a
  change that cannot be listed is high risk. Compose files named `*.yaml` are
  high risk. The base tag must look like `v<digit>...` and not point at HEAD.
- Gates match a verify record to the declared command by `cmd`, the identity
  of the exact command (a SHA-256, or an HMAC with the machine-local key when
  the command has secret shapes), not by redacted text, so changing a secret
  value in `verify:` no longer reuses the old pass. **A verify record made by
  7.0 has no `cmd`, so it no longer satisfies the stop gate, the ship gate, or
  `status` after you upgrade: run `verify` once.** There is no fallback to
  redacted text.
- A path counts as documentation for the stop gate and the low and normal ship
  tiers only when the rule at HEAD (stop gate) or at the base commit (ship
  gate) and the working rule agree, and a `risk:` glob at the base still
  applies. Editing `docs:` or `risk:` after the baseline cannot loosen a gate.
  A baseline STATE.md that exists but cannot be read counts nothing as
  documentation (stop gate) and makes the tier high (`risk`, ship gate).
- A malformed `local` or `cmd` value makes a record not reusable instead of
  crashing `verify`, and `reviews`, `status`, `stats`, and the reuse message
  print any ledger value as text without throwing.
- Redaction also masks `Authorization: Basic` credentials, Google API keys, and
  quoted secret values in full. Ledger text printed by `reviews`, `status`,
  `stats`, and the reuse message loses control characters, and `reviews`
  tolerates odd `head` and `dismissed` values.
- Plan slices carry a kind: `- [ ] 1. (behavior) <slice>: <how it is verified>`.
  The skills keep refactors apart from behavior changes.
- `/god-review` scopes re-reviews to the change since the last reviewed commit,
  passes dismissed findings and test-guard findings to the reviewer, and
  prefers a reviewer from a different model family. The shared skill names no
  specific model.
- CI cancels superseded pull request runs, lints once, and runs the release
  check in parallel with the test matrix.

## [7.0.1] - 2026-10-08

The first 7.x release on npm: 7.0.0 was tagged but never published.

### Security

- Registering hooks no longer writes `settings.json` or `hooks.json` through
  the predictable temp name `<file>.godpowers-tmp`. A repository that planted a
  symlink at that name could make a `--local` install overwrite the file it
  pointed at, such as a shell startup file. The temp file now has a random name
  and is created exclusively.

### Fixed

- `godpowers doctor` and `godpowers budget` no longer fail with `ENOENT` when
  run from the installed copy (`~/.claude/godpowers` or `~/.codex/godpowers`).
  The installer now copies the skill and agent sources there too.
- Reinstalling from the installed copy no longer deletes the installed skills
  or the copy itself, whatever spelling of its path is used. The new copy is
  built beside the old one and swapped in, the old one goes back if the swap
  fails, and a source without skills or agents fails before anything is
  removed. Staging folders left by a killed install are swept by the next
  install or uninstall.

## [7.0.0] - 2026-09-26

Godpowers is now a small core: 8 commands, 4 agents, and about 4K tokens of
instructions, down from 124 commands, 41 agents, and 1.35 MB of prompt files.
Frontier models plan and review well on their own, so the prompt methodology
was costing tokens without changing outcomes. What remains is what a model
cannot do for itself: durable state, recorded checks bound to exact code, an
independent reviewer, and gates enforced by hooks.

### Breaking changes

- Commands: 124 became 8. Old commands map to new ones as follows.
  - `/god`, `/god-mode`, `/god-next`, `/god-help`, `/god-locate`, and
    `/god-progress` became `/god`. Pass a goal to drive it through the stages
    it needs.
  - `/god-init`, `/god-migrate`, `/god-context`, and `/god-doctor` became
    `/god-init` plus `godpowers doctor` and `godpowers migrate`.
  - `/god-prd`, `/god-arch`, `/god-roadmap`, `/god-stack`, `/god-explore`,
    `/god-discuss`, `/god-story`, `/god-chart`, and `/god-plan` became
    `/god-plan`.
  - `/god-build`, `/god-feature`, `/god-fix`, `/god-hotfix`, `/god-refactor`,
    `/god-debug`, and `/god-repo` became `/god-build`.
  - `/god-review`, `/god-review-changes`, `/god-audit`, `/god-preflight`, and
    `/god-reconcile` became `/god-review`.
  - `/god-harden` and the security half of `/god-update-deps` became
    `/god-harden`.
  - `/god-ship`, `/god-deploy`, `/god-observe`, and `/god-launch` became
    `/god-ship`.
  - `/god-status` stays `/god-status`.
  - Every other command is gone. Use the host directly, or pin
    `npx godpowers@6` if you depend on one.
- Agents: 41 became 4 optional agents (`god-planner`, `god-executor`,
  `god-reviewer`, `god-security-auditor`). `god-spec-reviewer` and
  `god-quality-reviewer` merged into `god-reviewer`; `god-harden-auditor`
  became `god-security-auditor`. No skill requires them: skills describe what a
  step needs, and the agent using the skill chooses the subagent, if any, and
  how to run it, and names and passes its model and reasoning effort
  explicitly before starting it, sized to the subtask rather than inherited
  from the session.
- Project layout: `.godpowers/` now holds `STATE.md`, `PLAN.md`,
  `DECISIONS.md`, and `evidence.jsonl`. Run `godpowers migrate` on a 6.x
  project. It archives the old files under `.godpowers/archive/v6/`, maps the
  old tier statuses to a stage, and deletes nothing.
- Artifacts no longer need DECISION, HYPOTHESIS, or OPEN QUESTION labels on
  every sentence, and the substitution test is no longer a gate.
- Removed: the `@godpowers/mcp` package, the extension packs, install profiles,
  routing and recipes, workflow YAML, the dashboard, automations, suite (multi
  repo) mode, the learning loop, cost tracking, Pillars integration, and the
  6.x CLI operations that served them.
- The package entry point is now `bin/godpowers.js`.

### Added

- Proportional stages: `/god` gives a feature a build and an independent
  review, writes a plan only when the request does not already list its
  requirements, adds a security pass only when the change touches a trust
  boundary, and ships only when you ask. The project check is recorded once
  per build rather than after every slice. In the first A/B run
  (`docs/ab-eval.md`), running every stage matched plain Codex on correctness
  at about 4x the cost; the current flow cost about 2x to 2.8x, with blind
  review scores of 8 and 8.
- Reviews check tests: the review brief and the `god-reviewer` agent ask
  whether each requirement has a test, including the cases that must not
  trigger it.
- Hooks that code enforces, registered by the installer in
  `~/.claude/settings.json` (Claude Code) and `~/.codex/hooks.json` (Codex)
  without touching other tools' hooks:
  - SessionStart prints a three-line project brief and records the session's
    starting code state.
  - Stop asks the agent to verify before finishing when code changed without a
    passing check. It nudges once per code state and passes documentation-only
    changes.
  - PreToolUse blocks `git commit` while `godpowers lint` reports errors.
- Content fingerprints: evidence is bound to a fingerprint of the working
  copy built from git blob hashes with read-only git commands, so it survives
  commits, goes stale on any edit, and works inside Codex's read-only-`.git`
  sandbox.
- `godpowers verify --waive`, `godpowers record`, `godpowers gate ship`,
  `godpowers lint`, `godpowers migrate`, `godpowers clean`, `godpowers doctor`,
  and `godpowers budget`.
- A prompt budget enforced by the test suite: the shared skill stays under
  1,500 tokens, each command and agent under 800, all skills and agents under
  8,000, and the per-session load under 1,200.
- A Claude Code plugin manifest and marketplace entry.
- `scripts/ab-eval.js`, an A/B harness that runs the same tasks with and
  without Godpowers and compares tokens, cost, time, verify results, and diff
  size.

### Security and robustness

- Only the check command declared in STATE.md satisfies the gates, and a record
  covers the code as it was when the check started.
- The fingerprint is read-only and uses `git hash-object`, so it matches git
  for line-ending conversion, LFS, and SHA-256 repositories, and works in
  sandboxes that keep `.git` read-only.
- Hook input is read directly from file descriptor 0, so large or late
  payloads are never read as empty.
- `verify` forwards signals to the check's process group, stops waiting
  shortly after the command exits, and redacts more secret shapes (Stripe keys,
  JWTs, private keys, credentials in URLs) before cutting the output tail.
- The installer writes settings through symlinks and keeps file permissions,
  validates before changing anything, and never removes a user's own hook.
- `clean` and `migrate` skip symlinked instruction files, never remove text
  after an unterminated marker, and only remove the exact Pillars block 6.x
  generated. `migrate` archives every instruction file it changes.
- `init` never overwrites an existing decision log or ledger, and adds a union
  merge rule for the ledger to `.gitattributes`. Projects that keep
  `.godpowers/` out of git get neither that rule nor the AGENTS.md note.

### Fixed

- Claude Code installs now write `<name>/SKILL.md` skill directories, so the
  commands appear in the picker. Thanks to @ikkeflikkeri (#90).
- Reinstalling removes every 6.x leftover: flat skill files, retired agents,
  data directories, version files, and old hook scripts.
- Codex skills install to `~/.agents/skills`, the location current Codex reads.
  Codex agents install as TOML only.

### Upgrade

1. `npx godpowers@7 --claude --codex --global` (or your hosts). This removes
   the 6.x files.
2. In each project, run `npx godpowers@7 migrate --dry-run`, then
   `npx godpowers@7 migrate`. It also removes the old instruction blocks from
   AGENTS.md, CLAUDE.md, and editor rule files.
3. In Codex, open `/hooks` once to trust the new hooks.

## Before 7.0

Releases 0.1.0 (2026-05-09) through 6.4.0 (2026-09-07) built the 6.x line,
which grew to 124 commands and 41 agents. Godpowers 7.0.0 replaced it with 8
commands, 4 agents, and enforcement in code; see 7.0.0 above and
[docs/migrating-from-6.md](docs/migrating-from-6.md). Every earlier release is
tagged (`v0.1.0` through `v6.4.0`) at
https://github.com/hannsxpeter/godpowers/tags, and the full per-release notes
remain in git history: `git show v7.2.0:CHANGELOG.md`.
