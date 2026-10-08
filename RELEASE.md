# Godpowers 7.0.1

7.0.1 is the first 7.x release on npm (7.0.0 was tagged but never published).
It carries everything in 7.0 below, plus one security fix and two fixes to
the installed copy.

## Fixes in 7.0.1

- **Security:** registering hooks no longer writes settings through a
  predictable temp file. A repository that planted a symlink at
  `.claude/settings.json.godpowers-tmp` could make a `--local` install
  overwrite the file it pointed at.
- `godpowers doctor` and `godpowers budget` no longer fail with `ENOENT` when
  run from `~/.claude/godpowers` or `~/.codex/godpowers`.
- Reinstalling from the installed copy no longer deletes the installed skills
  or the copy itself, and a failed install leaves the old copy working.

## What 7.0 changed

Godpowers is now a small core: 8 commands, 4 agents, and about 4K tokens of
instructions, down from 124 commands, 41 agents, and 1.35 MB of prompt files.
It keeps what a model cannot do for itself and enforces it with hooks.

## Highlights

- **Hooks that code enforces** on Claude Code and Codex. The session brief
  shows state at startup. A Stop gate asks the agent to verify when code changed
  without a passing check. A commit gate blocks `git commit` while the
  `.godpowers/` files have errors.
- **Evidence bound to code.** Every check is recorded against a content
  fingerprint of the working copy. It survives commits, goes stale on any edit,
  and is computed with read-only git commands, so it works inside sandboxes.
- **One state file.** `.godpowers/` now holds `STATE.md`, `PLAN.md`,
  `DECISIONS.md`, and `evidence.jsonl`.
- **A ship gate.** `godpowers gate ship` needs a passing check, review, and
  security record for the current code, and no open critical risk.
- **Only the stages a goal needs.** `/god` builds and independently reviews a
  feature, writes a plan only when the request does not already list its
  requirements, adds a security pass only when the change touches a trust
  boundary, ships only when you ask, and records the project check once per
  build. The reviewer checks that each requirement has a test, including the
  cases that must not trigger it. In the first A/B run, running every stage
  matched plain Codex on correctness at about 4x the cost. With the current
  flow the same task cost about 2x to 2.8x, and both runs scored 8 of 10 in
  blind review against plain Codex's 7.
- **A prompt budget in CI**, so the core cannot quietly grow back.
- **An A/B harness** (`scripts/ab-eval.js`) to measure whether Godpowers helps
  on your own tasks.
- **Subagent-neutral, right-sized delegation.** A skill says what a step needs,
  such as a review from a fresh context. The agent using it picks the subagent
  and how to run it, then names and passes its model and effort explicitly: the
  cheapest that fit the subtask, with the strongest model and high effort kept
  for work that needs them. The four bundled agents are optional.
- **Claude Code skills appear in the picker again** (fix by @ikkeflikkeri), and
  a plugin manifest is included.

## Breaking changes

116 commands, 37 agents, the MCP package, extension packs, routing, workflows,
dashboards, automations, suite mode, and the learning loop are gone. The command
map and upgrade steps are in [docs/migrating-from-6.md](docs/migrating-from-6.md).
`npx godpowers@6` still installs 6.4.0.

## Upgrade

```bash
npx godpowers@7 --claude --codex --global
npx godpowers@7 migrate --dry-run   # in each project, then without --dry-run
```

In Codex, open `/hooks` once to trust the new hooks.
