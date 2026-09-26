# Decisions

Append-only. Newest last. To change a decision, add an entry that supersedes it.
## 2026-09-26: Cut Godpowers to a small core in 7.0
Context: 6.4 shipped 124 commands, 41 agents, and 1.35 MB of prompt files. Frontier models plan and review well without them, and the author's own usage had moved to the state files.
Decision: Keep 8 commands and 4 agents. Move enforcement into hooks and the CLI. Leave 6.x available as godpowers@6.
Why: Less prompt text costs fewer tokens on every call, and checks in code hold regardless of which model runs.

## 2026-09-26: Build the fingerprint with read-only git commands
Context: The first design staged files into a temporary index, which writes blobs to .git. A live Codex run showed that its workspace-write sandbox keeps .git read-only, so evidence could not bind to code there.
Decision: Hash files from `ls-files --stage`, `diff-files`, and `ls-files --others`, using git blob hashes, and write nothing.
Why: Works in sandboxes, and cannot corrupt a repository.

## 2026-09-26: Register hooks in settings files, not only through a plugin
Context: Claude Code plugins namespace commands (/godpowers:god), and Codex reads hooks from ~/.codex/hooks.json.
Decision: The npm installer merges three hook entries into ~/.claude/settings.json and ~/.codex/hooks.json, touching only its own entries. A plugin manifest is offered as an alternative for Claude Code.
Why: Short command names and one install path for both hosts the author uses.

## 2026-09-26: Skills call the CLI through npx -y godpowers@7
Context: Skills are plain files shared across hosts and cannot know where the CLI was copied.
Decision: Use `npx -y godpowers@7` in skills; hooks use the absolute path of the installed copy.
Why: Works on every host with Node, pinned to the major version so the evidence format stays compatible.

## 2026-09-26: Run only the stages a goal needs, and always size subagents
Context: The first A/B run on a real feature found the full plan, build, review, harden, and ship pipeline as correct as plain Codex at about 4x the cost, with review, harden, and ship taking 55-60% of the tokens; one of two reviewers silently inherited the session's model at xhigh.
Decision: /god gives a feature a plan, a build, and one fresh-context review, adds /god-harden only for trust-boundary changes, and runs /god-ship only on request. Skills require the agent to set every subagent's model and effort itself.
Why: Pay for process only where it changes outcomes; the ship gate still demands a security record before any release.

## 2026-09-26: Skip the plan for specified requests and record the check once per build
Context: With proportional stages the A/B task still cost about 2.4x plain Codex. The main thread made about 25 tool calls against 11, mostly bookkeeping: a plan for a request that already listed its requirements, and 9-12 test runs, several recorded through the CLI after each slice.
Decision: /god skips /god-plan when the request already lists its requirements, and /god-build runs targeted tests directly and records the project check once, on the final code.
Why: Every extra call resends the whole context, and the Stop hook and ship gate only need one passing record for the final code.
