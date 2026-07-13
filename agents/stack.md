---
pillar: stack
status: present
always_load: false
covers: [runtime stack, package manager, dependencies, tooling]
triggers: [stack, node, npm, package, dependency, runtime]
must_read_with: [repo]
see_also: [quality, deploy]
---

## Scope

- [DECISION] This pillar captures technology choices for Godpowers.

## Context

### Stack

- [DECISION] Godpowers uses Node.js with CommonJS runtime modules.
- [DECISION] Godpowers uses npm as package manager and package distribution mechanism.
- [DECISION] Runtime helpers intentionally avoid production dependencies.
- [DECISION] GitHub Actions is the CI and publish automation surface.

## Decisions

(none)

## Rules

(none)

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] Adding a YAML dependency would simplify parsing but would increase package footprint and installation risk.

## Touchpoints

- [DECISION] Stack decisions synchronize from `.godpowers/stack/DECISION.mdx` through the managed section below.

## Gaps

(none)

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/stack/DECISION.mdx`.
- Rule: keep this pillar aligned when these artifacts change durable stack truth.

### Extracted durable signals

From `.godpowers/stack/DECISION.mdx`:
- [DECISION] Candidates evaluated: Node.js CommonJS, Node.js ESM, and a compiled binary.
- [DECISION] Scores: CommonJS 9.2, ESM 7.8, compiled binary 6.2.
- [DECISION] CommonJS wins because the installer executes directly on Node 18-plus across 15 host layouts without a build step.
- [DECISION] Lock-in cost is low because modules use built-in APIs and can migrate file by file.
- [DECISION] Candidates evaluated: local files, SQLite, and a hosted service.
- [DECISION] Scores: local files 9.1, SQLite 7.4, hosted service 4.9.
- [DECISION] Local files win because disk state remains inspectable, offline, versionable, and portable between AI coding tools.
- [DECISION] Lock-in cost is low because every canonical format has a documented schema or deterministic parser.
<!-- godpowers:pillar-sync:end -->
