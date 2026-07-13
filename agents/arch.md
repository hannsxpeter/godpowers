---
pillar: arch
status: active
always_load: false
covers: [architecture, runtime model, state model, workflows, agents]
triggers: [architecture, workflow, state, router, agent, runtime]
must_read_with: [context, repo]
see_also: [quality, deploy]
---

## Scope

- [DECISION] This pillar captures architectural context for Godpowers.

## Decisions

- [DECISION] Godpowers uses a pure-skill runtime where slash-command skills spawn specialist agents inside the host AI coding tool.
- [DECISION] The CLI surface stays narrow: installer and uninstall flows, read-only status and next-route helpers, automation status and setup planning, dogfood fixtures, and extension scaffolding.
- [DECISION] Routing decisions are stored in `routing/*.yaml`.
- [DECISION] Workflow plans are stored in `workflows/*.yaml` and planned by `lib/workflow-runner.js`.
- [DECISION] Workflow plans can expose visible local helpers such as `repo-doc-sync`, `repo-surface-sync`, `host-capabilities`, `source-sync-back`, and `checkpoint-sync`.
- [DECISION] `lib/state-lock.js` provides cooperative advisory locking through `.godpowers/state.json`.
- [DECISION] Existing `.godpowers` projects refresh runtime feature awareness through `lib/feature-awareness.js`.
- [DECISION] `ARCHITECTURE.md` owns the architecture audit playbook for disconnected commands, actions, and workflows.
- [DECISION] `ARCHITECTURE-MAP.md` renders the same audit as a graph from skills to routes, agents, workflows, recipes, docs, and package checks.
- [DECISION] `ARCHITECTURE-MAP.md` keeps a complete core command supplement so all 122 shipped skills appear in the human-readable map.
- [DECISION] Workflow plans use canonical helper IDs such as `source-sync-back` and `pillars-sync-plan`, while `/god-sync` output may show the shorter aliases `source-sync` and `pillars-sync`.
- [DECISION] The current executable audit status is fresh for repo surface, route quality, recipe coverage, and workflow planning.

## Watchouts

- [HYPOTHESIS] Runtime behavior depends on host AI tools exposing skill and agent capabilities consistently.
- [HYPOTHESIS] Local helper work must stay visible in closeouts so automatic work does not become hidden orchestration.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/arch/ARCH.mdx`.
- Rule: keep this pillar aligned when these artifacts change durable arch truth.

## Extracted durable signals

From `.godpowers/arch/ARCH.mdx`:
- [DECISION] A developer invokes Godpowers inside an AI coding host, which loads installed skills and specialist agents from the host-specific runtime directory.
- [DECISION] Godpowers reads and writes project-local Pillars, `.godpowers` state, planning artifacts, source files, and verification evidence.
- [DECISION] GitHub Actions and npm are external release services reached only after explicit user authority and identity-bound release gates.
- [DECISION] Context: AI coding sessions end, compact, and move between hosts.
- [DECISION] Decision: `.godpowers/state.json` is authoritative and generated views derive from it.
- [DECISION] Rationale: A new session can verify state without trusting conversation memory.
- [DECISION] Flip point: Replace JSON state only if a portable store offers atomic local reads, offline operation, and deterministic export with lower complexity.
- [DECISION] Consequence: State writers must refresh generated views and checkpoints.
<!-- godpowers:pillar-sync:end -->
