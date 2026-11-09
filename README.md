# Godpowers

[![npm](https://img.shields.io/npm/v/godpowers)](https://www.npmjs.com/package/godpowers)
[![CI](https://github.com/hannsxpeter/godpowers/actions/workflows/ci.yml/badge.svg)](https://github.com/hannsxpeter/godpowers/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Godpowers keeps a project's memory on disk and refuses unverified "done".
The model does the planning and the coding. Godpowers adds four things a model
cannot do for itself: durable state that survives sessions and tools, a record
of which checks actually ran against which code, an independent reviewer in a
fresh context, and gates that code enforces through Claude Code and Codex hooks.

It is deliberately small: 8 commands, 4 agents, and about 6K tokens of
instructions in total. About 950 tokens load per session whether you use it or
not.

## Why 7.0 is smaller

Godpowers 6 had 124 commands, 41 agents, and 1.35 MB of prompt files. Frontier
models now plan, write PRDs, and review code well without that scaffolding, so
most of it cost tokens without changing outcomes. The parts that still matter
are the state files and the enforcement, and those now live in code:

| | 6.4 | 7.0 |
| --- | --- | --- |
| Commands | 124 | 8 |
| Agents | 41 | 4 |
| Prompt text shipped | about 1.35 MB | about 24 KB |
| Gates | written instructions | Stop and commit hooks, plus `gate ship` |
| Project state | `state.json`, generated views, and a folder per tier | `STATE.md`, `PLAN.md`, `DECISIONS.md`, `evidence.jsonl` |

If you need the 6.x commands, `npx godpowers@6` still installs them. See
[Migrating from 6.x](docs/migrating-from-6.md).

## Install

```bash
npx godpowers --claude --global
```

Use `--codex` for Codex (skills go to `~/.agents/skills`, hooks to
`~/.codex/hooks.json`), `--claude --codex` for both, or `--all` for every
supported host. Claude Code and Codex get the hooks. Cursor, Windsurf, Gemini
CLI, OpenCode, Copilot, and the other hosts get the skills and agents only.
`--local` installs into the current directory instead of your home directory.

Codex runs new hooks only after you trust them: open `/hooks` in Codex once
after installing.

Claude Code can also install Godpowers as a plugin. Plugin commands are
namespaced, for example `/godpowers:god`.

```text
/plugin marketplace add hannsxpeter/godpowers
/plugin install godpowers@godpowers
```

Pick one install method per host; installing both runs the hooks twice.
Uninstall with `npx godpowers --claude --uninstall`.

## Use it

In a repository:

1. `/god-init` creates `.godpowers/`, detects your check command, and adds a
   short note to AGENTS.md. On a 6.x project it runs the migration instead.
2. `/god <goal>` picks the smallest path that does the job well. A question gets
   an answer, a small change gets made and verified, and a feature gets built
   and independently reviewed. It writes a plan only when your request does not
   already list the requirements, adds a security pass only when the change
   touches a trust boundary (auth, secrets, untrusted input, money, deleting
   data), and ships only when you ask.
3. `/god` with no goal tells you where the project stands and the next step.

| Command | What it does |
| --- | --- |
| `/god` | Front door: the next step, or drive a goal through the stages it needs |
| `/god-init` | Set up `.godpowers/`, or migrate a 6.x project |
| `/god-plan` | Write `PLAN.md`: goal, requirements with "Done when" checks, design, slices |
| `/god-build` | Implement slices test-first and record the checks |
| `/god-review` | Independent review in a fresh context, then fix and record |
| `/god-harden` | OWASP Top 10 pass with dependency and secret checks |
| `/god-ship` | Pass the ship gate, then deploy, verify health, record |
| `/god-status` | State, evidence freshness, and open risks, read-only |

Four optional agents ship with it: `god-planner`, `god-executor`,
`god-reviewer`, and `god-security-auditor`. The skills never require them. The
agent running a skill decides whether to delegate, which subagent to use (its
host's own or one of these), and how to run it. Before starting a subagent it
says which model and reasoning effort it picked and why, then passes both
explicitly, sized to the subtask, rather than letting the subagent inherit its
own: a small, fast model at low effort for reading and mechanical work, the
strongest model at high effort only for hard or security-critical work. The
review and security skills carry the brief any reviewer should get.

## Project files

Everything lives in `.godpowers/`, which you commit with your code:

- `STATE.md` is the one state file. Its frontmatter holds `project`, `stage`
  (plan, build, review, harden, ship, done), and `verify` (your check command).
  Optional keys: `fast` (a file-local check; `{files}` expands to the changed
  files, each quoted for the shell), `docs` (comma-separated globs that count
  as documentation, or `none`), and `risk` (comma-separated globs that make a
  change high risk). Its body holds Goal, Now, Next, and Risks. A risk is one checkbox line:
  `- [ ] critical: SQL injection in /search (src/api/search.ts:40)`.
- `PLAN.md` holds the goal, requirements with "Done when" checks, non-goals,
  design, and slices. It is skipped when a request already lists its
  requirements; those go under Goal in `STATE.md`.
- `DECISIONS.md` is an append-only decision log. Entries look like
  `## 2026-09-26: Use Postgres`. To change a decision, add a newer entry.
- `evidence.jsonl` is written only by the CLI. Each record is bound to the exact
  code it describes and chained to the previous one by digest.

## Gates

Every verification record stores a fingerprint of your working copy, built
from git's content hashes of every file, including untracked files but leaving
out ignored files and `.godpowers/`. It depends only on content, so a check you
ran before committing still counts after the commit, and any later edit makes
it stale. Computing it only reads from git, so it also works inside Codex's
sandbox, and it matches git's own hashing for line-ending conversion, LFS, and
SHA-256 repositories.

A record covers the code as it was when the check started. If files change
while the check runs, run it again.

Only the check command declared in STATE.md (`verify:`) satisfies the gates.
Other commands are recorded but do not count.

- **Stop hook.** When a session ends a turn after changing code, and no passing
  (or waived) run of the declared check matches the current code, the agent is
  asked to run `godpowers verify` first. Changes that only touch documentation
  (markdown, reStructuredText, AsciiDoc, LICENSE, and similar files) pass. The
  agent is asked once per code state, so it cannot loop.
- **Commit hook.** `git commit` is blocked while `godpowers lint` finds errors
  in `.godpowers/`, for example a malformed risk line or an edited past
  decision.
- **Ship gate.** `godpowers gate ship` scales with the risk of the change
  since the latest `v*` tag (or `--base <ref>`). Low risk needs a passing
  check. Normal risk also needs a passing review record. High risk also needs
  a passing security record. With no tag and no `--base` there is nothing to
  compare, so the tier is high. An open critical risk always blocks, and
  `tests` findings show as a warning.

### Risk tiers

`godpowers risk [--base <ref>]` classifies the change since the base. Low means
only documentation and test files changed (or nothing). High means a changed
path matches a built-in pattern or a `risk:` glob from STATE.md. Everything
else is normal. The built-in patterns (`HIGH_RISK_PATTERNS` in
[lib/risk.js](lib/risk.js)) cover sign-in and authorization code, sessions,
permissions, crypto, secrets and `.env` files, database migrations and SQL
schemas, payments and billing, CI workflows, Docker and Compose files,
Terraform, Kubernetes and Helm, and deploy and infra folders. Matching is
case-insensitive.

### Records that survive documentation edits

Records also store a fingerprint of the files that are not documentation.
Review, harden, and ship records match when either fingerprint matches, so a
README typo does not void a review. Check and waiver records still match only
the whole tree, because a test suite can read documentation. `docs:` in
STATE.md changes what counts as documentation; `docs: none` turns the
exemption off, for the records and for the Stop hook.

To switch the Stop and commit gates off, add `gate: off` to STATE.md's
frontmatter, or set `GODPOWERS_GATE=off` for one session.

`godpowers init` adds `.godpowers/evidence.jsonl merge=union` to
`.gitattributes`, so branches that each recorded checks merge without
conflicts. Merged ledgers show chain-break warnings, which are expected. If you
keep `.godpowers/` out of git, init leaves `.gitattributes` and AGENTS.md
alone.

## CLI

On Claude Code and Codex, the installed skills call the installed copy of the
CLI by path, so the agent runs the same version as the hooks and needs no
network. Elsewhere they use `npx -y godpowers@7`. You can run the commands
directly too:

```text
godpowers init [--verify "<cmd>"] [--goal "<text>"] [--no-agents-md]
godpowers migrate [--dry-run]           6.x layout to 7.x; archives, deletes nothing
godpowers clean [--dry-run]             remove 6.x blocks from AGENTS.md, CLAUDE.md, rule files
godpowers status [--json]               stage, evidence freshness, risks, next step
godpowers verify "<cmd>" [--claim "<text>"]   run a check and record it
godpowers verify "<cmd>" --force        run even if it already passed on this code
godpowers fast [files...]               run the STATE.md "fast:" check; never recorded
godpowers fast --hook                   PostToolUse handler: silent unless the check fails (exit 2)
godpowers verify --waive "<reason>"     record that no automated check covers this code
godpowers record review|harden|ship --pass|--fail --summary "<text>"
godpowers record review ... --dismiss "<finding>: <reason>"   (repeatable)
godpowers reviews [--json]              review rounds since the last pass
godpowers stats [--json]                check runs, recovery time, review rounds
godpowers tests [--base <ref>] [--json] flag weakened tests since the base
godpowers risk [--base <ref>] [--json]  low, normal, or high risk since the base
godpowers gate ship [--base <ref>] [--json]   the release gate, by risk tier
godpowers lint [--notes] [--json]       validate .godpowers/ files
godpowers doctor [--json]               installed hosts, registered hooks, 6.x leftovers
godpowers budget [--json]               prompt size of the shipped skills and agents
```

`verify` with no command runs the declared check. It exits non-zero when the
check fails, and prints only the last 3,000 characters of output, to keep the
agent's context small. Quote the command (`verify "pytest -k 'not slow'"`) or
put godpowers options first (`verify --claim x pytest -k "not slow"`).
Stopping `verify` stops the check too.

`verify` reuses work. When the latest record of the same command on the same
code passed, it prints that it reused the record and exits 0 without running
the command or writing the ledger. `--force` always runs it (use it when the
environment may have changed). `--json` output then has `reused: true`.

`fast` runs the `fast:` command from STATE.md on the files you give it, or on
the files changed since HEAD plus untracked files. It never writes the ledger,
so it is feedback, not evidence. With `{files}` in the command and nothing
changed, it runs nothing.

`reviews` lists the review rounds since the last passing one, with the commit
each saw and the findings dismissed. After three failed rounds it says to stop
and rethink the approach. Record a finding you chose not to fix with
`record review --fail --summary "<text>" --dismiss "<finding>: <reason>"`, so
the next reviewer is not asked about it again.

`stats` reports from the ledger: check runs with passes, failures, and median
and longest duration, the median time from a failing run to the next passing
one, waivers, and review rounds.

`tests` compares the working tree with the base (default: the latest `v*` tag;
exit 2 when there is none and no `--base`) and flags deleted test files, fewer
test declarations or assertions in a file, and added skip or focus markers. It
exits 1 with findings. Put `godpowers: allow-test-change` on a line to mark a
deliberate change.

## Per-edit feedback hook

Godpowers does not register a hook that runs `fast`, because an installed hook
would run a command that any cloned repository declares, with no prompt.
Godpowers runs a repository's commands only when you or the agent call the
CLI. If you want feedback after every edit in Claude Code, add a PostToolUse
hook yourself, in the repository's own `.claude/settings.local.json` (which you
do not commit), and only in a repository whose `fast:` command you trust. Do
not put it in the global `~/.claude/settings.json`: a global hook would run the
`fast` command of every repository you open, including ones you just cloned.
Adjust the path to the installed copy:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/godpowers/bin/godpowers.js\" fast --hook",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

`fast --hook` reads the hook's JSON from stdin. If `tool_input.file_path` (or
`tool_input.path`) is a file inside the project, it checks that file;
otherwise it checks the files changed since HEAD. It never writes the ledger.

- Exit 0 with no output: nothing to do (no project, no `fast:` declared,
  nothing to check), the check passed, or the hook hit an internal error and
  failed open (a short note goes to stderr).
- Exit 2: the check failed. The output tail and a one-line summary go to stderr,
  which Claude Code shows to the agent, so it can fix the edit.

Keep the `timeout` short (seconds, not minutes); a check that cannot finish
quickly belongs in `verify`, not in a per-edit hook.

## Measure it yourself

Whether a workflow tool helps your models is an empirical question, so the
repository ships an A/B harness. It runs the same tasks with and without
Godpowers in separate git worktrees and records tokens, cost, time, verify
results, and diff size. See [docs/ab-eval.md](docs/ab-eval.md).

## Limits

- Review, security, and ship records are attestations: the CLI records that the
  agent says a review passed, bound to the code it reviewed. Only `verify`
  records are backed by an executed command.
- The evidence chain detects hand edits. It cannot stop someone who rewrites
  the whole file and recomputes every digest.
- Hooks exist only on Claude Code and Codex. On other hosts the gates are
  instructions.
- Godpowers has no recorded production users yet. See [USERS.md](USERS.md).

## More

- [Architecture](ARCHITECTURE.md)
- [Migrating from 6.x](docs/migrating-from-6.md)
- [A/B harness](docs/ab-eval.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

MIT licensed.
