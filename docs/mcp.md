# MCP Companion

## Purpose

- [DECISION] `@godpowers/mcp` is the first-party MCP companion package for Godpowers.
- [DECISION] The companion package exposes read-only MCP tools over stdio.
- [DECISION] The main `godpowers` package remains dependency-free at runtime.
- [DECISION] The MCP SDK dependency is isolated in `@godpowers/mcp`.

## Tools

- [DECISION] `status` wraps `lib/dashboard.js` and returns dashboard state from disk.
- [DECISION] `next` wraps `lib/dashboard.js` and returns the recommended next command.
- [DECISION] `gate_check` wraps `lib/gate.js` and returns the executable tier gate verdict.
- [DECISION] `lint_artifact` wraps `lib/artifact-linter.js` for one file inside the project root.
- [DECISION] `trace_requirement` wraps `lib/requirements.js` and returns requirement, roadmap, linkage, and ledger evidence.

## Boundary

- [DECISION] MCP mutation tools are out of scope through the 3.7.0 release.
- [DECISION] The companion does not expose state mutation, artifact writes, route edits, or package publish actions.
- [DECISION] The companion resolves the Godpowers runtime from `--runtime-root`, `GODPOWERS_RUNTIME_ROOT`, a local checkout, or an installed `godpowers` package.

## Setup

```bash
npx godpowers mcp-info --project=.
npx -y -p godpowers@3.7.0 -p @godpowers/mcp@3.7.0 godpowers-mcp serve --project=.
```

- [DECISION] `godpowers mcp-info` is read-only and does not load the MCP SDK.
- [DECISION] The server command starts `@godpowers/mcp` over stdio for MCP-capable hosts.

## Codex Registration

```bash
npx -y -p godpowers@3.7.0 -p @godpowers/mcp@3.7.0 godpowers-mcp setup --host=codex --project=.
npx -y -p godpowers@3.7.0 -p @godpowers/mcp@3.7.0 godpowers-mcp setup --host=codex --project=. --write
```

- [DECISION] The first setup command prints the managed Codex config block without writing files.
- [DECISION] The second setup command writes the managed `[mcp_servers.godpowers]` block to `~/.codex/config.toml`.
- [DECISION] No automatic MCP registration runs during package install.

## Verification

```bash
npm --workspace @godpowers/mcp test
npm --workspace @godpowers/mcp run pack:check
```

- [DECISION] The protocol test spawns the server over stdio, completes MCP initialization, lists tools, and calls each tool against `fixtures/quick-proof/project`.
- [DECISION] The package check verifies the companion tarball contains only its runtime files, README, and license.
