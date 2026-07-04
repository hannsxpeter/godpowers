---
name: god-loop
description: |
  Stand up the minimum viable loop: one automation, one skill, one state
  file, one objective gate. Turns Godpowers from a human-launched
  orchestrator into an autonomous loop that finds work, does it, verifies
  it against a machine-checkable gate, records what happened, and decides
  the next move on its own.

  Triggers on: "god loop", "/god-loop", "set up a loop", "autonomous
  loop", "loop engineering", "minimum viable loop", "run this on a
  schedule", "self-driving godpowers"
---

# /god-loop

Build the smallest autonomous loop that still holds itself accountable.

A loop is only worth building when four conditions hold: the work recurs, a
gate can verify the result without a human, there is enough token budget, and
the agent can reach the tools it needs. `/god-loop` checks those first, then
wires the four moving parts in order.

## The four parts (built in this order)

1. **Automation** - the heartbeat. A host-native schedule or event trigger
   from `/god-automation-setup` decides when the loop wakes up.
2. **Skill** - the work. One Godpowers skill (for example `/god-build`,
   `/god-fix`, or `/god-hygiene`) is the unit of work the loop runs each tick.
3. **State file** - the memory. `.godpowers/state.json` and the run ledger let
   the loop resume instead of restart, so each tick builds on the last.
4. **Objective gate** - the brake. A machine-checkable gate (tests, lint, a
   tier gate, or the have-nots validator) must pass before a change is
   accepted. No gate, no loop: a loop without an objective gate is the
   Ralph Wiggum failure mode, quietly shipping half-done work.

## Usage

### `/god-loop`
Interactive: check the four conditions, then propose an automation, a work
skill, and a gate for this project.

### `/god-loop --dry-run`
Print the proposed loop (heartbeat, work skill, gate, stop condition) without
creating any host automation.

### `/god-loop --check`
Report loop health only: the accepted-change rate and whether the loop is
meeting its target.

## Health signal

A loop is healthy when its **accepted-change rate** stays above target
(default 50%): of the changes the loop proposed, most survived the gate
instead of being rejected or rolled back. See `/god-metrics` for the number
and `lib/change-metrics.js` for how it is derived from the event ledger.

## Guardrails

- Every loop needs a hard stop: a token budget, an iteration cap, or a human
  review gate. `/god-loop` refuses to wire a loop with no stop condition.
- The maker and the checker stay separate. The skill that writes the change is
  never the one that grades it (see `/god-review`).
- Write-scoped external actions go through `/god-connect`, never straight from
  the loop.

## Implementation

Built-in. Composes `/god-automation-setup` (heartbeat),
`lib/change-metrics.js` (health), the outcome-loop budget tracker, and the
tier gates. Records the chosen loop in `.godpowers/automations.json` only
after the host setup succeeds.

## Related

- `/god-automation-setup` - create the host-native heartbeat
- `/god-metrics` - accepted-change rate and per-tier stats
- `/god-connect` - let the loop act on GitHub, Linear, Slack, or Sentry
- `/god-harden` - re-audit the loop's permissions on a cadence
- `/god-mode` - the full one-shot arc when you do not want a standing loop
