# Godpowers Recipes

> Every scenario in a full dev cycle, with the exact commands to use.
> Most flows compose existing primitives; extension authoring starts with its
> scaffold command.

If you can't find your scenario, check `command-flows.md` for the canonical
per-command reference, or `arc-integrations.md` for cross-workflow flows.

## Quick triage

Use `/god` or `/god-help` when you do not know the command name. Godpowers
presents families first, then leaf commands:

| Intent | Route shape |
|---|---|
| Capture something | note, todo, backlog, or seed |
| Size implementation work | fast, quick, story, feature, build, debug, or hotfix |
| Verify work | lint, standards, review, runtime test, audit, hygiene, preflight, or dogfood |
| Find status | status overview, progress ledger, lifecycle phase, resume location, or next action |

---

## Table of Contents

1. [Starting a project](#1-starting-a-project)
2. [Planning the work](#2-planning-the-work)
3. [Building](#3-building)
4. [Reviewing and shipping](#4-reviewing-and-shipping)
5. [Operating in production](#5-operating-in-production)
6. [Maintaining over time](#6-maintaining-over-time)
7. [Recovering from problems](#7-recovering-from-problems)
8. [Working with others (collaboration)](#8-working-with-others)
9. [Capturing knowledge](#9-capturing-knowledge)
10. [Adding a feature mid-development](#10-adding-a-feature-mid-development)
11. [Configuration and meta](#11-configuration-and-meta)
12. [When in doubt](#12-when-in-doubt)

---

## 1. Starting a project

### Greenfield: I have an idea, want to ship something

```
/god-mode
```
One command. Idea -> hardened production. Pauses only for genuine human-only decisions.

### Greenfield: Idea is fuzzy, want to think first

```
/god-explore
[explore the idea, surface assumptions, narrow scope]
/god-init
/god-mode
```

### Greenfield: I want manual control through each step

```
/god-init
/god-prd
/god-arch
/god-roadmap
/god-stack
/god-repo
/god-build
/god-deploy
/god-observe
/god-harden
/god-launch
```

### Joining an existing codebase (simple Mode B)

```
/god-map-codebase     <- 4 parallel mappers analyze tech, arch, quality, concerns
/god-init             <- detects Mode B from existing artifacts
/god-status           <- see what tiers are imported vs missing
/god-next             <- suggests the first missing tier
```

Use this path when the repo is known, ownership is clear, and the next change
is manageable.

### Inheriting an unclear or risky codebase

```
/god-preflight        <- read-only intake before stronger workflows
/god-archaeology      <- deep code archaeology
/god-reconstruct      <- rebuild planning artifacts from code
/god-audit            <- score the reconstructed surface
/god-tech-debt        <- prioritize debt before feature work
/god-feature          <- continue with a scoped change
```

Use this path when ownership, architecture, tests, or refactor risk are
unclear.

### Inheriting code from another team

```
/god-map-codebase     <- understand what you have
/god-extract-learnings  <- if previous team left .godpowers/ artifacts
/god-init             <- Mode B
/god-feature          <- continue with new features
```

### Returning to a project after a long break

```
/god-resume-work      <- if HANDOFF.md exists
/god-status           <- see current state from disk
/god-hygiene          <- check what may have drifted while away
/god-next             <- pick up where you left off
```

---

## 2. Planning the work

### Want to validate technical feasibility before committing

```
/god-spike
[time-boxed POC, 1 day default]
```
Output: SPIKE.md with findings. Recommendation routes to /god-feature or follow-up spike.

### Multiple competing approaches

```
/god-explore "compare approach A vs B vs C"
[Socratic questioning surfaces tradeoffs]
/god-prd      <- now with clearer scope
```

### Need multi-perspective input

```
/god-party
[choose personas: PM, Architect, QA, Security]
[each weighs in independently]
[synthesis output: agreements, disagreements, recommendation]
```

### PRD scope is unclear

```
/god-discuss             <- pre-planning Socratic discussion
/god-list-assumptions    <- surface what's being assumed
/god-prd                 <- write with clearer inputs
```

### Architecture decision is contentious

```
/god-arch
[when god-architect pauses on a tied decision]
[user picks based on flip-point analysis]
```

### Roadmap has too many features

```
/god-roadmap
[forces prioritization; god-roadmapper rejects "all milestones same size"]
```

### Stack tied between two options

```
/god-stack
[pauses if two options score within 10%]
[user picks based on their constraints]
```

---

## 3. Building

### Build the next milestone

```
/god-build
```
god-planner picks the first non-done milestone, breaks into slices, runs waves.

### Build is failing on a specific slice

```
/god-debug
[4-phase systematic debug]
[regression test + minimal fix]
```

### Need to add tests to legacy code first

```
/god-add-tests
[targets affected surface]
[then resume /god-build or /god-refactor]
```

### Refactor existing code (no behavior change)

```
/god-refactor
[scopes change, verifies coverage, plans slices, executes with TDD]
```

### Want a quick small task with TDD discipline

```
/god-quick
```
Skips planning tier. TDD enforced. Atomic commit.

### Trivial inline change (typo, config tweak)

```
/god-fast
```
No planning. No TDD ceremony. Direct edit + tests pass.

### Build pauses on ambiguous requirement

When god-executor pauses because a slice could go two ways:
- Pick option from the pause format
- Or run `/god-discuss` to think it through, then resume build

### Want to inspect what's been built

```
/god-status              <- overall state
/god-graph trace requirement:user-can-export-csv   <- trace one requirement to its slices
```

---

## 4. Reviewing and shipping

### Review code that was just written

```
/god-review
```
Spawns god-spec-reviewer (stage 1) + god-quality-reviewer (stage 2). Both must pass.

### Score artifacts against quality gates

```
/god-audit
```
Reads all `.godpowers/<tier>/` artifacts, scores against have-nots.

### Spot-check a specific artifact's standards

```
/god-standards
[provides the artifact path]
```
Runs substitution test, three-label test, have-nots on that one artifact.

### Set up deploy pipeline

```
/god-deploy
```

### Wire monitoring after deploy

```
/god-observe
```

### Security audit before launch

```
/god-harden
```
BLOCKS launch if Critical findings (even with --yolo).

### Launch the product

```
/god-launch
```
Refuses to run if /god-harden has unresolved Criticals.

### Channel-specific launch (extension pack required)

> Install the launch pack before invoking channel-specific commands.

```
/god-extension-add @godpowers/launch-pack
/god-show-hn        <- HN-specific tactics
/god-product-hunt   <- PH-specific
/god-indie-hackers  <- IH-specific
/god-oss-release    <- OSS library publishing
```

### Compliance audit (extension pack required)

> Install the security pack before invoking compliance commands.

```
/god-extension-add @godpowers/security-pack
/god-soc2-audit
/god-hipaa-audit
/god-pci-audit
```

---

## 5. Operating in production

### Production is broken right now

```
/god-hotfix
```
Skips planning. Debug -> regression test -> minimal fix -> compressed review -> expedited deploy -> verify in prod -> schedules postmortem.

### Bug found in dev, no urgency

```
/god-debug
```
Full 4-phase systematic debug. Not expedited.

### Incident has been fixed; need investigation

```
/god-postmortem
```
Required within 48h of hotfix. Class-of-bug analysis, action items with owners.

### Production seems unhealthy but no specific bug

```
/god-hygiene             <- composite check (audit + deps + docs)
/god-status              <- see if anything's drifted
/god-doctor              <- diagnose install/state issues
```

### Need to verify a specific behavior in prod

```
/god-debug
[in observe-only mode; reads metrics + logs]
```

### Production deploy needs to roll back

```
/god-undo                <- if it was the last Godpowers operation
/god-rollback deploy     <- explicitly walk back the deploy tier
[then redeploy a known-good version]
```

---

## 6. Maintaining over time

### Weekly health check

```
/god-hygiene
```
Audit + deps + docs. Composite report with prioritized actions.

### Monthly dependency updates

```
/god-update-deps
```
- Critical CVEs: handled here
- Patches: batched
- Minors: per-package
- Majors: routed to /god-upgrade

### Major framework upgrade (React 17 -> 18)

```
/god-upgrade
```
Expand-contract pattern. Per-slice migration with metric gating.

### Documentation has drifted from code

```
/god-docs
```
Verifies every claim against code. Detects drift. Updates + writes UPDATE-LOG.md.

### Periodic project audit

```
/god-audit
```
Score every artifact. Identify highest-priority remediation.

### Capture institutional knowledge

```
/god-extract-learnings
```
After each milestone or quarter. Decisions, lessons, patterns, surprises.

### Sprint cadence (for teams)

```
/god-sprint plan       <- start of sprint
/god-sprint status     <- mid-sprint check
/god-sprint retro      <- end of sprint
```

---

## 7. Recovering from problems

### Just made a change I want to undo

```
/god-undo
```
Reverts last operation via reflog. Files move to .trash/ (recoverable).

### State seems out of sync with disk

```
/god-repair
```
Detects drift between state.json and actual artifacts. Offers to fix.

### Want to re-run a tier

```
/god-redo prd     <- re-run PRD; downstream tiers marked in-flight
/god-redo arch    <- re-run architecture; downstream invalidated
```

### Want to explicitly skip a tier

```
/god-skip launch --reason "private internal tool, no public launch"
```
Logs the skip with audit trail.

### Need to roll back a whole tier

```
/god-rollback build
```
Walks back state + moves artifacts to .trash/. Recoverable.

### Need to recover something I deleted

```
/god-restore
```
Lists items in .trash/, lets you recover.

### Install seems broken

```
/god-doctor
```
Diagnoses install + state + suggests fixes.

### Project seems to be in an impossible state

```
/god-status              <- see what's claimed
/god-repair              <- detect/fix drift
/god-doctor              <- diagnose
[if all else fails:]
/god-undo                <- back out recent ops
```

---

## 8. Working with others

Use `/god-workstream` for same-repo parallelism. Use `/god-suite-*` commands
for multi-repo coordination.

### Two engineers working on parallel features

```
# Engineer A:
/god-workstream new feature-x
/god-feature

# Engineer B:
/god-workstream new feature-y
/god-feature

# When ready to merge:
/god-workstream merge feature-x
```

### Need to pause work, hand off to teammate

```
/god-pause-work
[teammate clones repo + opens session]
/god-resume-work
```

### Reviewing teammate's work

```
/god-review              <- two-stage review on the diff
```

### Creating a PR without exposing .godpowers/

```
/god-pr-branch
```
Creates `pr/<original-branch>` filtering out `.godpowers/` commits. Push that branch.

### Sharing decisions with the team

```
/god-extract-learnings   <- writes LEARNINGS.md
[share .godpowers/learnings/<milestone>/LEARNINGS.mdx]
```

### Multi-perspective decision (acting like a team)

```
/god-party
[choose personas: PM, Architect, QA, Security]
[get cross-functional input even as a solo founder]
```

---

## 9. Capturing knowledge

### Mid-flow idea, don't want to lose it

```
/god-note "consider rate limiting the export endpoint"
```
Zero ceremony. Appended to NOTES.md.

### Idea worth a real todo

```
/god-add-todo "rate limit export endpoint" --priority=P1
```
Goes to TODOS.md with priority and source.

### Idea for the future, not immediate

```
/god-add-backlog "team collaboration features"
```
Long-term parking lot. Reviewed periodically.

### Idea conditional on a future event

```
/god-plant-seed "evaluate Postgres 17 features when MRR > $5k"
```
Dormant until trigger fires.

### Reviewing captured notes

```
/god-note list           <- recent notes
/god-check-todos         <- pending todos
[/god-add-backlog] list  <- backlog
[/god-plant-seed] check  <- seeds with met triggers
```

### Promoting a note to action

```
/god-note promote 5      <- promotes note #5 to a todo
[then /god-check-todos to pick it up]
```

### Building project knowledge graph

```
/god-graph build         <- walks all artifacts, builds graph
/god-graph trace requirement:user-export   <- trace from requirement to commits
/god-graph orphans       <- find requirements never delivered
```

### Mapping a codebase

```
/god-map-codebase        <- 4 parallel mappers
/god-intel show          <- query results
/god-intel refresh tech  <- update specific section
```

---

## 10. Adding a feature mid-development

### Tiny scope (typo, config, 1-line)

```
/god-fast
```

### Small feature (1-3 hours, TDD discipline)

```
/god-quick "add 'last updated' timestamp to dashboard"
```

### Big feature, want to pause arc and address it now

```
/god-pause-work          <- save current /god-mode state
/god-feature             <- runs feature workflow
/god-resume-work         <- restores arc
```

### Big feature, defer to current milestone end

```
/god-add-backlog "team collaboration features"
[continue current work]
[after milestone: /god-feature picks it up]
```

### Big feature, want it in NEXT milestone

```
/god-add-backlog "feature X"
[when planning next milestone]
/god-redo roadmap        <- regenerate with feature X
```

### Feature requires PRD update

```
/god-redo prd
[god-pm re-runs with the new requirement]
[downstream tiers marked in-flight; orchestrator walks them forward]
```

### Parallel feature (don't disrupt main)

```
/god-workstream new feature-x
/god-feature             <- runs on the workstream
[main work continues unaffected]
/god-workstream merge feature-x   <- when done
```

### Feature might be needed in 6 months

```
/god-plant-seed "team collaboration when team > 5 engineers"
```

---

## 11. Configuration and meta

### View current settings

```
/god-settings list
```

### Change a setting

```
/god-settings set config.yolo true
/god-settings set config.trash-retention-days 60
```

### Switch model profile

```
/god-set-profile quality       <- best output, slowest, costliest
/god-set-profile balanced      <- default
/god-set-profile budget        <- cheapest
/god-set-profile inherit       <- use AI tool's default
```

### See the project's lifecycle phase

```
/god-lifecycle
```

### See the version

```
/god-version
```

### Get help

```
/god-help                <- all commands grouped by tier
/god-help build          <- specific to one command
```

### Persistent context for a topic

```
/god-thread new "auth migration"
[work on auth across multiple sessions]
/god-thread switch "auth migration"   <- continue
```

---

## 12. When in doubt

### "What should I run next?"

```
/god-next
```
Reads disk state, suggests the right command with reason.

### "Where am I in the project?"

```
/god-status
```

### "How far along are we? What's done vs left?"

```
/god-progress
```
Shows which PRD requirements and roadmap increments are done, in progress, or
not started, derived from the linkage map. Refreshes the
`.godpowers/REQUIREMENTS.mdx` checklist you can open or share.

### "Is the project healthy?"

```
/god-hygiene
```

### "Something's broken, I don't know what"

```
/god-doctor
```

### "I forgot what I was doing"

```
/god-status              <- current state
/god-logs                <- recent operations (v0.15)
/god-trace <tier>        <- detailed events for a tier (v0.15)
```

> `/god-logs` and `/god-trace` ship with the v0.15 observability layer.
> Today you can `cat .godpowers/runs/<id>/events.jsonl` for the raw stream.

### "Where did this requirement come from?"

```
/god-graph trace requirement:user-can-export-csv
```

### "What can I install to extend this?"

```
/god-extension-scaffold --name=@godpowers/my-pack --output=.  <- create a pack
/god-test-extension <pack-dir>                               <- validate it
/god-extension-list      <- what's installed
[npm search @godpowers]  <- what's available
```

### "I just want to start fresh"

```
/god-undo                <- one operation at a time
/god-rollback init       <- whole project
[or manually rm -rf .godpowers/ if you really want to nuke it]
```

---

## The Universal Pattern

For any scenario you might face:

1. **What life-cycle phase are you in?** (pre-init, in-arc, steady-state, post-incident, in-migration)
2. **What's the size of the work?** (trivial, small, medium, large)
3. **Is it blocking something else?** (sync vs async)
4. **Is there urgency?** (hotfix vs feature)
5. **What do you have today vs what's missing?**

The 120 commands compose to handle all of these. If a scenario isn't here:
- Run `/god-next` and describe the situation
- /god-next routes you to the right command
- Or describe what you want; the AI tool's skill matching does the rest

---

## Recipe Index by Command

If you know the command, here's where each one shines:

| Command | Best for |
|---------|----------|
| `/god-mode` | Greenfield idea -> production |
| `/god-init` | Initialize project |
| `/god-explore` | Pre-init ideation |
| `/god-prd` | Write PRD |
| `/god-arch` | Design architecture |
| `/god-roadmap` | Sequence work |
| `/god-stack` | Pick tech stack |
| `/god-repo` | Scaffold repo |
| `/god-build` | Build a milestone |
| `/god-deploy` | Deploy pipeline |
| `/god-observe` | Wire monitoring |
| `/god-harden` | Security audit |
| `/god-launch` | Launch product |
| `/god-feature` | Add feature (anytime, not just steady state) |
| `/god-hotfix` | Urgent prod bug |
| `/god-postmortem` | After-incident review |
| `/god-refactor` | Safe refactor |
| `/god-spike` | Research time-box |
| `/god-upgrade` | Framework migration |
| `/god-docs` | Documentation work |
| `/god-update-deps` | Dependency updates |
| `/god-audit` | Score artifacts |
| `/god-hygiene` | Composite health check |
| `/god-debug` | Systematic debug |
| `/god-review` | Two-stage code review |
| `/god-standards` | Quality gate check |
| `/god-fast` | Trivial inline edit |
| `/god-quick` | Small task with TDD |
| `/god-add-tests` | Test legacy code |
| `/god-discuss` | Pre-planning thinking |
| `/god-list-assumptions` | Surface assumptions |
| `/god-pause-work` | Save context |
| `/god-resume-work` | Restore context |
| `/god-workstream` | Parallel branch |
| `/god-pr-branch` | Clean PR (filter .godpowers/) |
| `/god-undo` | Revert last op |
| `/god-redo` | Re-run a tier |
| `/god-skip` | Skip with audit |
| `/god-repair` | Fix drift |
| `/god-rollback` | Walk back tier |
| `/god-restore` | Recover from .trash |
| `/god-doctor` | Diagnose install/state |
| `/god-status` | Current state |
| `/god-progress` | Deliverable progress (requirements done / left) |
| `/god-next` | What's next |
| `/god-lifecycle` | Project phase |
| `/god-help` | Discoverable help |
| `/god-version` | Version |
| `/god-add-todo` | Capture task |
| `/god-check-todos` | List + route todos |
| `/god-note` | Zero-friction capture |
| `/god-add-backlog` | Long-term parking |
| `/god-plant-seed` | Conditional future idea |
| `/god-extract-learnings` | Capture institutional knowledge |
| `/god-thread` | Persistent topic context |
| `/god-map-codebase` | Analyze existing code |
| `/god-intel` | Query codebase intel |
| `/god-graph` | Knowledge graph |
| `/god-sprint` | Sprint ceremonies |
| `/god-party` | Multi-persona discussion |
| `/god-build-agent` | Generate custom agent |
| `/god-settings` | Config management |
| `/god-set-profile` | Model profile |
| `/god-extension-scaffold` | Create an extension pack |
| `/god-extension-add/list/remove/info` | Skill pack management |
| `/god-smite` | Delete node_modules + reinstall |

---

## Design recipes (added in v0.11)

### Recipe: Use a known site as design baseline

**When**: PRD names a familiar product as visual reference (Linear, Stripe,
Notion, etc.).

**Sequence**:
1. `/god-design suggest` - scans PRD for known site mentions
2. `/god-design from <site>` - fetches curated DESIGN.md from awesome-design-md
3. god-design-reviewer gates the change (two-stage spec + quality)
4. `/god-design polish` - refine with impeccable if installed
5. Reverse-sync wires component implementations as `/god-build` proceeds

71 curated sites available; cached per-project on first fetch.

### Recipe: Verify the running app matches design

**When**: After `/god-build`, before `/god-launch`. Or any time DESIGN.md
changes and you want to check the live app.

**Sequence**:
1. Ensure dev server or deploy preview is running at a reachable URL
2. `/god-test-runtime audit [url]` - design audit only
3. `/god-test-runtime test [url]` - functional acceptance flows
4. `/god-test-runtime` - both pipelines in one browser session
5. Critical findings flow to REVIEW-REQUIRED.md and pause arc
6. `/god-review-changes` walks them

Runs headless (agent-browser preferred; Playwright fallback). Backends
detected automatically; install one with `npm install -g agent-browser`
or `npm install playwright`.

### Recipe: Extract design from an unknown site

**When**: PRD references a site that's NOT in the awesome-design-md catalog.

**Sequence**:
1. `/god-design scan <url>` - SkillUI extracts a DESIGN.md via static
   analysis (or `--ultra` for Playwright-driven visual extraction)
2. `/god-design polish` - refine with impeccable if installed
3. god-design-reviewer gates the result
4. PASS verdict applies the DESIGN.md to project root

Cached at `.godpowers/cache/skillui/<slug>/`. Requires
`npm install -g skillui` for first-time setup.

### Recipe: Multi-repo coordinated change (Mode D)

**When**: Suite of repos under one org; a refactor needs to touch several.

**Sequence**:
1. `/god-suite-init` - one-time registration of siblings
2. `/god-suite-status` - confirm all repos are clean before patch
3. `/god-suite-patch "<description>" --repos a,b,c` - coordinated change
4. Each repo's `god-orchestrator` runs the patch (per-repo Quarterback rule)
5. `/god-suite-status` to verify aggregate outcome
6. `/god-suite-release` if a coordinated release follows

Suite-config at `<hub>/.godpowers/suite-config.yaml` declares siblings
explicitly (no auto-discovery).
