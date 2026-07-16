# Godpowers

[![CI](https://github.com/hannsxpeter/godpowers/actions/workflows/ci.yml/badge.svg)](https://github.com/hannsxpeter/godpowers/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-5.5.1-blue)](CHANGELOG.md)
[![npm](https://img.shields.io/npm/v/godpowers.svg)](https://www.npmjs.com/package/godpowers)

**Ship fast. Ship right. Ship everything. Ship accountably.**

Godpowers turns your AI coding tool into a disciplined engineering team. You
type a slash command like `/god-mode`; Godpowers plans the work, spawns
specialist agents to do it, checks their output against real gates, and leaves a
trail on disk so you can see exactly what happened. In 5.0 it can also run as an
autonomous **loop**: it finds the next piece of work, does it, verifies it, and
decides what to do next, on its own.

The current source surface contains 122 slash commands, 40 specialist agents,
13 workflows, and 44 recipes. The default core profile exposes 15 commands.

If you have never used it before, this page is written for you. Start at
[New here?](#new-here-start-in-two-minutes) and follow it top to bottom.

---

## New here? Start in two minutes

You do not have to install anything to see what Godpowers does. From inside any
project folder:

```bash
npx godpowers quick-proof --project=. --brief
```

That prints a safe proof from a shipped fixture plus host capability evidence.
It does not inspect your current project and writes nothing. To inspect the
current project explicitly through the same read-only view, run:

```bash
npx godpowers quick-proof --project=. --inspect-project --brief
```

When you are ready to use it for real, install it for your AI coding tool (Claude
Code shown; other tools are under [Install](#install)):

```bash
npx godpowers --claude --global --profile=core
```

Then open your AI tool in a project and type:

```
/god         describe what you want in plain English and it routes you
/god-mode    run the whole project, idea to hardened production, on its own
/god-loop    set up a self-driving loop that keeps working on a schedule
```

That is the whole on-ramp. Everything below explains the ideas so the output
makes sense.

---

## The words you will see (plain-English glossary)

Godpowers has its own vocabulary. Here is what each term means before you meet it
in the tool:

- **arc** - one full run of a project, from raw idea to launch.
- **tier** - a phase of that run. There are four: orchestration, planning,
  building, shipping.
- **agent** - a specialist worker (a PM, an architect, a reviewer) that Godpowers
  spawns in a fresh context to do one job well.
- **skill / slash command** - a thing you can invoke, like `/god-build`. There
  are 122 of them, but you only ever need a few at a time.
- **gate** - an automatic, pass-or-fail check (tests, lint, security) that work
  must clear before it counts as done. No gate, no "done".
- **have-nots** - a named list of failure modes every document must avoid. They
  are grep-testable, so they cannot be faked.
- **loop** - a self-driving cycle: find work, do it, verify it, record it, decide
  the next move. New in 5.0.
- **state** - the project's memory, kept on disk in `.godpowers/`, never trapped
  in chat history.

You do not need to memorize these. `/god-help` explains anything in context, and
the full list lives in [docs/concepts.md](https://github.com/hannsxpeter/godpowers/blob/main/docs/concepts.md).

---

## What Godpowers actually does

Every serious AI coding run should leave more than code. Godpowers makes each run
leave **disk state, artifacts, passing gates, host guarantees, and a next
action**, so the project can be inspected, resumed, and trusted.

It fuses several disciplines into one workflow:

- **Native project context** - every Godpowers project is a Pillars project: a
  root `AGENTS.md` plus routed `agents/*.md` files hold durable project truth
  before any command touches code.
- **Form-first execution** - one primary product form selects the vertical
  slice before archetype, industry, or regulatory constraints are composed.
- **Artifact discipline** - every sentence in every document is a labeled
  decision, hypothesis, or open question, with mechanically verified failure
  modes.
- **Execution engine** - fresh-context agents in parallel waves with atomic
  commits. No context rot, no sequential bottlenecks.
- **Quality immune system** - TDD enforcement, two-stage code review (spec
  compliance, then code quality), surgical diffs, and verification before
  anything is called complete.
- **Accountability** - the current state is on disk, the next action is derived
  from it, and every change traces back to a request.
- **Publication integrity** - public activation is bound to a fresh hardening
  hash, timestamp, and Critical-finding policy.

It is the builder in a three-part family: [godplans](https://github.com/hannsxpeter/godplans)
plans everything up front (`.godplans/PLAN.mdx` plus its self-contained
validator), [godaudits](https://github.com/hannsxpeter/godaudits)
scores what was built (canonical `.godaudits/AUDIT.json` plus a generated
`AUDIT.mdx` report), and Godpowers builds, imports
either one when it finds it, and ships. Its own artifacts live under
`.godpowers/` as `.mdx`, human-readable and machine-parseable, with a legacy
`.md` fallback for projects created before 4.0.

Godpowers also imports Arc-Ready 1.1 tier artifacts as read-only migration
evidence and writes progress back only through
`.arc-ready/GODPOWERS-SYNC.md`.

### Two ways to drive

**One-shot arc.** Type `/god-mode` and Godpowers runs every tier from idea to
hardened production, pausing only when it hits a real question for you. This is
the right choice for building something once.

**Standing loop (new in 5.0).** Type `/god-loop` and Godpowers stands up a
self-driving cycle on a schedule: it wakes up, finds the next piece of work, does
it, checks it against a gate, records what happened, and decides the next move.
This is the right choice for ongoing, recurring work (nightly hygiene, a backlog
that drains itself, an issue queue that gets triaged).

---

## The loop (new in 5.0)

Loop engineering is the shift from prompting an agent by hand to building a small
system that prompts the agent for you. Godpowers 5.0 makes that a first-class
mode. A loop has exactly four moving parts, and `/god-loop` wires them in order:

1. **Automation** - the heartbeat. A host-native schedule or trigger (from
   `/god-automation-setup`) decides when the loop wakes up.
2. **Skill** - the work. One Godpowers command is the unit of work per tick.
3. **State file** - the memory. `.godpowers/state.json` and the run ledger let
   the loop resume instead of restart, so each tick builds on the last.
4. **Objective gate** - the brake. A machine-checkable gate must pass before a
   change is accepted. A loop without an objective gate quietly ships half-done
   work, so `/god-loop` refuses to build one without a hard stop.

### Is the loop healthy?

The one number that matters is the **accepted-change rate**: of the changes the
loop proposed, what fraction survived the gate instead of being rejected or
rolled back. A healthy loop stays above 50%. See it with:

```
/god-metrics        accepted-change rate plus per-tier stats
```

It is derived straight from the event ledger (`lib/change-metrics.js`), so it
cannot be gamed.

### Letting the loop act on the outside world

A loop that only reads its own state is half a loop. `/god-connect` lets it open
a GitHub issue, move a Linear ticket, post to Slack, or triage a Sentry error, by
**delegating to the connectors your host already exposes over MCP**. Godpowers
never vendors an API client and never handles your credentials; it only names the
connector and the action.

Reads are allowed by default. **Writes are off until you turn them on** per
connector:

```
/god-connect                 detect connectors and show their scope
/god-connect allow github    opt GitHub into write scope
```

### Keeping the loop safe over time

An unattended loop accumulates permission creep. `/god-harden` now tracks a
**permission re-audit cadence** (default every 30 days) so you get a hard signal
when connector scope, automation reach, and credentials are due for review,
instead of a vague "we should check security sometime". A read-only
`permission-reaudit` automation template can run it on schedule.

---

## Install

```bash
npx godpowers --claude --global --profile=core
```

Other targets: `--codex`, `--cursor`, `--windsurf`, `--opencode`, `--gemini`,
`--copilot`, `--augment`, `--trae`, `--cline`, `--kilo`, `--antigravity`,
`--qwen`, `--codebuddy`, `--pi`. Or `--all` for everything (15 runtimes).

The installer copies slash-command skills, specialist agents, Codex agent
metadata, and (Claude Code only) a SessionStart hook into your tool's config
directory.

### Pick a profile so the command list stays calm

You do not need all 122 commands visible at once. Profiles install only the ones
that fit your role:

| Journey | Profile |
|---|---|
| I want the basics | `core` |
| I build products | `builder` |
| I maintain Godpowers or mature repos | `maintainer` |
| I coordinate multi-repo suites | `suite` |
| I want everything | `full` |

```bash
npx godpowers --claude --global --profile=core
npx godpowers --codex --local --profile=builder
```

You can switch the visible surface later without reinstalling:

```bash
npx godpowers surface --profile=builder --codex --global --dry-run
npx godpowers surface --profile=builder --codex --global --apply
```

`--minimal` is an alias for `--profile=core`.

### Runtime Expectations

Agent spawning is host-native, and hosts differ. Godpowers reports honestly
whether it can provide **full**, **degraded**, or **unknown** runtime guarantees
rather than pretending a background agent ran.

| Runtime class | What to expect |
|---|---|
| Claude Code | Reference-grade when native agent spawning is available. |
| Codex | Strong support through installed `agents/*.toml` metadata. |
| Other install targets | Skills and agent contracts install; host-native spawning depends on the tool. |
| Degraded hosts | Godpowers reports local-only or simulated behavior instead of hiding it. |

Full details: [Host capabilities](https://github.com/hannsxpeter/godpowers/blob/main/docs/host-capabilities.md).

---

## Start with a path

If the full surface feels large, begin with one path and learn the next command
only when Godpowers recommends it. `/god-help` shows a short, state-aware view;
`/god-help all` shows everything.

### Start With A Path

| Goal | Starter path |
|---|---|
| Start a product | `/god-first-run`, `/god-init`, `/god-plan`, `/god-build` |
| Try safely | `/god-demo`, `/god-first-run`, `/god-init` |
| Add a feature | `/god-reconcile`, `/god-feature`, `/god-sync`, `/god-review` |
| Fix production | `/god-fix`, `/god-postmortem`, `/god-status` |
| Audit an existing repo | `/god-preflight`, `/god-archaeology`, `/god-reconstruct`, `/god-audit`, `/god-tech-debt` |
| Run a self-driving loop | `/god-connect`, `/god-loop`, `/god-metrics` |
| Ship a release | `/god-ship`, `/god-sync`, `/god-docs`, `/god-version`, `npm run release:check` |
| Maintain project health | `/god-hygiene`, `/god-update-deps`, `/god-docs`, `/god-check-todos` |
| Extend Godpowers | `/god-extend scaffold --name=@godpowers/my-pack --output=.`, `/god-extend test`, `/god-extend add`, `/god-extend list` |

New public command surface should be added only when existing families, ladders,
profiles, recipes, and docs cannot express a proven user need.

### Don't want full autonomy?

Run individual commands. After each one, Godpowers tells you what to run next
based on disk state, and you can always ask:

```
/god-next
```

That reads `.godpowers/state.json`, scans disk, reconciles any drift, and
suggests the next logical command with a compact action brief. The SessionStart
hook does the same when you open a session in a Godpowers project.

---

## How it stays honest

Every artifact clears these mechanical checks before it counts as complete:

| Check | What it catches |
|---|---|
| Substitution test | AI-slop (generic output that reads the same for any product) |
| Three-label test | Unlabeled assumptions hiding as decisions |
| Have-nots | Named failure modes, grep-testable per tier |
| Artifact-on-disk | Phantom "done" (agent claims done, file does not exist) |
| Critical-finding gate | Shipping with known security holes |
| TDD enforcement | Code without tests |
| Two-stage review | Code that passes tests but violates spec or quality |
| Accepted-change rate | A loop thrashing instead of shipping |

These are guardrails, not proof the product is right. A PRD can pass every check
and still make the wrong call. The point is to catch generic, missing, or
untraceable work so the remaining human judgment is visible.

### The maker is never the checker

The agent that writes a change never grades it. Godpowers spawns the reviewer in
a separate fresh context, so it cannot rubber-stamp its own work. Build,
spec-review, and quality-review are three independent agents.

---

## Architecture in one screen

Each slash command is a **thin orchestrator**. It does not do the work; it spawns
the right specialist in a fresh context.

```
You type:        /god-prd
Skill loads:     skills/god-prd.md
Skill spawns:    god-pm agent (fresh context)
Agent reads:     .godpowers/state.json + .godpowers/intent.yaml
Agent writes:    .godpowers/prd/PRD.mdx
Skill verifies:  artifact exists, have-nots pass
Skill updates:   state.json
```

### The four tiers

| Tier | Sub-steps | Specialists |
|------|-----------|-------------|
| 0: Orchestration | mode detection, scale, progress | god-orchestrator |
| 1: Planning | PRD, optional DESIGN, ARCH, ROADMAP, STACK | god-pm, god-designer, god-architect, god-roadmapper, god-stack-selector |
| 2: Building | repo, plan, execute, review | god-repo-scaffolder, god-planner, god-executor, god-spec-reviewer, god-quality-reviewer |
| 3: Shipping | deploy, observe, launch, harden | god-deploy-engineer, god-observability-engineer, god-launch-strategist, god-harden-auditor |

### The MCP companion

The main `godpowers` runtime is dependency-free. The optional `@godpowers/mcp`
companion package owns the MCP SDK and exposes nine read-only tools (`status`,
`next`, `gate_check`, `lint_artifact`, `trace_requirement`, `work_report`,
`change_metrics`, `route`, `verification_history`) so MCP-capable hosts can read
project state:

```bash
npx godpowers mcp-info --project=.
npx -y -p godpowers@5.0.0 -p @godpowers/mcp@5.0.0 godpowers-mcp serve --project=.
```

Host registration is opt-in:

```bash
npx -y -p godpowers@5.0.0 -p @godpowers/mcp@5.0.0 godpowers-mcp setup --host=codex --project=. --write
```

External **write** actions never go through this MCP surface; they are delegated
to host connectors via `/god-connect`. See
[MCP Companion](https://github.com/hannsxpeter/godpowers/blob/main/docs/mcp.md).

---

## Cost and the pause philosophy

Full autonomous runs spawn many fresh-context agents and can be expensive. The
runtime records token and dollar estimates through `cost.recorded` events;
`/god-cost` reports spend and savings, and `/god-budget` sets context caps, cache
use, and model profiles.

God Mode pauses only when a human is genuinely needed:

1. Intent is truly ambiguous (two valid directions).
2. A flip-point depends on human-only constraints (team size, budget).
3. Two options score within 10% with no objective tiebreaker.
4. A Critical security finding needs human judgment.
5. Brand or copy decisions require your voice.

Every pause states the question, why only you can answer it, the options with
tradeoffs, and a default if you just say "go". Mechanical failures are not
pauses; they enter the repair loop.

---

## Maintainer validation

The public release gate is one command:

```bash
npm run release:check
```

`npm test` runs the full suite through `scripts/run-tests.js`, and `npm run lint`
runs dependency-free static checks.

---

## Supported tools

Installs for 15 runtimes: Claude Code, Codex, Cursor, Windsurf, Gemini CLI,
OpenCode, Copilot, Augment, Trae, Cline, Kilo, Antigravity, Qwen, CodeBuddy, Pi.
Claude Code and Codex are the reference-grade paths; on other targets the skills
and agent contracts install but host-native spawning depends on the tool.

## Full reference

- [Getting Started](https://github.com/hannsxpeter/godpowers/blob/main/docs/getting-started.md)
- [Concepts](https://github.com/hannsxpeter/godpowers/blob/main/docs/concepts.md)
- [Loop engineering](https://github.com/hannsxpeter/godpowers/blob/main/docs/loop-engineering.md)
- [Quick Proof](https://github.com/hannsxpeter/godpowers/blob/main/docs/quick-proof.md)
- [First 10 Minute Proof Case Study](https://github.com/hannsxpeter/godpowers/blob/main/docs/case-studies/first-10-minute-proof.md)
- [Adoption Canary](https://github.com/hannsxpeter/godpowers/blob/main/docs/adoption-canary.md)
- [Command reference (all 122 skills + 40 agents)](https://github.com/hannsxpeter/godpowers/blob/main/docs/reference.md)
- [Host capabilities](https://github.com/hannsxpeter/godpowers/blob/main/docs/host-capabilities.md)
- [Roadmap](https://github.com/hannsxpeter/godpowers/blob/main/docs/ROADMAP.md)
- [Release Notes](RELEASE.md)
- [Changelog](CHANGELOG.md)
- [Inspiration](INSPIRATION.md)

## License

MIT
