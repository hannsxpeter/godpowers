# Inspiration

This file acknowledges the ideas Godpowers builds on. Everything in the
repository was written independently; no upstream prose, code, fixture, or
result is copied or vendored, and none of these projects is a runtime
dependency.

- **Superpowers** ([github.com/anthropics/skills](https://github.com/anthropics/skills)):
  subagents with fresh context and review by an agent that did not write the
  code. Godpowers keeps this as `god-reviewer`.
- **BMAD-METHOD** ([github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)):
  thin, incremental delivery slices. Godpowers keeps this as the slice list in
  `PLAN.md`.
- **Mythify**: executed verification records instead of claimed ones. Godpowers
  keeps this as `godpowers verify` and the evidence ledger, rewritten for 7.0.
- **pstack** (MIT): the blast-radius review idea behind the reviewer's "one
  fact that must hold" check, and the prose-pattern review behind the advisory
  notes in `godpowers lint`.
- **tstack** ([github.com/t3dotgg/tstack](https://github.com/t3dotgg/tstack), MIT,
  by Theo Browne): sol-loop's verdict line, budget, and diff-growth rule,
  which became `godpowers verdict` and the review growth warning; the
  base-drift rule from modernize and babysit-pr, now `gate ship --onto`;
  full-send and full-stop's unattended mode, question-tool rule, and handoff
  states, now in `/god`; skill descriptions written as triggers; and Codex
  `agents/openai.yaml`, which installs next to each skill. Godpowers did not
  adopt council (three reviewers per round), the pr-wait watcher (hosts watch
  PRs), unattended merging, or the PR-comment and PR-filing skills.
- **arc-ready**: artifact discipline, which shaped the 6.x standards. Godpowers
  7 no longer enforces those as gates.

A future copy of a substantial portion of an MIT-licensed source would need its
copyright and permission notice. Godpowers itself is MIT licensed; see
[LICENSE](LICENSE).
