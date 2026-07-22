# Inspiration

> The single canonical place where godpowers acknowledges its
> intellectual ancestry. Outside this file, the rest of the repo
> reads as standalone work.

Godpowers was shaped by ideas from several existing AI coding workflow
systems. The four direct ancestors were:

- **Prior internal planning-system experiments** - pure-skill model, slash
  commands inside AI tools, TDD enforcement, critical-finding gate with
  autonomous-mode carve-out
- **Superpowers** by Anthropic ([github.com/anthropics/skills](https://github.com/anthropics/skills)) - subagent specialization with strict hand-off contracts, fresh-context isolation, two-stage review pipelines
- **BMAD-METHOD** ([github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)) - story-file workflow for incremental delivery, multi-phase methodology
- **arc-ready / arc-anything** - artifact-quality discipline (substitution test, three-label test, named have-nots catalog)

Beyond what was inherited, godpowers added:

- **Bidirectional linkage** between artifact elements and code files,
  with 8 stable ID types and 6 discovery mechanisms
- **Reverse-sync** that writes fenced "Implementation Linkage"
  footers back to artifacts after code changes
- **Three-axis verification system**: static (mechanical lint),
  linkage (drift detection), runtime (headless browser audit +
  PRD acceptance flow assertions)
- **Conditional design pipeline**: DESIGN.md (Google Labs spec) +
  PRODUCT.md, gated through a two-stage design review
- **Multi-repo coordination** (Mode D) via a Tier-0 peer agent,
  preserving the per-repo single-orchestrator rule
- **Detect-and-delegate philosophy** for external tools (currently
  Google Labs design.md, Impeccable, awesome-design-md, SkillUI,
  vercel-labs/agent-browser + Playwright; never vendored)
- **Story-file workflow** as a finer slice between feature and commit
- **Light-impeccable internal references** (7 design domain refs)
  for the case where Impeccable is not installed
- **AI-tool context writer** that maintains fenced sections in
  AGENTS.md / CLAUDE.md / GEMINI.md and 11 other tool-specific paths
- **Feature awareness and host guarantee reporting** so existing projects and
  AI coding hosts can state what Godpowers capabilities are actually available
- **Messy-repo dogfood fixtures** for legacy planning migration, sync-back, extension
  authoring, host capability, and Mode D suite release dry-run behavior
- **Autonomous repo documentation and surface sync** for badges, route
  metadata, recipes, package payloads, release gates, and extension packs
- **Divergence before convergence** (`references/planning/DIVERGENCE.md`), a
  godpowers-authored widening pass that produces the alternatives the Tier 1
  antipattern catalogs already assume were considered. The framing of isolated
  candidate generation ahead of the critic was influenced by the ADHD skill by
  Udit Akhouri ([github.com/uditakhourii/adhd](https://github.com/uditakhourii/adhd),
  MIT). No code, prose, or lens text is vendored, there is no runtime
  dependency, and godpowers asserts nothing about its internals or published
  results. The lenses are inverted from godpowers' own antipattern catalogs.

## Why this is the only mention

Acknowledging influences once, in a single dedicated file, keeps the
rest of the repo focused on what godpowers IS rather than what it
came from. New contributors and AI agents reading the codebase don't
need a context-load of comparative history every time they open a
docs file.

## License posture

Godpowers itself: MIT (see LICENSE).

External integrations are detected at runtime and never vendored;
each retains its own license. Catalogs (e.g., the 71-site catalog
metadata in `lib/awesome-design.js`) are derivative facts; the
upstream repos stay authoritative for content.
