# Composing with Other AI Coding Workflow Systems

> Godpowers is one of several skill-based AI dev tools. Here's how it
> composes with others, what's safe to combine, and how to resolve
> conflicts.

Godpowers does not assume it's the only AI workflow system installed.
Many users layer multiple tools (planning frameworks, discipline harnesses,
codebase mappers, story trackers). The rules below let them coexist.

## Coexistence principles

1. **One state directory per project.** Godpowers owns `.godpowers/`.
   Other systems own their own directories (e.g. `.planning/`,
   `.<vendor>/`). Don't point two systems at the same directory.

2. **Skills can coexist in `~/.claude/skills/`** (or the equivalent for
   other AI tools). The AI tool routes by description match. Multiple
   `/god-*` skills and any other namespace coexist fine.

3. **Don't mix recovery commands across systems.** `/god-undo` reverts
   Godpowers state only. If another tool also writes to `.godpowers/`,
   recovery drifts. Keep recovery scopes disjoint.

4. **Hooks are per-tool but share the directory.** SessionStart hooks
   from multiple systems live in `~/.claude/hooks/` and run sequentially.
   Order is not guaranteed; do not rely on cross-tool hook ordering.

5. **Resolve conflicts by state-directory ownership.** If Godpowers
   says X and another tool says Y about the same artifact, follow
   whichever system owns the directory the artifact lives in.

## When two systems overlap

| Overlap kind | Strategy |
|---|---|
| Both write to the same artifact | Pick one as authoritative. Disable the other's writer for that artifact. |
| Both define a planning workflow | Pick one for planning. Mixing creates duplicate state and divergent truth. |
| One reasons (TDD, review), the other plans (PRD/ARCH) | Stack them. They're orthogonal. |
| Both ship slash commands with similar names | Disambiguate by prefix. `/god-*` is reserved for Godpowers. |

## Migration into Godpowers

If you arrive at Godpowers carrying artifacts from another system,
`/god-init` Mode B (gap-fill) and `/god-migrate` read what exists and map it
forward:

- legacy planning `.planning/` or `.legacy-planning/` context -> `.godpowers/prep/IMPORTED-CONTEXT.mdx`
  and optional native seed artifacts
- BMAD `_bmad-output/` or `.bmad/` context -> imported preparation context and
  open questions for PRD, architecture, roadmap, and stack
- Superpowers specs or plans -> imported preparation context and native
  Godpowers seed artifacts when confidence is high
- Existing PRD-like documents -> `.godpowers/prd/PRD.mdx` after
  substitution-test rewrite if needed
- Existing ADRs -> `.godpowers/arch/adr/`
- Existing roadmap or milestones -> `.godpowers/roadmap/ROADMAP.mdx`
- Existing story or ticket files -> `.godpowers/stories/STORY-*.mdx` through
  `/god-story`

Mode B does not delete the source files. It produces Godpowers artifacts
alongside them. Once parity is reached, you can retire the older system at
your own pace.

## Managed sync-back

Godpowers can keep a source system informed without making that source system
authoritative. `/god-sync` writes managed companion files such as:

- `.planning/GODPOWERS-SYNC.md`
- `_bmad-output/GODPOWERS-SYNC.md`
- `docs/superpowers/GODPOWERS-SYNC.md`

The sync-back file is a bridge, not a second source of truth. It should contain
the current Godpowers status, imported-context mapping, open conflicts, and the
next safe route back into either system. It must be fenced or companion-owned
so Godpowers does not overwrite arbitrary legacy planning, BMAD, or Superpowers artifacts.

## Existing Godpowers projects after upgrades

Feature awareness is the upgrade path for projects that are already
Godpowers-native. `/god-context refresh`, `/god-sync`, `/god-doctor --fix`, and
God Mode resume can record the current runtime feature set, refresh managed AI
tool fences, and point out missing migration, sync-back, dogfood, host
capability, extension-authoring, or suite-release readiness.

## Migration out of Godpowers

Every Godpowers artifact is a plain Markdown file with optional
frontmatter. There's no proprietary binary state. To leave:

1. Copy `.godpowers/prd/`, `arch/`, `roadmap/`, `stack/` somewhere.
2. Strip the fenced "Implementation Linkage" footers if the target
   system doesn't understand them (they're recoverable from code
   annotations).
3. Use the most recent managed sync-back file as the return-path summary if the
   target system is legacy planning, BMAD, or Superpowers.
4. Delete `.godpowers/`.

## What Godpowers does not try to be

Godpowers is opinionated about: artifact discipline, bidirectional
linkage, the four-tier workflow, the single-orchestrator rule, headless
runtime verification, and the substitution / three-label / have-nots
gates. It is intentionally not opinionated about: team ceremonies,
sprint cadence, ticket trackers, knowledge graphs, prompt engineering
methodology. If you need those, run them alongside.
