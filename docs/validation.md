# Validation System

How Godpowers validates artifacts and code against decisions. Three
orthogonal axes, all running in parallel:

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
- [DECISION] `npm run lint` delegates to `scripts/static-check.js`.
- [DECISION] `scripts/static-check.js` runs `node --check` across JavaScript
  files and verifies the release gate still includes parser coverage and
  installer helper extraction.
- [DECISION] `scripts/static-check.js` verifies the full release runner still
  includes generated state view and state advance mutation regression tests.
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
  gates in `.godpowers/harden/FINDINGS.md`.
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

PRD-specific:
- **P-04** success metric without timeline
- **P-05** success metric without measurement method
- **P-07** Scope and No-Gos section empty
- **P-08** open question without owner
- **P-09** open question without due date

ARCH-specific:
- **A-04** PRD NFR not mapped to architectural choice

DESIGN-specific (via `lib/design-spec`):
- **D-NAME** frontmatter missing `name` field
- **D-CONTRAST** WCAG AA contrast fail on text-on-background
- **D-TOKEN-REF** unresolved `{token.path}` reference
- **D-SECTION-ORDER** sections out of canonical order
- **D-SECTION-DUP** duplicate section heading

### Mechanical vs interpretive

Of the 156 documented have-nots in `references/HAVE-NOTS.md`:
- **~30 are mechanical** (regex-checkable; in `lib/have-nots-validator.js`)
- **~126 are interpretive** (judgment-required; documented for human + AI review)

The mechanical 30 are caught by `/god-lint`. The interpretive checks are
the responsibility of `god-auditor` (retroactive scoring) and the
two-stage code review (`god-spec-reviewer` + `god-quality-reviewer`).

This split is deliberate: mechanical checks should never be done by
hand. Interpretive checks should never be claimed to be mechanical.

### How to run

```bash
/god-lint                                    # All known artifacts
/god-lint .godpowers/prd/PRD.md             # One file
/god-lint --json                            # Structured output
/god-lint --errors-only                     # Skip warnings
```

Returns structured findings:
```json
{
  "results": [
    {
      "path": ".godpowers/prd/PRD.md",
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
Warnings surface but don't block.

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

After running, `REVIEW-REQUIRED.md` is populated with new findings.
`/god-review-changes` walks them.

## Runtime axis

The browser layer. Verifies the running app matches what artifacts say.

### What it checks

**Design audit** (`/god-test-runtime audit`):
- Rendered colors match `colors.*` tokens in DESIGN.md
- Rendered fonts match `typography.*.fontFamily`
- Rendered border-radius matches `rounded.*` tokens
- WCAG AA contrast on real DOM (real foreground/background luminance)

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
linkage -> REVIEW-REQUIRED.md (cumulative, batched)
runtime -> .godpowers/runtime/<run-id>/{audit-report.json, test-report.json}
              -> REVIEW-REQUIRED.md
```

`/god-review-changes` walks REVIEW-REQUIRED.md interactively. Per
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
- `references/HAVE-NOTS.md` - the catalog of 156 named failure modes
- [change-propagation.md](./change-propagation.md) - how findings flow
- [linkage.md](./linkage.md) - stable IDs and discovery mechanisms
- [design-md.md](./design-md.md) - DESIGN.md format and lifecycle
