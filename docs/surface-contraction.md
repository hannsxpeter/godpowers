# Surface Contraction Evidence

## Scope

- [DECISION] This document records the Phase 5 evidence boundary for shrinking the default installed Godpowers command surface.
- [DECISION] This document does not change installer behavior, command deprecation behavior, or slash-command routing.
- [DECISION] The next Phase 5 behavioral slice can use this file as the checked source for which proof-campaign commands map to the twelve-verb surface and which commands require explicit exceptions.

## Repository Facts

- [DECISION] `lib/install-profiles.js` is the current source for install profile membership.
- [DECISION] The `core` profile currently selects 15 skills from the shipped `skills/` directory.
- [DECISION] The `builder` profile currently selects 33 skills from the shipped `skills/` directory.
- [DECISION] The `maintainer` profile currently selects 44 skills from the shipped `skills/` directory.
- [DECISION] The `suite` profile currently selects 20 skills from the shipped `skills/` directory.
- [DECISION] The `full` profile currently selects 112 skills from the shipped `skills/` directory.
- [DECISION] `lib/install-profiles.js` still defaults an omitted profile to `full`.
- [DECISION] Phase 5 may flip the omitted-profile default only after a behavior slice updates installer tests, public docs, and release artifacts in the same claim.

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
| `/god-observe` | Explicit exception | [DECISION] Treat observe as a Phase 5 routing exception because the current Phase 5 verb definitions do not name observe under `ship` or `audit`, while Run B proves the command is part of shipping closure. |
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

- [DECISION] The next Phase 5 behavioral slice should preserve the current `core` count near 15 when it flips the omitted installer profile away from `full`.
- [DECISION] The current `core` profile keeps `god`, `god-help`, `god-version`, `god-next`, `god-status`, `god-progress`, `god-doctor`, `god-settings`, `god-init`, `god-mode`, `god-build`, `god-review`, `god-sync`, `god-quick`, and `god-fast`.
- [DECISION] The next Phase 5 behavioral slice should not remove proof-used leaves from `full`; it should add deprecation metadata and successor routing only when the new verb dispatch skills exist.
- [DECISION] The next Phase 5 behavioral slice should decide whether `/god-observe` routes through `ship`, routes through `audit`, or remains a full-profile exception with a documented successor.
- [DECISION] The next Phase 5 behavioral slice should keep `quick-proof`, `status`, `next`, `gate`, and `dogfood` CLI helpers outside slash-command profile counts.
