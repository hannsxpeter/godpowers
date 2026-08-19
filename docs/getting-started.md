# Getting Started with Godpowers

This page takes you from nothing installed to a finished project. It assumes no
prior knowledge of Godpowers, and it explains each new word the first time it
shows up.

**Want proof before you commit?** [Quick Proof](quick-proof.md) is a single
command you can run right now that shows real output and changes nothing on your
machine. The [First 10 Minute Proof Case Study](case-studies/first-10-minute-proof.md)
tells the same story as a short before-and-after.

---

## Step 1: Install

One line:

```bash
npx godpowers --claude --global --profile=core
```

No account, no signup, no API key. The installer copies a set of commands and
specialist definitions into your AI tool's config folder (`~/.claude/` for
Claude Code) and stops. Nothing runs in the background.

That flag installs the smallest starting set of commands, which is what you
want on day one.

**Using a different AI tool?** Swap the flag: `--codex`, `--cursor`,
`--windsurf`, `--gemini`, `--opencode`, `--copilot`, `--augment`, `--trae`,
`--cline`, `--kilo`, `--antigravity`, `--qwen`, `--codebuddy`, `--pi`. Or
`--all` to cover every tool you have installed.

### Choose how much you want to see

Godpowers ships a lot of commands. A **profile** decides how many of them are
visible to you. Everything still works the same underneath; you are only
choosing how crowded your command list is.

| If this sounds like you | Install flag |
|---|---|
| I want the basics | `--profile=core` or `--minimal` |
| I build products | `--profile=builder` |
| I maintain Godpowers or mature repos | `--profile=maintainer` |
| I coordinate work across several repos | `--profile=suite` |
| Show me everything | `--profile=full` |

Start with `core`. You can change your mind later without reinstalling:

```bash
npx godpowers surface --profile=builder --codex --global --dry-run
npx godpowers surface --profile=builder --codex --global --apply
```

Run the `--dry-run` first to see what would change. Then run `--apply`.

Once installed, `/god-help` shows a short list based on where your project
actually is. `/god-help all` shows the complete catalog when you want it.

---

## Step 2: See it work before you trust it

Before starting a real project, get one honest signal that the install worked:

```bash
npx godpowers demo --project=.
```

Then open your AI tool in an empty folder and type:

```
/god-first-run
```

This walks you through a guided first run with the training wheels on. It is the
gentlest way in, and it is worth the five minutes.

---

## Step 3: Build something

When you are ready for the real thing, type:

```
/god-mode
```

Your AI tool will ask what you want to build. Answer however you like, in plain
English. "A booking system for a dance studio" is a perfectly good answer. From
there, Godpowers runs the whole project:

1. **Works out what kind of job this is.** Brand new, or filling gaps in
   something that exists?
2. **Works out how big it is.** Trivial, small, medium, large, or enterprise.
   The answer changes how much process it applies.
3. **Plans it.** What the product is, how it is shaped, in what order to build
   it, and what to build it with.
4. **Builds it.** Tests written first, code second, then two independent
   reviewers check the result. Every change committed separately.
5. **Ships it.** Deployment, monitoring, a security pass, and launch materials.

When it finishes, you have a working application, tests, a deployment pipeline,
monitoring with real targets, a security report, and launch artifacts.

Everything it produced lives in a `.godpowers/` folder inside your project. To
see where things stand at any time:

```
/god-status              a compact summary
/god-status --full       every check, in detail
```

---

## Prefer to keep your hands on the wheel?

Skip `/god-mode` and run one command at a time:

```
/god-init       start the project
/god-prd        write the plan: what this is and who it is for
/god-design     shape the look and feel, when there is a user interface
/god-arch       decide how the system fits together
/god-roadmap    put the work in order
```

After each one, run `/god-next` and Godpowers will tell you what makes sense to
do next, based on what is actually on disk.

Two things worth knowing about this path:

- After `/god-init`, Godpowers writes down what it found in your codebase. If it
  spots planning work from another tool, it imports that too rather than making
  you retype it.
- For projects with a user interface, `/god-prd` may suggest running
  `/god-design` before `/god-arch`. That way, screens and flows inform the
  architecture instead of arriving too late to influence it.

---

## After the first build

A project does not end at launch. These commands cover the rest of its life:

| When this happens | Run this |
|---|---|
| You want to add a feature | `/god-feature` |
| Production is on fire | `/god-hotfix` |
| The code needs cleaning up | `/god-refactor` |
| You need to research something first | `/god-spike` |
| Something broke and you want to learn from it | `/god-postmortem` |
| A framework needs upgrading | `/god-upgrade` |
| The docs have drifted | `/god-docs` |
| Dependencies are stale | `/god-update-deps` |
| Routine health check | `/god-hygiene` |

### Working with a codebase that already exists

Two routes, depending on how well you know the code.

**You know this codebase.** Take the short path: `/god-map-codebase`,
`/god-init`, `/god-status`, then `/god-next`.

**You inherited this codebase.** Take the long path, which is built for the case
where nobody left you notes: `/god-preflight`, `/god-archaeology`,
`/god-reconstruct`, `/god-audit`, `/god-tech-debt`, then `/god-feature`.

---

## Your work survives the session ending

Everything Godpowers produces is written to disk in `.godpowers/`, not held in
the chat. Close the window, come back tomorrow, open a fresh session: it reads
the folder and picks up where it stopped. Conversation memory is never the
source of truth.

If state already exists, `/god-mode --yolo` resumes from it. It will not ask you
to describe the project again unless there is genuinely nothing to recover.

---

## When it stops to ask you something

`/god-mode` interrupts only for decisions a human actually has to make:

1. What you asked for could reasonably mean two different things.
2. A hard-to-reverse choice depends on things it cannot know, such as your team
   size, budget, or timeline.
3. Two options are within 10 percent of each other with no objective tiebreak.
4. A critical security finding needs your judgment.
5. Brand voice or a final headline needs to sound like you.

Adding `--yolo` skips all of these except critical security findings. The
decisions it made on your behalf are logged so you can review them afterward.

**Failures are not pauses.** If tests, linting, type checks, or the build fail,
Godpowers records the diagnostics, fixes the problem, runs verification again,
and carries on. It only asks for help when the same failure survives repeated
repair attempts, or when the blocker genuinely requires a person.

### Compact verification for agent sessions

If you are maintaining Godpowers itself, use the agent-oriented test view to
keep the terminal summary small while retaining complete evidence:

```bash
npm test -- --agent-output
```

The full harness contract, including specialist context, program design,
handoffs, maintainability deltas, and the evolution benchmark, is documented in
[Harness Quality](harness-quality.md).

---

## Optional extras

None of this is required. Godpowers detects each one and works fine without it.

### For projects with a user interface

```bash
# lets Godpowers open the built app and confirm it actually renders,
# rather than trusting that passing tests mean a working screen
npm install -g agent-browser
agent-browser install                  # downloads Chrome for Testing

# reads a live site's design system out of its markup, so /god-design
# can start from a real URL instead of a blank page
npm install -g skillui

# a design skill pack that /god-design hands off to when present
npx skills add https://github.com/pbakaus/impeccable
```

There is also a catalog of 71 design references at
github.com/VoltAgent/awesome-design-md, fetched on demand when you run
`/god-design from <site>`. Nothing to install.

### Skill packs

Skill packs add specialists for particular domains:

- `@godpowers/security-pack` - SOC 2, HIPAA, and PCI auditors
- `@godpowers/launch-pack` - Show HN, Product Hunt, Indie Hackers, and open
  source launch strategists
- `@godpowers/data-pack` - ETL, machine learning feature, and dashboard
  specialists
- `@godpowers/provenance-pack` - authorized AI provenance inspection and
  cleaning through a user-operated service
- `@godpowers/operations-pack` - approval-gated issue triage and a human-only
  setup wizard with statically checked shell helpers

Install one with `/god-extension-add @godpowers/security-pack`. To build your
own, start from the scaffold:

```bash
/god-extension-scaffold --name=@godpowers/my-pack --output=.
```

The terminal equivalent:

```bash
npx godpowers extension-scaffold --name=@godpowers/my-pack --output=.
```

---

## Notes on specific tools

### Pi (earendil-works/pi-coding-agent)

[Pi](https://github.com/earendil-works/pi) is a first-class target. The `--pi`
flag copies Godpowers skills into `~/.pi/skills/`. Pi reads `AGENTS.md` and
`CLAUDE.md` for project context, and Godpowers writes both via
`/god-context on`. If your project has a local `.pi/` directory, `/god-context`
also drops a one-line pointer at `.pi/skills/godpowers.md`.

Pi follows the cross-tool [Agent Skills standard](https://agentskills.io) at
`.agents/skills/`, and Godpowers writes there too when `.agents/` exists.

### T3 Code (pingdotgg/t3code)

[T3 Code](https://github.com/pingdotgg/t3code) is a graphical wrapper around
other AI agents (Codex, Claude Code, OpenCode). Because it calls the underlying
agent's CLI, it inherits whatever context Godpowers already wrote for that
agent. There is nothing T3-specific to install: the existing `--codex`,
`--claude`, or `--opencode` install plus `/god-context on` covers it.

---

## Where to next

- [Concepts](concepts.md) - the vocabulary and the mental model behind it
- [Harness Quality](harness-quality.md) - how context, verification, plans, handoffs, and changeability evidence are bounded
- [Reference](reference.md) - all 124 slash commands and CLI helpers
- [Tutorial: First Project](tutorials/first-project.md) - a full end-to-end walkthrough
- [Composing with other tools](../references/shared/ORCHESTRATORS.md) - living alongside other AI workflow systems
