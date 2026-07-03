# DESIGN.md Guide

How DESIGN.md works inside Godpowers. The format follows the
[Google Labs design.md spec](https://github.com/google-labs-code/design.md);
the lifecycle and review gates are Godpowers' addition.

## What DESIGN.md is

A markdown file at your project root that combines **machine-readable
design tokens** (YAML frontmatter) with **human-readable design
rationale** (markdown body). AI agents read tokens for exact values;
prose tells them why.

```md
---
name: MRR Tracker
description: Editorial-warm dashboard. Restrained, data-first.
colors:
  ink: "oklch(20% 0.01 250)"
  paper: "oklch(98% 0.005 80)"
  accent: "oklch(60% 0.18 250)"
typography:
  display:
    fontFamily: Fraunces
    fontSize: clamp(2rem, 5vw, 3.25rem)
  body:
    fontFamily: Inter
    fontSize: 1rem
spacing:
  sm: 16px
  md: 24px
  lg: 32px
components:
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "24px"
---

## Overview

[DECISION] Editorial register. Reading-driven dashboard for solo
SaaS founders.

## Colors

[DECISION] Three-color palette. Ink for type. Paper for canvas.
Single accent (accent) carries action.

## Typography

[DECISION] Fraunces display + Inter body. Tabular numerals on metric
columns.

## Components

The `card` token wraps each metric panel. No nested cards.

## Do's and Don'ts

- [DECISION] Do: tabular numerals on figure columns
- [DECISION] Don't: use the accent color for decoration
```

## When DESIGN.md is required

`/god-design` runs as an early Tier 1 sub-step after PRD and before
architecture when `lib/design-detector` returns `requires-design: true`.
Triggers:

- `package.json` has a frontend framework dep (React, Vue, Svelte,
  Next.js, Nuxt, etc. - 24 patterns recognized)
- `pubspec.yaml` declares Flutter
- `.godpowers/prep/INITIAL-FINDINGS.mdx`, `.godpowers/prep/IMPORTED-CONTEXT.mdx`,
  or PRD mentions UI, screens, journeys, components, product voice, brand, or
  interaction states
- `.godpowers/stack/DECISION.mdx` mentions a UI framework, when stack already
  exists
- `src/components/`, `app/`, or `public/` directory exists

When skipped: `tier-1.design.status = not-required` and the arc
continues to architecture.

## How to start a DESIGN.md

Three paths, in order of preference:

### Option 1: Use a curated catalog entry

If your brand reference is one of the 71 curated sites:

```bash
/god-design from linear        # Linear's tokens
/god-design from stripe        # Stripe's tokens
/god-design from notion        # Notion's tokens
```

Catalog: VoltAgent's
[awesome-design-md](https://github.com/VoltAgent/awesome-design-md).
Cached per-project at `.godpowers/cache/awesome-design/<slug>.md`.
Lazy fetch from raw.githubusercontent.com on first use.

### Option 2: Scan an arbitrary website

If your brand reference is not in the catalog:

```bash
/god-design scan https://my-target-site.com [--ultra]
```

Uses [SkillUI](https://www.npmjs.com/package/skillui) to extract a
DESIGN.md via static analysis (default mode) or Playwright-driven
visual extraction (`--ultra`). Output cached at
`.godpowers/cache/skillui/<slug>/DESIGN.md`.

### Option 3: Build from scratch

```bash
/god-design teach        # if Impeccable installed
/god-design              # if not (uses minimal builder + 7 internal refs)
```

When [Impeccable](https://github.com/pbakaus/impeccable) is installed,
its `teach` command runs an interactive interview to produce both
PRODUCT.md (strategic) and DESIGN.md (visual).

When Impeccable is absent, godpowers falls back to its 7 internal
domain references:
- [TYPOGRAPHY.md](../references/design/TYPOGRAPHY.md)
- [COLOR.md](../references/design/COLOR.md)
- [SPATIAL.md](../references/design/SPATIAL.md)
- [MOTION.md](../references/design/MOTION.md)
- [INTERACTION.md](../references/design/INTERACTION.md)
- [RESPONSIVE.md](../references/design/RESPONSIVE.md)
- [UX-WRITING.md](../references/design/UX-WRITING.md)

## How DESIGN.md changes are gated

When DESIGN.md changes (manual edit, `/god-design polish`,
`/god-design colorize`, `/impeccable critique`, etc.):

```
diff detected
  -> god-design-reviewer (two-stage gate)
       Stage 1 (spec): impeccable critique + PRODUCT.md alignment
       Stage 2 (quality): WCAG contrast + token resolution + section order
       Verdict: PASS | WARN | BLOCK

  -> if BLOCK: append to .godpowers/design/REJECTED.mdx; abort propagation
  -> if PASS or WARN:
       lib/impact.forDesign() computes affected files
       lib/reverse-sync.run() updates linkage and writes Implementation
       footers to DESIGN.md
       findings flow to REVIEW-REQUIRED.md
       /god-review-changes walks them
```

## Validation

Three layers:

1. **Format validation**: `lib/design-spec.lint(content)` validates
   frontmatter schema, section order, token reference resolution,
   WCAG contrast on text-on-background components. Mechanical.
2. **Anti-pattern detection** (when impeccable installed):
   `npx impeccable detect DESIGN.md` runs its deterministic
   anti-pattern rules.
3. **Runtime audit** (when frontend exists): `/god-test-runtime audit`
   launches a headless browser, extracts computed styles, compares to
   declared tokens. Catches "DESIGN.md says one thing, the running
   app does another."

## Relationship to PRODUCT.md

| File | Owner | Job |
|---|---|---|
| `PRD.md` | god-pm | Functional requirements, NFRs, scope, success metrics |
| `PRODUCT.md` | Impeccable (`/impeccable teach`) | Register (brand vs product), users, brand personality, anti-references |
| `DESIGN.md` | Impeccable + god-designer | Visual tokens (Google Labs spec) + rationale prose |

PRD says "what to build." PRODUCT says "how it should feel."
DESIGN says "the visual language."

## Reference: Section order

Follows Google Labs design.md spec. Sections, in order:

1. Overview / Brand & Style
2. Colors
3. Typography
4. Layout / Layout & Spacing
5. Elevation & Depth
6. Shapes
7. Components
8. Do's and Don'ts

Sections may be omitted; those present must appear in this order.
Duplicates error.

## See also

- [change-propagation.md](./change-propagation.md) - how DESIGN.md
  changes ripple through the system
- [linkage.md](./linkage.md) - stable IDs for components and tokens
- [validation.md](./validation.md) - the three-axis verification system
- `lib/design-spec.js` - parser + linter
- `lib/awesome-design.js` - catalog
- `lib/skillui-bridge.js` - SkillUI fallback
- `agents/god-designer.md` - lifecycle owner
- `agents/god-design-reviewer.md` - two-stage review gate
- `references/design/DESIGN-ANATOMY.md` - what good DESIGN.md looks like
- `references/design/DESIGN-ANTIPATTERNS.md` - what to avoid
