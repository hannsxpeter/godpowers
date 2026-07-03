---
pillar: observe
status: active
always_load: false
covers: [events, metrics, traces, checkpoints, logs]
triggers: [observe, observability, events, checkpoint, trace, metrics, logs]
must_read_with: [repo]
see_also: [quality]
---

## Scope

- [DECISION] This pillar captures observability mechanisms inside Godpowers itself.

## Signals

- [DECISION] `lib/events.js` writes hash-chained JSONL events under `.godpowers/runs/<run-id>/events.jsonl`.
- [DECISION] `lib/checkpoint.js` writes `.godpowers/CHECKPOINT.mdx` as the durable orientation pin for future sessions.
- [DECISION] `/god-logs`, `/god-metrics`, and `/god-trace` read the event stream.
- [DECISION] `lib/dashboard.js` renders disk-derived project status, action brief, proactive checks, and host guarantees.
- [DECISION] Event vocabulary includes local helper, dashboard, host capability, dogfood, source-system import, sync-back, repo-doc sync, and repo-surface sync events.

## Watchouts

- [HYPOTHESIS] Checkpoint drift can confuse future sessions if state changes without `lib/checkpoint.syncFromState`.
- [HYPOTHESIS] Event vocabulary drift can break OTel export, dashboard closeouts, and recovery if schemas and runtime events diverge.
