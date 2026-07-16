# Surface Contraction Evidence

## Scope

- [DECISION] This document records the Phase 5 evidence boundary for shrinking the default installed Godpowers command surface.
- [DECISION] This document records the installer behavior, command deprecation behavior, and slash-command routing boundary after the Phase 5 verb dispatch slice.
- [DECISION] The Phase 5 behavioral slice uses this file as the checked source for which proof-campaign commands map to the twelve-verb surface and which commands require explicit exceptions.

## Repository Facts

- [DECISION] `lib/install-profiles.js` is the current source for install profile membership.
- [DECISION] The `starter` profile currently selects 8 skills from the shipped `skills/` directory.
- [DECISION] The `core` profile currently selects 15 skills from the shipped `skills/` directory.
- [DECISION] Every core command stays at the high-level workflow boundary.
- [DECISION] The `builder` profile currently selects 44 skills from the shipped `skills/` directory.
- [DECISION] The `maintainer` profile currently selects 53 skills from the shipped `skills/` directory.
- [DECISION] The `suite` profile currently selects 24 skills from the shipped `skills/` directory.
- [DECISION] The `full` profile currently selects 122 skills from the shipped `skills/` directory.
- [DECISION] `lib/install-profiles.js` defaults an omitted profile to `core`.
- [DECISION] `--profile=full` preserves every shipped slash command, including deprecated compatibility aliases.

## Evidence Sources

| Source | Verified command evidence | Phase 5 use |
|---|---|---|
| [Run A](case-studies/run-a.md) | [DECISION] Run A directly records `/god-mode --brownfield --yolo`, tier gate CLI checks, status CLI output, and a passed adoption canary. | [DECISION] Use Run A for autonomous entry, gate-helper exception, and status proof only, because it does not enumerate every internal slash stage. |
| [Run B](case-studies/run-b.md) | [DECISION] Run B directly records `/god-mode`, `/god-preflight`, `/god-prd`, `/god-arch`, `/god-roadmap`, `/god-stack`, `/god-repo`, `/god-build`, `/god-deploy`, `/god-observe`, `/god-harden`, `/god-launch`, `/god-sync`, and `/god-status`. | [DECISION] Use Run B as the complete green host-proof surface for the local web-app path. |
| [Run C](case-studies/run-c.md) | [DECISION] Run C directly records `/god-mode`, `/god-preflight`, `/god-archaeology`, `/god-reconstruct`, `/god-tech-debt`, `/god-prd`, `/god-design`, `/god-arch`, `/god-roadmap`, `/god-stack`, `/god-repo`, `/god-build`, `/god-harden`, `/god-launch`, `/god-sync`, and `/god-status`. | [DECISION] Use Run C as the blocked-but-useful host-proof surface for brownfield planning and harden blockage. |
| [sindresorhus/is canary](case-studies/sindresorhus-is-adoption-canary.md) | [DECISION] The canary records quick-proof, status, and next CLI signals with `/god-prd` and `/god-init` recommendations. | [DECISION] Use this canary for first-contact CLI proof, not for host slash-command proof. |
| [expressjs/cors canary](case-studies/expressjs-cors-adoption-canary.md) | [DECISION] The canary records quick-proof, status, and next CLI signals with `/god-prd` and `/god-init` recommendations. | [DECISION] Use this canary for first-contact CLI proof, not for host slash-command proof. |
| [tinyhttp canary](case-studies/tinyhttp-adoption-canary.md) | [DECISION] The canary records quick-proof, status, and next CLI signals with `/god-prd` and `/god-init` recommendations. | [DECISION] Use this canary for first-contact CLI proof, not for host slash-command proof. |

## Verb Mapping

| Observed command | Phase 5 target | Evidence decision |
|---|---|---|
| `/god-mode` | `/god` front door and core compatibility leaf | [DECISION] Keep `/god-mode` in the default boundary until `/god` supports the same autonomous project-run entry with flags. |
| `/god-preflight` | `audit` | [DECISION] Route preflight through audit because Run B and Run C used it to inspect brownfield readiness before planning. |
| `/god-archaeology` | `audit` | [DECISION] Route archaeology through audit because Run C used it as brownfield investigation before reconstruction. |
| `/god-reconstruct` | `plan` | [DECISION] Route reconstruction through plan because Run C used it to create planning context from existing code. |
| `/god-tech-debt` | `audit` | [DECISION] Route technical debt through audit because Run C used it to score existing project risk. |
| `/god-prd` | `plan` | [DECISION] Route PRD through plan because Run B, Run C, and all three canaries use PRD as first planning output or recommendation. |
| `/god-design` | `plan` | [DECISION] Route design through plan because Run C used it as the product-experience planning step before architecture. |
| `/god-arch` | `plan` | [DECISION] Route architecture through plan because Run B and Run C used it after PRD and before roadmap or stack. |
| `/god-roadmap` | `plan` | [DECISION] Route roadmap through plan because Run B and Run C used it to sequence work. |
| `/god-stack` | `plan` | [DECISION] Route stack through plan because Run B and Run C used it as the implementation choice gate. |
| `/god-repo` | `build` | [DECISION] Route repo scaffolding through build because Run B and Run C used it as the setup step before implementation. |
| `/god-build` | `build` | [DECISION] Route build through build because Run B and Run C used it for implementation and local verification. |
| `/god-deploy` | `ship` | [DECISION] Route deploy through ship because Run B used deploy before observe, harden, and launch. |
| `/god-observe` | `ship` | [DECISION] Route observe through ship because Run B proves observability is part of shipping closure between deploy and launch. |
| `/god-harden` | `audit` | [DECISION] Route harden through audit because the Phase 5 plan names harden as an audit route and Run B plus Run C used it as the launch gate. |
| `/god-launch` | `ship` | [DECISION] Route launch through ship because the Phase 5 plan names launch as a ship route and Run B plus Run C reached that stage. |
| `/god-sync` | `sync` | [DECISION] Route sync through sync because Run B and Run C used it for final artifact and state alignment. |
| `/god-status` | `audit` | [DECISION] Route status through audit because the Phase 5 plan names status as an audit view and Run B plus Run C used it after the host run. |
| `quick-proof` CLI | Explicit exception | [DECISION] Keep quick-proof as an installer CLI helper outside slash-command profile contraction because all three CLI canaries use it before host slash commands. |
| `status` CLI | `audit` support helper | [DECISION] Keep status CLI aligned with the audit route because Run A and the canaries use it for first-contact and closeout proof. |
| `next` CLI | `/god` front door support helper | [DECISION] Keep next CLI aligned with front-door routing because the canaries use it to report the first recommended command. |
| `gate` CLI | Explicit exception | [DECISION] Keep gate as a runtime helper outside slash-command profile contraction because Run A, Run B, and Run C used gate evidence to verify tier enforcement. |
| `dogfood` CLI | Explicit exception | [DECISION] Keep dogfood as a maintainer release helper outside core slash-command contraction because Run B and Run C used it inside the Godpowers repository. |

## Core Boundary For The Next Slice

- [DECISION] The Phase 5 behavior slice preserves the `core` count near 15 while flipping the omitted installer profile away from `full`.
- [DECISION] The current `core` profile keeps `god`, `god-first-run`, `god-demo`, `god-help`, `god-surface`, `god-version`, `god-status`, `god-init`, `god-plan`, `god-mode`, `god-build`, `god-fix`, `god-ship`, `god-sync`, and `god-undo`.
- [DECISION] Review, audit, capture, and extension leaves remain available through role profiles and the full 122-command compatibility profile.
- [DECISION] The Phase 5 behavior slice does not remove proof-used leaves from `full`.
- [DECISION] `god-locate`, `god-lifecycle`, and `god-roadmap-check` are deprecated compatibility aliases with `successor` frontmatter.
- [DECISION] `quick-proof`, `status`, `next`, `gate`, and `dogfood` CLI helpers remain outside slash-command profile counts.
