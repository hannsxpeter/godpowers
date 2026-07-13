# Fusion Architecture: Mythify Evidence Engine + Quarterback, native in Godpowers

Status: DESIGN (not yet implemented)
Author: architecture analysis, 2026-06-15
Scope: redesign Mythify's evidence engine and router/quarterback as native Node
inside Godpowers, keeping Godpowers' pure-skill execution model, 40 product
agents, 120 routing defs, and multi-runtime install intact.

## 1. Executive summary

Godpowers is mid-transition toward a durable, exit-code-backed evidence ledger
and already has the schema, a fail-closed consumer, and a hash-chained event
stream for it. What it lacks is an **enforced producer** of evidence and an
**entry-level router** that can refuse work on a red check or right-size
ceremony. Mythify is exactly those two missing pieces, and its engine already
exists in native Node (its MCP server). This design completes Godpowers' own
transition by transplanting Mythify's proven engine as the enforced producer and
stacking Mythify's prompt-classifying quarterback in front of Godpowers'
existing structural router. god-orchestrator stops self-attesting completion and
starts (a) routing decisions through the quarterback and (b) closing every
substep through the evidence gate.

No new runtime. No second state directory. The change is additive to
`state.json`, idiomatic to the existing `lib/` domain-module pattern, and lands
the chat-visible, resumable, can't-fake-done behavior the project has been
building toward.

## 2. Current-state findings (ground truth)

### Godpowers (v3.0.2)
- **Pure-skill model.** The LLM is the executor; `lib/` is read/compute helpers.
  `lib/workflow-runner.js:9-18`: "'execute' doesn't shell out; the orchestrator
  agent reads the plan and dispatches agents inside its AI context."
- **State.** `lib/state.js` is the sole write gateway for `.godpowers/state.json`
  (`state.write()` at `state.js:175` regenerates `PROGRESS.mdx` views). State is
  otherwise federated by domain: `lib/linkage.js` owns `links/*.json` +
  append-only `LINKAGE-LOG.mdx`; `lib/requirements.js` derives a ledger and rolls
  up into `state.deliverables`; `lib/events.js` owns hash-chained
  `runs/<id>/events.jsonl`. `PROGRESS.mdx` is a generated projection, not truth.
- **Evidence skeleton, no producer.** `schema/state.v1.json:341-369` defines
  `SubStep.verification.commands[]` = `{command, status, exitCode, ranAt,
  durationMs, diagnostics}`. `lib/gate.js:270-317` (`checkBuildEvidence`)
  requires at least one passed command and zero failed before the build gate
  passes; `gate.js` is fail-closed by construction (`verdict` starts `fail`,
  `exitCode()` returns 1 unless `pass`). But **no lib function writes
  `verification.commands` or emits `gate.pass`/`gate.fail`.** Population is the
  orchestrator LLM's job per `references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md`,
  and can be skipped.
- **Router exists, arc-bound.** `lib/router.js:290-331` (`suggestNext`) walks
  tier-1 (prd, design?, arch, roadmap, stack), tier-2 (repo, build), tier-3
  (deploy, observe, harden, launch) returning the first non-done substep.
  `checkPrerequisites` evaluates `file:`, `state:dotted==value`,
  `safe-sync-clear`, `no-critical-findings`, `OR`. `routing/*.yaml` (121
  per-command defs) + `routing/recipes/*.yaml` (43 fuzzy-intent recipes) are the
  playbook. `hasNoCriticalFindings()` (`router.js:370-394`) is fail-closed
  (false when `harden/FINDINGS.md` absent).
- **Verification today** is a mix: build tier genuinely enforces evidence via the
  gate; other tiers rest on artifact-existence + have-nots lint + reviewer-agent
  PROSE verdicts (`god-spec-reviewer`, `god-quality-reviewer`) returned to the
  orchestrator. TDD is prompt-attested (`specialists/god-executor.md:42-99`), not
  mechanically proven.

### Mythify (v3.6.2)
- **Engine in two parities.** Python CLI (`scripts/mythify.py`, 10,283 lines) and
  a field-for-field Node port (`mcp-server/src/index.js`, 9,048 lines) over one
  `.mythify/` state dir.
- **verify run** (`cmd_verify_run` mythify.py:8700 / index.js:8866): `subprocess`
  with timeout, records to append-only `verifications.jsonl`:
  `{kind:"executed", claim, command, exit_code, duration_seconds, stdout_tail,
  stderr_tail, verified, timestamp, plan, step_id, step_title, step_status}`.
  `verified = (not timed_out) and exit_code == 0`. `verify claim` records a
  second-class `{kind:"attested", verified:null, ...}` that never counts.
- **Strict completion gate** (`cmd_step` mythify.py:8321-8333): a step may go
  `completed` only if an `executed`, `verified:true` record exists with
  `timestamp >= step.updated_at` (when it went in_progress) AND bound to that
  step. Enabled by default; opt out only via `MYTHIFY_REQUIRE_VERIFIED_STEP` in
  `{0,false,no,off}`.
- **report** (`build_work_report` mythify.py:4729): cursor-based
  (`reports/<cursor>.json`), merges plan/step/verification/reflection events
  sorted by `(timestamp, order, key)`, surfaces "Attention" for reds, advances a
  cursor unless `--peek`. This is the chat play-by-play.
- **outcome loops** (`outcomes/<slug>/{goal.json,iterations.jsonl}`): bounded
  retry budget; `outcome check` runs the verifier, records an iteration, and
  also writes the executed record to the main `verifications.jsonl`.
- **memory** (`memory.json`, categories fact/decision/discovery/state),
  **lessons** (`lessons/*.json`, project or `~/.mythify/lessons` global),
  **reflections** (`reflections.jsonl`).

## 3. Fusion thesis

> Complete the transition Godpowers already started. Use Mythify's already-Node
> evidence engine as the enforced producer of the `verification.commands` records
> Godpowers' gate already consumes; stack Mythify's prompt-classifying
> quarterback in front of Godpowers' structural router; refactor god-orchestrator
> to decide-next via the quarterback and declare-done via the evidence gate.

Mapping of who supplies what:

| Capability | Source | Integration |
| :--- | :--- | :--- |
| Specialist agents, tiers, arcs, recipes | Godpowers (keep) | unchanged |
| Structural in-arc routing | Godpowers `lib/router.js` (keep) | wrapped by quarterback |
| Fail-closed gate + verification slot | Godpowers `lib/gate.js`, `state.v1.json` (keep) | gate now reads reliably-populated records |
| Enforced evidence producer | Mythify engine -> `lib/evidence.js` | NEW |
| Strict can't-fake-done gate | Mythify -> evidence close path | NEW (extends gate to all tiers) |
| Red-check override + proportional ceremony | Mythify router -> `lib/quarterback.js` | NEW |
| Chat play-by-play report | Mythify report -> `lib/work-report.js` | NEW |
| Outcome loops, memory, lessons, reflections | Mythify -> `lib/evidence.js` submodules | NEW |

## 4. Target architecture

### 4.1 The unified evidence ledger (state model)

Decision: **append-only ledger is the source of truth; `state.json` carries a
per-substep rollup.** This mirrors the existing `requirements -> state.deliverables`
and `linkage -> state.linkage` pattern exactly, so it is idiomatic and leaves
`gate.js` reading its native shape.

One `evidence.verify()` call writes to three coherent destinations:

1. `.godpowers/ledger/verifications.jsonl` (NEW) — append-only, Mythify-shape
   record, the durable audit trail and the source for the work report.
2. `state.json` substep `verification.commands[]` — rollup of the latest verdict
   per substep, in Godpowers' existing shape, so `gate.js` is unchanged.
3. `runs/<id>/events.jsonl` — emit `gate.pass` / `gate.fail` to the existing
   hash-chained OTel stream, closing the "no producer" gap there too.

Record written to the ledger (Mythify-shape, rebound to Godpowers' substep):

```json
{
  "kind": "executed",
  "claim": "build slice tests pass",
  "command": "npm test",
  "exit_code": 0,
  "duration_seconds": 12.4,
  "stdout_tail": "…last 4000 chars…",
  "stderr_tail": "…",
  "verified": true,
  "timestamp": "2026-06-15T18:22:04+00:00",
  "arc": "feature-arc",
  "substep": "tier-2.build",
  "substep_status": "in-flight"
}
```

Rollup into `state.json` (`gate.js` reads this unchanged):

```json
"tier-2": { "build": { "verification": { "commands": [
  { "command": "npm test", "status": "pass", "exitCode": 0,
    "ranAt": "2026-06-15T18:22:04+00:00", "durationMs": 12400, "diagnostics": "" }
] } } }
```

`evidence.verifyClaim()` records a second-class `{kind:"attested",
verified:null}` for the genuinely-unverifiable (PRD/ARCH rationale, launch copy),
matching Mythify's doctrine. Attested records never satisfy the gate.

### 4.2 `lib/evidence.js` (the engine, lifted from Mythify's Node MCP)

**DECISION (2026-06-15): vendor, not shared package.** The engine is copied into
Godpowers rather than consumed as a shared dependency. Accepted cost: a Node fork
(Mythify's `mcp-server/src/index.js` and this module are now two copies). To keep
the fork from silently drifting, vendoring carries provenance discipline:

- A header in `lib/evidence.js`: `// Vendored from mythify-mcp@<version>
  (mcp-server/src/index.js@<commit>). Engine logic only; do not hand-edit record
  shapes. Re-sync via scripts/sync-evidence-engine.js.`
- `lib/evidence/.provenance.json` records `{source, version, commit, syncedAt,
  adaptations:[]}` so any future reader knows the upstream point of origin.
- `scripts/sync-evidence-engine.js` re-pulls the upstream engine, re-applies the
  recorded adaptations (plan/step -> arc/substep, `.mythify/` -> `.godpowers/ledger/`),
  and flags any upstream record-shape change for review.

Self-contained domain module, peer to `lib/linkage.js`. Lifted from
`mythify/mcp-server/src/index.js` and adapted (plan/step -> arc/substep; state
dir -> `.godpowers/ledger/`; writes through `lib/atomic-write.js`).

Public surface:

```
evidence.verify(command, {substep, claim, timeout})   -> record; appends ledger;
                                                          rolls up state.json;
                                                          emits gate.pass/fail
evidence.verifyClaim(claim, evidence)                 -> attested record
evidence.canClose(substep)                            -> bool (strict gate)
evidence.history({substep, recent})                   -> records
evidence.outcome.start/check/stop(...)                -> bounded retry loop
evidence.memory.set/get/clear(...)                    -> memory.json
evidence.lesson.add/list(...)                         -> lessons/*.json
evidence.reflect(...)                                 -> reflections.jsonl
```

The strict gate (`canClose`) is the Mythify rule, rebound: a substep may close
to `done` only if a `kind:"executed", verified:true` record for that substep
exists with `timestamp >= substep.wentInFlightAt`. Tier-appropriate: planning
substeps (prd/arch/roadmap/stack) whose routing declares no executable gate may
close on artifact-existence + have-nots + an attested record; build/deploy/harden
substeps require an executed pass. This preserves Godpowers' existing
tier-by-tier verification strategy while making the executed path enforced where
it applies.

### 4.3 `lib/quarterback.js` (two-layer router)

A thin NEW decision layer that **composes** the existing routers rather than
duplicating them, so there is exactly one quarterback built on the existing
playbook readers.

```
quarterback.route(prompt, {projectRoot}) -> {
  route, reason, nextCommand, ceremony, verificationStrategy,
  chatPolicy: "stay in this chat as executor",
  mutatesState: false,
  evidence: { classification, latestVerdict, activeArc, openFindings }
}
```

Algorithm (priority ladder, first match wins). Reads the ledger's latest verdict
and `state.json`; calls `recipes.matchIntent()` and `router.suggestNext()` under
the hood:

```
[10] recover   <- ledger latest verdict is RED, or harden FINDINGS critical
                  -> /god-debug then resume; do not start new work
[20] resume    <- active arc has non-done substeps + continuation intent
                  -> router.suggestNext() within the arc
[30] recovery  <- incident/hotfix/postmortem intent -> hotfix-arc / postmortem
[40] brownfield<- inheriting existing code -> brownfield-arc / archaeology
[50] research  <- uncertain tech -> /god-spike / /god-explore
[60] review    <- "find risks/critique/audit" -> audit-only / /god-review
[70] full      <- "idea to production / ship it all" -> full-arc (/god-mode)
[80] feature   <- ordinary multi-step feature -> feature-arc
[90] trivial   <- single reversible edit / question -> /god-fast or answer inline
```

Rows [10] and [90] are the new genes: **refuse-on-red** (impossible in Godpowers
today at entry) and **proportional ceremony** (do not open an arc for a one-line
fix). Everything else delegates to the existing `router.js` / `recipes.js`.

### 4.4 god-orchestrator refactor

Unchanged: spawns specialists in fresh contexts, private disk-mediated handoff,
pause rules, the 40 product agents, mode/scale detection. We change only how it decides
next and how it declares done.

Current loop (`GOD-ORCHESTRATOR-RUNBOOK.md:480-496`):

```
read PROGRESS.mdx -> first non-done substep -> verify upstream gate ->
spawn specialist -> verify output exists -> have-nots + gate-command ->
update PROGRESS.mdx to done -> repeat
```

Refactored loop:

```
play = quarterback.route(prompt)            # entry: ceremony + red-check override
if play.route in {recover, trivial, pause}: handle and stop/branch

loop:
  substep = router.suggestNext()            # structural next, unchanged
  evidence.markInFlight(substep)
  spawn specialist(substep)                 # Godpowers' strength, unchanged
  rec = evidence.verify(play.verifyCmd, {substep})   # enforced producer
  if not rec.verified:
      # next quarterback pass returns "recover"; never advance on red
      emit work-report(); enter repair loop; continue
  if not evidence.canClose(substep): refuse  # strict gate; no green w/o evidence
  state.advance(substep, "done")            # close only after the gate
  emit work-report(--since last)            # chat play-by-play
  repeat until quarterback says done or pauses
```

Net behavioral changes:
- Completion is gated on an executed record. `state.advance(...,"done")` is only
  reachable after `evidence.canClose`. This is the can't-fake-done guarantee.
- The orchestrator cannot march past a red check (quarterback returns recover).
- Proportional ceremony enters at the front (trivial -> fast).
- Resume is a pure function of disk: a fresh orchestrator calls
  `quarterback.route` over `.godpowers/` and gets the same next play.
- A work report is emitted to chat after each substep (the visibility gene).

### 4.5 CLI and MCP faces

Skills shell into the engine exactly as they already shell into `npx godpowers`
(via `lib/cli-dispatch.js`). NEW subcommands:

```
npx godpowers verify "<cmd>" --substep tier-2.build --claim "…"
npx godpowers route "<prompt>"
npx godpowers report --since last
npx godpowers outcome start|check|stop …
```

`packages/mcp` gains read-only tools alongside `status`/`next`/`gate_check`
(same `runtime.requireRuntime('evidence'|'quarterback')` bridge, all
`readOnlyHint:true`): `work_report`, `route`, `verification_history`. Mutating
verification stays on the CLI/orchestrator path, matching Godpowers' rule that
the MCP is a read-only veneer.

### 4.6 Target `.godpowers/` layout (additions marked NEW)

```
.godpowers/
  state.json                 # +verification.commands reliably populated (rollup)
  intent.yaml
  PROGRESS.mdx                # generated view (unchanged)
  REQUIREMENTS.mdx
  ledger/                    # NEW (peer to links/)
    verifications.jsonl      # NEW append-only evidence (source of truth)
    reflections.jsonl        # NEW
    reports/<cursor>.json    # NEW report cursors
    outcomes/<slug>/{goal.json,iterations.jsonl}  # NEW
    memory.json              # NEW
    lessons/*.json           # NEW (global at ~/.godpowers/lessons)
    LEDGER-LOG.md            # NEW human-readable append log (linkage-style)
  links/ runs/ prd/ arch/ … # unchanged
```

## 5. Refactor plan (phased, each phase shippable)

- **Phase 0 — Producer, no behavior change.** Lift Mythify's Node engine into
  `lib/evidence.js`; wire `evidence.verify()` to append the ledger + roll up into
  `state.json.verification.commands` + emit `gate.pass/fail`. Add `npx godpowers
  verify`. Outcome: the records `gate.js` already reads are now reliably written.
  Nothing downstream changes yet. Lowest risk; immediately useful.
- **Phase 1 — Enforced gate everywhere.** Extend `gate.js`'s build-only evidence
  requirement to every executable-gated tier; orchestrator closes substeps via
  `evidence.canClose` -> `state.advance`. Outcome: "done" means exit-code-backed
  on all such tiers. This is the one intentional behavior change and it is the
  point.
- **Phase 2 — Quarterback.** Add `lib/quarterback.js` + `npx godpowers route`;
  orchestrator consults it at entry. Outcome: proportional ceremony + refuse-on-red.
- **Phase 3 — Loops, memory, narration.** Port outcome loops, memory, lessons,
  reflections; emit `report` to chat after each substep; add MCP read tools.
  Optional one-time importer for existing `.mythify/` ledgers.

## 6. Preserved vs changed

Preserved: 40 product agents, 120 routing defs, 44 recipes, 13 workflows, the 4-tier
model, `state.v1.json` (extended, not broken), `gate.js` read shape, `events.jsonl`,
linkage, requirements, pure-skill execution, 15-runtime install, MCP read-only
veneer, fresh-context spawning, private handoff, pause rules.

Changed: NEW `lib/evidence.js` + `.godpowers/ledger/`; NEW `lib/quarterback.js`;
`gate.js` evidence requirement extended to all gated tiers; `cli-dispatch.js`
gains `verify`/`route`/`report`/`outcome`; `GOD-ORCHESTRATOR-RUNBOOK.md` loop
consults quarterback + closes via evidence gate + emits report; `state.json`
`verification.commands` becomes engine-owned rollup; `packages/mcp` gains 3 read
tools.

## 7. Risks and decisions

- **Two routers.** Resolved by composition: `quarterback.js` calls `router.js`
  and `recipes.js`; it adds only refuse-on-red and ceremony. One quarterback.
- **Two state stores.** Resolved by rollup: the jsonl ledger is source of truth,
  `state.json.verification.commands` is derived, exactly like `state.deliverables`.
- **Unverifiable tiers.** Keep Mythify's attested-second-class. Planning tiers
  record attested + rely on artifact/have-nots; code tiers require executed.
  `gate.js` already distinguishes these strategies per tier.
- **Published surface.** `state.json` change is additive; the only behavior
  change is the gate extension (Phase 1), which is the intended outcome.
- **Honest enforcement boundary.** In a pure-skill system we cannot force the LLM
  to *run* a verifier. What the gate guarantees is that a substep **cannot reach
  `done` without an executed passing record bound to it since it went in-flight.**
  That is exactly Mythify's guarantee: no green without evidence. We close the
  "claimed-done-without-proof" hole; we do not (and cannot) compel the act of
  checking. This is the same boundary Mythify accepts.

## 8. Why this beats the alternatives considered

- Chosen path is **vendor** (see 4.2): fastest Phase 0, zero cross-repo
  coordination, fork cost contained by provenance + a re-sync script. Revisit a
  shared package only if the re-sync friction outweighs the coupling it avoids.
- vs "Godpowers calls external Mythify via MCP": no Python dependency for users,
  one state dir, no version-skew between two products.
- vs "clean-sheet third product": keeps Godpowers' maturity (120 commands, 40
  agents) and avoids second-system syndrome; reuses Mythify's already-Node engine.
- vs "leave Godpowers as-is": Godpowers' own evidence ledger stays
  producer-less and skippable, and it still cannot right-size ceremony or refuse
  on red at entry.
