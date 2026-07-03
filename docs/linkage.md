# Linkage

How Godpowers maps stable artifact IDs to code files. The linkage layer
is what makes [change propagation](./change-propagation.md) work.

## Stable IDs across all artifacts

| Artifact | ID format | Example |
|---|---|---|
| PRD requirement | `P-{MUST,SHOULD,COULD}-NN` | `P-MUST-01` |
| ADR | `ADR-NNN` | `ADR-007` |
| ARCH container | `C-{slug}` | `C-auth-service` |
| ROADMAP milestone | `M-{slug}` | `M-launch-v1` |
| STACK decision | `S-{slug}` | `S-postgres-15` |
| DESIGN token | YAML path | `colors.primary`, `typography.display` |
| DESIGN component | `D-{slug}` | `D-button-primary` |

Every linkage entry is one of these IDs paired with a file path.

## Storage

```
.godpowers/links/
  artifact-to-code.json    # forward map: { id: [files] }
  code-to-artifact.json    # reverse map: { file: [ids] }
  LINKAGE-LOG.md           # append-only history
```

## Discovery: 6 mechanisms

`/god-scan` (or any code-touching workflow) walks the project tree
and applies these mechanisms to discover links:

### 1. Comment annotations (primary)

The cleanest signal. Adds zero ceremony to code:

```ts
// Implements: P-MUST-01
export function login() { /* ... */ }

// follows ADR-007 pattern
export class Session { /* ... */ }

// Token: {colors.primary}
const buttonBg = 'oklch(20% 0.01 250)';

// Source: C-auth-service
import { authenticate } from './auth';
```

Recognized verbs:
- `Implements:`, `Implement:` (PRD requirements, design components)
- `Fixes:` (incidents, bug-tied PRD items)
- `Token:` (DESIGN.md tokens)
- `Pattern:`, `Source:`, `Container:` (ARCH elements)
- Any standalone mention of `ADR-NNN`

Comma-separated lists are supported: `// Implements: P-MUST-01, ADR-007`.

### 2. Filename heuristics

When a file is in a container directory or follows a component naming
convention, a link is inferred:

| Path | Inferred ID |
|---|---|
| `src/components/Button.tsx` | `D-button` (DESIGN component) |
| `src/components/UserProfile.tsx` | `D-user-profile` (kebab-cased) |
| `src/auth/login.ts` | `C-auth` (matches service-y slug rules) |
| `src/api/handlers.ts` | `C-api` |

Container heuristic only fires for slugs matching `service|server|api|db|auth|core`.

### 3. Import analysis

Imports of STACK-listed dependencies link the importing file to the
stack decision:

```ts
import { Pool } from 'pg';
// links to S-postgres-{version}
```

### 4. Style-system parsing

CSS variables and inline token references are parsed:

```css
.button {
  color: var(--colors-primary);  /* -> colors.primary */
  background: var(--colors-secondary);
}
```

```tsx
const card = {
  bg: '{colors.paper-warm}',     // -> colors.paper-warm
  rounded: '{rounded.md}'        // -> rounded.md
};
```

### 5. Test descriptions

Test framework conventions:

```ts
describe('P-MUST-01: user can log in', () => {
  it('accepts valid credentials', () => { /* ... */ });
});
```

### 6. Manual entries

For cases where annotations are awkward (generated files, conceptual
links, third-party code):

```bash
/god-link P-MUST-03 src/generated/templates/welcome-email.html
```

This adds the entry to the linkage map without modifying the source file.

## What gets linked vs ignored

Scanner extensions:
```
.js .jsx .ts .tsx .mjs .cjs
.py .go .rb .rs .java .kt .swift
.css .scss .less .styl
.html .vue .svelte .astro
.md .mdx
.yml .yaml
.sh .bash
```

Ignored directories:
```
node_modules .git .next dist build out
.cache .parcel-cache .turbo target
__pycache__ .pytest_cache .venv venv
.tox .idea .vscode coverage .nyc_output
.svelte-kit .vercel .godpowers
```

## Querying the linkage map

```js
const linkage = require('./lib/linkage');

// Forward: what files implement P-MUST-01?
linkage.queryByArtifact(projectRoot, 'P-MUST-01');
// -> ['src/auth/login.ts', 'src/auth/session.ts']

// Reverse: what artifacts does this file implement?
linkage.queryByFile(projectRoot, 'src/auth/login.ts');
// -> ['P-MUST-01', 'ADR-007']

// Orphans: declared but no implementing code
linkage.listOrphans(projectRoot, ['P-MUST-01', 'P-MUST-02', 'P-MUST-03']);
// -> ['P-MUST-02']  (the only one without a link)

// Coverage
linkage.coverage(projectRoot, knownIds);
// -> 0.87  (87% of declared IDs have at least one linked file)
```

## When the map updates

| Trigger | Behavior |
|---|---|
| `/god-build` completes | Incremental scan of newly-committed files |
| `/god-feature` completes | Scan of feature surface |
| `/god-hotfix` completes | Scan of fix files |
| `/god-refactor` completes | Re-scan touched files; update affected entries |
| `/god-update-deps` completes | Re-evaluate STACK linkage |
| `/god-sync` runs | Full reverse-sync (scan + apply + drift + footers) |
| `/god-scan` (manual) | Same as /god-sync's scan portion |
| `/god-link` invoked | Single explicit edit |

Per Q6 in the plan: a git pre-commit hook is optional and off by default.
Linkage updates after meaningful commands; the hook would just trigger
the same flow more eagerly.

## Deriving requirement status

The linkage map is the foundation for deliverable progress: which requirements
are done, in progress, or not started. `lib/requirements.js` reads the PRD
(declared `P-MUST-NN` / `P-SHOULD-NN` / `P-COULD-NN` ids), the ROADMAP
(delivery increments and their member requirement ids), the forward linkage
map (requirement id to implementing files), and build state, then derives a
status per requirement:

| Status | Condition |
|---|---|
| not started | no code is linked to the requirement |
| in progress | code is linked, but its increment (or the build) is not done |
| done | code is linked AND its increment is done (or the build is complete) |

Reverse-sync regenerates the human-readable ledger `.godpowers/REQUIREMENTS.mdx`
and caches a summary under `state.json` `deliverables` whenever the map changes.
`/god-progress` surfaces this, and `/god-status` shows a deliverable-progress
section. Because status is derived from the map (not hand-maintained), it
cannot drift from the code that is actually linked.

## Drift detection

`lib/drift-detector` runs on every `/god-sync` and `/god-scan`. It checks:

- **DESIGN token drift**: file references a token that no longer exists
  in DESIGN.md (e.g., `colors.removed` after the token was deleted)
- **STACK version drift**: STACK declares a major version different from
  what `package.json` (or `pyproject.toml`, etc.) actually has
- **ARCH container drift**: cross-container imports that may violate the
  declared responsibility split (info-level signal; user verifies)

Findings flow to `REVIEW-REQUIRED.md`.

## Conventions checklist

- Use the canonical ID format. The linker rejects garbage.
- Prefer comment annotations over manual `/god-link` (they're scoped
  to the code, travel with refactors, survive renames better).
- One annotation per logical unit. A function that implements two
  requirements: comma-separate them.
- For test files: name the test with the ID so the description-parser
  picks it up automatically.
- Keep stable IDs in the artifact authoritative. Don't rename a
  P-MUST-01 to P-MUST-99 mid-project; the linkage map will think the
  old one was orphaned.

## Anti-patterns

- **Stale annotations after refactor**: a function moves to a new file
  but the comment stays in the old. Reverse-sync will eventually catch
  the new file (if annotation moves with it) but the old link persists.
  Fix: when refactoring, move annotations with the code.
- **Annotation that lies**: `// Implements: P-MUST-01` on a function
  that implements something else. The linkage map will show wrong files
  for P-MUST-01. Fix: drift detection will eventually catch it via
  /god-audit.
- **Avoiding annotations to keep code clean**: the alternative is
  `/god-link` for every linkage, which is more friction. One-line
  comments are the cheaper path.

## See also

- [change-propagation.md](./change-propagation.md) - how the linkage
  map enables forward, reverse, and cross-artifact propagation
- `lib/linkage.js` - core map manager
- `lib/code-scanner.js` - all 6 discovery mechanisms
- `lib/drift-detector.js` - drift checks
- `lib/requirements.js` - derives requirement status and renders the ledger
- `/god-progress` - deliverable progress report (`.godpowers/REQUIREMENTS.mdx`)
