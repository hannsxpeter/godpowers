# @godpowers/mcp

- [DECISION] `@godpowers/mcp` is the first-party read-only MCP companion package for Godpowers.
- [DECISION] The main `godpowers` package stays dependency-free at runtime, and the MCP SDK dependency lives only in this companion package.
- [DECISION] Version 3.4.0 exposes five tools: `status`, `next`, `gate_check`, `lint_artifact`, and `trace_requirement`.
- [DECISION] Mutation tools are intentionally absent through the 3.4.0 release.

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
