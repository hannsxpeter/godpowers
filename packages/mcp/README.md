# @godpowers/mcp

- [DECISION] `@godpowers/mcp` is the first-party read-only MCP companion package for Godpowers.
- [DECISION] The main `godpowers` package stays dependency-free at runtime, and the MCP SDK dependency lives only in this companion package.
- [DECISION] Version 4.0.1 exposes eight read-only tools: `status`, `next`, `gate_check`, `lint_artifact`, `trace_requirement`, `work_report`, `route`, and `verification_history`.
- [DECISION] Mutation tools are intentionally absent through the 4.0.1 release.
- [DECISION] Runtime skew caveat: 4.0.1 reads `.mdx`-canonical project artifacts (with legacy `.md` fallback). Pair it with a `godpowers` runtime at 4.0.0 or later; a pre-4.0 runtime cannot see `.mdx` artifacts, so mixed versions report incomplete state.

## Install

```bash
npm install -g godpowers @godpowers/mcp
```

## Run

```bash
godpowers-mcp serve --project=.
```

## Codex Setup

```bash
godpowers-mcp setup --host=codex --project=.
godpowers-mcp setup --host=codex --project=. --write
```

- [DECISION] The first command prints a registration plan without writing files.
- [DECISION] The second command writes a managed `[mcp_servers.godpowers]` block to `~/.codex/config.toml`.
- [DECISION] No automatic host registration runs during package install.

## Tool Boundary

- [DECISION] `status` wraps `lib/dashboard.js` and returns rendered dashboard text plus structured status.
- [DECISION] `next` wraps `lib/dashboard.js` and returns the recommended next command from disk state.
- [DECISION] `gate_check` wraps `lib/gate.js` and returns the executable tier gate verdict.
- [DECISION] `lint_artifact` wraps `lib/artifact-linter.js` for one file inside the project root.
- [DECISION] `trace_requirement` wraps `lib/requirements.js` and returns requirement, roadmap, linkage, and ledger evidence.
- [DECISION] `work_report` wraps `lib/work-report.js` and returns the verification play-by-play (read-only; never advances the report cursor).
- [DECISION] `route` wraps `lib/quarterback.js` and classifies a prompt into an entry play without mutating state.
- [DECISION] `verification_history` wraps `lib/evidence.js` and returns ledger records, optionally filtered to one substep.
