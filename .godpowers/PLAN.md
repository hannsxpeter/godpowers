# Plan

## Goal
Godpowers 7.0: cut the 6.x surface (124 commands, 41 agents, 1.35 MB of prompt
files) to a small core that keeps durable state, checks bound to exact code, an
independent reviewer, and gates enforced by hooks, and ship it to npm.

## Requirements
- R1: Eight commands and four agents replace the 6.x surface. Done when: `npm run budget` reports 13 files within budget and `test/package.test.js` passes.
- R2: Evidence is bound to the exact code. Done when: `test/git.test.js` and `test/evidence.test.js` pass, including subdirectory projects and a read-only `.git`.
- R3: The Stop hook asks for verification after unverified code changes, once per code state. Done when: `test/hooks.test.js` passes and a live Codex session is sent back to verify an unfinished change.
- R4: The commit hook blocks `git commit` while lint has errors. Done when: `test/hooks.test.js` passes and a live Codex session is blocked with the lint output.
- R5: The installer registers hooks without disturbing other tools and removes 6.x leftovers. Done when: `test/install.test.js` passes against a home directory seeded with 6.x and third-party files.
- R6: 6.x projects migrate without losing anything. Done when: `test/init-migrate.test.js` passes.

## Non-goals
- Keeping 6.x commands in this repository. `godpowers@6` stays installable from npm.
- Hooks for hosts other than Claude Code and Codex.

## Design
`lib/` holds the CLI: `git.js` (read-only snapshots), `evidence.js` (ledger),
`gate.js` (stop and ship gates), `hooks.js` (host hook handlers), `install.js`
(skills, agents, runtime copy, hook registration), `migrate.js`, `lint.js`,
`status.js`, `budget.js`. See ARCHITECTURE.md.

## Slices
- [x] 1. Remove the 6.x surface: repository file count down from 1015
- [x] 2. Core library and CLI: unit tests
- [x] 3. Skills and agents within budget: `npm run budget`
- [x] 4. Hooks and installer for Claude Code and Codex: tests plus a live Codex smoke run
- [x] 5. Migration and instruction-file cleanup: tests
- [x] 6. Docs, CI, publish workflow: `npm run release:check`
- [ ] 7. Independent review, publish 7.0.0, upgrade the local install: CI publish run and `godpowers doctor`

## Open questions
- none
