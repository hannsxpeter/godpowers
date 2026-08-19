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
- **Decision units and fog of war**
  (`references/planning/WAYFINDING.md`, `/god-chart`), a godpowers-authored
  planning tier for work too big for one session. The framing of a decision as
  a trackable unit, the destination-fixes-scope rule, the fog-of-war slot for
  questions you cannot yet phrase, and terminal out-of-scope closure were
  influenced by the wayfinder skill by Matt Pocock
  ([github.com/mattpocock/skills](https://github.com/mattpocock/skills)). No
  code or prose is vendored and there is no runtime dependency. Godpowers
  implements these on its own substrate: units are `STORY-*` files on the
  existing story board rather than issues on an external tracker, and two
  wayfinder rules were deliberately not adopted (refer-by-name conflicts with
  the load-bearing stable-id contract that `lib/linkage.js` depends on, and
  the single-map constraint would require dismantling `/god-reconcile`).

- **Reference-anchored blind comparison and the bounded polish loop**
  (`references/design/BLIND-COMPARISON.md`, `lib/blind-compare.js`, the
  optional `reference:` anchor in DESIGN.md consumed by
  `lib/runtime-audit.js`, `/god-polish`). Three framings were influenced by
  the gauntlet-loop skill by duolahypercho
  ([github.com/duolahypercho/gauntlet-loop](https://github.com/duolahypercho/gauntlet-loop),
  MIT), which packages Matt Shumer's aim prompt: a named shipped product as
  the quality bar instead of self-authored criteria, blind side-by-side
  judgment so the critic cannot flatter the work it sits next to, and an
  iterative climb toward that bar with the human as the brake. No code or
  prose is vendored, there is no runtime dependency, and godpowers asserts
  nothing about its internals or published results. Godpowers implements
  the ideas on its own substrate and inverts the parts that conflict with
  its load-bearing contracts: pairs are sealed with a mechanical
  verdict-before-unseal ordering rather than trusted procedure alone, the
  reference verdict is advisory and never trips the critical-finding gate,
  and the polish loop rejects "the human is the only brake" outright: a
  rounds cap (`polish-rounds-limit`) and a dry-round detector close the
  loop on their own, because unbounded iteration is also unbounded cost.

- **Harness quality and intentional context engineering**
  (`scripts/run-tests.js`, `lib/context-budget.js`, `lib/program-design.js`,
  `lib/slice-handoff.js`, `lib/maintainability-trajectory.js`, and
  `lib/evolution-benchmark.js`). The framing of compact verification with
  complete retained evidence was influenced by HumanLayer's Harness
  Engineering work
  ([humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents)).
  Intentional compaction, bounded specialist loadouts, and fresh-context
  workers were influenced by HumanLayer's Advanced Context Engineering work
  ([humanlayer.dev/blog/advanced-context-engineering](https://www.humanlayer.dev/blog/advanced-context-engineering))
  and the open source 12-factor-agents repository
  ([github.com/humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents)).
  The research, plan, implement sequence and concrete program-design record
  were influenced by HumanLayer's `create_plan` command
  ([github.com/humanlayer/humanlayer/blob/main/.claude/commands/create_plan.md](https://github.com/humanlayer/humanlayer/blob/main/.claude/commands/create_plan.md)).
  The six-checkpoint evolution benchmark and report-only maintainability
  trajectory were influenced by HumanLayer's published SlopCodeBench
  methodology
  ([github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/benchmarking-opus-5-on-slop-code-bench.md](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/benchmarking-opus-5-on-slop-code-bench.md)).
  No code, prose, fixture, or benchmark result is vendored, and there is no
  runtime dependency. Godpowers implements these ideas on its own
  disk-authoritative substrate with dependency-free CommonJS helpers,
  bounded projections, independent reviews, and release evidence.

- **Meaning-preserving post-draft prose review**
  (`references/shared/VOICE.md`, `lib/prose-lint.js`, and the U-12 integration
  in `lib/have-nots-validator.js`). The scan, targeted rewrite, preservation of
  meaning and intended tone, and final self-audit sequence were influenced by
  pstack's unslop skill
  ([github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md](https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md)).
  Godpowers implements its own seven-rule advisory scanner, masking rules,
  documentation and launch treatments, fixtures, performance bound, and
  zero-warning self-dogfood gate. No upstream prose, rule catalog, code,
  fixture, or result is vendored, and there is no runtime dependency.

- **Blast-radius safety cases for code review**
  (`references/building/BLAST-RADIUS.md`, `skills/god-review.md`,
  `specialists/god-quality-reviewer.md`, `lib/impact.js`, and
  `lib/evidence.js`). The idea of naming a load-bearing safety condition,
  looking beyond direct callers, grading evidence strength, and separating
  risks from cleared paths was influenced by pstack's blast-radius skill
  ([source](https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md),
  [MIT license](https://github.com/cursor/plugins/blob/main/pstack/LICENSE)).
  Godpowers authored its protocol, prose, implementation, fixtures, probes,
  and results independently. No upstream prose, code, fixture, or result is
  copied or vendored, the pstack plugin is not an npm dependency, and the npm
  package contains no pstack runtime. A future copy or substantial portion
  would require the upstream copyright and MIT permission notice.

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
