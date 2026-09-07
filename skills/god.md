---
name: god
description: |
  Front door. Take free-text intent from the user, match it to a recipe via
  the Godpowers runtime recipes module, and recommend one matching command
  sequence. If no text is given, show one state-derived recommendation and a
  few alternatives.

  Triggers on: "/god", "god", "/god help", "I want to ...", "how do I ..."
  (when not matched by a more specific command)
---

# /god (front door)

<!-- Implements: P-MUST-50 -->

The natural-language entry point. Users describe what they want; this skill
matches the intent to a recipe and recommends the right command sequence. No
agent is spawned here. This is a thin router on top of the Godpowers runtime
recipes module.

If the user only types `/god`, answer with one sentence of position, one
recommended command, and 2 to 3 alternatives. Do not show a catalog.

## Runtime module resolution

Before calling runtime modules, resolve the Godpowers runtime root:

1. If `<projectRoot>/lib/recipes.js` exists, use the repository checkout runtime at `<projectRoot>`.
2. Otherwise use the installed bundle at `<tool-config-dir>/godpowers-runtime`, where `<tool-config-dir>` is the directory that contains this installed skill, such as `~/.claude`, `~/.codex`, `~/.cursor`, `~/.windsurf`, or `~/.gemini`.
3. Load recipes from `<runtimeRoot>/lib/recipes.js`, routing from `<runtimeRoot>/lib/router.js`, command families from `<runtimeRoot>/lib/command-families.js`, and recipe YAML from `<runtimeRoot>/routing/recipes/`.

## Why this exists

Slash commands are precise but require the user to know the command name.
Recipes are scenario-shaped ("I'm coming back after a week", "production is
broken", "add a feature during the current project run") and match free-text intent. `/god` is the
front door that turns intent into the right slash command.

This skill is the single front door. It points to narrower views only when the
user needs them:

| Skill | Best for |
|-------|----------|
| `/god <free text>` | "I don't know which command, but here's what I want" |
| `/god-next` | "Continue safely from disk state" |
| `/god-status --full` | "Show every dashboard detail" |
| `/god-init` | "Start a project here" |
| `/god-mode` | "Run the whole project run autonomously" |

## Command family UX

Before showing individual leaf commands, use the family map from
`lib/command-families.js`:

| Family | User question |
|--------|---------------|
| start | "How do I begin or import this project?" |
| continue | "Where are we and what should happen next?" |
| build | "How big is this work and how should it run?" |
| verify | "What is the cheapest sufficient check?" |
| operate | "How do we run, observe, harden, or fix production?" |
| maintain | "How do we keep docs, deps, routes, and context current?" |
| capture | "Where should this thought, task, backlog item, or seed go?" |
| recover | "How do we repair or walk back state?" |
| extend | "How do we install or author skill packs?" |
| collaborate | "How do we coordinate people, workstreams, suites, or PRs?" |
| configure | "How do we tune settings, budgets, cache, profiles, or help?" |

Use the classifiers from `lib/command-families.js` when intent is about
capture, work size, verification, or duplicate trigger phrases. Keep every
leaf command available as a direct shortcut.

### Capture ladder

- Save only: `/god-note`
- Actionable soon: `/god-add-todo`
- Optional later: `/god-add-backlog`
- Conditional future trigger: `/god-plant-seed`

### Work size ladder

- Trivial direct edit: `/god-fast`
- Small TDD task: `/god-quick`
- Fine-grained planned slice: `/god-story`
- Existing-product feature: `/god-feature`
- Current milestone work: `/god-build`
- Non-urgent bug: `/god-debug`
- Production outage: `/god-hotfix`

### Verification ladder

- Mechanical artifact check: `/god-lint`
- Artifact quality gate: `/god-standards`
- Code diff review: `/god-review`
- Live behavior check: `/god-test-runtime`
- Artifact set score: `/god-audit`
- Ongoing health check: `/god-hygiene`
- Existing repo intake: `/god-preflight`
- Release fixture readiness: `/god-dogfood`

## Process

### Step 1: parse the user's intent

Treat everything after `/god` as free text. If empty, treat as state-driven.

```
/god add a feature without breaking the current project run
   text = "add a feature without breaking the current project run"

/god
   text = "" -> state-driven mode
```

### Step 2: dispatch by mode

For nonempty free text, first apply **Adaptive run selection** from `SKILL.md`.
The current model assesses task, scope, risk, and uncertainty from the user
request and bounded repository evidence, then calls
`<runtimeRoot>/lib/command-families.js selectRunApproach(assessment)`.
This is recommendation-only and does not grant execution authority.

If the result is direct with no command, answer the question or assessment
in chat and stop routing. Do not match the word "project" to a full run,
initialize state, generate a report, or launch a preflight agent merely
because the repository is large. Honor an explicit request for a report or
named command. Direct answers do not require a next-command block.

For focused work, use the result alongside the existing classifiers and
recipes to choose the narrowest suitable command. Keep command-specific
prerequisites, review, and verification. Full suggestions retain `/god-mode`'s
explicit-only policy. Do not automatically expand the user's requested scope
to every step in a matched recipe. Read-only questions can finish directly;
the front door still does not execute implementation or spawn agents itself.

```
text empty?
  yes -> state-driven: call <runtimeRoot>/lib/dashboard.js compute(projectRoot)
         display one sentence of current position
         recommend the structural next command first
         show at most 3 alternatives

  no  -> intent-driven: call <runtimeRoot>/lib/recipes.js matchIntent(text, projectRoot)
         call <runtimeRoot>/lib/command-families.js classifiers for capture, work size, verification, and trigger precedence hints
         take top 1-3 matches by score
         if highest score >= 10 (exact phrase match): propose directly
         if highest score 5-9 (all-words match): propose with confirmation
         if no matches: suggest /god-next (state-driven fallback)
```

### Step 3: render the suggestion

For a single high-confidence match (score >= 10):

```
Recommended: <command>
Why: <one sentence tied to the user's words and disk state>

Sequence:
  1. <command>   <why>
  2. <command>   <why>
  ...

Next commands:
- <command>: Run the recommended sequence.
- /god-help <family>: See only the relevant family.
- /god-status --full: Inspect the complete dashboard first.
```

For multiple matches (top 3):

```
Top matches for "<user text>":

  1. <recipe-name>   (<score>)   <description>
  2. <recipe-name>   (<score>)   <description>
  3. <recipe-name>   (<score>)   <description>

Next commands:
- <best command>: Run the strongest match.
- /god-discuss <ambiguity>: Resolve the routing ambiguity.
- /god-help <family>: See the relevant command family.
```

For state-driven (no text):

```
You are <lifecycle-phase>; the likely next move is <command>.

Next commands:
- <command>: <why>
- /god-next: Continue with the state-derived safe step.
- /god-status --full: Inspect every dashboard check.
- /god-help all: Show the complete catalog.
```

Do not include a God Mode option when the request is clearly a tiny fix,
single-file change, or narrow question. In that case, recommend the smallest
matching command, such as `/god-fast`, `/god-spike`, or `/god-next`.

### Step 4: execute or hand off

If user confirms a recipe:
  - Walk the recipe's `default-sequence.steps`
  - For each step, suggest the slash command and let the user invoke it
    (or invoke it directly if it has no destructive side effects)

If user picks the structural next:
  - Hand off to `/god-next --before=<command>` so prereqs are checked first

## Interaction model

This skill is a router, not an orchestrator. It:
- Reads recipes (via `<runtimeRoot>/lib/recipes.js`)
- Reads state (via `<runtimeRoot>/lib/state.js`)
- Proposes commands

It does NOT:
- Spawn agents directly
- Modify `state.json`, `PROGRESS.md`, or `events.jsonl`
- Run multi-tier work (that's `god-orchestrator`'s job, accessed via `/god-mode`)

The user always sees what command will run. Confirmation is required before
any destructive sequence executes.

## Examples

### Example 1: high-confidence intent match

```
User: /god production is broken

Match: production-broken (score: 20)
What this does: Production is broken now

Sequence:
  1. /god-hotfix     Skip planning, debug, fix with TDD, expedited deploy, schedule postmortem

Next commands:
- /god-hotfix: Start the expedited production fix.
- /god-help operate: See production operations commands only.
- /god-status --full: Inspect the complete dashboard first.
```

### Example 2: ambiguous intent (multiple matches)

```
User: /god parallel feature during build

Top matches for "parallel feature during build":

  1. feature-during-current-work     (10)   Bigger feature during the current project run; reconcile with roadmap, pause, do feature, update roadmap, resume
  2. parallel-feature                (10)   Parallel feature, do not disrupt main work

Next commands:
- /god-reconcile parallel feature during build: Resolve the roadmap impact first.
- /god-feature parallel feature: Start the feature as scoped work.
- /god-discuss parallel feature routing: Clarify which path fits.
```

### Example 3: state-driven (no text)

```
User: /god

You are in planning with the PRD done and architecture pending.

Next commands:
- /god-arch: Start the next planning gate.
- /god-status --full: Inspect all dashboard details first.
- /god-help start: See start and planning commands only.
```

### Example 4: no match

```
User: /god make me a sandwich

No recipe matched. Falling back to state-driven suggestion.

You are launched and no recipe matched the request.

Next commands:
- /god-next: Continue from disk state.
- /god-status --full: Re-derive full status from disk.
- /god-discuss routing ambiguity: Clarify what you want Godpowers to do.
```

## Why a skill, not an agent

The matching and dispatch logic is mechanical (lookups against
`<runtimeRoot>/routing/recipes/*.yaml`) and has no need for fresh-context isolation. Running
it as a skill keeps it fast, lets the user see the proposed commands, and
avoids stacking another orchestrator layer above `god-orchestrator`. See
`docs/concepts.md` (the Quarterback section) for why we don't add a second
orchestrator.

## Output

No new artifacts. This skill only proposes commands and (with confirmation)
hands off to the right slash command. State is updated by the downstream
command, not by `/god`.
