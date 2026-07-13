---
pillar: observe
status: present
always_load: false
covers: [events, metrics, traces, checkpoints, logs]
triggers: [observe, observability, events, checkpoint, trace, metrics, logs]
must_read_with: [repo]
see_also: [quality]
---

## Scope

- [DECISION] This pillar captures observability mechanisms inside Godpowers itself.

## Context

### Signals

- [DECISION] `lib/events.js` writes hash-chained JSONL events under `.godpowers/runs/<run-id>/events.jsonl`.
- [DECISION] `lib/checkpoint.js` writes `.godpowers/CHECKPOINT.mdx` as the durable orientation pin for future sessions.
- [DECISION] `/god-logs`, `/god-metrics`, and `/god-trace` read the event stream.
- [DECISION] `lib/outcome-metrics.js` derives time to accepted change, recorded cost, manual intervention, resume success, deployment completion, and rollback proof without filling absent evidence.
- [DECISION] `lib/dashboard.js` renders disk-derived project status, action brief, proactive checks, and host guarantees.
- [DECISION] Event vocabulary includes local helper, dashboard, host capability, dogfood, source-system import, sync-back, repo-doc sync, and repo-surface sync events.

## Decisions

(none)

## Rules

(none)

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] Checkpoint drift can confuse future sessions if state changes without `lib/checkpoint.syncFromState`.
- [HYPOTHESIS] Event vocabulary drift can break OTel export, dashboard closeouts, and recovery if schemas and runtime events diverge.

## Touchpoints

- [DECISION] Observability context synchronizes from authoritative state through the managed section below.

## Gaps

(none)

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/state.json`.
- Rule: keep this pillar aligned when these artifacts change durable observe truth.
<!-- godpowers:pillar-sync:end -->
