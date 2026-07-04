---
name: god-connect
description: |
  Detect and scope external connectors (GitHub, Linear, Slack, Sentry,
  Notion) so a loop can act on the outside world, not just read its own
  state. Godpowers delegates every action to the host's MCP connector and
  never vendors an API client, so credentials stay on the host. Reads are
  allowed by default; writes require an explicit per-connector opt-in.

  Triggers on: "god connect", "/god-connect", "connectors", "connect
  github", "connect linear", "let the loop open issues", "act on slack",
  "sentry triage", "external mcp connectors", "write scope"
---

# /god-connect

Let Godpowers act on external systems through the connectors your host already
exposes over MCP.

The comparison that motivated this: a loop that only exposes its own state is
half a loop. To close issues, move tickets, post updates, or triage errors, the
loop needs connectors. Godpowers stays dependency-free by **detecting** the
host's MCP connectors and **delegating** the action to them, the same way it
delegates scheduling to host-native schedulers.

## Supported connectors

| Connector | Category | Example read | Example write |
|-----------|----------|--------------|---------------|
| GitHub | code-host | list issues, read PR | open issue, comment, open PR |
| Linear | issue-tracker | list issues, read cycle | create issue, move issue |
| Slack | chat | read channel | post message |
| Sentry | errors | list issues, read event | assign, resolve |
| Notion | docs | search, read page | create page, update page |

## Usage

### `/god-connect`
Detect available connectors and show each connector's current scope.

### `/god-connect status`
Report detected connectors, read/write scope, and the config path.

### `/god-connect allow <connector> [--actions=a,b]`
Opt a connector into write scope, optionally narrowed to an action allowlist.
Writes `.godpowers/connectors.json`.

### `/god-connect deny <connector>`
Disable a connector (blocks even reads until re-enabled).

## Policy gate

Every action passes `lib/connectors.js` first:

- **Reads** are allowed by default.
- **Writes** are denied unless `connectors.<id>.allowWrite` is `true`.
- Writes may be further narrowed to an `allowedActions` allowlist.
- Godpowers only names the connector and the action; the host MCP connector
  performs it, so credentials never pass through Godpowers.

## Priority ladder

When more than one connector can serve a task, Godpowers walks a capability
ladder in priority order and stops at the first connector that is both available
on the host and enabled in config. It prefers a purpose-built connector over a
general one.

| Capability | Priority order |
|------------|----------------|
| `track-work` (issues, tickets) | Linear, then GitHub |
| `open-pr` | GitHub |
| `notify` | Slack |
| `triage-errors` | Sentry |
| `document` | Notion, then GitHub |

A disabled connector is skipped, not chosen. Backed by
`connectors.pickConnector(capability)` in `lib/connectors.js`.

## Implementation

Built-in. Backed by `lib/connectors.js` (registry, detection, policy, and the
capability ladder) and surfaced in host capability reporting
(`lib/host-capabilities.js`). Config lives in `.godpowers/connectors.json`.

## Related

- `/god-loop` - the loop that uses these connectors to act
- `/god-harden` - re-audits connector write scope on a cadence
- `/god-automation-setup` - the schedule that drives the loop
