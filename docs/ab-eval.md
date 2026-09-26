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
send `/god <task>`. `env` sets environment variables for that arm only.

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
- `verify` is your check, not the agent's claim.
- The review output is there to count real defects. Read it rather than
  trusting its verdict.
- Decide per stage. Godpowers may help most on the steps beyond code (security,
  deploy, monitoring) and least on routine feature work.
