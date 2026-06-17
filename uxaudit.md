# godpowers - UX Audit

> Read-only UX audit. No source, doc, or config file was changed; the only file
> written is this report. Date: 2026-06-17. Self-contained: every finding cites a
> concrete location (file:line, command, route, or named step) and states how to
> verify the fix.

---

## Snapshot

- **Product:** `godpowers` v3.13.2 - an AI development system distributed via `npx godpowers` that installs 120 `/god-*` slash commands + 40 specialist agents into AI coding tools, orchestrates an autonomous "idea to hardened production" arc (`/god-mode`), and ships a thin Node CLI (`godpowers <subcommand>`: status, next, gate, verify, surface, etc.).
- **State:** branch `main`, commit `cc7c902`+ (clean tree; published to npm).
- **Surface / product type:** a developer tool with three experience surfaces: (1) the **install + CLI** (`bin/install.js`, `lib/cli-dispatch.js`, `lib/dashboard.js`), (2) the **slash-command surface** (120 `/god-*` commands, the `/god` natural-language router, command families), and (3) the **autonomous workflow** (`/god-mode` -> `workflows/full-arc.yaml`, gated by an executed-evidence ledger). Plus the docs (`README.md`, `docs/`, `SKILL.md`). No web/mobile UI.
- **Frameworks:** Node CLI (CommonJS), Markdown skills/agents, YAML routing. No web framework.
- **Primary actor and top jobs-to-be-done:** a developer who already uses an AI coding tool (Claude Code, Codex, Cursor, ...) and wants disciplined, accountable AI-assisted delivery. Jobs: (J1) decide whether it is worth trying; (J2) install it; (J3) start a project / run the autonomous arc; (J4) check where they are and what is next; (J5) recover a stalled run; (J6) find the right command among 120.
- **Evident maturity / context of use:** a mature, heavily-engineered v3.13.2 tool that is honest about having **zero production users** (`USERS.md:7`). Used at a terminal alongside an AI coding tool. Calibrated to that bar.
- **Audit coverage:** Sampled across the three surfaces via three parallel lens passes (CLI/onboarding; content/IA; journeys/process/trust). The CLI was **run read-only** against throwaway `/tmp` projects (no global state mutated, nothing installed); the slash-command/agent behavior and the live `/god-mode` arc were **read, not run**, so workflow and routing findings about lived behavior are marked Confirmed where the code path is deterministic and Suspected where they need a live multi-agent run.
- **Exclusions:** the internal source-code quality (covered separately by `codeaudit.md`), the 40 agent prompt internals, vendored deps.

---

## Overall score

**78 / 100 - Grade C (adequate, real gaps)**

Two very different products live in one repo. The **expert/runtime experience** is excellent: the `godpowers <subcommand>` CLI has recovery-oriented errors, clean `--json`, a genuinely useful "action brief," try-before-install proof, honest degraded-host reporting, a real (not theatrical) executed-evidence gate, and an unusually candid trust posture. The **newcomer experience** is where it slips: a typo of a read-only command silently triggers a global install, a bad `--profile` crashes mid-install with a raw stack trace, the README opens with maintainer changelog prose and undefined jargon instead of a value prop, and the "just describe what you want" router misses the most common verbs ("ship it", "deploy", "fix a bug").

**Calibration:** graded as a developer + AI-agent CLI tool, not a consumer web app, so the web-only lenses (web-WCAG, mobile Forms, Core Web Vitals) are scored against their CLI equivalents (terminal-output accessibility, CLI argument handling, command latency). Default weights kept. No Critical finding, so the overall is uncapped; the four High findings hold Usability, Content, and IA below the B line.

| Dimension | Score | Grade | Weight | Verdict |
|---|---|---|---|---|
| Usability and Heuristics | 72 | C | 13% | Subcommand surface is exemplary, but the install path lets a typo become a global install and a bad profile become a stack trace. |
| Accessibility and Inclusive Design | 86 | B | 13% | Plain-text CLI output with `+`/`!`/`x` symbol prefixes (not color-only); scored as terminal accessibility. |
| User Journeys and Flows | 82 | B | 11% | Disk-as-truth state and dual progress views make a long autonomous run legible; resume naming is split. |
| Process and Workflow Efficiency | 79 | C | 11% | The executed-evidence gate adds real value; the strongest freshness gate (`canClose`) is documented but not wired into the close path. |
| Interaction and Visual Design | 84 | B | 9% | Clean dashboard/action-brief rendering; `next` repeats the recommendation three times. |
| Information Architecture and Navigation | 68 | D | 8% | Strong scaffolding (router, families, ladders) over 120 commands, but the free-text router misses common verbs and misroutes them. |
| Content and UX Writing | 60 | D | 8% | Excellent micro-copy (errors, CTAs, install success) undercut by a changelog-as-intro README and undefined jargon on the highest-traffic surface. |
| Onboarding, Conversion and Engagement | 76 | C | 8% | Try-before-install proof and forward-pointing empty states are strong; the README front door and the typo-installs gap hurt first contact. |
| Forms and Input | 72 | C | 7% | Subcommand args are rigorously validated; install/profile/surface args are not. |
| Performance and Responsiveness | 90 | A | 6% | Cached recipes, single git call per dashboard, fast file ops; nothing to flag. |
| Trust, Ethics and Transparency | 90 | A | 6% | Honest USERS.md ("zero production users"), an advisory hook that admits it is advisory, degraded-host honesty, a real evidence chain, no dark patterns. |
| **Overall (weighted)** | **78** | **C** | 100% | A newcomer-onboarding pass and three install-validation fixes from a solid B. |

---

## What to fix first

Ordered: High before Medium, ties broken toward load-bearing flows and systemic patterns.

- [x] `[USE-001]` A typo'd / unknown subcommand silently falls through to the **installer** - **High, S** - `npx godpowers staus` begins a global install instead of erroring. **(RESOLVED - slice 1)**
- [x] `[USE-002]` `--profile=<bad>` throws a raw Node stack trace mid-install and leaves a partial dir - **High, S** - a validation error reaches the user as a crash, after side effects started. **(RESOLVED - slice 1)**
- [ ] `[CNT-001]` The README opens with maintainer changelog prose + undefined jargon, not a value prop - **High, M** - the most-read file buries "what / who / how to start" below version archaeology.
- [ ] `[IA-001]` The free-text `/god` router misses the most common verbs ("ship it", "deploy", "fix a bug", "check progress") - **High, M** - the product's headline promise ("just describe what you want") fails on its highest-traffic intents.
- [ ] `[IA-002]` The classifier fallback routes unmatched intents to `/god-quick` (a build task) - **Medium, S** - a confident-but-wrong route is worse than a no-match.

---

## Strengths (preserve these)

1. **TTY refusal of silent global install** (`bin/install.js:138-150`): bare `npx godpowers` in a non-TTY context refuses, exits 1, and names the exact recovery command. The single best installer decision.
2. **The action brief** (`lib/dashboard.js:312-343`): every dashboard leads with Next / Why / Readiness / Attention / Host guarantees, answering "what do I do next and why" - the hardest job for a status command. Blocker list is filtered and capped at 3.
3. **Recovery-oriented, consistent subcommand errors** (`lib/cli-dispatch.js`): `verify`/`gate`/`state`/`memory`/`outcome`/`can-close` all emit `Error: <what> requires <flag>, for example <concrete invocation>` and exit non-zero. Textbook diagnose-and-recover.
4. **`--json` is clean on the failure path** (`lib/cli-dispatch.js:272-274`): structured JSON on stdout, exit 1, no prose leakage; the `outcome check` notice writes to **stderr** specifically so it cannot corrupt `--json` (`cli-dispatch.js:494-501`).
5. **Try-before-install proof path** (`lib/quick-proof.js:15-16`): `quick-proof` runs against a shipped fixture with zero install, so the README "Ten Minute Proof Path" (ahead of Install) is real, not aspirational.
6. **Honest degraded-host reporting** (`lib/host-capabilities.js:109-150`): distinguishes `full`/`degraded`/`unknown` and names the first concrete gap. The opposite of status theater.
7. **Disk-as-truth state** (`lib/state.js`, `lib/checkpoint.js:8-14`): `state.json` is authoritative and CHECKPOINT.md is explicit "context-rot protection," so a fresh session re-orients. Right architecture for a long autonomous run.
8. **The evidence gate is real, not a sticker** (`lib/evidence.js:274-315`, `lib/gate.js:277-325`): `verify` runs a real subprocess, records the true exit code into `state.json`, and the tier gate requires a passed command and zero fails for build/deploy/harden. You cannot close on prose.
9. **Honest USERS.md** (`USERS.md:7`): "Currently zero recorded production users. Be honest." No adoption overclaim.
10. **The advisory hook admits it is advisory** (`hooks/pre-tool-use.sh:1-11`, `SECURITY.md:51-56`): calls itself a "typo guard, NOT a security boundary, easily bypassed." A rare hook that does not pretend to be a sandbox.
11. **The `/god` router as a real front door** (`skills/god.md`): high-confidence -> propose, mid-confidence -> confirm, no-match -> fall back to `/god-next`; "make me a sandwich" degrades gracefully.
12. **Command families + decision ladders** (`lib/command-families.js`): 11 user-question-framed families plus escalation ladders give real information scent over 120 commands.

---

## Systemic patterns (root causes)

### PATTERN-A - The install/surface argument surface lacks the validation the subcommand surface has
The `godpowers <subcommand>` path validates every required arg with example-bearing messages and non-zero exits, but the install path lets a typo become an install, a bad profile become a stack trace, and a bad surface-runtime become a confident plan.
- **Members:** USE-001, USE-002, USE-003.
- **Root fix:** push install-time validation (unknown bare token -> "unknown command"; unknown `--profile`; unknown surface `--runtime`) to the same standard `verify`/`gate`/`state` already meet, reusing the existing `error()` + `process.exit(1)` helpers and the existing `Unknown runtime` message. All three are Effort S.

### PATTERN-B - The highest-traffic onboarding surfaces are written for maintainers, not newcomers
The README, `--help`, and the free-text router all assume insider vocabulary or omit the newcomer's first move.
- **Members:** CNT-001, CNT-002, CNT-003, CNT-004, IA-001, IA-002, CNT-005.
- **Root fix:** one newcomer-onboarding pass: rewrite the README top fold to value-prop -> install -> first command (push version prose to CHANGELOG, which is already linked); gloss or link first-use jargon; group `--help` into Common vs Advanced; broaden recipe intent-keywords for common verbs and stop the classifier defaulting to `/god-quick`. The runtime already has the right micro-patterns (the install-success copy, the action brief); apply them to first contact.

---

## Findings

### [USE-001] A typo'd or unknown subcommand silently triggers a global install - RESOLVED (slice 1)
- Status: FIXED (slice 1) - `bin/install.js main()` now rejects a bare leading token that is not a known command (`Unknown command: <x>` + exit 1) before the install path. Tested in `scripts/test-install-smoke.js` (typo writes no skills, exits 1).
- Severity: High | Confidence: Confirmed | Effort: S | Dimension: Usability and Heuristics
- Location: `lib/installer-args.js:216-231` (parse loop), `bin/install.js:209-222` (`main`)
- Evidence: Only exact members of the `COMMANDS` set become `opts.command`. Any other bare leading token (`stat`, `staus`, `verfy`) is neither a command nor a recognized flag, so it falls through to the install path. Verified: `npx godpowers staus` prints the banner then begins installing Godpowers (or, in non-TTY, hits the silent-install refusal) rather than reporting an unknown command.
- Impact: A typo of a read-only inspection command triggers a global filesystem install into the user's AI-tool config dirs. This is the highest-impact usability gap: it violates error prevention and surprises in exactly the wrong direction (a read intent mutates global state).
- Recommendation: in `main`/`parseArgs`, when the first token looks like a subcommand (a bare non-flag token that is not a known runtime) but is not in `COMMANDS`, emit `Unknown command: <x>. Run npx godpowers --help for usage.` and exit 1; optionally suggest the nearest match.
- Verify the fix: `node bin/install.js staus </dev/null; echo $?` prints an unknown-command error and exits 1, not the installer banner.
- Related: PATTERN-A.

### [USE-002] `--profile=<bad>` throws a raw stack trace mid-install and leaves a partial directory - RESOLVED (slice 1)
- Status: FIXED (slice 1) - the profile is validated via `normalizeProfiles` before any filesystem write; a bad value is a clean one-line error with the valid list and exit 1, no stack trace, no partial `.claude`. Tested in `scripts/test-install-smoke.js`.
- Severity: High | Confidence: Confirmed | Effort: S | Dimension: Usability and Heuristics
- Location: `lib/install-profiles.js:152-153` (`throw new Error`), reached via `lib/installer-core.js:139`; unguarded in `bin/install.js:168-199` (`runInstall`)
- Evidence: `npx godpowers --claude --local --profile=bogus` prints the banner, prints `Installing for Claude Code ...`, creates `.claude/skills/`, then dumps a full Node stack trace (`Error: Unknown install profile: bogus ... at normalizeProfiles ...`) via uncaught exception. A partial `.claude/skills` directory is left behind.
- Impact: the error content is fine, but it reaches the user as a crash after side effects have started, the opposite of every other error surface in the tool. Looks like a bug, not a validation message, and leaves partial state.
- Recommendation: validate the profile in `parseArgs` (or at the top of `runInstall`, before any `ensureDir`/`installForRuntime`) and emit `error('Unknown install profile: bogus. Valid: core, builder, maintainer, suite, full')` + `process.exit(1)`. The valid list is already in `PROFILE_DESCRIPTIONS`.
- Verify the fix: `node bin/install.js --claude --local --profile=bogus </dev/null 2>&1` prints one clean `x Unknown install profile ...` line, no stack trace, and creates no `.claude` dir.
- Related: PATTERN-A.

### [CNT-001] The README opens with maintainer changelog prose, not a value proposition
- Severity: High | Confidence: Confirmed | Effort: M | Dimension: Content and UX Writing
- Location: `README.md:33-77` (especially 33-61)
- Evidence: The first full screen after the tagline is release-note prose ("Version 3.13.2 is a maintenance release that drives a third self-audit to zero: the `*-sync` modules now share one check-builder, the coverage gate enforces a per-file floor, the corrupt-state error is typed ...") plus undefined terms (`*-sync`, "MCP module loader", "Mythify fusion", "quarterback", "have-nots"). The actual value prop (lines 8-13) is good but is immediately buried.
- Impact: the most-read file leads with the least relevant content for its largest audience (newcomers deciding whether to try it). A reader looking for "what is this / who is it for / how do I start" hits version archaeology and jargon, the classic high-bounce front door.
- Recommendation: move version-history prose to `CHANGELOG.md`/`RELEASE.md` (already linked at README:65-66). Keep the top fold to: tagline -> two-sentence what/who -> install -> first command -> links. Target: a runnable command within one screen.
- Verify the fix: the first 40 lines of README contain no version numbers except the badge, and "Install" / `/god-mode` appears above the fold.
- Related: PATTERN-B, CNT-002, CNT-003.

### [IA-001] The free-text router misses the most common verbs (RESOLVED - slice 3)
- Severity: High | Confidence: Confirmed | Effort: M | Dimension: Information Architecture and Navigation
- RESOLVED (slice 3): broadened `intent-keywords` for the high-traffic recipes (bug-no-urgency: "fix a bug"/"fix bug"/"bug"; release-maintenance: "ship it"/"ship"/"release"/"deploy"/"deploy this"; whats-done: "check progress"/"progress"). Regression test in `scripts/test-recipes.js` asserts each common verb returns its topical recipe with score >= 5. Verified empirically: fix a bug -> bug-no-urgency (25), ship it -> release-maintenance (20), deploy -> release-maintenance (15), release -> release-maintenance (10), check progress -> whats-done (20).
- Location: `lib/recipes.js` (`matchIntent`), `routing/recipes/*.yaml` (`intent-keywords`)
- Evidence: empirical `matchIntent()` tests returned NO recipe match for "fix a bug", "ship it", "deploy", "release", and "check progress"; "production is down" also missed (the recipe lists "production down"/"fix production" but not the "X is Y" variant). The matcher does literal phrase matching, so bare verbs and natural phrasings fall through.
- Impact: the router's headline promise is "just describe what you want" (the README invites `/god production is broken`, "ship it"), yet the most common verbs miss. A miss then falls to the classifier, which misroutes (IA-002). Dedicated `/god-fix`/`/god-ship` commands cover these, but only if the user already knows to type them, defeating the router.
- Recommendation: broaden `intent-keywords` in the high-traffic recipes to include bare verbs and "X is Y" variants ("deploy", "release", "ship it", "production is down/broken/failing"); add a substring/stemming pass so "fix a bug" hits the bug recipe.
- Verify the fix: re-run the intent table; each common intent returns a match score >= 5.
- Related: PATTERN-B, IA-002.

### [USE-003] `surface --runtime=<bad>` accepts a nonexistent runtime and recommends applying to it - RESOLVED (slice 1)
- Status: FIXED (slice 1) - `runSurfaceCommand` validates `--runtime` against `runtimeKeys()` and emits `Unknown runtime: <x>` + exit 1 (JSON-aware) instead of rendering a `Path: null` plan. Tested in `scripts/test-cli-dispatch.js`.
- Severity: Medium | Confidence: Confirmed | Effort: S | Dimension: Usability and Heuristics
- Location: `lib/cli-dispatch.js:67-96` (`runSurfaceCommand`)
- Evidence: `npx godpowers surface --profile=builder --runtime=bogus --dry-run` prints `- bogus: current unknown, selected 43 commands / Path: null` and then a Next-commands line literally recommending `godpowers surface ... --bogus --global --apply: Apply this profile to bogus.` The install path correctly rejects `--runtime bogus` (`x Unknown runtime: bogus`); `surface` has no such guard.
- Impact: confident, actionable-looking guidance for an impossible target (a runtime that does not exist), with `Path: null`. Mild theater: help that cannot succeed.
- Recommendation: validate surface runtime targets against `runtimeKeys()` and emit the same `Unknown runtime: <x>` error + exit 1 the installer already uses.
- Verify the fix: `surface --profile=builder --runtime=bogus --dry-run` errors instead of rendering a plan with `Path: null`.
- Related: PATTERN-A.

### [USE-004] `status --full` reports "Phase: Complete / Step: Complete" on an uninitialized project (RESOLVED - slice 2)
- Severity: Medium | Confidence: Confirmed | Effort: S | Dimension: Usability and Heuristics
- RESOLVED (slice 2): `lib/dashboard.js` full render now prints `Phase: not initialized` / `Step: not initialized` when `state === 'not initialized'`, suppressing the tier/step suffixes. Verified: `status --full` on an empty project shows no "Complete" in the Phase/Step lines.
- Location: `lib/dashboard.js:39-54` (`currentPhase(null)` defaults to `'Complete'`), rendered at `dashboard.js:391-392`; not-initialized branch `dashboard.js:245-271`
- Evidence: `status --full` on a project with no `.godpowers/` prints `State: not initialized` and, two lines later, `Phase: Complete` / `Step: Complete`. Directly contradictory. The brief view hides it (omits Phase/Step), so it bites only users who ask for detail.
- Impact: a visibility-of-status failure that tells a new user their uninitialized project is "Complete," eroding trust in the dashboard exactly when someone inspects closely.
- Recommendation: when `state` is `'not initialized'`, render Phase/Step as `not initialized`/`n/a`, not `Complete` (special-case in `render`, or give `currentPhase(null)` a neutral default).
- Verify the fix: `status --full` on an empty project contains no "Complete" in the Phase/Step lines.
- Related: none.

### [CNT-002] Undefined internal jargon in user-facing prose
- Severity: Medium | Confidence: Confirmed | Effort: S | Dimension: Content and UX Writing
- Location: `README.md` and `docs/reference.md` (e.g. README:383 ships "/god-audit | Score artifacts against have-nots"); terms: "have-nots", "quarterback", "arc", "Pillars", "Mythify fusion", "bluefield"
- Evidence: these terms appear before (or without) definition; `docs/concepts.md` exists but is not reached first. `SKILL.md:194` defines a plain-language substitution table ("arc" -> "project run", "tier" -> "phase") but it governs runtime spoken output, not the static docs (CNT-003 covers the leak).
- Impact: forces decode-or-leave on a newcomer. "have-nots" especially is internal QA vocabulary that should not appear in a command's one-line description.
- Recommendation: gloss or link each first use (`docs/concepts.md#term` or a 4-word inline gloss); apply the SKILL.md §12 substitution table to README and reference as a one-time copy pass.
- Verify the fix: grep README for `have-nots|quarterback|bluefield`; each first occurrence is defined inline or linked.
- Related: PATTERN-B, CNT-003.

### [CNT-003] README is wall-of-text dense (~640 lines, long unbroken paragraphs)
- Severity: Medium | Confidence: Confirmed | Effort: M | Dimension: Content and UX Writing
- Location: `README.md` (e.g. 33-61 is effectively one block; 299-350 maintainer-validation prose)
- Evidence: heavy nominalization ("Strict release readiness remains fail-closed", "delegated release checks to cover root docs, docs, agents, skills, routing ...") and long paragraphs make it read like spec prose, not a scannable README.
- Impact: scannability is the primary README job; this reads as reference material, raising the cost of every first visit.
- Recommendation: cap top-half paragraphs at three sentences; convert "covers X, Y, Z" enumerations to lists; move maintainer-validation sections below the user-facing fold or into CONTRIBUTING.
- Verify the fix: no paragraph in the top half exceeds three sentences.
- Related: PATTERN-B.

### [CNT-004] `npx godpowers --help` is a flat command + flag dump with no prioritization
- Severity: Medium | Confidence: Confirmed | Effort: S | Dimension: Content and UX Writing
- Location: `bin/install.js:33-136` (`showHelp`)
- Evidence: ~30 commands and ~30 flags are listed at equal weight; the 18 ledger/evidence commands (`verify`, `can-close`, `route`, `report`, `reflect`, `memory`, `lesson`, `outcome`, `import-ledger`) appear alongside the 3-4 a newcomer needs. The install-success output (`install.js:187-197`) does prioritize well (suggests only `/god, /god-plan, /god-status, /god-mode`); `--help` does not mirror it.
- Impact: a newcomer running `--help` cannot tell the commands they need from the ones they do not.
- Recommendation: group the list into "Common" (status, next, demo, quick-proof, surface, install) and "Advanced (ledger/evidence)", mirroring the install-success prioritization.
- Verify the fix: `--help` has a "Common commands" subsection of <= 6 items above the advanced ones.
- Related: PATTERN-B.

### [IA-002] The classifier fallback misroutes unmatched intents to `/god-quick` (RESOLVED - slice 3)
- Severity: Medium | Confidence: Confirmed | Effort: S | Dimension: Information Architecture and Navigation
- RESOLVED (slice 3): `classifyWorkSize` now returns `null` when there is no small-coding-task signal (instead of defaulting to `/god-quick`), so an unmatched intent falls back to the state-driven `/god-next` rather than being mis-sized as a small TDD task. An explicit `quick|small|tdd|slice|minor|chore|refactor` signal preserves the genuine `/god-quick` case. Regression test in `scripts/test-command-families.js` asserts `classifyWorkSize('ship it')`, `('check progress')`, and `('deploy this')` all return null.
- Location: `lib/command-families.js` (`classifyWorkSize`)
- Evidence: `classifyWorkSize()` defaults anything unmatched to `/god-quick`. Tests: "ship it" -> `/god-quick`, "check progress" -> `/god-quick`, "deploy this" -> `/god-quick`. So when a recipe miss (IA-001) falls through, "ship it" is classified as a small TDD coding task, the opposite of its meaning.
- Impact: a confident-but-wrong route is worse than a no-match; the user may follow it. "check progress" should reach `/god-progress`, "ship it" `/god-ship`.
- Recommendation: have `classifyWorkSize` return null when no signal matches (letting `/god` fall back to state-driven `/god-next`); add progress/ship/deploy intent keywords so they classify correctly.
- Verify the fix: `classifyWorkSize("ship it")` and `("check progress")` no longer return `/god-quick`.
- Related: IA-001, PATTERN-B.

### [IA-003] Several `/god-*` command names are implementation vocabulary, not user vocabulary
- Severity: Medium | Confidence: Confirmed | Effort: M | Dimension: Information Architecture and Navigation
- Location: `skills/god-*.md` names/descriptions; e.g. `/god-smite` ("Hard reset of node-style dependency cache"), `/god-intel`, `/god-org-context` ("Bluefield support"), `/god-reconcile` vs the existing `/god-sync`, and four overlapping "is this good?" verbs (`/god-standards`, `/god-lint`, `/god-audit`, `/god-hygiene`)
- Evidence: a user wanting to clear caches will not find `/god-smite`; `/god-reconcile` ("Comprehensive reconciliation across all impacted artifacts") overlaps `/god-sync`; the four quality verbs differ meaningfully (the verification ladder explains it) but the names do not carry the distinction. These leaf names are what users see in completion CTAs and `/god-help all`.
- Impact: violates one-term-per-concept and user-vocabulary; the families/ladders compensate, but the names still mislead on findability.
- Recommendation: for the worst offenders, lead the description's first four words with the plain intent ("`/god-smite`: Clear the dependency cache (hard reset)") and resolve the `/god-reconcile` vs `/god-sync` overlap; do not rename the playful brand wholesale, just the names that actively mislead.
- Verify the fix: for each flagged command, the description's first sentence leads with the user-intent verb; `/god-help search cache` surfaces `/god-smite`.
- Related: PATTERN-B.

### [IA-004] No `docs/` index; user-facing and internal docs are mixed with no signposting
- Severity: Medium | Confidence: Confirmed | Effort: S | Dimension: Information Architecture and Navigation
- Location: `docs/` (33 `.md` files, no `docs/README.md` or table of contents)
- Evidence: internal docs (`phase-4-state-read-inventory.md`, `surface-contraction.md`, `repo-surface-sync.md`) sit beside user-facing `getting-started.md` with no separation; cross-link density is thin (only a few docs link to getting-started/reference). A user landing in `docs/` via the GitHub file browser has no map.
- Impact: a reader cannot tell which docs are for them; the maintainer docs dilute the user docs.
- Recommendation: add `docs/README.md` with a "Start here" section (getting-started, quick-proof, concepts, reference) and an "Internal / maintainer" section for the rest.
- Verify the fix: `docs/README.md` exists and links every user-facing doc under "Start here".
- Related: none.

### [PROC-001] The strictest close gate (`canClose` freshness) is documented as the discipline but not wired into the close path
- Severity: Medium | Confidence: Confirmed | Effort: M | Dimension: Process and Workflow Efficiency
- Location: `lib/evidence.js:548-616` (`canClose`, self-documented at 551-553: "It does NOT mutate state and is NOT yet wired into gate.js or the close path"); enforced gate at `lib/gate.js:277-325`
- Evidence: two notions of "can this step close" exist. `gate.js`'s `checkExecutedEvidence` is mechanically enforced by `npx godpowers gate`. `evidence.canClose` is a richer "since-in-flight" freshness predicate (stale green from a prior attempt cannot close a re-opened step), but it is enforced only by agent instruction (`GOD-ORCHESTRATOR-RUNBOOK.md:408`), not by the gate. Its only caller is the manual `can-close` CLI command.
- Impact: the strongest anti-fakery property (freshness-bound evidence) depends on the agent remembering to run `can-close`, not on the gate. A drifted agent could close a re-opened substep on a stale prior pass that `gate.js` alone accepts, the gap between the gate that is described and the gate that runs.
- Recommendation: either wire the since-in-flight freshness check into `gate.js`'s `checkExecutedEvidence` (compare command `ranAt` to the substep's `updated` timestamp), or, if the un-wiring is intentional for now, relabel `can-close` in the docstring and runbook as "advisory discipline, not a mechanical gate" (the same honesty the hook already models).
- Verify the fix: `grep -rn 'canClose' lib/gate.js` is currently empty; re-open a build substep after a prior pass and confirm `gate --tier=build` and `can-close --substep tier-2.build` can disagree, then no longer disagree after the fix.
- Related: none.

### [CNT-005] "Readiness: ready" is reported when the only action is initial setup (RESOLVED - slice 2)
- Severity: Low | Confidence: Confirmed | Effort: S | Dimension: Content and UX Writing
- RESOLVED (slice 2): the brief and full renders now show `Readiness: no blockers` instead of the overloaded `ready` (the `confidence` data field is unchanged for JSON consumers). Verified: brief status on an empty project no longer asserts "ready" as the readiness headline.
- Location: `lib/dashboard.js:336-342` (`actionBrief`: `confidence: blockers.length === 0 ? 'ready' : 'needs attention'`)
- Evidence: on an uninitialized project the brief reads `Next: /god-init` with `Readiness: ready`; `quick-proof` shows `Readiness: ready` even with `Host gaps: 2`. "Ready" is overloaded: it means "no proactive blockers," not "ready to ship."
- Impact: a skimming user may read the project as further along than it is.
- Recommendation: rename the headline to `Blockers: none` / `Blockers: N`, or derive a `setup-needed` state when `next.command` is an init/setup command.
- Verify the fix: brief status on an empty project does not assert "ready" as the readiness headline.
- Related: none.

### [CNT-006] The `report` empty state is a soft dead-end (RESOLVED - slice 2)
- Severity: Low | Confidence: Confirmed | Effort: S | Dimension: Content and UX Writing
- RESOLVED (slice 2): `lib/work-report.js` render now appends `Run "npx godpowers verify <command>" or "reflect --action ..." to add records.` after both empty-state messages. Verified: `report` on an empty project names the commands that create records.
- Location: `lib/cli-dispatch.js:334-343`, `lib/work-report.js` render
- Evidence: `npx godpowers report` on a project with no ledger prints `Nothing new since the last report.` and exits 0, with no pointer to what produces report entries (`verify`, `reflect`). Most other empty states in the tool offer a next step; this one stops.
- Impact: a new user who runs `report` early gets a flat "nothing" with no breadcrumb.
- Recommendation: when empty, add `No verification or reflection records yet. Run 'npx godpowers verify ...' or 'reflect ...' to populate the ledger.`
- Verify the fix: `report` on an empty project names at least one command that creates records.
- Related: none.

### [IXD-001] `next` prints the recommended command three times in one screen (RESOLVED - slice 2)
- Severity: Low | Confidence: Confirmed | Effort: S | Dimension: Interaction and Visual Design
- RESOLVED (slice 2): `runDashboardCommand` no longer appends the third "Suggested next command" block; the recommendation now appears at most twice (Action brief Next + Next Recommended). Verified: `next` on an empty project prints zero "Suggested next command" lines.
- Location: `lib/cli-dispatch.js:34-39` (`runDashboardCommand` appends a "Suggested next command" block after a dashboard that already shows it under "Action brief: Next" and "Next: Recommended")
- Evidence: `npx godpowers next` shows the same `/god-init` three times in ~18 lines.
- Impact: cosmetic signal dilution that undercuts the otherwise-tight dashboard.
- Recommendation: drop the appended block for `next` (the rendered dashboard already answers it), or have `next` render only the action brief + one suggested command.
- Verify the fix: `next` states the recommended command at most twice.
- Related: none.

### [JRN-001] Resume entry points are split and the README implies `--yolo` is required
- Severity: Low | Confidence: Confirmed | Effort: S | Dimension: User Journeys and Flows
- Location: `skills/god-mode.md:20-22` (self-resume from disk), `routing/god-resume-work.yaml` (keys off `HANDOFF.md`), `README.md:430-431`
- Evidence: a user returning to a paused run faces three plausible re-entries (`/god-mode`, `/god-resume-work`, `/god-status`/`/god-next`); `/god-mode` resume reads CHECKPOINT.md while `/god-resume-work` reads a different file (HANDOFF.md); and README:430 ("If `.godpowers` state already exists, `/god-mode --yolo` resumes from disk") implies resume needs `--yolo`, which is misleading (`skills/god-mode.md:20-22` resumes on any `/god-mode` when CHECKPOINT exists).
- Impact: mild re-entry ambiguity at the highest-context-loss moment. Not a dead-end (all paths converge via `/god-next`), but friction.
- Recommendation: clarify in README that plain `/god-mode` resumes from disk (not `--yolo`-only), and have CHECKPOINT.md's "new session" block name the single canonical arc-resume command, distinct from `/god-resume-work` (for a manual `/god-pause-work` handoff).
- Verify the fix: README:430 and `checkpoint.js:194-202` disambiguate arc-resume vs handoff-resume.
- Related: none.

### [JRN-002] Progress percentage can overstate shipped reality when tiers are skipped
- Severity: Low | Confidence: Suspected | Effort: S | Dimension: User Journeys and Flows
- Location: `lib/state.js:364-385` (`progressSummary`), `lib/dashboard.js:39-53`
- Evidence: progress % is `completed / total` substeps, and `skipped`/`not-required` count as complete (`state.js:16`). A run that skipped several tiers shows a high % that overstates how much product exists. The README mitigates by separating "workflow progress" from "deliverable progress" (`/god-progress`), but that needs a second command. Marked Suspected because confirming the inflation needs a live run with skipped tiers.
- Impact: a user glancing at "85%" may over-read shipped reality.
- Recommendation: when any tier is `skipped`, annotate the dashboard progress line ("85% workflow progress, 2 tiers skipped"); the data is already in `summarizeTiers`.
- Verify the fix: set two tier-3 substeps to `skipped`, run `status`, confirm the % is annotated rather than silently inflated.
- Related: none.

### [TRU-001] SECURITY.md promises a 7-day acknowledgment SLA the project may not meet
- Severity: Low | Confidence: Confirmed | Effort: S | Dimension: Trust, Ethics and Transparency
- Location: `SECURITY.md:21` ("Acknowledgment within 7 days", "Assessment within 14 days") vs `SECURITY.md:111` ("fix-to-disclosure within 90 days")
- Evidence: a hard 7-day ack SLA on a pre-launch, effectively solo-maintainer project (per USERS.md) is an over-promise that erodes trust if missed.
- Impact: a reporter who does not hear back in 7 days distrusts the whole policy.
- Recommendation: soften to "best-effort acknowledgment, typically within 7 days," matching the honest tone of USERS.md and the advisory hook.
- Verify the fix: SECURITY.md:19-24 no longer states a hard SLA.
- Related: none.

### [TRU-002] "15 first-class runtimes" headline outruns the honest "depends on the tool" table
- Severity: Low | Confidence: Suspected | Effort: S | Dimension: Trust, Ethics and Transparency
- Location: `README.md:618` ("15 first-class runtimes"), `README.md:131` ("everything (15 runtimes)") vs `README.md:182-190` (Runtime Expectations table: only Claude Code and Codex are reference-grade; the other 13 are "depends on the tool")
- Evidence: the Runtime Expectations table is commendably honest, but the "15 first-class runtimes" headline reads as parity, while the very next table says 13 of 15 are conditional. Marked Suspected pending whether real users over-expect from the headline.
- Impact: a skimming reader could over-expect host-native behavior on the 13 non-reference tools.
- Recommendation: adjust the headline to "15 supported runtimes (2 reference-grade: Claude Code, Codex)" so the strong claim and the honest table agree at a glance.
- Verify the fix: README:618 and README:184-186 agree on the parity claim.
- Related: none.

---

## Dimension notes

- **Usability (72):** the subcommand surface is exemplary (Strengths 2-4), but PATTERN-A (USE-001 typo->install, USE-002 profile crash, USE-003 surface bad runtime) and USE-004 (Complete on uninit) are real install-surface gaps, two of them High.
- **Accessibility (86):** scored as terminal accessibility - plain text, `+`/`!`/`x` symbol prefixes (not color-only), CI-enforced ASCII repo-wide. No findings; the deduction reflects a calibrated CLI read, not a web WCAG pass.
- **User Journeys (82):** the long autonomous run is legible (disk-as-truth, dual progress, CHECKPOINT pin); JRN-001 (resume naming) and JRN-002 (skip inflation) are the dips.
- **Process (79):** the executed-evidence gate is genuine value (Strength 8); PROC-001 (the unwired `canClose` freshness gate) is the one real gap, flagged by the code itself.
- **Interaction (84):** clean dashboard/action-brief rendering; IXD-001 (triple-printed next) is the lone nit.
- **Information Architecture (68):** strong scaffolding (router, families, ladders) but the free-text router - the headline promise - misses common verbs (IA-001) and misroutes them (IA-002), plus jargon command names (IA-003) and no docs index (IA-004).
- **Content (60):** excellent micro-copy undercut by the changelog-as-intro README (CNT-001), jargon (CNT-002), density (CNT-003), and a flat `--help` (CNT-004); this is the weakest dimension and the biggest newcomer drag.
- **Onboarding (76):** try-before-install proof and forward-pointing empty states are strong, but the README front door (CNT-001) and the typo-installs gap (USE-001) hurt first contact.
- **Forms and Input (72):** subcommand args are rigorously validated; install/profile/surface args are the gap (PATTERN-A).
- **Performance (90):** cached recipes, one git call per dashboard, fast file ops; nothing to flag.
- **Trust (90):** honest USERS.md, advisory hook, degraded-host honesty, a real evidence chain; only the SLA wording (TRU-001) and the runtime-parity headline (TRU-002) are calibration nits.

---

## Remediation plan

- **Quick wins** (High/Critical, Confirmed, S): USE-001, USE-002 (close PATTERN-A's two High items in one validation pass; USE-003 rides along).
- **Plan now** (suggested order): USE-001 -> USE-002 -> USE-003 (PATTERN-A) -> CNT-001 -> CNT-004 -> IA-001 -> IA-002 (PATTERN-B, the newcomer pass) -> USE-004 -> PROC-001 -> IA-003 -> IA-004.
- **Verify first** (Suspected, need a live run): JRN-002 (skip inflation), TRU-002 (parity over-expectation).
- **Backlog** (Low): CNT-005, CNT-006, IXD-001, JRN-001, TRU-001, IA-005.

---

## Scope and limitations

- The CLI was **run read-only** (status, next, surface, verify, report, gate against throwaway `/tmp` projects; nothing installed, no global state mutated). The **slash-command and `/god-mode` arc behavior were read, not run** - the routing/classifier findings (IA-001, IA-002) were confirmed by directly exercising `matchIntent`/`classifyWorkSize`, but the lived multi-agent arc (PROC-001's drift scenario, JRN-002's skip inflation) is Suspected and needs a live run to confirm frequency/impact.
- Coverage was sampled across the three surfaces, weighted to the flows the most users touch (install, status/next, the `/god` router, the README front door). The 120 command prompts and 40 agent internals were assessed by name/description and routing, not read line-by-line.
- **Assumed persona:** a developer adopting godpowers via an AI coding tool, at a terminal. If the dominant real entry is instead an experienced user who already knows the command set, the Content/IA newcomer findings (CNT-001, IA-001) matter less and the runtime-CLI polish matters more; the score would rise. Confirm with onboarding funnel data if available.

---

## How to use this report (for the acting agent)

1. Triage by severity and confidence. Confirmed Critical and High are safe to act on now, in the order in "What to fix first". Re-verify any Suspected finding (run the product, run the check, or test with users) before changing anything.
2. Fix root causes first; prefer systemic patterns (PATTERN-A, PATTERN-B) over individual leaves.
3. Preserve the strengths; do not flatten them while fixing other issues (especially the action brief, the recovery-oriented errors, the evidence gate, and the honest trust framing).
4. Confirm the stated assumption on Likely findings before acting.
5. One finding, one change, verified: after each fix run its "Verify the fix" step; keep changes atomic and traceable to the finding ID.
6. Do not widen scope silently; note adjacent issues rather than sprawling into a redesign.
7. Re-run the audit to measure progress; confirm findings are resolved, not relocated, and watch for regressions in the strengths.
