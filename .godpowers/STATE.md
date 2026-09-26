---
godpowers: 7
project: godpowers
stage: ship
verify: npm test
updated: 2026-09-26
---
# godpowers

## Goal
Keep Godpowers a small, verified core: durable project state, checks bound to exact code, an independent reviewer, and gates enforced by hooks in Claude Code and Codex.

## Now
- 7.0.0 is built, independently reviewed (all high and medium findings fixed with regression tests), and smoke-tested live in Codex.

## Next
- Publish 7.0.0 from a v7.0.0 tag, then upgrade the local install on every host.

## Risks
- [ ] low: Windows behavior (process-tree kill, argument quoting) is untested
- [ ] low: the session-start snapshot takes about 5 seconds on repositories with 120,000 files
