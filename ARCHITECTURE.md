# Architecture

Godpowers 7 is a small Node.js CLI with no production dependencies, plus
13 markdown files of instructions. The instructions tell the model what to do.
The CLI and the hooks check that it was done.

## Principles

1. **The model plans and orchestrates.** Godpowers does not script the model's
   reasoning. Skills name the outcome, the files to keep current, and the checks
   to run.
2. **Code over prose.** Anything checkable is checked by the CLI: evidence
   freshness, file structure, append-only decisions, the ship gate.
3. **Small always-on footprint.** The test suite enforces a prompt budget
   (`lib/budget.js`).
4. **Use what the host provides.** Subagents, memory, planning, scheduling, and
   usage tracking belong to Claude Code and Codex, so Godpowers does not
   reimplement them. Skills say what a step needs, such as a review from a fresh
   context, and leave the choice of subagent and how to run it to the agent
   using the skill.

## Layout

```text
bin/godpowers.js      entry point; calls lib/cli.js
lib/                  the CLI (see below)
skills/<name>/SKILL.md  8 commands plus the shared `godpowers` skill
agents/<name>.md      4 optional subagents
hooks/hooks.json      hook registration for the Claude Code plugin
.claude-plugin/       plugin and marketplace manifests
scripts/              test runner, text lint, package check, A/B harness
test/                 node:test suites
```

## Modules

| Module | Responsibility |
| --- | --- |
| `cli.js` | Argument parsing and dispatch for every command |
| `paths.js` | Project root discovery and the 6.x or 7.x layout check |
| `frontmatter.js` | Flat YAML frontmatter parse and write |
| `templates.js` | Starting content for STATE.md, PLAN.md, DECISIONS.md |
| `state.js` | STATE.md sections, risk lines, validation, field updates |
| `git.js` | Read-only snapshots and fingerprints, changed paths, lines removed since HEAD |
| `evidence.js` | The evidence ledger: run and record checks, waivers, attestations, chain |
| `gate.js` | Stop gate and ship gate |
| `lint.js` | Structural checks on `.godpowers/` files |
| `prose.js` | Advisory prose notes for PLAN.md and DECISIONS.md |
| `status.js` | Status view and the session brief |
| `hooks.js` | SessionStart, Stop, and PreToolUse handlers for Claude Code and Codex |
| `context.js` | The AGENTS.md note and removal of 6.x instruction blocks |
| `init.js` | Project setup and check-command detection |
| `migrate.js` | 6.x to 7.x migration |
| `runtimes.js` | Supported hosts and their directories |
| `install.js` | Install, uninstall, hook registration, 6.x cleanup |
| `doctor.js` | Read-only installation diagnostics |
| `budget.js` | Prompt size measurement and limits |

## Evidence and the fingerprint

`git.snapshot` lists the project's files with read-only git commands:
`ls-files --stage` for tracked files, `diff-files` for the ones that changed on
disk, and `ls-files --others --exclude-standard` for untracked ones. Unchanged
tracked files reuse the blob hash from the index. Changed and untracked files
are hashed by `git hash-object --stdin-paths` without `-w`, so git applies the
same filters (line endings, LFS) and hash algorithm it would use on commit.
Symlinks hash their target text. A clean submodule is identified by its
commit, and a dirty submodule or nested repository is fingerprinted
recursively. If git cannot hash a file (unreadable, or a filter that fails in a
sandbox), it falls back to a Node hash, then to a size-and-time marker. The
fingerprint is a SHA-256 over the sorted path and hash pairs, leaving out
`.godpowers/`. Nothing is written to `.git` or the temp directory.

`evidence.verify` fingerprints before and after running the command and binds
the record to the code as it was before. If files changed during the run, the
record says so and the check must run again. Each record carries `fp` (the
fingerprint algorithm version), `prev` (the digest of the record before it),
and `digest` (a SHA-256 over its own canonical JSON). `readAll` reports digest
mismatches and invalid lines as errors, and chain breaks (from merges) as
warnings.

`statusFor` takes, for one fingerprint, the last `verify` of the project's
declared check (or any `verify` when none is declared) or `waive` as the check
status, and the last `review`, `harden`, and `ship` records as those statuses.

The command runs in its own process group. A timeout, or a signal to the CLI,
ends the whole group; on Windows the tree is ended with `taskkill`. The CLI
stops waiting shortly after the command exits, even if a background process it
started still holds the output pipes.

## Hooks

The installer registers three command hooks. Claude Code gets them in
`settings.json`, with an `if` filter so the PreToolUse hook only starts for
`git commit`. Codex gets them in `hooks.json`. Both hosts send the same JSON on
stdin.

- **SessionStart** stores the starting snapshot in the temp directory, keyed
  by project and session, and prints a three-line brief.
- **Stop** compares the current snapshot with the session's starting one (or
  HEAD). It allows the stop when nothing changed, only documentation changed, or
  a passing or waived record matches the current tree. Otherwise it continues
  the turn with instructions: `additionalContext` on Claude Code, and
  `decision: block` on Codex. It nudges once per tree, then lets the turn end
  with a warning shown to the user.
- **PreToolUse** runs lint when a Bash command contains `git commit` (Claude
  Code only starts it for `git` commands), and denies the call while there are
  errors.

Hook input is read from file descriptor 0 directly. Checking
`process.stdin.isTTY` would switch it to non-blocking mode and make large or
late payloads read as empty.

Every hook fails open: an internal error is shown as a system message and never
blocks the host.

## Install

`install.install(host)` first validates the host's settings or hooks file, then
removes 6.x leftovers, copies skills (directories for Claude Code and Codex,
flat files elsewhere) and agents (TOML for Codex), copies `bin/`, `lib/`, and
`package.json` to `<host>/godpowers/` with a `.godpowers-runtime` marker, and
merges the hook entries. On Claude Code and Codex the installed skills and
agents call that copy by path instead of `npx`. The installer only touches
entries named `god`, `god-*`, or `godpowers`, hook commands that run
`godpowers.js hook`, and registrations of 6.x hook scripts that no longer
exist. It writes settings through symlinks, keeps their permissions, and
refuses a file that is not valid JSON or has an unexpected `hooks` shape.

## Tests and budgets

`npm test` runs every `test/*.test.js` file with `node --test`. `npm run
coverage` enforces 90% line and 75% branch coverage on `lib/`.
`test/misc.test.js` fails when any skill or agent exceeds its token budget.
`test/package.test.js` checks that skills, agents, the plugin manifests, the
changelog, and the README agree.
