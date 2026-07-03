---
name: god-dashboard
description: |
  Build a dashboard where every chart answers a question and every question
  ties to an action. Requires @godpowers/data-pack.

  Triggers on: "god dashboard", "/god-dashboard", "build dashboard", "Grafana"
extension: "@godpowers/data-pack"
---

# /god-dashboard

Spawn god-dashboard-builder.

## Verification
- `.godpowers/data/dashboards/<name>/SPEC.mdx` exists
- Every chart has a question
- Every chart ties to an action
- No more than 7 charts per dashboard

## On Completion
```
Dashboard spec ready: .godpowers/data/dashboards/<name>/

Suggested next:
  - /god-build to implement charts in your tool (Grafana, Datadog, etc.)
  - Wire annotations from your deploy pipeline
```
