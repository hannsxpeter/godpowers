---
name: god-graph
description: |
  Build, query, and inspect the project knowledge graph. Connects PRD
  requirements to architecture decisions to roadmap milestones to build
  slices to deploy artifacts.

  Triggers on: "god graph", "/god-graph", "knowledge graph", "trace requirement"
---

# /god-graph

Connect-the-dots across all artifacts.

## What the graph encodes

Nodes:
- Requirements (from PRD)
- ADRs (from ARCH)
- Milestones (from ROADMAP)
- Slices (from BUILD/PLAN)
- Commits
- Have-nots
- Open questions

Edges:
- Requirement -> ADR (NFR -> architectural choice)
- ADR -> Slice (decision -> implementation)
- Slice -> Commit (plan -> code)
- Have-not -> Artifact (failure mode -> what it applies to)
- Open question -> Phase (when due)

## Subcommands

### `/god-graph build`
Walk all artifacts in `.godpowers/`, build the graph, write to
`.godpowers/graph/GRAPH.json`.

### `/god-graph trace <node>`
Show all edges from a specific node. Example:
`/god-graph trace requirement:user-can-export-csv`
Shows which ADR addresses it, which milestone delivers it, which slices
implement it, which commits it landed in.

### `/god-graph orphans`
Show nodes with no edges. Likely: requirements never delivered, ADRs
never referenced, slices never reviewed.

### `/god-graph render`
Render an ASCII or Mermaid visualization to `.godpowers/graph/GRAPH.mdx`.

## Why this matters

- "Did we build everything in the PRD?" -> orphan check on requirements
- "Why did we make this choice?" -> trace from code back to ADR
- "What's the impact of changing X?" -> trace edges from X
