---
name: godpowers
description: Shared contract for Godpowers projects (repos with a .godpowers/ folder): where state lives, how completion is proven with recorded checks, and which gates code enforces. Use when the user mentions godpowers or the repo has .godpowers/.
---

# Godpowers

Godpowers keeps a project's memory on disk and refuses unverified "done". You do the thinking. Godpowers supplies the state files, a definition of done, and gates that code enforces.

## Commands

| Command | Use it to |
| --- | --- |
| `/god` | ask what to do next, or drive a goal end to end |
| `/god-init` | set up `.godpowers/` in a repo, or migrate a 6.x project |
| `/god-plan` | write or refresh the plan |
| `/god-build` | implement plan slices test-first |
| `/god-review` | get an independent review in a fresh context |
| `/god-harden` | run a security pass |
| `/god-ship` | pass the release gate and ship |
| `/god-status` | see state, evidence, and risks |

## Files in `.godpowers/`

- `STATE.md`: the one state file. Frontmatter: `project`, `stage` (plan, build, review, harden, ship, done), `verify` (the project's check command). Sections: Goal, Now, Next, Risks.
- `PLAN.md`: goal, requirements with "Done when" checks, non-goals, design, slices.
- `DECISIONS.md`: append-only log of lasting decisions, `## YYYY-MM-DD: title`. Supersede, never edit.
- `evidence.jsonl`: written only by the CLI. Never edit it by hand.

Update STATE.md at milestones (stage change, slice done, new risk), not after every edit.

## Evidence

- Before saying code work is done, run the checks through the CLI: `npx -y godpowers@7 verify "<command>"`. It records the result against the exact code on disk.
- A passing record goes stale when code changes. Run it again after your last change.
- If no automated check can cover a change, record why with `npx -y godpowers@7 verify --waive "<reason>"` and say the change is unverified. Never waive a failing check.
- Report failures as failures, with the output.

## Risks

Risks are checkbox lines under `## Risks` in STATE.md: `- [ ] critical: what, where`. Tick the box when it is fixed. Severities: critical, high, medium, low. An open critical risk blocks shipping.

## Gates enforced by code

- Stop hook: if code changed during the session and no passing record matches it, you are asked to verify before finishing.
- Commit hook: `git commit` is blocked while `npx -y godpowers@7 lint` reports errors in `.godpowers/` (including edits to past decisions).
- Ship gate: `npx -y godpowers@7 gate ship` needs a passing check, review, and security record for the current code, and no open critical risk.

## Working style

- Scale the ceremony to the work. A one-line fix needs no plan; a new product needs PLAN.md.
- Delegate to a subagent only when a fresh context or parallel work helps. You choose which subagent (your host's own, or the optional god-* agents) and how it runs.
- Size every subagent before you start it instead of inheriting your own model and effort: pick the cheapest model and the lowest reasoning effort that will do the subtask well. Reading, searching, running checks, and mechanical edits suit a small, fast model at low effort. Subtle design, tricky correctness, and security-critical review justify the most capable model (for example Fable or Astra) at high effort.
- Ask the user only for decisions that are theirs: scope, spending, credentials, and public or irreversible actions.
