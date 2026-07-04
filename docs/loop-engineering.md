# Loop engineering in Godpowers

Loop engineering is the shift from prompting a coding agent by hand to building a
small system that prompts the agent for you: something that finds the work, hands
it to the agent, checks the result, records what happened, and decides the next
move on its own. Godpowers 5.0 makes that a first-class mode.

This document maps the loop-engineering model onto the Godpowers building blocks
and points at the exact commands and modules that implement each part.

## The four parts of a loop

A loop has four moving parts. `/god-loop` wires them in this order and refuses to
build a loop that is missing the last one.

| Part | Role | In Godpowers |
|------|------|--------------|
| Automation | Heartbeat: decides when the loop wakes | `/god-automation-setup`, host-native schedulers (`lib/automation-providers.js`) |
| Skill | Work: the unit of work per tick | any Godpowers command (`/god-build`, `/god-fix`, `/god-hygiene`, ...) |
| State file | Memory: resume instead of restart | `.godpowers/state.json` and the run ledger (`lib/events.js`) |
| Objective gate | Brake: a change must pass before it is accepted | tier gates, the have-nots validator, tests and lint |

## Osmani's loop structure, mapped

The canonical loop structure is Automation -> Context -> Agent -> Verification ->
Gate -> State. Godpowers implements each stage:

- **Automation** -> `lib/automation-providers.js` detects 15+ host schedulers and
  records opt-in automations in `.godpowers/automations.json`.
- **Context** -> the Pillars layer (`AGENTS.md` plus routed `agents/*.md`) and
  the 122 skills carry durable project knowledge across runs.
- **Agent** -> fresh-context specialist agents spawned per sub-step.
- **Verification** -> the three-axis system: static lint, linkage drift, and
  runtime browser audit.
- **Gate** -> the have-nots (grep-testable failure modes) and tier gates block
  progress mechanically.
- **State** -> `.godpowers/state.json` is the one authoritative source; the
  hash-chained event ledger records every step.

## The one number that matters: accepted-change rate

Tokens spent and tasks attempted are vanity numbers. The metric that tracks
whether a loop is actually producing shippable work is the **accepted-change
rate**: of the changes the loop proposed, what fraction survived the gate instead
of being rejected or rolled back.

- Target: keep it above 50% (the loop-engineering rule of thumb).
- Source: `lib/change-metrics.js` derives it from the event ledger. It prefers
  explicit `change.accepted` / `change.rejected` events and otherwise falls back
  to `gate.pass`, `gate.fail`, and `state.rollback`.
- Surface: `/god-metrics` and the read-only MCP `change_metrics` tool.

A healthy rate means the loop's first attempts survive review. A low rate means
the loop is thrashing and should be paused and inspected.

## Letting the loop act: connectors

A loop that only reads its own state cannot act on the outside world. `/god-connect`
lets the loop open a GitHub issue, move a Linear ticket, post to Slack, or triage
a Sentry error, by delegating to the connectors the host already exposes over MCP.

- Godpowers never vendors an API client and never handles credentials; it only
  names the connector and the action (`lib/connectors.js`).
- Reads are allowed by default. Writes are denied until the project opts a
  connector into write scope in `.godpowers/connectors.json`, optionally narrowed
  to an action allowlist.

## Keeping the loop safe: permission re-audit

An unattended loop accumulates permission creep. `lib/reaudit.js` tracks how
stale the last permission and attack-surface audit is (default 30-day cadence)
and reports when the next one is due. `/god-harden` records and reports it, and a
read-only `permission-reaudit` automation template can run it on schedule.

## Failure modes the design guards against

- **Ralph Wiggum failure** (a loop that quietly ships half-done work): prevented
  by the objective-gate requirement and the accepted-change-rate signal. A loop
  with no hard stop is refused.
- **Self-grading** (the agent that writes the change also approves it): prevented
  by spawning the reviewer in a separate fresh context (see `/god-review`).
- **Runaway cost**: every loop needs a hard stop (a token budget, an iteration
  cap, or a human review gate); `/god-budget` sets the caps.

## When not to build a loop

Loops are worth building only when the work recurs, a gate can verify the result
without a human, there is enough token budget, and the agent can reach the tools
it needs. For one-off work, use `/god-mode` (a single autonomous arc) instead of
a standing loop.
