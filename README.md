# Godpowers

[![npm](https://img.shields.io/npm/v/godpowers)](https://www.npmjs.com/package/godpowers)
[![CI](https://github.com/hannsxpeter/godpowers/actions/workflows/ci.yml/badge.svg)](https://github.com/hannsxpeter/godpowers/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Godpowers keeps a project's memory on disk and refuses unverified "done".
The model does the planning and the coding. Godpowers adds four things a model
cannot do for itself: durable state that survives sessions and tools, a record
of which checks actually ran against which code, an independent reviewer in a
fresh context, and gates that code enforces through Claude Code and Codex hooks.

It is deliberately small: 8 commands, 4 agents, and about 4K tokens of
instructions in total. About 900 tokens load per session whether you use it or
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
| Prompt text shipped | about 1.35 MB | about 17 KB |
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
   an answer, a small change gets made and verified, and a feature goes through
   plan, build, review, harden, and ship.
3. `/god` with no goal tells you where the project stands and the next step.

| Command | What it does |
| --- | --- |
| `/god` | Front door: the next step, or drive a goal end to end |
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
host's own or one of these), and how to run it, and it sizes each subagent's
model and reasoning effort to the subtask instead of inheriting its own: a
small, fast model at low effort for reading and mechanical work, the strongest
model at high effort only for hard or security-critical work. The review and
security skills carry the brief any reviewer should get.

## Project files

Everything lives in `.godpowers/`, which you commit with your code:

- `STATE.md` is the one state file. Its frontmatter holds `project`, `stage`
  (plan, build, review, harden, ship, done), and `verify` (your check command).
  Its body holds Goal, Now, Next, and Risks. A risk is one checkbox line:
  `- [ ] critical: SQL injection in /search (src/api/search.ts:40)`.
- `PLAN.md` holds the goal, requirements with "Done when" checks, non-goals,
  design, and slices.
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
- **Ship gate.** `godpowers gate ship` passes only with a passing check, a
  passing review record, and a passing security record for the current code,
  and no open critical risk.

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
godpowers verify --waive "<reason>"     record that no automated check covers this code
godpowers record review|harden|ship --pass|--fail --summary "<text>"
godpowers gate ship [--json]            the release gate
godpowers lint [--notes] [--json]       validate .godpowers/ files
godpowers doctor [--json]               installed hosts, registered hooks, 6.x leftovers
godpowers budget [--json]               prompt size of the shipped skills and agents
```

`verify` with no command runs the declared check. It exits non-zero when the
check fails, and prints only the last 3,000 characters of output, to keep the
agent's context small. Quote the command (`verify "pytest -k 'not slow'"`) or
put godpowers options first (`verify --claim x pytest -k "not slow"`).
Stopping `verify` stops the check too.

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
