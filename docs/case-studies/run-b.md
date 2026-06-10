# Phase 2 Host Proof Run B

## Repository Identity

- [DECISION] Slot B is a permissively licensed web app or app template with a runnable local development workflow.
- [DECISION] Repository URL: `https://github.com/vitejs/create-vite-app.git`.
- [DECISION] Repository commit: `7b1c46dab57d14abd5f36941fe867a3d45e7c6af`.
- [DECISION] License: MIT, verified from `package.json` and `LICENSE` in the shallow clone.
- [DECISION] Selection rationale: `create-vite-app` ships app templates, and `template-react/package.json` exposes `dev` and `build` scripts backed by Vite.
- [DECISION] No maintainer relationship is recorded for this automation.

## Host Run Status

- [DECISION] Host invocation was not started for Slot B in this run.
- [DECISION] Phase 2 sequencing requires triage after Slot A before repeating the host proof for Slot B.
- [DECISION] Slot A did not produce durable host-run artifacts before interruption, so Slot B remains selected but unrun.
- [DECISION] Case-study claim: this is not a completed published host-run case study.

## Evidence Protocol

- [DECISION] CLI canary result: `node scripts/run-adoption-canary.js https://github.com/vitejs/create-vite-app.git --output=/tmp/godpowers-phase2/create-vite-app-canary.md` passed and wrote a report.
- [DECISION] Host guarantee line from the CLI canary was `Host guarantees: full on unknown`.
- [DECISION] No wall-clock host-run time, `/god-cost`, pauses, gate failures, repairs, validation commands, or shipped outcome exist for Slot B yet.

## Blocker

- [DECISION] Blocker: Slot B is waiting on a completed or genuinely failed Slot A host-run artifact.
- [OPEN QUESTION] Should Slot B use the repository root or one copied template directory as the target project root? Owner: maintainer. Due: before starting Slot B.
