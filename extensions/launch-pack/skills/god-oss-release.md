---
name: god-oss-release
description: |
  Open source library release. README, versioning, examples that run,
  status signals. Requires @godpowers/launch-pack.

  Triggers on: "god oss", "/god-oss-release", "open source release", "publish library"
extension: "@godpowers/launch-pack"
---

# /god-oss-release

Plan an open source library release.

## Setup

1. Verify @godpowers/launch-pack is installed
2. Verify library has working code, tests, basic docs
3. Spawn god-oss-release-strategist

## Verification

- `.godpowers/launch/oss/PLAN.mdx` exists
- README has all required sections
- All code examples in README verified to run
- Version is v0.1.0 (not jumping to v1.0)
- LICENSE present
- CHANGELOG present

## On Completion

```
OSS release plan ready: .godpowers/launch/oss/PLAN.mdx

Library: [name]
Version: v0.1.0
Examples verified: [N]/[N]

Suggested next:
  - Publish to npm/PyPI/crates.io
  - Use /god-show-hn for developer audience launch
  - Tag and release on GitHub
```
