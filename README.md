# Godpowers

[![CI](https://github.com/aihxp/godpowers/actions/workflows/ci.yml/badge.svg)](https://github.com/aihxp/godpowers/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.5.2-blue)](CHANGELOG.md)
[![npm](https://img.shields.io/npm/v/godpowers.svg)](https://www.npmjs.com/package/godpowers)

**Ship fast. Ship right. Ship everything. Ship accountably.**

Godpowers is an AI-powered development system that takes a project from raw
idea to hardened production. It runs as **slash commands inside your AI coding
tool** (Claude Code, Codex, Cursor, etc.) that orchestrate **specialist agents**
in fresh contexts to do the work.

Want the short proof first? Start with [Quick Proof](docs/quick-proof.md) to
run `npx godpowers quick-proof --project=. --brief`, see outcome metrics, pick
a starter command set, and understand runtime expectations before reading the
full reference. The [First 10 Minute Proof Case Study](docs/case-studies/first-10-minute-proof.md)
shows the same evidence as a before-and-after adoption story. External
CLI-verifiable canaries now cover [sindresorhus/is](docs/case-studies/sindresorhus-is-adoption-canary.md),
[expressjs/cors](docs/case-studies/expressjs-cors-adoption-canary.md), and
[tinyhttp/tinyhttp](docs/case-studies/tinyhttp-adoption-canary.md), with host
slash-command gaps called out rather than hidden.
Host-run proof studies now cover [slugify-cli](docs/case-studies/run-a.md),
[Countdown](docs/case-studies/run-b.md), and
[react-github-readme-button](docs/case-studies/run-c.md), including one
blocked harden run recorded as evidence instead of hidden as success.

Godpowers makes AI coding accountable: every serious run should leave disk
state, artifacts, validation gates, host guarantees, and a next action. Code is
only one output. The project memory and proof trail matter too.

Version 2.5.2 keeps the 2.5.1 Codex host-run proof studies and patches two
Phase 2 blocker defects: installed runtime gate command access and build-gate
false passes when verification evidence is red.

Maintainer hardening continues on the 2.x line with small, audited public
surface updates when they close real workflow gaps. The 2.1.0 patch closes a command-injection vector in the
agent-browser driver, guards runtime file parsing against corrupt state,
makes data-directory installs a clean replace, and reconciles documentation
drift. The 2.0.3 patch range-checks workflow agent references,
derives command metadata from the individual files in `skills/`, delegates
installer runtime logic to `lib/`, moves the detailed God Mode runbook into
`references/`, and exposes async file APIs for incremental migration away from
synchronous-only internals.

Strict release readiness remains fail-closed. Godpowers requires delegated
release checks to cover root docs, docs, agents, skills, routing, workflows,
schema, templates, references, hooks, lib, scripts, tests, fixtures, GitHub
workflows, package metadata, npm, GitHub release, CI, publish workflow, and
local install state before a human-approved release executor can run.

The dashboard now starts with an action brief and a host guarantee line: the
next command, why it is recommended, whether the project is ready, the first
blockers that need attention, and whether the current host can provide full,
degraded, or unknown runtime guarantees.

### Ten Minute Proof Path

Run this before deciding whether Godpowers is worth a full project arc:

```bash
npx godpowers quick-proof --project=. --brief
npx godpowers status --project=. --brief
npx godpowers next --project=. --brief
```

The first command should produce disk-state evidence, missing-artifact
visibility, a next command, host guarantees, and outcome metrics. The next two
commands show what Godpowers can infer from your current project.

It fuses four disciplines into one unified workflow:

- **Native project context** - every Godpowers project is a Pillars project:
  root `AGENTS.md` plus task-routed `agents/*.md` files carry durable project
  truth before commands touch code.
- **Artifact discipline** - every sentence in every document is a labeled
  decision, hypothesis, or open question. Mechanically verified failure modes.
- **Domain precision** - fuzzy or overloaded project language is challenged,
  resolved, and stored in a domain glossary before it contaminates planning.
- **Execution engine** - fresh-context agents in parallel waves with atomic
  commits. No context rot. No sequential bottlenecks.
- **Quality immune system** - TDD enforcement, two-stage code review (spec
  compliance + code quality), request-trace discipline, surgical diffs, and
  verification before completion.
- **Team intelligence** - scale-adaptive complexity, specialized agent personas
  (PM, Architect, Executor, Reviewer, Harden Auditor, etc.).

## What Godpowers Proves

Godpowers is designed to prove more than "the model wrote files." A useful run
should prove:

- The current state is on disk, not trapped in chat memory.
- The next action is derived from repository state.
- Planning artifacts, code changes, reviews, and launch checks can be inspected.
- Host guarantees are explicit, including degraded or simulated agent behavior.
- Release confidence covers tests, package contents, install surfaces, and docs.
- Build plans cite real files and symbols before execution starts.
- New dependencies have registry and legitimacy evidence before they enter the stack.

## Install

```bash
npx godpowers --claude --global --profile=core
```

Other targets: `--codex`, `--cursor`, `--windsurf`, `--opencode`, `--gemini`,
`--copilot`, `--augment`, `--trae`, `--cline`, `--kilo`, `--antigravity`,
`--qwen`, `--codebuddy`, `--pi`. Or `--all` for everything (15 runtimes).
T3 Code is transparently supported through the underlying agent.

The installer copies:
- Slash command skills to `<runtime>/skills/`
- Specialist agents to `<runtime>/agents/`
- Codex agent metadata to `<runtime>/agents/*.toml`
- SessionStart hook (Claude Code only) to `<runtime>/hooks/`

Installer profiles keep the visible command surface calm. Start with `core` or
`builder` unless you already know you need the full maintainer surface:

```bash
npx godpowers --claude --global --profile=core
npx godpowers --codex --local --profile=builder
npx godpowers --all --profile=maintainer
```

Profiles are `core`, `builder`, `maintainer`, `suite`, and `full`. `full`
preserves the complete command surface, while the smaller profiles install the
commands most relevant to the role. `--minimal` is an alias for
`--profile=core`.

Use profiles as journeys:

| Journey | Profile |
|---|---|
| I want the basics | `core` |
| I build products | `builder` |
| I maintain Godpowers or mature repos | `maintainer` |
| I coordinate suites | `suite` |
| I want everything | `full` |

Agent spawning is host-native. Claude uses its native agent/task interface,
Codex uses installed `agents/*.toml` metadata backed by the same Markdown agent
contracts, and the other runtimes use their supported agent or subagent
mechanism against the installed `agents/god-*.md` files. If a host cannot
provide a true fresh-context spawn, Godpowers must report that limitation
instead of pretending a background agent ran.

### Runtime Expectations

| Runtime class | What to expect |
|---|---|
| Claude Code | Strong reference path when native agent spawning is available. |
| Codex | Strong installed support through `agents/*.toml` metadata backed by the same Markdown agent contracts. |
| Other install targets | Skills and agent contracts install, while host-native spawning depends on the tool. |
| Degraded hosts | Godpowers must report local-only or simulated agent behavior instead of hiding the limitation. |

See [Host capabilities](docs/host-capabilities.md) for the detailed guarantee
model.

## Usage

Open your AI coding tool in any project directory and type:

```
/god-mode
```

That starts the autonomous project run. It will run all tiers from idea to hardened
production, pausing only when it has a real question for you.

### Just describe what you want

If you don't know which command to run, type free text after `/god`:

```
/god production is broken
/god add a feature without breaking the current project run
/god I'm coming back after a week
```

The front door matches your intent against scenario recipes and proposes the
right command sequence. Confirmation is always required before anything
destructive runs. See `skills/god.md`.

### Don't want full autonomy?

Run individual commands. After each one finishes, Godpowers tells you what to
run next based on disk state:

```
PRD complete: .godpowers/prd/PRD.md

Suggested next: /god-arch (design the architecture)
```

For UI or product-experience projects, PRD can route to design first:

```
Suggested next: /god-design (shape product experience)
```

You can also ask any time:

```
/god-next
```

This reads `.godpowers/PROGRESS.md`, scans disk, reconciles any drift, and
suggests the next logical command with a compact action brief. The SessionStart
hook does the same thing when you open a new session in a Godpowers project.

### Start With A Path

If the full command surface feels large, begin with one of these paths and only
learn the next command when Godpowers recommends it.

`/god-help` presents command families first: start, continue, build, verify,
operate, maintain, capture, recover, extend, collaborate, and configure. Leaf
commands remain direct shortcuts.

| Goal | Starter path |
|---|---|
| Start a product | `/god-init`, `/god-prd`, `/god-design`, `/god-arch`, `/god-roadmap`, `/god-stack`, `/god-repo`, `/god-build` |
| Add a feature | `/god-reconcile`, `/god-feature`, `/god-sync`, `/god-review` |
| Fix production | `/god-hotfix`, `/god-postmortem`, `/god-status` |
| Audit an existing repo | `/god-preflight`, `/god-archaeology`, `/god-reconstruct`, `/god-audit`, `/god-tech-debt` |
| Ship a release | `/god-sync`, `/god-docs`, `/god-version`, `/god-automation-setup`, `npm run release:check` |
| Maintain project health | `/god-hygiene`, `/god-update-deps`, `/god-docs`, `/god-check-todos` |
| Extend Godpowers | `/god-extension-scaffold --name=@godpowers/my-pack --output=.`, `/god-test-extension`, `/god-extension-add`, `/god-extension-list` |

### Outcome Metrics

Godpowers reports adoption and run signals separately from narrative claims:

| Metric | Where it appears |
|---|---|
| Commands to first signal | `quick-proof` outcome metrics |
| Next command and reason | `quick-proof`, `status`, `next`, `/god-next` |
| Missing artifacts | dashboard planning visibility |
| Host gaps | host guarantee line |
| Run duration, pauses, retries, cost | `/god-metrics`, `/god-trace`, `/god-cost` |

New public command surface should be added only when existing families,
ladders, profiles, recipes, and docs cannot express a proven user need.

The same status engine is available from the installer CLI for humans, CI,
Codex, Claude, Cursor, Gemini, OpenCode, Windsurf, Antigravity, and any host
runtime that can execute Node:

```bash
npx godpowers status --project=.
npx godpowers next --project=.
npx godpowers status --project=. --brief
npx godpowers status --project=. --json
npx godpowers quick-proof --project=.
npx godpowers gate --tier=prd --project=.
npx godpowers dogfood
npx godpowers extension-scaffold --name=@godpowers/my-pack --output=.
```

### Maintainer Validation

Godpowers keeps the public release gate behind one command:

```bash
npm run release:check
```

That command runs the maintained full-suite runner, audit checks, and package
contents verification. `npm test` delegates to `scripts/run-tests.js`, so the
test order is maintained as a readable list instead of a long package script.
`npm run lint` runs dependency-free static checks through
`scripts/static-check.js`, including shared test harness adoption, installer
decomposition, async runtime APIs, agent reference validation coverage, and God
Mode runbook delegation.

Tier skills now run the executable gate before downstream work proceeds:

```bash
npx godpowers gate --tier=prd --project=.
npx godpowers gate --tier=build --project=.
npx godpowers gate --tier=harden --project=.
```

The gate reads disk artifacts, runs the shared artifact linter, checks build
verification evidence, and blocks unresolved Critical harden findings.

The runtime remains dependency-free. YAML parsing is intentionally limited to
the documented Godpowers subset used by intent, routing, workflow, and
extension files, with parser coverage in `scripts/test-yaml-parser.js`.

### Slash Commands

| Command | What it does | Spawns agent |
|---------|--------------|--------------|
| `/god` | Front door: match free-text intent to a command sequence | (built-in) |
| `/god-mode` | Full autonomous project run | god-orchestrator |
| `/god-next` | Auto-detect and suggest the next command | (built-in) |
| `/god-init` | Start a project, detect mode and scale | (built-in) |
| `/god-prd` | Write the PRD | god-pm |
| `/god-arch` | Design architecture | god-architect |
| `/god-roadmap` | Sequence the work | god-roadmapper |
| `/god-stack` | Pick the technology stack | god-stack-selector |
| `/god-design` | Visual design system (DESIGN.md + PRODUCT.md) | god-designer + god-design-reviewer |
| `/god-repo` | Scaffold the repository | god-repo-scaffolder |
| `/god-build` | Build it (TDD, parallel waves) | god-planner + god-executor + reviewers |
| `/god-deploy` | Set up deploy pipeline | god-deploy-engineer |
| `/god-observe` | Wire observability | god-observability-engineer |
| `/god-launch` | Launch (gated on harden) | god-launch-strategist |
| `/god-harden` | Adversarial security review | god-harden-auditor |
| `/god-status` | Re-derive state from disk | (built-in) |
| `/god-progress` | Deliverable progress: requirements and increments done / in progress / left | (built-in) |
| `/god-automation-status` | Show host automation provider support | (built-in) |
| `/god-automation-setup` | Prepare opt-in automation setup | (built-in) |
| `/god-dogfood` | Run messy-repo dogfood scenarios for release and autonomy readiness | (built-in) |
| `/god-migrate` | Detect legacy planning, BMAD, and Superpowers context; import and sync back | god-greenfieldifier when needed |
| `/god-preflight` | Read-only intake audit before project-run readiness and pillars | god-auditor |
| `/god-audit` | Score artifacts against have-nots | god-auditor |
| `/god-debug` | 4-phase systematic debug | god-debugger |
| `/god-review` | Two-stage code review | god-spec-reviewer + god-quality-reviewer |
| `/god-lint` | Mechanically validate artifacts against have-nots | (built-in) |
| `/god-scan` | Rebuild linkage map from code; run reverse-sync | (built-in) |
| `/god-link` | Manually add or remove a code-artifact link | (built-in) |
| `/god-design-impact` | What-if analysis on DESIGN.md changes | (built-in) |
| `/god-review-changes` | Walk REVIEW-REQUIRED.md interactively | (built-in) |
| `/god-context` | Manage AGENTS.md / CLAUDE.md / GEMINI.md fences | god-context-writer |
| `/god-test-runtime` | Headless browser audit + functional tests | god-browser-tester |

### Other Workflows

For real-world scenarios beyond greenfield:

| Command | When to use | Spawns |
|---------|-------------|--------|
| `/god-feature` | Add a feature to an existing project | god-pm + god-architect (delta) + executor chain |
| `/god-hotfix` | Urgent production bug fix | god-debugger + god-executor + reviewers + deploy |
| `/god-refactor` | Safe refactor with TDD (no behavior change) | god-explorer + god-planner + executor chain |
| `/god-spike` | Time-boxed research with throwaway POC | god-spike-runner |
| `/god-postmortem` | Post-incident investigation | god-incident-investigator |
| `/god-upgrade` | Framework/version migration with expand-contract | god-migration-strategist |
| `/god-docs` | Write/update docs verified against code | god-docs-writer |
| `/god-update-deps` | Audit and update dependencies safely | god-deps-auditor |

### God Mode Flags

```
/god-mode                # Standard: pauses for real questions only
/god-mode --yolo         # Zero pauses except Critical security. Repairs red checks before it stops.
/god-mode --conservative # More checkpoints
/god-mode --from=arch    # Resume from a specific tier
/god-mode --audit        # Score existing artifacts. Build nothing.
/god-mode --dry-run      # Plan everything. Build nothing.
```

`/god-mode` is not complete when it merely writes planning artifacts. It keeps
going through build, verification, repair, launch, and final sync. Red tests,
typecheck, lint, build, or check output enter the repair loop instead of being
reported as the final result.

Build execution also keeps diffs narrow. Executors state assumptions, expected
files, changed public behavior, and verification before editing. Reviewers
block speculative flexibility, unrelated cleanup, and any touched file that
does not trace back to the request or slice plan.

If `.godpowers` state already exists, `/god-mode --yolo` resumes from disk
instead of asking for the project description again.

Under `--yolo`, Godpowers also auto-applies Pillars sync proposals when
durable `.godpowers` artifacts change project truth. The decision is logged to
`.godpowers/YOLO-DECISIONS.md`.

Every completing command now ends with a **Godpowers Dashboard**. It shows the
current phase, tier, step count, workflow progress, PRD and roadmap visibility,
recent work, proactive checks, open items, and the single recommended next
action. `/god-status` and `/god-next` use the same shape so the project never
ends in a vague "done" state. The dashboard is backed by
`lib/dashboard.js`, and the rendered output names that source when the runtime
engine is available. Audit, hygiene, and remediation scores are reported as
separate scores rather than being reused as workflow progress.

That dashboard reports **workflow progress** (which pipeline stage you are on).
For **deliverable progress** (how much of the actual product is built), run
`/god-progress`: it lists every PRD requirement as done, in progress, or not
started, groups them by roadmap increment, and writes a `.godpowers/REQUIREMENTS.md`
checklist you can open or share. Status is derived from the linkage map (code
that implements each requirement), so it can never drift from what is actually
on disk. The dashboard also surfaces a `Deliverable progress` line, and during a
`/god-mode` build each step reports how many requirements moved to done.

Godpowers can also inspect automation support:

```bash
npx godpowers automation-status --project=.
npx godpowers automation-setup --project=.
```

Godpowers can dogfood itself against shipped messy-repo fixtures:

```bash
npx godpowers dogfood
```

The dogfood suite covers a half-migrated legacy planning project, full and degraded host
guarantee detection, extension scaffold validation, and a Mode D suite release
dry-run. `/god-dogfood` reports failures with scoped specialist ownership
rather than treating fixture checks as silent background work.

Automation setup is opt-in. The installer does not create schedules, routines,
background agents, API triggers, or CI workflows. Safe starting templates are
read-only status, checkpoint, review queue, hygiene, and release readiness
reports.

Godpowers can migrate from adjacent planning systems:

```bash
/god-migrate
```

This detects legacy planning `.planning/` or `.legacy-planning/`, BMAD `_bmad-output/` or `.bmad/`,
and Superpowers specs or plans. It writes
`.godpowers/prep/IMPORTED-CONTEXT.md`, optional imported seed artifacts, and
managed sync-back files such as `.planning/GODPOWERS-SYNC.md`,
`_bmad-output/GODPOWERS-SYNC.md`, or
`docs/superpowers/GODPOWERS-SYNC.md`.

Existing Godpowers projects can refresh their awareness after an upgrade:

```bash
/god-context refresh
```

This records the current Godpowers feature set in `.godpowers/state.json`,
refreshes managed AI-tool context fences, and suggests `/god-migrate` or
`god-greenfieldifier` when source-system evidence needs migration judgment.

For existing codebases and org-constrained new projects, God Mode now runs a
greenfield simulation audit and then actions it through a greenfieldification
plan. It pauses before risky artifact rewrites because that process can change
product scope, design direction, architecture, roadmap, stack, and shipping
commitments.

## Architecture

### Slash Command + Specialist Agent Pattern

Each slash command is a **thin orchestrator**. It does NOT do the work itself.
It spawns the right specialist agent in a **fresh context** to do the work.

```
You type:        /god-prd
Skill loads:     skills/god-prd.md
Skill spawns:    god-pm agent (fresh 200K context)
Agent reads:     .godpowers/PROGRESS.md
Agent writes:    .godpowers/prd/PRD.md
Skill verifies:  artifact exists, have-nots pass
Skill updates:   PROGRESS.md
```

### The Four Tiers

| Tier | Sub-steps | Specialists |
|------|-----------|-------------|
| 0: Orchestration | mode detection, scale, progress | god-orchestrator |
| 1: Planning | PRD, optional DESIGN, ARCH, ROADMAP, STACK | god-pm, god-designer, god-architect, god-roadmapper, god-stack-selector |
| 2: Building | repo, plan, execute, review | god-repo-scaffolder, god-planner, god-executor, god-spec-reviewer, god-quality-reviewer |
| 3: Shipping | deploy, observe, launch, harden | god-deploy-engineer, god-observability-engineer, god-launch-strategist, god-harden-auditor |

### Artifact Paths

```
.godpowers/PROGRESS.md         Cross-tier progress ledger
.godpowers/REQUIREMENTS.md     Requirement checklist (done / in progress / not started)
.godpowers/prd/PRD.md          Product Requirements Document
.godpowers/domain/GLOSSARY.md  Domain vocabulary and resolved ambiguities
.godpowers/arch/ARCH.md        System Architecture
.godpowers/arch/adr/           Architecture Decision Records
.godpowers/roadmap/ROADMAP.md  Sequenced Roadmap
.godpowers/stack/DECISION.md   Stack Decision (with flip points)
.godpowers/repo/AUDIT.md       Repo Scaffold Audit
.godpowers/build/PLAN.md       Build Plan (slices, waves)
.godpowers/build/STATE.md      Build State
.godpowers/deploy/STATE.md     Deploy Pipeline State
.godpowers/observe/STATE.md    Observability State
.godpowers/launch/STATE.md     Launch State
.godpowers/harden/FINDINGS.md  Security Findings
```

Godpowers projects also include native Pillars context:

```
AGENTS.md              Pillars loading protocol plus Godpowers managed fence
agents/context.md      Always-loaded project identity and invariants
agents/repo.md         Always-loaded repository layout and naming
agents/*.md            Task-routed domain pillars
```

Existing `.godpowers` projects are Pillar-ized on resume or sync. Current PRD,
ARCH, STACK, ROADMAP, BUILD, DEPLOY, OBSERVE, HARDEN, DESIGN, and PRODUCT
artifacts become managed source references in the relevant pillar files, with
labeled decisions, hypotheses, and open questions extracted when available.

## Quality Guardrails

Every artifact passes these mechanical checks before it is treated as complete:

| Check | What it catches |
|---|---|
| Substitution test | AI-slop (generic output that reads the same for any product) |
| Three-label test | Unlabeled assumptions hiding as decisions |
| Have-nots | Named failure modes, grep-testable per tier |
| Artifact-on-disk | Phantom resume (agent claims done, file does not exist) |
| Critical-finding gate | Shipping with known security holes |
| TDD enforcement | Code without tests |
| Request-trace review | Scope creep, unrelated cleanup, speculative abstraction |
| Two-stage review | Code that passes tests but violates spec or quality |

These checks are guardrails, not proof that the product is right. A PRD can
pass the substitution test and still make the wrong product call. Godpowers
uses mechanical checks to catch generic, missing, or untraceable work so the
remaining judgment is visible to humans and reviewers.

## Operational Reality

Godpowers is pre-launch. See [USERS.md](USERS.md) for current adoption status.

Full autonomous runs can be expensive because they spawn multiple fresh-context
agents. The runtime records token and dollar estimates through `cost.recorded`
events, and `/god-cost` reports spend, savings, live vs estimated token counts,
and cache hits. `/god-budget` configures context caps, cache use, and model
profiles. `/god-metrics` and `/god-trace` expose run duration, pauses, retries,
and per-tier history from `.godpowers/runs/<id>/events.jsonl`.

Treat a real `/god-mode` result as successful only when it produces shipped or
ship-ready work on someone else's codebase, with validation results, cost, and
wall-clock time visible.

## Pause Philosophy

God Mode pauses only when:

1. User intent is genuinely ambiguous (two valid directions)
2. A flip-point depends on human-only constraints (team size, budget)
3. Two options score within 10% with no objective tiebreaker
4. A Critical security finding needs human judgment
5. Brand/copy decisions require the human's voice

Every pause includes: what the question is, why only the human can answer,
options with tradeoffs, and a default if the user just says "go".

## Supported Tools

15 first-class runtimes: Claude Code, Codex, Cursor, Windsurf, Gemini CLI,
OpenCode, Copilot, Augment, Trae, Cline, Kilo, Antigravity, Qwen, CodeBuddy,
Pi. T3 Code inherits from the underlying agent (Codex / Claude / OpenCode).

## Full reference

- [Getting Started](docs/getting-started.md)
- [Quick Proof](docs/quick-proof.md)
- [First 10 Minute Proof Case Study](docs/case-studies/first-10-minute-proof.md)
- [Concepts](docs/concepts.md)
- [Command reference (all 112 skills + 40 agents)](docs/reference.md)
- [Feature awareness](docs/feature-awareness.md)
- [Adoption Canary](docs/adoption-canary.md)
- [Repository documentation sync](docs/repo-doc-sync.md)
- [Repository surface sync](docs/repo-surface-sync.md)
- [Roadmap](docs/ROADMAP.md)
- [Release Notes](RELEASE.md)
- [Changelog](CHANGELOG.md)
- [Inspiration](INSPIRATION.md)

## License

MIT
