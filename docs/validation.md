# Validation System

There are three genuinely different ways a project can be wrong, so Godpowers
checks along three independent axes.

A document can be **badly formed**: missing fields, wrong shape, generic filler.
A document can be well-formed and **lying**: it describes a system that no longer
matches the code. And code can pass every test and still **not work** when a real
browser loads it.

No single check catches all three. Running one and calling it validated is how
projects end up confidently broken.

| Axis | What it catches | When it runs | Speed |
|---|---|---|---|
| **Static** | Document-level have-nots, format violations, missing fields | Every artifact write; `/god-lint` | < 1s |
| **Linkage** | Drift between artifacts and code; orphans; cross-artifact impact | Every code-touching workflow; `/god-scan`; `/god-sync` | < 5s |
| **Runtime** | Rendered styles vs design tokens; PRD acceptance flows; real-DOM contrast | `/god-test-runtime`; `/god-launch` gate | 30s - 2min |

They are ordered by cost. Static runs constantly because it is nearly free.
Runtime runs at gates because it is not.

The rest of this page is the detailed maintainer view of each axis.

| Axis | What it catches | When it runs | Speed |
|---|---|---|---|
| **Static** | Document-level have-nots, format violations, missing fields | Every artifact write; `/god-lint` | < 1s |
| **Linkage** | Drift between artifacts and code; orphans; cross-artifact impact | Every code-touching workflow; `/god-scan`; `/god-sync` | < 5s |
| **Runtime** | Rendered styles vs design tokens; PRD acceptance flows; real-DOM contrast | `/god-test-runtime`; `/god-launch` gate | 30s - 2min |

## Static axis

The lint layer. Mechanical checks against the catalog of failure modes.

### Repository gate checks

- [DECISION] `npm test` delegates to `scripts/run-tests.js` so the full test
  sequence is maintained as data instead of a long package script.
- [DECISION] `scripts/run-tests.js` includes the skill validator, static
  checks, YAML parser coverage, route checks, repo surface checks, installer
  smoke tests, Mode D tests, dogfood tests, package extension tests, and the
  integration smoke test.
- [DECISION] `scripts/static-check.js` asserts the root manifest's exact
  top-level key set and that `dependencies`, `optionalDependencies`, and
  `peerDependencies` are all empty, which is the mechanical enforcement of ARCH
  ADR-002. The previous guard read only `dependencies`, so a production
  dependency declared as optional or peer passed every check in the repository.
- [DECISION] The roadmap's evidence hashes cover its genuine upstream inputs
  (PRD, ARCH, stack decision) and not `package.json`, which the roadmapper never
  reads. Hashing it asserted a derivation that does not exist and made every
  pull request touching a root dependency structurally red, because Dependabot
  cannot run `npm run version:sync`.
- [DECISION] `scripts/test-dependency-overrides.js` fails the suite when an npm
  `override` is absent from the lockfile, carries no advisory id in
  `overrides-rationale`, or is no longer load-bearing because every parent that
  declares the package already permits the resolved version. An override that
  changes nothing is a permanent major-version ceiling, and Dependabot reads
  overrides: one that caps resolution below a fix produces no pull request, only
  an error against the alert.
- [DECISION] `.github/workflows/security-audit.yml` runs `npm audit` on a daily
  cron in both the production and full-tree scopes. `npm run test:audit` audits
  with `--omit=dev` and runs only on push and pull request, so without the cron
  a development-scope advisory could never fail any gate and a production one
  waited for the next push.
- [DECISION] `npm run lint` delegates to `scripts/static-check.js`.
- [DECISION] `scripts/static-check.js` runs `node --check` across JavaScript
  files and verifies the release gate still includes parser coverage and
  installer helper extraction.
- [DECISION] `scripts/static-check.js` verifies the full release runner still
  includes generated state view and state advance mutation regression tests,
  and verifies the state view owner covers the Godpowers-owned per-tier
  `STATE.md` views.
- [DECISION] `scripts/static-check.js` verifies CLI dispatch stays extracted
  in `lib/cli-dispatch.js`, `bin/install.js` re-exports the shared dispatch
  table, and `scripts/test-cli-dispatch.js` tests the executable wrapper
  against the lib implementation.
- [DECISION] `npm run coverage:lib` intentionally scopes c8 to `lib/**/*.js`
  so extracted command behavior counts toward the 90 percent lib floor while
  `bin/install.js` remains outside the lib-only ratchet.
- [DECISION] `scripts/static-check.js` rejects copied test harness boilerplate
  outside `scripts/test-harness.js`.
- [DECISION] `scripts/static-check.js` verifies async file APIs exist on
  load-bearing state, intent, and workflow plan modules.
- [DECISION] `scripts/static-check.js` verifies executable skill metadata
  source-of-truth parsing through `lib/skill-surface.js`.
- [DECISION] `scripts/static-check.js` verifies tier skills reference
  `npx godpowers gate --tier=<tier> --project=.` and tier routes declare the
  matching `standards.gate-command` metadata.
- [DECISION] `scripts/static-check.js` keeps `skills/god-mode.md` as a concise
  dispatch contract and checks that the detailed runbook lives in
  `references/orchestration/GOD-MODE-RUNBOOK.md`.
- [DECISION] `scripts/test-agent-refs.js` makes workflow `uses:
  god-agent@range` references executable by validating their SemVer ranges
  against the current agent contract.
- [DECISION] `npm run release:check` remains the maintainer command before a
  public package release because it runs the full test gate, audit gate, and
  package contents gate.

### Executable tier gates

- [DECISION] `npx godpowers gate --tier=<tier> --project=.` checks PRD,
  design, architecture, roadmap, stack, repo, build, and harden tier artifacts
  without running arbitrary project commands.
- [DECISION] Gate JSON has `{tier, verdict, artifacts, checks, findings,
  summary}` so hosts can quote exact check ids and reasons.
- [DECISION] Build gates require `.godpowers/state.json` to record exact
  verification commands that passed under `tiers.tier-2.build.verification.commands`.
- [DECISION] Harden gates fail unresolved Critical findings and blocked launch
  gates in `.godpowers/harden/FINDINGS.mdx`.
- [DECISION] `/god-mode` runs the matching gate after each tier skill returns
  and before starting downstream tier work.

### Dependency-free YAML subset

- [DECISION] Godpowers keeps runtime YAML parsing dependency-free for now.
- [DECISION] `lib/intent.parseSimpleYaml` supports the subset used by
  `intent.yaml`, routing files, workflow files, extension manifests, and
  release surface checks.
- [DECISION] The supported subset includes top-level scalars, nested objects,
  arrays of scalars, arrays of objects, quoted strings with colons or hashes,
  inline arrays with quoted commas, and literal or folded block scalars.
- [HYPOTHESIS] A production dependency such as a full YAML parser should only
  be added if a future route, workflow, or extension manifest needs YAML
  features outside this documented subset.
- [DECISION] `scripts/test-yaml-parser.js` is the regression suite for the
  supported subset.

### What it checks

Universal (apply to all artifacts):
- **U-08** em or en dash present
- **U-09** decorative emoji
- **U-02** unlabeled paragraph (no DECISION/HYPOTHESIS/OPEN QUESTION)
- **U-10** phantom reference (link to nonexistent file)
- **U-11** future-dated timestamp in body
- **U-01** generic claim (substitution test risk)
- **U-12** theater sentence pattern (advisory warning only)

#### U-12 advisory prose scan

`lib/prose-lint.js` is a pure, dependency-free scanner. It treats its input as
inert text and returns ordered findings with a rule id, line, column, excerpt,
message, and suggested review action. `lib/have-nots-validator.js` maps those
findings into universal U-12 warnings. A U-12 warning increments the warning
count but never the error count, so it does not block artifact advancement by
itself.

The scanner has seven context-sensitive sentence-pattern rules: filler, vague
attribution, stacked hedging, stock framing, inflated phrasing, empty
conclusions, and dense sentences. Matching is bounded to one finding per rule
per line. It does not ban standalone words, and a clean scan does not prove that
prose is human-authored, correct, or objectively good.

Before matching, the scanner masks opening YAML frontmatter, fenced code,
inline code, Markdown link destinations, and marked bad, avoid, or wrong
examples. It sanitizes terminal control characters from excerpts and limits
each excerpt to 160 characters. This masking is structural pattern matching,
not a complete Markdown parser, so findings remain prompts for human judgment.

`scripts/static-check.js` also scans every Markdown and MDX file under
`skills/`, `specialists/`, `agents/`, and `references/`. The checked-in baseline
is zero warnings; warning growth fails that repository self-dogfood check until
the new finding is reviewed.

Documentation and launch work share the post-draft audit in
`references/shared/VOICE.md`, then apply different output rules. Documentation
keeps engineering explanations direct and preserves exact repository names,
verified commands, runbook steps, and evidence language. Launch copy may keep
an approved founder or product voice, positioning, and channel constraints,
while operational status and engineering evidence stay direct and neutral.

PRD-specific:
- **P-04** success metric without timeline
- **P-05** success metric without measurement method
- **P-07** Scope and No-Gos section empty
- **P-08** open question without owner
- **P-09** open question without due date

ARCH-specific:
- **A-03** PRD NFR not mapped to architectural choice
- **A-14** boundary-crossing flow with no ordered interaction
- **A-15** capacity number with no input or no source for it
- **A-16** dependency with no timeout, retry stance, or degraded state

DESIGN-specific (via `lib/design-spec`):
- **D-NAME** frontmatter missing `name` field
- **D-CONTRAST** WCAG AA contrast fail on text-on-background
- **D-TOKEN-REF** unresolved `{token.path}` reference
- **D-SECTION-ORDER** sections out of canonical order
- **D-SECTION-DUP** duplicate section heading

### Mechanical vs interpretive

Of the 183 documented have-nots in `references/HAVE-NOTS.md`:
- **26 are mechanical** (regex-checkable; in `lib/have-nots-validator.js`)
- **157 are interpretive** (judgment-required; documented for human + AI review)

The mechanical 26 are caught by `/god-lint`. The interpretive checks are
the responsibility of `god-auditor` (retroactive scoring) and the
two-stage code review (`god-spec-reviewer` + `god-quality-reviewer`).

This split is deliberate: mechanical checks should never be done by
hand. Interpretive checks should never be claimed to be mechanical.

### Blast-radius safety case

Stage 2 review adds a behavioral safety case from
`references/building/BLAST-RADIUS.md` without adding another command or review
stage. Every pass states exactly one load-bearing safety fact with a falsifiable
condition, affected boundary, consequence if false, strongest evidence level,
and evidence citation.

| Level | Evidence | Review state |
|---|---|---|
| 1 | Reviewer assertion without a source | `UNPROVEN` |
| 2 | Specific source, dependency, schema, manifest, or `file:line` citation | `UNPROVEN` |
| 3 | Traced branch or consumer path that refutes one named failure path | `UNPROVEN` |
| 4 | Successful focused probe executed through `npx godpowers verify` | Proven only for the exercised path and inputs |
| 5 | Successful running, installed, process, browser, service, host, or faithful-consumer reproduction through `npx godpowers verify` | Proven only for the exercised delivery boundary |

Evidence levels are ordinal, not additive. Several citations, traces, or
agreeing reviewers cannot turn levels 1 through 3 into level 4 or 5.
`lib/impact.js`, grep, AST search, LSP references, and import graphs are
candidate generators only. `lib/impact.js` labels its output
`static-candidate`, `unproven`, with maximum level 2.

Before grading the safety fact, the reviewer records evidence or an observed
not-applicable reason for all 10 boundary classes:

1. dependency implementation
2. pinned dependency version
3. local dependency patches
4. lifecycle or ordering timing
5. serialized or public API contracts
6. database or disk-state fields
7. configuration or feature flags
8. generated or installed surfaces
9. npm package surfaces
10. cross-language consumers

Review output separates Confirmed Risks, Cleared Risks, and Unproven Claims.
Confirmed Risks and Cleared Risks require level 4 or 5 evidence. A high-impact
`UNPROVEN` claim blocks Stage 2 when failure could affect authentication or
authorization, secrets, state integrity, destructive actions, installer or
published package behavior, public or serialized contracts, or verification
ledger integrity. A lower-impact `UNPROVEN` claim remains a warning and names
one exact command, fixture, dependency trace, or runtime reproduction needed
next.

Runtime reproduction is conditional. Level 5 is required when real lifecycle,
installation, packaging, process, browser, service, host, or faithful-consumer
behavior can change the answer and an evidenced runnable target exists. When
runtime state cannot alter a deterministic local conclusion, the reviewer
records level 5 as not applicable with the observed reason. When runtime proof
matters but no runnable target exists, the gap remains an Unproven Claim with
an owner, impact, and exact evidence needed.

Level 4 and 5 citations resolve locally through
`lib/evidence.resolveReviewEvidence`. The caller supplies one exact record ID,
expected claim, exact command, canonical substep, review-window start, and
latest behavior-change timestamp. Acceptance requires one executed record with
exit 0 and `verified: true`, plus one matching SHA-256 digest-bound gate event
on a valid event chain. Failed, timed-out, attested-only, mismatched,
pre-change, stale, duplicate, unbound, or altered evidence cannot clear a risk.

The executed verification record shape is unchanged. Gate events add only the
record ID and record digest needed for the local binding check; the existing
ledger, state rollup, and hash-chained event stream remain authoritative.

The resolver returns a sanitized projection. It omits raw ledger claims,
commands, stdout tails, and stderr tails, and exposes only bounded identity,
result, comparison, freshness, event-binding, and chain-integrity fields. This
checks consistency inside a trusted workspace. It cannot authenticate against
an actor that can rewrite all trusted files and recompute the chain.

A change is wide when it crosses at least 3 boundary classes or at least 2
high-impact classes. Bounded changes use 1 Stage 2 safety case. Wide changes
always use at least 2 independent fresh-context safety cases, even after a
provisional first-pass failure. Reconciliation compares the safety fact,
boundary inventory, evidence grade, and risk classification; reviewer
agreement never raises evidence.

The focused adversarial suite creates temporary repositories for six hidden
failures: pinned dependency implementation, lifecycle ordering, a serialized
field consumer, installed-copy drift, a missing package file, and a
cross-language invocation. Each direct-caller probe appears safe, while the
required boundary probe exposes the failure. Fixture subprocesses use fixed
argument arrays, a 10-second timeout, and a 1 MiB output cap; timeout and output
overflow fail closed.

### How to run

```bash
/god-lint                                    # All known artifacts
/god-lint .godpowers/prd/PRD.mdx             # One file
/god-lint --json                            # Structured output
/god-lint --errors-only                     # Skip warnings
```

Maintainers can run the focused blast-radius contracts directly:

```bash
node scripts/test-blast-radius.js
node scripts/test-impact.js
node scripts/test-evidence.js
node scripts/test-feature-awareness.js
node scripts/check-package-contents.js
```

Returns structured findings:
```json
{
  "results": [
    {
      "path": ".godpowers/prd/PRD.mdx",
      "type": "prd",
      "summary": { "errors": 2, "warnings": 1, "infos": 0 },
      "findings": [
        {
          "code": "P-04",
          "severity": "error",
          "line": 24,
          "message": "Success metric without timeline.",
          "suggestion": "Add a time bound to make the metric measurable."
        }
      ]
    }
  ]
}
```

Errors block agent advancement (cannot auto-resolve, even under --yolo).
Warnings surface but don't block. This includes U-12 prose-pattern findings.

## Linkage axis

The drift layer. Catches divergence between artifacts and code.

### What it tracks

Bidirectional map at `.godpowers/links/`:
- `artifact-to-code.json`: forward map (`P-MUST-01 -> [files]`)
- `code-to-artifact.json`: reverse map (`file -> [ids]`)

Discovery via 6 mechanisms (see [linkage.md](./linkage.md)):
1. Comment annotations (primary)
2. Filename heuristics
3. Import analysis
4. Style-system parsing
5. Test descriptions
6. Manual entries via `/god-link`

### What drift looks like

| Drift kind | Example | Fix |
|---|---|---|
| design-token-drift | Code references `colors.removed` but DESIGN.md no longer has it | Restore token or remove reference |
| stack-version-drift | STACK declares Next.js 15; package.json has Next.js 13 | Update one or the other |
| arch-container-drift | Code in `src/auth/` imports from `src/billing/` but ARCH says they're separate containers | Refactor or update ARCH |

Severity is `error` for breaking drift (token deletion still
referenced), `warning` for soft drift (stack version major mismatch),
`info` for advisory (cross-container import worth reviewing).

### How to run

```bash
/god-scan                                   # Full pipeline
/god-scan --linkage-only                    # Just scan + update map
/god-scan --drift-only                      # Drift detection only
/god-scan --footers-only                    # Rewrite fenced footers from existing map
```

After running, `REVIEW-REQUIRED.mdx` is populated with new findings.
`/god-review-changes` walks them.

## Runtime axis

The browser layer. Verifies the running app matches what artifacts say.

### What it checks

**Design audit** (`/god-test-runtime audit`):
- Rendered colors match `colors.*` tokens in DESIGN.md
- Rendered fonts match `typography.*.fontFamily`
- Rendered border-radius matches `rounded.*` tokens
- WCAG AA contrast on real DOM (real foreground/background luminance)
- When DESIGN.md declares a `reference:` anchor with a `url`: the anchor
  is captured beside the app and judged as a blind screenshot pair
  (`references/design/BLIND-COMPARISON.md`). Advisory severity only:
  losing to the reference informs the review queue, it never gates.

**Functional verification** (`/god-test-runtime test`):
- Each P-MUST/SHOULD/COULD requirement's "Acceptance:" criterion
  parsed into runnable user flows
- Run flows against the live app (navigate, click, type, expect)
- Pass/fail per requirement

**Both** (`/god-test-runtime`):
- Single browser launch, both pipelines, aggregate report

### Backends

Cascade:
1. **agent-browser** (vercel-labs CLI; preferred when installed)
2. **Playwright** (JS API; fallback when agent-browser absent)

Both are headless-only; the bridge layer (`lib/browser-bridge`)
enforces `headless: true` and never exposes a flag to override.

### Critical-finding gate

Runtime checks add new triggers to the existing critical-finding gate:

- **WCAG AA fail** on text-on-background components
- **Component drift > 10%** of probed selectors
- **Any P-MUST-* requirement fails** its acceptance flow
- **Browser launch failure** after retry

All four pause both default mode AND `--yolo`.

## Findings flow

```
static lint -> /god-lint output (immediate, blocks on errors)
linkage -> REVIEW-REQUIRED.mdx (cumulative, batched)
runtime -> .godpowers/runtime/<run-id>/{audit-report.json, test-report.json}
              -> REVIEW-REQUIRED.mdx
```

`/god-review-changes` walks REVIEW-REQUIRED.mdx interactively. Per
locked plan answer: the file does NOT auto-clear under `--yolo`. The
user must address or explicitly clear with `--clear`.

## Three-axis interaction

| Scenario | Static | Linkage | Runtime |
|---|---|---|---|
| Em dash added to PRD | ERROR (U-08) | - | - |
| Token deleted but still referenced in code | - | ERROR (drift) | possible WCAG fail at runtime |
| Login button styled wrong color in code | - | possible drift if linked | ERROR (design audit) |
| User cannot log in (P-MUST-01 broken) | - | - | ERROR (functional fail) |
| ADR-007 says X but code doesn't follow | possible static check | possible drift | - |

Together: the system catches issues at the layer most appropriate to
their nature. Static catches form. Linkage catches lying. Runtime
catches breakage.

## See also

- `lib/artifact-linter.js` - static axis orchestrator
- `lib/have-nots-validator.js` - mechanical have-nots registry
- `lib/linkage.js` - linkage map manager
- `lib/drift-detector.js` - drift detection
- `lib/reverse-sync.js` - linkage + drift -> footers + REVIEW-REQUIRED
- `lib/browser-bridge.js` - runtime backend cascade
- `lib/runtime-audit.js` - design verification on rendered DOM
- `lib/runtime-test.js` - PRD acceptance flow assertions
- `references/HAVE-NOTS.md` - the catalog of 183 named failure modes
- [change-propagation.md](./change-propagation.md) - how findings flow
- [linkage.md](./linkage.md) - stable IDs and discovery mechanisms
- [design-md.md](./design-md.md) - DESIGN.md format and lifecycle
