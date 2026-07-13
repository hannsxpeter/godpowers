---
name: god-design
description: |
  Design lifecycle commands. Owns DESIGN.md (Google Labs spec) and
  PRODUCT.md (impeccable strategic file). Detects impeccable; bridges
  to its 23 commands when present. Falls back to a minimal builder when
  not.

  Triggers on: "god design", "/god-design", "design system", "visual identity",
  "polish design", "critique design", "audit design", "design tokens",
  "brand register", "design.md", "product.md"
---

# /god-design

Front door for all design work in a Godpowers project. Bridges to
[Impeccable](https://github.com/pbakaus/impeccable) when installed,
producing DESIGN.md in the
[Google Labs design.md format](https://github.com/google-labs-code/design.md).

## Forms

| Form | Action |
|---|---|
| `/god-design` | Run the full setup flow (delegates to /impeccable teach if installed) |
| `/god-design teach` | Strategic interview + DESIGN.md + PRODUCT.md (impeccable teach) |
| `/god-design document` | Regenerate DESIGN.md from existing code (impeccable document) |
| `/god-design refresh` | Alias for document |
| `/god-design suggest [text]` | Look for known site references and suggest matching DESIGN.md from awesome-design-md catalog |
| `/god-design from <site>` | Fetch curated DESIGN.md from awesome-design-md and use as starter |
| `/god-design from <url>` | If <url> is not in catalog, fall back to skillui static analysis |
| `/god-design reference <site>` | Use a known site as a named reference in PRODUCT.md without copying its DESIGN.md |
| `/god-design catalog` | List the 71 known sites with categories and short descriptions |
| `/god-design scan <url> [--ultra]` | Scan a website / repo / dir with skillui and extract DESIGN.md |
| `/god-design scan-repo <git-url>` | Clone repo and scan via skillui dir mode |
| `/god-design extract` | Pull components into design system (impeccable extract) |
| `/god-design shape` | Plan UX/UI before code (impeccable shape) |
| `/god-design critique [scope]` | UX design review (impeccable critique) |
| `/god-design audit [scope]` | a11y / perf / responsive (impeccable audit) |
| `/god-design polish [scope]` | Final pass before shipping (impeccable polish) |
| `/god-design harden` | Error handling, i18n, edge cases (impeccable harden) |
| `/god-design onboard` | First-run flows, empty states (impeccable onboard) |
| `/god-design bolder` | Amplify boring designs (impeccable bolder) |
| `/god-design quieter` | Tone down overly bold (impeccable quieter) |
| `/god-design distill` | Strip to essence (impeccable distill) |
| `/god-design animate` | Add purposeful motion (impeccable animate) |
| `/god-design colorize` | Strategic color (impeccable colorize) |
| `/god-design typeset` | Fix font choices, hierarchy (impeccable typeset) |
| `/god-design layout` | Fix layout, spacing (impeccable layout) |
| `/god-design delight` | Add moments of joy (impeccable delight) |
| `/god-design overdrive` | Technically extraordinary effects (impeccable overdrive) |
| `/god-design clarify` | Improve unclear UX copy (impeccable clarify) |
| `/god-design adapt` | Adapt for different devices (impeccable adapt) |
| `/god-design optimize` | Performance improvements (impeccable optimize) |
| `/god-design live` | Visual variant mode (impeccable live) |
| `/god-design status` | Lint findings + drift report |
| `/god-design impact "<change>"` | What-if analysis (delegates to /god-design-impact) |

## Process

1. Verify `.godpowers/` exists. If not: "Run `/god-init` first."
2. Read `.godpowers/state.json` for project state.
3. Detect:
   - `lib/design-detector.isUiProject()` - is UI required?
   - `lib/design-detector.isImpeccableInstalled()` - is impeccable available?
4. If UI not required: warn that DESIGN is unusual for this project type;
   confirm before proceeding.
5. Spawn `god-designer` with the requested subcommand.
6. After god-designer returns: surface any lint findings, suggest
   `/god-design polish` if warnings exist.

## Verification

After god-designer returns:
1. Verify `DESIGN.md` exists on disk when design was required.
2. Run `npx godpowers gate --tier=design --project=.`
3. If the gate returns a non-zero exit, do not mark Design complete. Report the gate output and repair the artifact first.
4. Run `npx godpowers state advance --step=design --status=done --project=.`.

## Detection-driven behavior

- **UI + impeccable installed**: bridges to impeccable's commands
  through `lib/impeccable-bridge.js`. All 23 commands available.
- **UI + impeccable NOT installed**: prompts to install impeccable; if
  declined, falls back to god-designer's minimal builder. A subset of
  commands (teach, document, status, impact) work in fallback.
- **No UI**: tries to dissuade. If user insists, fallback builder runs
  but recommends skipping the DESIGN tier entirely.

## Two-stage review on changes

When DESIGN.md or PRODUCT.md change as a result of any subcommand:

1. `god-design-reviewer` runs in two-stage gate (spec + quality)
2. PASS: change applied; downstream propagation runs (impact, REVIEW-REQUIRED)
3. WARN: change applied with warnings logged
4. BLOCK: change rejected; appended to `.godpowers/design/REJECTED.mdx`;
   user told why and what to fix

This pattern mirrors code review (god-spec-reviewer + god-quality-reviewer)
applied to design.

## Verification

After god-designer and god-design-reviewer return:
1. Verify `DESIGN.md` exists on disk
2. Record design lint, review verdict, and command history in `.godpowers/state.json`
3. Run `npx godpowers gate --tier=design --project=.` and do not proceed on a non-zero exit
4. Run `npx godpowers state advance --step=design --status=done --project=.` when the project requires design, or `npx godpowers state advance --step=design --status=not-required --project=.` when design is explicitly not required.

## Output

Project root:
- `DESIGN.md` (Google Labs format, lint-clean)
- `PRODUCT.md` (impeccable strategic file, when impeccable installed)

Inside `.godpowers/design/`:
- `STATE.md` (generated design state view from `.godpowers/state.json`)
- `HISTORY.md` (append-only log of design changes; populated by god-designer)
- `REJECTED.md` (append-only log of blocked changes; populated by god-design-reviewer)

## Output to events.jsonl

For every subcommand dispatch:

```json
{ "name": "impeccable.dispatch", "command": "polish", "scope": "header" }
{ "name": "design.review-verdict", "verdict": "PASS|WARN|BLOCK" }
{ "name": "design.lint-result", "errors": 0, "warnings": 1 }
```

## Awesome DESIGN.md catalog integration

When the user mentions a known site (in PRD body, brand description, or
free-text intent), the catalog from
[VoltAgent's awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
(MIT licensed, 71 curated DESIGN.md files at time of writing) provides
ready-to-use starting points.

### Detection

`lib/awesome-design.extractSiteReferences(text)` scans text for known
site mentions. Triggers include:

- Direct mention: "Linear", "Stripe", "Notion"
- Phrasal mention: "feel like Linear", "similar to Stripe", "Apple-style"
- Slug mention: "linear.app", "x.ai"

The catalog covers 71 sites across 9 categories: AI/LLM, dev-tools,
backend-data, productivity, design-tools, fintech, ecommerce,
media-consumer, automotive.

### Behaviors

- **`/god-design suggest`**: scan PRD + PRODUCT (if present) for site
  mentions, surface matches with their preview URLs. Non-destructive.
- **`/god-design from linear`**: fetch `linear.app/DESIGN.md` from the
  catalog and use as starter. Cached at
  `.godpowers/cache/awesome-design/<slug>.md`. After fetch, runs through
  god-design-reviewer's two-stage gate before applying.
- **`/god-design reference linear`**: adds Linear as a named brand
  reference in PRODUCT.md without copying its DESIGN.md. Useful when
  you want "the feeling of Linear" without their tokens verbatim.
- **`/god-design catalog`**: prints the full list with categories and
  descriptions.

### Cache + license

DESIGN.md files are fetched lazily from raw.githubusercontent.com and
cached per-project under `.godpowers/cache/awesome-design/`. Source repo
is MIT-licensed; tokens represent publicly visible CSS values.

If the user wants to refresh a stale cache:
```
/god-design from linear --refresh
```

### When the catalog is consulted automatically

- During `/god-design teach` flow: god-designer scans PRD/PRODUCT for
  site mentions and offers suggestions before drafting from scratch
- During `/god` (front door): if the user's free text mentions a known
  site, the recipe matcher includes a "use awesome-design DESIGN.md"
  recipe option

## SkillUI fallback (when site is not in catalog)

When a user references a site that isn't in the awesome-design-md
catalog (e.g., a competitor not yet curated, a private app, or any
arbitrary URL), fall back to
[SkillUI](https://www.npmjs.com/package/skillui) (MIT licensed): a CLI
that statically analyzes a website / git repo / local directory and
extracts a complete design system including a DESIGN.md.

### Detection cascade

```
User mentions a site reference (e.g., "feel like Acme.com")
  -> lib/awesome-design.lookupSite(name)
       hit:  use the curated DESIGN.md from the catalog
       miss: fall through
  -> lib/skillui-bridge.isInstalled()
       installed:     run skillui --url <best-guess-URL>; produces DESIGN.md
       not installed: prompt user to `npm install -g skillui` or skip
```

### Forms

| Form | Behavior |
|---|---|
| `/god-design from <slug>` | Catalog lookup (Linear, Stripe, etc.); fast |
| `/god-design from <url>` | Catalog lookup, falls through to SkillUI |
| `/god-design scan <url>` | Always uses SkillUI; bypasses catalog |
| `/god-design scan <url> --ultra` | SkillUI ultra mode (Playwright + screenshots) |
| `/god-design scan-repo <git-url>` | Clone + scan via SkillUI dir mode |
| `/god-design scan-dir <path>` | Scan a local project (e.g., for migration) |

### Output flow

```
1. SkillUI runs; output cached at .godpowers/cache/skillui/<slug>/
2. The generated DESIGN.md is found via findFirstDesignMd
3. Validated by lib/design-spec.lint
4. Reviewed by god-design-reviewer (two-stage gate)
5. If PASS: promoted to project-root DESIGN.md
6. Reverse-sync wires component implementations as usual
```

### Cost / install

SkillUI default mode is pure static analysis (no browser, no API key).
For ultra mode, requires Playwright + Chromium (one-time install).
Both modes are local; no telemetry.

The bridge layer is `lib/skillui-bridge.js`. Detect-and-delegate; never
vendored. If SkillUI isn't installed, the bridge returns
`{ error: 'not-installed' }` with the install command for the user.

## See also

- `lib/design-detector.js` - UI and impeccable detection
- `lib/design-spec.js` - Google Labs format parser and linter
- `lib/impeccable-bridge.js` - command dispatch layer
- `lib/awesome-design.js` - 71-site catalog + lookup + fetch
- `specialists/god-designer.md` - lifecycle owner
- `specialists/god-design-reviewer.md` - two-stage review gate
- `references/design/DESIGN-ANATOMY.md` - what good DESIGN.md looks like
- `references/design/DESIGN-ANTIPATTERNS.md` - what to avoid
- [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) - upstream catalog


## Re-invocation contract

What happens if `/god-design` is run when `.godpowers/design/DESIGN.mdx` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-designer; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-designer in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-design --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-design-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-design invocation as `op:god-design` for `/god-undo`.

### Idempotency guarantees

- Running `/god-design` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-design --dry-run` is always read-only.
- An interrupted `/god-design` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
