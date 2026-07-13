---
pillar: privacy
status: present
always_load: false
covers: [personal data, consent, retention, deletion, subject rights]
triggers: [privacy, personal data, pii, consent, retention, deletion]
must_read_with: [context, security]
see_also: [analytics]
---

## Scope

- [DECISION] This pillar captures privacy boundaries for Godpowers project-local events, adoption metrics, connectors, and exported telemetry.

## Context

- [DECISION] Godpowers stores workflow state and evidence locally under `.godpowers/` unless a user explicitly configures an external connector or telemetry export.
- [DECISION] OTel export and connector actions are explicit capabilities rather than silent data collection.

## Decisions

- [DECISION] Local evidence should record operational facts without copying secrets, credentials, or unnecessary personal content.

## Rules

- [DECISION] Do not place API tokens, session values, raw credentials, or unnecessary personal data in state, events, logs, checkpoints, or sync-back files.
- [DECISION] External export requires explicit configuration and must remain visible in closeout evidence.

## Workflows

- [DECISION] Before adding a new external data path, inventory collected fields, purpose, destination, retention behavior, deletion path, and user control.

## Watchouts

- [HYPOTHESIS] User-authored artifact excerpts can contain personal data even when the runtime itself does not collect identity fields.

## Touchpoints

- [DECISION] Privacy concerns touch `lib/events.js`, `lib/otel-exporter.js`, connector configuration, logs, checkpoints, and source-system sync-back.

## Gaps

(none)
