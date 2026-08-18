# Harness Quality

Godpowers treats the coding agent, its context, the test runner, and the
repository as one engineering system. The harness quality layer makes failures
easy to diagnose, larger changes explicit before editing starts, and completed
slices easy to resume from disk.

## Compact verification

Human-readable output remains the default. Agents and automation can request a
bounded summary while the runner retains the complete child output in a private
temporary log:

```bash
npm test -- --agent-output
npm test -- --json
```

Compact mode stops at the first failed child, preserves its exact exit status,
and reports the command, elapsed time, focused diagnostics, and retained-log
path. Successful runs report aggregate command and check counts without feeding
hundreds of passing lines back into the agent context.

## Explicit specialist context

Every workflow specialist declares one of two contracts in its frontmatter:

```yaml
required-context:
  - file:.godpowers/state.json
  - inline:task
optional-context:
  - file:.godpowers/roadmap/ROADMAP.mdx
max-tokens: 12000
```

Or, when the specialist genuinely needs no project files:

```yaml
no-project-context: true
max-tokens: 4000
```

Required sources fail closed when they are missing, escape the project root, or
exceed the budget. Optional sources are dropped in stable declaration order.
File sources reject symbolic links and retain identity-pinned bytes for spawn,
so a later path replacement cannot change approved context. Repository
enumeration stops at explicit entry and depth limits. The emitted
`context.loadout` evidence records identifiers, counts, and byte estimates,
never source contents, regardless of which event API emits it.

## Program design before implementation

Every executable build plan records its size. A small change can skip program
design only with a sizing rationale and a skip rationale. Medium and large
changes must define these sections before Build can close:

- File Tree Delta
- Module Boundaries
- Public Contracts
- Call And Data Flow
- Reused Patterns
- Non-Goals
- Verification Points

Human-guided runs record affirmative approval in a hash-chained `user.resolve`
event bound to the exact project-relative plan path and SHA-256 content hash.
Plan frontmatter and prose cannot authorize themselves. YOLO runs record
affirmative auto-approval and its rationale. Missing, negative, unreadable, or
project-external plan evidence blocks the Build gate.

## Structured slice handoffs

Slice completion, pause, or ownership change can produce a handoff from plan,
state, events, linkage, and verification evidence. The handoff is capped at
8 KiB and always preserves requirement IDs, blockers, failed verification, and
the next action. Conflicting current state wins over the projection.

Handoffs are views, not a second state store. A new process resumes from the
authoritative state plus the handoff, without relying on the previous chat.

## Maintainability trajectory

`lib/maintainability-trajectory.js` captures a stable before-and-after report
for source lines, files, functions, median and p90 function length, comment
density, TODO and FIXME markers, duplicated blocks, dependency edges, and
cyclic dependency components. It includes signed deltas and sample counts.

Generated, vendored, dependency, coverage, build, and Godpowers state paths use
one shared exclusion rule set. Repository imports are parsed as inert text and
are never executed. Tree traversal has explicit entry and depth limits. The
measures remain report-only for the first three release candidates. Reviewers
interpret deterioration, but no single metric can fail a build during
calibration.

## Incremental evolution benchmark

The bundled scenario reveals exactly six requirements, one checkpoint at a
time, inside a clean temporary Git repository. It runs without network access
or model credentials and records behavior status, attempts, rework, changed
lines, acceptance, handoff completeness, and maintainability deltas.

```bash
node lib/evolution-benchmark.js \
  --scenario fixtures/evolution/maintainability-sequence \
  --evidence-dir .godpowers/evidence/evolution
```

The command retains deterministic JSON and Markdown evidence, removes its
temporary repository, and exits nonzero at the first failed or incomplete
checkpoint. It is a changeability baseline, not a claim that one score captures
code quality.

Scenario manifests and checkpoint files must be regular files contained by the
scenario root. Manifests and checkpoints are capped at 16 KiB each, scalar
fields at 4 KiB, machine evidence at 256 KiB, and the human summary at 128 KiB.
Baseline trees reject Git and other version-control metadata. Every temporary
Git command ignores global and system configuration and uses a known empty
hooks directory and template directory. Baseline copying also enforces entry,
byte, and traversal-depth limits.
The behavior child blocks direct network, subprocess, and worker entry points.
Handled interrupts retain partial evidence and remove the temporary repository
plus network guard.

## Release verification

The focused checks are part of the full suite and package gate:

```bash
npm test -- --agent-output
npm run release:check
npm run pack:check
```

The root package keeps zero production dependencies. The complete runtime and
six-checkpoint fixture ship in the npm tarball so published-package behavior can
be verified in isolation.
