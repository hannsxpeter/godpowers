# Divergence

> Widen the candidate pool before a Tier 1 decision converges.
>
> Every antipattern file in this directory detects a bad choice after it is
> already on disk. `ARCH-ANTIPATTERNS.md` catches "Resume-Driven Architecture"
> and "Cargo-Cult Cloud-Native". `STACK-ANTIPATTERNS.md` catches "The Buzzword
> Stack" and "The 'We'll Just Use' Trap". Those detectors assume an alternative
> existed and was rejected for a reason. Nothing in Godpowers produces that
> alternative. This reference is the producer.

## The problem this solves

A specialist that generates one candidate and then scores it is not choosing.
It is justifying. The score is real, the rationale is real, and the decision was
made in the first sentence of generation.

Concrete instances in this repo:

- `specialists/god-architect.md` goes from PRD to C4 Level 1 to ADRs with no
  candidate-generation step, then requires "Rationale (why this over
  alternatives)" and pauses when "two architectures score equally". Three
  references to a candidate set that nothing produces.
- `specialists/god-stack-selector.md` says "List 2-3 viable candidates", inside
  a pre-enumerated category list. The cap is set before generation, the
  candidates are generated in the scorer's own context, and the category list
  forecloses "there is no database" and "the queue is a Postgres table" before
  anything is generated.
- `specialists/god-explorer.md` Phase 3 makes Framing A the user's own framing
  by rule, prescribes the shape of B and C, and attaches pro/con inline, so the
  critic runs during generation.
- `specialists/god-debugger.md` Phase 4 generates 2-3 root causes in the same
  context that just chose the instrumentation, then ranks them.

## When this fires

Only on hard-to-reverse Tier 1 work, and only when the calling agent is at the
step where candidates would otherwise be enumerated:

| Caller | Step | Fires when |
|---|---|---|
| god-architect | before C4 Level 1 | the system shape is hard to reverse (a monolith/service split, a sync/async boundary, a storage-ownership decision) |
| god-stack-selector | before the per-category candidate list | always, and it widens the category list itself, not just the candidates inside a category |
| god-explorer | Phase 3 (Reframe) | always, to produce the framings that are currently produced by fiat |
| god-debugger | Phase 4 (Hypothesize) | only on the restart path (all hypotheses refuted), or when instrumentation did not narrow the failure boundary |

## When this does not fire

Abort and proceed directly. Do not announce the abort in the artifact.

- `--yolo` is set. Yolo defaults are convergence-biased on purpose.
- Any tier other than the four above. Build, deploy, observe, harden, launch,
  and design tiers each have their own producers or their own catalogs.
- The user used closed phrasing: "standard", "canonical", "textbook", "just",
  "quick", "the usual". They asked for the known answer.
- The decision is cheap to reverse. Slice decomposition is re-cut for free;
  widening it buys nothing.
- A prior divergence pass in this session already covered the same decision.

The cost of running this when it is not needed is larger than the cost of
skipping it when it would have helped. Bias toward not firing.

## Host gate

Read `lib/host-capabilities.js` via `detect()`. If `guarantees.agentSpawn` is
false, the host cannot give a branch a fresh context.

Do NOT simulate the fan-out by writing the branches sequentially in one
context. That produces a wider single thought and hides the fact that it did.
Instead run one labeled single-context pass and write this line into the
artifact:

```
[OPEN QUESTION] Candidate set generated in a single context; isolated fan-out
was unavailable on this host. Alternatives below may share an unstated
assumption.
```

The degradation belongs in the artifact, not in console output. The artifact is
what a reader trusts six months later.

## Fan-out contract

**N = 4 branches, one wave.** `references/building/BUILD-WAVES.md` caps parallel
work at 3-4 per wave for coordination reasons; the same cap applies here.

**Each branch receives exactly three things:**

1. The problem statement, restated in one paragraph.
2. One lens from the table below.
3. One named artifact excerpt, and only one: the PRD problem statement and NFR
   block for architecture work, the relevant ADR context for stack work, the
   observation document for debugging.

**Each branch receives none of the following:** the session transcript, the
other branches' output, the caller's working notes, the artifact draft in
progress, or the obvious answer. Input tokens are the entire cost of this
pass. A branch that receives the full context costs N times the base context
and produces a candidate anchored on it, which defeats the point twice.

**Tools: `Read, Grep, Glob`.** A branch with no tools produces plan-shaped
prose with no contact with the system, including a confident "first concrete
step" naming files that do not exist. Give branches read access and require
that any claim about the codebase cite a path.

**Posture: generator only.** A branch does not score, rank, hedge, compare, or
recommend. It emits six one-line candidates. Depth is the caller's job, because
the caller is the one holding the PRD, the ARCH, and repository access.

**Isolation is the invariant.** If branches see each other, they anchor on each
other and the whole pass collapses into one thought with extra steps.

## Lenses

Pick 4. Vary the picks across runs so re-running the same decision produces a
different candidate set. Each lens below inverts a detector this repo already
ships, so the candidates it produces are the ones the detector assumes were
considered.

| Lens | Prompt to the branch | Inverts |
|---|---|---|
| **Remove the load-bearing assumption** | Name the one thing every version of this treats as fixed (the framework, the database, the request/response model, the fact that there is a server). Assume it is gone. What is now possible? | STACK-ANTIPATTERNS "The 'We'll Just Use' Trap" |
| **10x the stated load** | The PRD's stated numbers are off by 10x in the direction that hurts. What shape survives that, and what does it cost when the real number is 1x? | ARCH-ANTIPATTERNS "'Scalable' Without Numbers", "Paper-Tiger Architecture" |
| **The 3am pager** | You are on call when this breaks at 3am. What shape means you are not paged at all, and what shape means you are paged but fix it in one command? | ARCH-ANTIPATTERNS "Hidden Single Points of Failure" |
| **Hostile operator** | Someone with legitimate access wants to abuse this. Generate the abuses, then invert each into a shape that makes the abuse structurally impossible rather than merely forbidden. | ARCH-ANTIPATTERNS "Architecture Theater", trust-boundary have-nots |
| **$0 and one hour** | No budget, no team, one hour. What is the crudest thing that still does the load-bearing work? Name what it gives up. | ARCH-ANTIPATTERNS "Cargo-Cult Cloud-Native", "Resume-Driven Architecture" |
| **Inversion** | Ask the opposite question. If the goal is X, generate ways to guarantee NOT X. Then negate each one back into a candidate. | PRD-ANTIPATTERNS "The Empty No-Gos" |
| **Adjacent-domain transplant** | Name an engineering domain outside software that has already solved this shape (manufacturing, logistics, power distribution, air traffic control, publishing). Transplant one specific mechanism, not the vibe. | ARCH-ANTIPATTERNS "Stackitecture" |
| **The PRD is half as long** | Half the requirements are cut. Which half, and what shape does the surviving half actually want? It is usually not the same shape with pieces missing. | PRD-ANTIPATTERNS "The Feature Laundry List" |

Bias the picks toward the decision at hand. Storage and consistency decisions
want "10x the stated load" and "the 3am pager". Product framing wants "the PRD
is half as long" and "inversion". Always include one lens that is uncomfortable
for the decision, because that is the one producing candidates the caller would
not have written.

## Rules the calling agent must not break

**1. Seed the obvious answer as a labeled baseline.** Before the fan-out, write
down the answer you would have given without it and label it `Baseline`. It is
excluded from generation and included in evaluation. The textbook answer is
frequently the correct answer, and a process that structurally excludes it is
worse than no process. If the baseline wins, say so plainly: "the widened pool
did not beat the obvious choice" is a real and useful finding.

**2. Never introduce a novelty axis on Tier 1 work.** Score against the rubric
the calling specialist already owns: fit-for-requirements, maturity, ecosystem
health, team familiarity, and total cost for stack work; the NFR map and flip
points for architecture. Adding a novelty weight manufactures exactly
`STACK-ANTIPATTERNS.md` "The Buzzword Stack" and "The Resume-Driven Choice",
which are the failures this repo exists to prevent. Divergence widens the pool.
It does not touch the rubric.

**3. Traps demote, they never delete.** A candidate that looks attractive but
carries a hidden cost is recorded with the one-line reason it is a trap, ranked
below the survivors, and rendered as `[HYPOTHESIS]`. It is not removed. The
reason a candidate is a trap is itself a model judgment and is sometimes wrong;
deleting on that judgment silently discards the possibly-correct answer and
leaves no evidence that it happened.

**4. Stop when the shapes repeat.** If a fifth lens would produce candidates
that share an underlying assumption with the four already returned, the space
is mapped. Do not pad to hit a number. Ten variations of one idea is not
breadth; it is decoration.

## What lands in the artifact

The pass is worthless if its output stays in the console. Each caller has a
landing site:

- **Architecture**: the `## Options Considered` table in `templates/ARCH.mdx`,
  plus a named alternative inside each ADR's Rationale. An architecture with
  exactly one shape considered must say so explicitly, with the reason.
- **Stack**: the "Candidates evaluated" and "Rejected, with reason" lines per
  category in `templates/STACK-DECISION.mdx`, including whether the category
  needs to exist at all.
- **Explore**: the alternative framings become cluster labels over the widened
  pool rather than three slots filled by rule.
- **Debug**: the hypothesis list, with the discarded candidates and the one-line
  reason each was discarded.

A reader who disagrees with the decision should be able to find their preferred
alternative in the artifact, already considered, with the reason it lost.

## Failure modes

This pass has gone wrong if:

- Every candidate shares the same underlying assumption. That is a wider single
  thought, not divergence.
- The output is a list with no position taken. "Here are 20 options, you decide"
  is a cop-out. Generate wide, converge with a real opinion.
- A branch received the session context, so the candidates all echo the draft.
- The artifact gained a section but the decision did not change and no
  alternative is named. That is ceremony.
- The pass fired on a cheap-to-reverse decision, or under `--yolo`.
- The novelty of a candidate was used as a reason to prefer it.

### Anchoring tells in a single-context table

When the fan-out is skipped or degrades to one context (see Host gate), the
convergence step is anchored on the answer it already chose. That anchoring
leaves a signature. Re-read your own `## Options Considered` table and treat any
of these as a sign the table was written to justify a decision already made,
not to test it:

- **The baseline is scored high with an empty trap column and a wide moat.** A
  selected row at 9 with the next shape at 5 or 6 and no hidden cost named is
  rarely the world; it is usually the author flattering the choice. A real
  winner still has a trap flag naming what it gives up.
- **Two rows are one shape wearing two hats.** "Selected" and "status quo
  baseline" that differ only by a trivial detail, or two candidates whose
  labels are surface synonyms, are padding. Merge them and the pool is smaller
  than it looked.
- **The errors all flatter the chosen row.** Rejection reasons that overstate a
  rival's cost, or claims that a rival feature is absent when a grep would find
  it, point one direction. Isolated generation tends to err against the options
  it rejected; anchored generation errs in favor of the one it kept. Check the
  reasons against the tree with Grep before trusting them.
- **The selected row carries no self-criticism.** The strongest tables put a
  real, verified defect on their own winning row. A winner with nothing said
  against it was not stress-tested.

These are the same tells whether a human, a single-context run, or a degraded
host produced the table. They are cheap to check and worth checking on every
hard-to-reverse decision.

## Provenance

Godpowers-authored. The framing of isolated generation before the critic runs
was influenced by the ADHD skill (see `INSPIRATION.md`). No code, prose, or lens
text is taken from it, there is no runtime dependency on it, and Godpowers
asserts nothing about its internals or its published results.
