# Quick Proof

This page is the shortest path to understanding what Godpowers adds beyond a
normal AI coding prompt. It is proof-first by design: run one tiny local check,
read one dashboard-shaped transcript, then inspect the files that make the run
accountable.

## What This Proves

- [DECISION] A normal AI coding prompt can produce code, but Godpowers also
  leaves disk state, artifacts, validation gates, host guarantees, and a next
  action.
- [DECISION] Godpowers treats the file system as the source of truth, so a
  session can resume from `.godpowers/` instead of depending on chat memory.
- [DECISION] Godpowers reports degraded host behavior instead of pretending
  every AI coding tool can provide the same agent-spawning guarantees.
- [HYPOTHESIS] A new user should be able to see this difference in 10 minutes
  without waiting for a full multi-hour project run.

## Ten Minute Path

Run these from a project directory after installing Godpowers.

```bash
npx godpowers quick-proof --project=. --brief
npx godpowers status --project=. --brief
npx godpowers next --project=. --brief
```

The first command reads a shipped fixture at `fixtures/quick-proof/project`, computes
the next command from its `.godpowers/state.json`, and reports host guarantees
from your current environment.

The next two commands render live project status and the recommended next
action for the current directory.

If the project has no `.godpowers/` directory yet, start with the smallest
state-producing path inside your AI coding tool:

```text
/god-init
/god-next
```

Then inspect the created state:

```bash
find .godpowers -maxdepth 2 -type f | sort
```

The proof is not that every command already ran. The proof is that Godpowers
can name what exists, what is missing, what the host can guarantee, and the
single next move.

## Outcome Metrics

- [DECISION] Quick Proof reports commands to first signal, state source,
  tracked steps, missing planning artifacts, next command, host level, and host
  gap count.
- [DECISION] These metrics separate observable adoption evidence from broader
  claims about a full autonomous project run.
- [DECISION] A useful first run should produce at least one next command, one
  host guarantee, and one inspectable disk-state path.

## External CLI Canaries

- [DECISION] Three external repositories now have CLI-verifiable canary
  reports: [sindresorhus/is](case-studies/sindresorhus-is-adoption-canary.md),
  [expressjs/cors](case-studies/expressjs-cors-adoption-canary.md), and
  [tinyhttp/tinyhttp](case-studies/tinyhttp-adoption-canary.md).
- [DECISION] These canaries prove first-contact status and next-action signals
  against real cloned repositories.
- [OPEN QUESTION] They do not yet prove host slash-command execution inside
  those repositories. Owner: maintainer. Due: before broad product proof
  claims.

## Before And After

### Unguided AI Prompt

```text
User: Build a SaaS for solo founders to track MRR.

AI: Here are the files for a dashboard application.
```

That may be useful, but the result usually lacks durable planning state,
independent review, host capability reporting, and a structured resume point.

### Godpowers Prompt

```text
User: /god-mode
User: A SaaS for solo founders to track MRR breakdown by new, expansion, and churn.
```

Godpowers routes the work through project state and artifacts:

```text
.godpowers/PROGRESS.md
.godpowers/prd/PRD.md
.godpowers/arch/ARCH.md
.godpowers/roadmap/ROADMAP.md
.godpowers/stack/DECISION.md
.godpowers/build/PLAN.md
.godpowers/harden/FINDINGS.md
```

The difference is the audit trail. Code is only one output. The project memory,
validation record, and next action are also outputs.

## Transcript Excerpts

These excerpts show the shape of successful operation. They are intentionally
short so the user-facing surface stays readable.

### Next Action

```text
Godpowers Quick Proof

Action brief:
  Next: /god-prd
  Why: Prep exists, but no PRD artifact is complete.
  Readiness: ready
  Attention: none
  Host guarantees: full for shell and local runtime, agent spawning depends on host
```

### Dashboard Closeout

```text
Godpowers Dashboard

Current status:
  State: partial
  Phase: Planning
  Progress: 20% (1 of 5 tracked planning steps complete)
  Worktree: modified files unstaged

Planning visibility:
  PRD: pending
  Roadmap: missing

Next:
  Recommended: /god-prd
  Why: The project has initialization findings but no product requirements artifact.
```

### Host Guarantee

```text
Host guarantees: degraded
First gap: this host can install skills, but true fresh-context agent spawning
is not available. Godpowers will report Agent: simulated in current context.
```

### Review Finding

```text
Reviews:
  1 pending, suggest /god-review-changes

Finding:
  Severity: warning
  Surface: build plan
  Reason: acceptance criteria exist, but the runtime verification URL is missing.
```

### Release Gate

```text
Release readiness:
  State: blocked
  Attention: package payload check failed
  Next: npm run pack:check
```

## Starter Paths

Use these paths before reading the full command reference.

| Goal | Start here |
|---|---|
| Start a product | `/god-init`, `/god-prd`, `/god-design`, `/god-arch`, `/god-roadmap`, `/god-stack`, `/god-repo`, `/god-build` |
| Add a feature | `/god-reconcile`, `/god-feature`, `/god-sync`, `/god-review` |
| Fix production | `/god-hotfix`, `/god-postmortem`, `/god-status` |
| Audit an existing repo | `/god-preflight`, `/god-archaeology`, `/god-reconstruct`, `/god-audit`, `/god-tech-debt` |
| Ship a release | `/god-sync`, `/god-docs`, `/god-version`, `/god-automation-setup`, `npm run release:check` |
| Maintain health | `/god-hygiene`, `/god-update-deps`, `/god-docs`, `/god-check-todos` |
| Extend Godpowers | `/god-extension-scaffold --name=@godpowers/my-pack --output=.`, `/god-test-extension`, `/god-extension-add`, `/god-extension-list` |

## Runtime Expectations

| Runtime class | What to expect |
|---|---|
| Claude Code | Strong reference path when native agent spawning is available. |
| Codex | Strong installed support through `agents/*.toml` metadata backed by the same Markdown agent contracts. |
| Other install targets | Skills and agent contracts install, while host-native spawning depends on the tool. |
| Degraded hosts | Godpowers must report local-only or simulated agent behavior instead of hiding the limitation. |

See [host-capabilities.md](host-capabilities.md) for the detailed capability
model.

## What To Inspect Next

- [Getting Started](getting-started.md) explains install and first project flow.
- [First 10 Minute Proof Case Study](case-studies/first-10-minute-proof.md)
  explains the local proof as a public case study.
- [Reference](reference.md) lists every slash command.
- [Validation](validation.md) explains static, linkage, and runtime checks.
- [Proof Transcript](proof-transcript.md) captures the runnable quick-proof
  command output.
- [Dogfooding](dogfooding.md) explains messy-repo checks that prove behavior
  against fixtures.
- [Adoption Canary](adoption-canary.md) defines the next real-world proof loop.
