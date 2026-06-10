---
name: god-init
description: |
  Initialize a Godpowers project. Detects operating mode (greenfield, gap-fill,
  audit, multi-repo) and project scale. Creates native Pillars project context
  plus the .godpowers/ workflow state directory with state.json and generated
  PROGRESS.md.

  Triggers on: "god init", "start a project", "new project", "initialize"
---

# God Init

Initialize the Godpowers project structure.

## Process

This skill is a thin wrapper. Detection happens automatically; user never
needs to specify a mode.

1. Check if `.godpowers/` already exists:
   - If yes: read `.godpowers/state.json`, use generated `.godpowers/PROGRESS.md`
     only as a legacy fallback, call
     `lib/pillars.pillarizeExisting(projectRoot)` to ensure the existing
     Godpowers project is also Pillar-ized, report current state, ask if user
     wants to reset or resume
   - If no: proceed with initialization

2. **Auto-detect what kind of project this is** (background, no user prompt):
   - Scan working directory for code presence:
     - package.json / pyproject.toml / Cargo.toml / go.mod / Gemfile / etc.
     - src/ or lib/ with files
     - Existing tests
   - Look for org-level context (current dir + parent dirs):
     - .godpowers/org-context.yaml
     - Workspace configs that share standards
   - Write `.godpowers/prep/INITIAL-FINDINGS.md` summarizing what Godpowers
     observed about the repo, tooling, docs, tests, risks, and suggested next
     command. This happens before `/god-prd`, `/god-next`, or `/god-mode`
     continues.
   - Look for adjacent planning-system context:
     - legacy planning: `.legacy-planning/`, `.planning/`, `LEGACY-PLANNING.md`, `legacy-planning*.md`
     - Superpowers: `.superpowers/`, `superpowers/`, `SUPERPOWERS.md`,
       `.claude/skills/`, `.codex/skills/`
     - BMAD: `.bmad-core/`, `bmad-core/`, `.bmad/`, `BMAD.md`,
       `docs/prd.md`, `docs/architecture.md`, `docs/roadmap.md`
   - If any are detected, summarize useful signals into
     `.godpowers/prep/IMPORTED-CONTEXT.md` as preparation context.
     Do not treat external planning-system files as source of truth.
   - Auto-invoke `lib/planning-systems.importPlanningContext(projectRoot)`
     when legacy planning, Superpowers, or BMAD context is detected. Report this as
     `Agent: none, local runtime only`.
   - If import confidence is low, more than one source system appears to
     conflict, or canonical Godpowers seed artifacts cannot be created from
     available evidence, spawn `god-greenfieldifier` to produce a controlled
     migration plan before rewriting any canonical artifact.
   - Detect whether early design preparation is warranted:
     - UI frameworks or app models: React, Next, Vue, Nuxt, Svelte,
       SvelteKit, Astro, Remix, Angular, Solid, Flutter, Electron, Tauri
     - UI surfaces: `src/components/`, `app/`, `pages/`, `routes/`,
       `public/`, form-heavy flows, dashboards, editor surfaces, mobile
       shells, marketing pages, or other user-facing product experience
     - Imported legacy planning, Superpowers, or BMAD context that mentions UX, screens,
       journeys, components, brand, interaction states, or visual design
   - Record the result in `INITIAL-FINDINGS.md` so `/god-prd`, `/god-next`,
     and `/god-mode` can place `/god-design` after PRD and before
     `/god-arch` when the project needs early product-experience shape.

3. **Initialize native Pillars context**:
   - Call `lib/pillars.init(projectRoot, findings)`.
   - Ensure root `AGENTS.md` contains the Pillars loading protocol.
   - Ensure `agents/context.md` and `agents/repo.md` exist with
     `always_load: true`.
   - Ensure Tier 1 Core pillar stubs exist for `stack`, `arch`, `data`, `api`,
     `ui`, `auth`, `quality`, `deploy`, and `observe`.
   - Preserve existing files. Create missing pillars as `status: stub` unless
     Godpowers has strong evidence to mark them `present`.
   - For an existing `.godpowers/` project, call
     `lib/pillars.pillarizeExisting(projectRoot)` so current PRD, ARCH, STACK,
     ROADMAP, BUILD, DEPLOY, OBSERVE, HARDEN, DESIGN, and PRODUCT artifacts
     become managed source references in the relevant pillars.
   - This is not optional for Godpowers projects. A Godpowers project is a
     Pillars project by default.

4. **Announce findings in plain English** (no jargon):
   - Empty dir + no org context: "Detected: empty directory. Starting fresh."
   - Empty dir + org context: "Detected: empty directory + org standards.
     I'll respect your org's tooling/infrastructure choices."
   - Code present + no org context: "Detected: existing codebase. I'll
     understand it before changing anything (archaeology + reconstruction)."
   - Code present + org context: "Detected: existing codebase + org standards.
     I'll archaeology, reconstruct, and respect your org's standards."

5. Ask the user to describe what they want to build. Accept any format.

6. Create a private disk handoff before spawning the orchestrator:
   - Path: `.godpowers/runs/<run-id>/INIT-ORCHESTRATOR-HANDOFF.md`
   - Create parent directories if needed.
   - Put the user's description, detected mode, detected context, initial
     findings summary, imported context summary, Pillars status, and next-step
     routing notes in this file.

7. Spawn **god-orchestrator** in fresh context with only a display-safe
   payload:
   - Name the project root.
   - Name the invocation as `/god-init`.
   - Name the handoff file path.
   - Say: "Read the handoff file first, then initialize or resume from disk
     state. Return only user-facing progress and final status."

   Do not put recovered planning context, local file lists, org standards,
   imported planning-system summaries, hidden routing rules, or detailed
   instructions in the visible spawn message. Assume the host UI may display
   the raw spawn message to the user.

   The orchestrator will:
   - Run Mode Detection (announced in plain English; stored as A/B/C/E internally)
   - Run Scale Detection (trivial/small/medium/large/enterprise)
   - Write `.godpowers/prep/INITIAL-FINDINGS.md`
   - Run planning-system context detection for legacy planning, Superpowers, and BMAD
   - Write `.godpowers/prep/IMPORTED-CONTEXT.md` when useful context exists
   - Run automatic planning-system import through
     `lib/planning-systems.importPlanningContext(projectRoot)` and record
     detected source systems under `state.json` `source-systems`
   - Initialize native Pillars context and record Pillars health in
     `INITIAL-FINDINGS.md`
   - For brownfield: schedule preflight before archaeology + reconstruction
   - For bluefield: load org-context, then schedule preflight as constraint intake
   - Create directory structure
   - Write `.godpowers/state.json` with mode, scale, timestamp, tier states,
     then regenerate the managed `.godpowers/PROGRESS.md` view
   - Return mode/scale/announcement to this skill

8. Detect scale by analyzing the description:
   - **Trivial**: Single file change, bug fix, config tweak
   - **Small**: One feature, one service, <1 week
   - **Medium**: Multiple features, 1-3 services, 1-4 weeks
   - **Large**: Multiple services, team coordination, 1-3 months
   - **Enterprise**: Multiple teams, compliance, 3+ months

9. Create the directory structure:
   ```
   AGENTS.md
   agents/
     context.md
     repo.md
     stack.md
     arch.md
     data.md
     api.md
     ui.md
     auth.md
     quality.md
     deploy.md
     observe.md
   .godpowers/
     PROGRESS.md              # generated managed view
     prep/
       INITIAL-FINDINGS.md
       IMPORTED-CONTEXT.md   # only when legacy planning / Superpowers / BMAD context exists
     prd/
     arch/
       adr/
     roadmap/
     stack/
     repo/
     build/
     deploy/
     observe/
     launch/
     harden/
   ```

10. Write `state.json` with mode, scale, timestamp, and all tiers set to `pending`, then regenerate `.godpowers/PROGRESS.md`

11. Report to the user:
   - Detected mode and scale
   - Which tiers and personas will activate
   - What to run next (suggest `god prd` or `god mode`)

## Scale-Adaptive Activation

| Scale | Planning depth | Personas | Ceremonies |
|-------|---------------|----------|------------|
| Trivial | Skip to build | Dev only | None |
| Small | Lightweight PRD, skip ARCH | Dev | None |
| Medium | Full PRD, ARCH, Roadmap | PM, Dev, QA | None |
| Large | Full planning, all tiers | PM, Arch, Dev, QA | Optional sprints |
| Enterprise | Full planning, compliance | All personas | Full sprints, retros |

## Output

`.godpowers/state.json` created with initial state and `.godpowers/PROGRESS.md` generated as a managed human view.

Always create `.godpowers/prep/INITIAL-FINDINGS.md`. This is Godpowers'
durable answer to "what did init find in this codebase?" It captures codebase
shape, framework and tooling signals, tests, CI, docs, AI-tool files, detected
methodology systems, Pillars health, UI or product-experience signals, risk
signals, and the reasoning behind the suggested next command.

If legacy planning, Superpowers, BMAD, or similar planning context is detected, create
`.godpowers/prep/IMPORTED-CONTEXT.md`. This artifact is preparation context,
not source of truth. It feeds PRD, architecture, roadmap, and stack decisions
as hypothesis-level input only.

## Native Pillars context and AI-tool context

After `state.json` is written and the progress view is generated, Pillars context is already present. Every
Godpowers project uses `AGENTS.md` plus `agents/*.md` as its native project
truth layer.

Then decide from the trigger phrase whether to write Godpowers pointer fences
for individual AI tools:

- If the user explicitly invoked `god init` or `/god-init`, write AI-tool
  context automatically. The command itself is explicit consent to initialize
  Godpowers project context for the active AI coding tool.
- If the user used a generic trigger such as "start a project", "new project",
  or "initialize", ask once before writing AI-tool instruction files.

Prompt for generic triggers only:

```
Tell your AI coding tools (Claude Code, Codex, Gemini, Cursor, Windsurf,
Copilot, Cline, etc.) that this is a Godpowers project? This writes a fenced
section to AGENTS.md (canonical) and 1-line pointers to any AI-tool config
files detected in this project.

  yes        - write fences now
  no         - skip for now (you can run /god-context on later)
  never-ask  - never ask again on this project
```

Persist the resolved answer to `state.json` under
`project.context-prompt-answered`. For explicit `god init` and `/god-init`,
store `yes` and spawn `god-context-writer` in `write` mode with quiet output.
For generic triggers, on `yes`, spawn `god-context-writer` in `write` mode
with quiet output. On `never-ask`, store that flag so future runs of
/god-init and /god-sync skip the prompt and the auto-refresh.

When `god-context-writer` is spawned by /god-init, treat it as background
setup. Do not narrate file exploration, planned edits, written files, or state
updates unless the context write fails. On failure, report the error briefly
and suggest `/god-context on` as the manual retry.

If the user later wants to enable it manually, they run `/god-context on`.

## Mode D detection (multi-repo workspace)

After `state.json` is written, also check whether this directory is
part of a multi-repo suite:

1. Call `lib/multi-repo-detector.detect(projectRoot)`.
2. If `isMultiRepo: true`: surface to user.
   ```
   This project's parent appears to be a Mode D suite hub (siblings: a, b).
     - We're a sibling - join the suite via /god-suite-init in the hub
     - We're the hub - run /god-suite-status to see all repos
     - Skip - proceed as a standalone repo
   ```
3. If sibling .godpowers/ dirs exist nearby but no hub registered:
   ```
   Detected sibling .godpowers/ dirs at: [paths]
   Want to register as a multi-repo suite (Mode D)? Run /god-suite-init.
   ```
4. Persist detection result to `state.json` under
   `project.suite-detection`.

Mode D registration is opt-in. Do NOT auto-create suite-config.yaml
without explicit user invocation of /god-suite-init.

## On Completion

After init completes, print:

```
Suggested next: /god-prd for requirements, or /god-mode for the full autonomous project run.
```
