# A/B harness

`scripts/ab-eval.js` runs the same tasks with and without Godpowers so you can
see whether it helps your models, and what it costs.

For each task, each arm, and each repeat it:

1. creates a detached git worktree of the task's repository at `ref`,
2. runs the optional `setup` command, then the arm's agent command with the
   task prompt,
3. saves the agent's output and extracts tokens, cost, and turns when the output
   includes them (Claude Code `--output-format json`, Codex `exec --json`),
4. runs the task's `verify` command and records pass or fail,
5. records the diff size, and runs the optional `review` command (for example an
   independent reviewer) and saves its output,
6. removes the worktree unless you pass `--keep`.

It writes `results.json` and `summary.md`. The summary leaves two columns for
what only a person can judge: how often you had to step in, and whether you
would ship the result.

## Config

```json
{
  "repeat": 1,
  "timeoutMinutes": 60,
  "review": "codex exec review --uncommitted",
  "tasks": [
    {
      "id": "search-endpoint",
      "repo": "/path/to/repo",
      "ref": "main",
      "setup": "npm ci",
      "prompt": "Add a /search endpoint with pagination and tests.",
      "verify": "npm test"
    }
  ],
  "arms": {
    "native": {
      "command": "claude -p --output-format json --permission-mode acceptEdits {prompt}",
      "env": { "GODPOWERS_GATE": "off" }
    },
    "godpowers": {
      "command": "claude -p --output-format json --permission-mode acceptEdits {prompt}",
      "prompt": "/god {prompt}"
    }
  }
}
```

`{prompt}` in an arm's `command` is replaced by the shell-quoted prompt. An
arm's optional `prompt` template wraps the task prompt, so the Godpowers arm can
send `/god <task>`. `env` sets environment variables for that arm only, and an
arm's `setup` runs in its worktree after the task's `setup` (for example
`godpowers init` for the Godpowers arm). The verify output of every run is
saved next to the agent output.

For an objective check, keep an acceptance test the agents never see and copy
it into the worktree from the task's `verify` command.

## Run

```bash
node scripts/ab-eval.js ab.json --dry-run
node scripts/ab-eval.js ab.json --out ab-results
```

Start with three or four real tasks from your own backlog: a feature, a bug fix,
a small greenfield app, and a change with deploy or security impact. Keep the
model and effort the same across arms. Run each more than once if the results
are close, because single agent runs vary.

## Reading the results

- Token and cost columns come from the agent's own report. If an arm's command
  does not print one, those columns stay empty.
- Codex `exec --json` reports the main thread's tokens only. Subagents' tokens
  are in their session files under `~/.codex/sessions`, so leave out
  `--ephemeral` when an arm can delegate.
- `--dangerously-bypass-hook-trust` also runs the hooks in `~/.codex/hooks.json`,
  so an arm that passes hooks with `-c` runs them twice. Give the native arm
  `--disable hooks`.
- `verify` is your check, not the agent's claim.
- The review output is there to count real defects. Read it rather than
  trusting its verdict.
- Decide per stage. Godpowers may help most on the steps beyond code (security,
  deploy, monitoring) and least on routine feature work.

## First results

On 2026-09-26 the harness ran one well-specified feature from a real backlog:
make `godaudits diff` usable as a CI gate. Codex ran `gpt-5.6-sol` at xhigh,
two runs per arm. A hidden acceptance test, the full suite, and a blind review
graded each run.

| | Plain Codex | Full pipeline | Proportional | Lean |
| --- | --- | --- | --- | --- |
| Hidden test and suite | 2 of 2 pass | 4 of 4 pass | 2 of 2 pass | 2 of 2 pass |
| Blind review score (of 10) | 7, 7 | 7, 8, 8, 8 | 8, 8 | 8, 7 |
| Minutes per run | 3.4 to 3.5 | 13 to 27 | 7.2 to 8.2 | 5.9 to 6.0 |
| Estimated spend | 1x | about 4x | about 2.4x | about 1.8x |

The last three columns are Godpowers.

Spend weights cached input at a tenth and output at eight times the price of
uncached input. In the runs with full logs, review, security, and ship took 55
to 60% of the Godpowers tokens, and every run, with or without Godpowers,
shipped the same top gap: a misspelled flag silently disabled the gate.

So `/god` now runs the security pass only for changes that touch a trust
boundary and ships only on request, and the skills require every subagent's
model and effort to be set explicitly: in one of two runs the reviewer had
silently inherited the session's model at xhigh. The proportional column is a
re-run of the same task with those changes. Both runs stopped after the review,
set their reviewer's effort explicitly (one also chose a smaller model), and
got "ship as is" from the blind reviewer, at a little over half the previous
spend. Most of the remaining gap was bookkeeping calls during the build.

The lean column is a third re-run after `/god` stopped writing a plan for
requests that already list their requirements and `/god-build` started
recording the check once per build. The main thread made 16 to 19 tool calls
instead of about 25, and planning plus building cost about what plain Codex
spends on the whole task, so the review is now most of the remaining gap. Both
blind reviews asked for more edge-case tests before shipping, so watch test
depth on requests that skip the plan. One task and two runs per arm is a small
sample, so run your own before drawing conclusions.
