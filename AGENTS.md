# Godpowers repository

This repository is Godpowers itself: a small Node.js CLI (`bin/`, `lib/`) plus
the skills (`skills/<name>/SKILL.md`) and agents (`agents/`) it installs into
AI coding tools. `ARCHITECTURE.md` maps the modules.

## Working here

- `npm test` runs every suite; `npm run release:check` runs lint, coverage,
  the prompt budget, and the package check.
- Keep `lib/` dependency-free and covered (90% lines, 75% branches).
- Skills and agents have token budgets enforced by the tests. Prefer a CLI
  check or a hook over more instructions.
- No em dashes, en dashes, or emoji in any file (`npm run lint` checks).
- Releases publish from a `v*` tag push, never `npm publish` by hand. See
  CONTRIBUTING.md.

<!-- godpowers:begin -->
## Godpowers

Project state lives in `.godpowers/` (STATE.md, PLAN.md, DECISIONS.md). Before calling code work done,
run `npx -y godpowers@7 verify "<check command>"`. `/god` shows the next step.
<!-- godpowers:end -->
