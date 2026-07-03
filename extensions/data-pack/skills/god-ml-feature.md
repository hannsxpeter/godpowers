---
name: god-ml-feature
description: |
  Add an ML feature with training-serving consistency, freshness SLOs,
  and drift detection. Requires @godpowers/data-pack.

  Triggers on: "god ml feature", "/god-ml-feature", "ML feature", "feature store"
extension: "@godpowers/data-pack"
---

# /god-ml-feature

Spawn god-ml-feature-engineer.

## Verification
- `.godpowers/data/ml-features/<name>/FEATURE.mdx` exists
- Training-serving consistency proven
- Freshness SLO documented
- Drift detection wired

## On Completion
```
ML feature ready: .godpowers/data/ml-features/<name>/

Suggested next:
  - /god-build to implement
  - /god-observe to wire freshness alerts
```
