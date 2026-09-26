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
- **arc-ready**: artifact discipline, which shaped the 6.x standards. Godpowers
  7 no longer enforces those as gates.

A future copy of a substantial portion of an MIT-licensed source would need its
copyright and permission notice. Godpowers itself is MIT licensed; see
[LICENSE](LICENSE).
