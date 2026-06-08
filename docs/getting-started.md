# Getting Started with Godpowers

Want proof before the full walkthrough? Read [Quick Proof](quick-proof.md) for
the runnable fixture command, transcript excerpts, starter command sets, and
runtime expectations. The [First 10 Minute Proof Case Study](case-studies/first-10-minute-proof.md)
shows the same flow as a compact before-and-after story.

## Install

```bash
npx godpowers --claude --global --profile=core
```

That installs the smallest first-run command surface. No accounts are required.
The installer copies skills, agents, hooks, templates, references, and
workflows into `~/.claude/`.

For other AI tools: `--codex`, `--cursor`, `--windsurf`, `--gemini`,
`--opencode`, `--copilot`, `--augment`, `--trae`, `--cline`, `--kilo`,
`--antigravity`, `--qwen`, `--codebuddy`, `--pi`. Or `--all` for everything.

### Choose a profile journey

Profiles install a smaller visible command surface while preserving the same
runtime model:

| Journey | Install flag |
|---|---|
| I want the basics | `--profile=core` or `--minimal` |
| I build products | `--profile=builder` |
| I maintain Godpowers or mature repos | `--profile=maintainer` |
| I coordinate suites | `--profile=suite` |
| I want everything | `--profile=full` |

`/god-help` presents command families first, then the complete catalog.

### Pi support (earendil-works/pi-coding-agent)

[Pi](https://github.com/earendil-works/pi) is supported as a first-class
target. The installer's `--pi` flag copies godpowers skills into
`~/.pi/skills/` (Pi's user-global skills directory). Pi reads `AGENTS.md`
and `CLAUDE.md` for project context, both of which godpowers populates
via `/god-context on`. When a project has a local `.pi/` directory,
`/god-context` also writes a 1-line pointer to `.pi/skills/godpowers.md`.

Pi follows the cross-tool [Agent Skills standard](https://agentskills.io)
at `.agents/skills/`; godpowers writes there too when `.agents/`
exists in the project.

### T3 Code support (pingdotgg/t3code)

[T3 Code](https://github.com/pingdotgg/t3code) is a web/desktop GUI
that wraps existing AI agents (Codex, Claude Code, OpenCode). Because
T3 invokes the underlying agent's CLI, it transparently inherits
whatever AGENTS.md / CLAUDE.md fence godpowers has written for that
agent. No T3-specific install or config is needed; the existing
`--codex`, `--claude`, or `--opencode` install paths plus `/god-context on`
cover T3 users automatically.

### Optional: full design pipeline

For UI work, install these (godpowers detects each lazily; works without
them via the internal fallback path):

```bash
npm install -g agent-browser           # runtime verification (preferred)
agent-browser install                  # downloads Chrome for Testing
npm install -g skillui                 # extract DESIGN.md from any URL
npx skills add https://github.com/pbakaus/impeccable   # design intelligence
```

Catalog (no install): the 71-site awesome-design-md catalog at
github.com/VoltAgent/awesome-design-md is used via lazy fetch when you
run `/god-design from <site>`.

## Your first project (5 minutes)

Before a full project run, get one local proof signal:

```bash
npx godpowers quick-proof --project=. --brief
```

Open Claude Code in an empty directory. Type:

```
/god-mode
```

Claude will ask what you want to build. Answer in any format. The orchestrator
takes over and runs the full arc:

1. Mode detection (greenfield / gap-fill)
2. Scale detection (trivial / small / medium / large / enterprise)
3. Tier 1: PRD -> Architecture -> Roadmap -> Stack
4. Tier 2: Repo scaffold -> Build (with TDD, two-stage review, atomic commits)
5. Tier 3: Deploy -> Observe -> Harden -> Launch

When complete, you have:
- A working application
- Tests
- Deploy pipeline
- Observability with SLOs
- Security findings (or clean)
- Launch artifacts

All artifacts live in `.godpowers/`. Run `/god-status` any time to see state.

## Want more control?

Skip `/god-mode` and run individual commands:

```
/god-init       Start the project
/god-prd        Write the PRD
/god-design     Shape DESIGN.md early when UI or product experience is detected
/god-arch       Design the architecture
/god-roadmap    Sequence the work
... etc
```

After `/god-init`, Godpowers writes `.godpowers/prep/INITIAL-FINDINGS.md` with
what it found in the codebase. If it detects legacy planning, Superpowers, BMAD, or similar
planning context, it also writes `.godpowers/prep/IMPORTED-CONTEXT.md` as
supporting preparation material for PRD, architecture, roadmap, and stack
decisions.

For UI or product-experience projects, `/god-prd` can suggest `/god-design`
before `/god-arch`. That lets screens, flows, components, product voice, and
accessibility requirements inform architecture instead of arriving after it.

After each, run `/god-next` to see the suggested next command.

## Beyond greenfield

Once you have a working project, ongoing work uses other workflows:

- `/god-feature` to add a feature
- `/god-hotfix` for urgent prod bugs
- `/god-refactor` for safe cleanup
- `/god-spike` for time-boxed research
- `/god-postmortem` after incidents
- `/god-upgrade` for framework migrations
- `/god-docs` for documentation
- `/god-update-deps` for dependency updates
- `/god-hygiene` periodic health check

For existing repositories, use the simple path when the codebase is familiar
and context is manageable: `/god-map-codebase`, `/god-init`, `/god-status`,
then `/god-next`. Use the deep inheritance path when ownership, architecture,
tests, or risk are unclear: `/god-preflight`, `/god-archaeology`,
`/god-reconstruct`, `/god-audit`, `/god-tech-debt`, then `/god-feature`.

## Need extensions?

Skill packs add specialized agents:

- `@godpowers/security-pack` - SOC 2, HIPAA, PCI auditors
- `@godpowers/launch-pack` - Show HN, Product Hunt, Indie Hackers, OSS strategists
- `@godpowers/data-pack` - ETL, ML feature, dashboard specialists

Install packs with `/god-extension-add @godpowers/security-pack`. To author a
new pack, start from the shipped scaffold:

```bash
/god-extension-scaffold --name=@godpowers/my-pack --output=.
```

The terminal equivalent remains:

```bash
npx godpowers extension-scaffold --name=@godpowers/my-pack --output=.
```

## Disk-authoritative state

Every artifact lives on disk in `.godpowers/`. If a session ends, you can
resume in a new one: it reads the disk and continues. Conversation memory
is never authoritative.

If `.godpowers` state already exists, `/god-mode --yolo` resumes from disk. It
does not ask for the project description again unless there is no state, no
intent, no checkpoint, and no completed artifact to recover from.

## Pause philosophy

`/god-mode` only pauses for genuine human-only decisions:
1. Ambiguous user intent (two valid directions)
2. Human-constraint flip points (team size, budget, timeline)
3. Statistical ties (two options within 10%)
4. Critical security findings
5. Brand voice / final headline

Add `--yolo` to skip pauses except Critical security. Auto-decisions log to
`.godpowers/YOLO-DECISIONS.md` for review.

Mechanical failures are not pauses. If tests, lint, typecheck, build, or check
commands fail, `/god-mode` records the diagnostics, repairs the failure, reruns
verification, and continues. It only asks for help when the same root failure
survives focused repair attempts or the blocker is genuinely human-only.

## Where to next

- [Concepts](concepts.md) - the vocabulary and mental model
- [Reference](reference.md) - all 112 slash commands and CLI helpers
- [Tutorial: First Project](tutorials/first-project.md) - end-to-end walkthrough
- [Composing with other tools](../references/shared/ORCHESTRATORS.md) - coexistence with other AI workflow systems
