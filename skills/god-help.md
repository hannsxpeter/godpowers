---
name: god-help
description: |
  Discoverable contextual help for Godpowers. Shows a short guided view by
  default, with the full catalog available only through /god-help all.

  Triggers on: "god help", "/god-help", "what can godpowers do",
  "list commands", "show help"
---

# /god-help

Show the smallest useful help view for the current project state. Do not dump
the installed command catalog unless the user asks for `all`, a family, a
category, a keyword search, or one command.

## Default Output

### 1. Where You Are

Render one plain sentence from disk state:

```text
You are <not initialized | in planning | building | shipping | complete>; the likely next move is <command>.
```

If no `.godpowers/` directory exists, treat the user as first-run and recommend
`/god-first-run`.

### 2. Likely Next Area

Show 3 to 6 commands. Put the best command first. Use the family map from
`<runtimeRoot>/lib/command-families.js` and the state-derived recommendation
from `<runtimeRoot>/lib/router.js` or `<runtimeRoot>/lib/dashboard.js`.

Example for an initialized project:

```text
Likely next area: continue

Next commands:
- /god-next: Continue with the safest state-derived next step.
- /god-status --full: See the complete dashboard and proactive checks.
- /god-help build: See build commands only.
```

Example for first-run:

```text
You have not initialized Godpowers here yet.

Next commands:
- /god-first-run: Walk through the first 10 minutes with one recommendation at a time.
- /god-demo: Try the shipped sandbox before touching this repo.
- /god-init: Start this project now.
- /god-help all: Show the complete catalog.
```

### 3. Families

Show family hubs without leaf commands:

- Start: start or import a project.
- Continue: understand state and choose the next move.
- Build: plan, implement, test, and ship product work.
- Verify: check artifacts, code, runtime behavior, and release readiness.
- Operate: deploy, observe, harden, launch, and respond in production.
- Maintain: keep artifacts, docs, dependencies, context, and repo surfaces current.
- Capture: save thoughts, tasks, backlog items, seeds, and learnings.
- Recover: undo, repair, restore, skip, or diagnose broken state.
- Extend: install, inspect, test, remove, or author extension packs.
- Collaborate: coordinate people, workstreams, suites, sprints, and pull requests.
- Configure: tune settings, budgets, cache, profiles, help, and version info.

End with `Next commands:` and never more than four commands.

## Subcommands

### `/god-help`

Contextual help with 3 to 6 likely next commands.

### `/god-help all`

Full installed catalog grouped by category. This is the only default path that
lists every command.

### `/god-help <command>`

Description of one command from the skill frontmatter.

### `/god-help search <keyword>`

Filter the catalog by keyword match against names and descriptions.

### `/god-help <family>`

Show one family card plus its leaf commands. Valid families are start,
continue, build, verify, operate, maintain, capture, recover, extend,
collaborate, and configure.

### `/god-help --category=<name>`

Show only one category, such as lifecycle, planning, building, shipping, or
configuration.

## Implementation

Built-in, no spawned agent. Reads:
- `<runtime>/skills/*.md` frontmatter
- `.godpowers/state.json` for current state
- `<runtimeRoot>/lib/dashboard.js` for the next route when available
- `<runtimeRoot>/lib/command-families.js` for family cards and ladders
- `<runtimeRoot>/references/shared/GLOSSARY.md` for canonical definitions of
  Godpowers vocabulary (tier, sub-step, artifact, gate, have-not, mode, scale)
  when the user asks what a term means

Resolve `<runtimeRoot>` as `<projectRoot>` when
`<projectRoot>/lib/dashboard.js` exists. Otherwise use the installed bundle at
`<tool-config-dir>/godpowers-runtime`, where `<tool-config-dir>` is the
directory that contains this installed skill.

## When To Use

- First time using Godpowers and needing one next move.
- Forgot the exact name of a command.
- Want commands relevant to the current state without seeing the whole catalog.

## When Not To Use

- You know exactly what you want: run that command.
- You want intent-to-command matching: use `/god`.
- You want the next state-derived action only: use `/god-next`.
