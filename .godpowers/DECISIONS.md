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

## 2026-09-27: Make subagent sizing its own step
Context: Across the 8 A/B runs since skills first asked for sizing (two each at a38c592, 902d024, 9a9ab58, and a5641cb), the reviewer inherited the session's model and effort in 2 and got only an effort in 1; the inherited xhigh reviewer used about 2.4x the input tokens of a sized one.
Decision: Before starting any subagent, the agent says which model and effort it picked and why, then passes both explicitly in the call that starts it.
Why: Naming the choice turns a buried clause into a step, and a skipped choice becomes visible in the transcript. Not yet measured.

## 2026-11-08: Reuse a passing check instead of running it again
Context: `verify` ran the command every time, even when a passing record of the same command already matched the exact code.
Decision: `verify` returns the latest passing record of the same command on the same tree without running it; `--force` runs it anyway.
Why: The fingerprint already proves nothing changed, so a second run costs time without adding evidence. Environment drift is the caller's to rule out with `--force`.

## 2026-11-08: Judgment records survive documentation edits, check records do not
Context: A README typo after review voided the review and security records for the ship gate, although the stop gate already treated documentation-only edits as safe.
Decision: Records also store a fingerprint over non-documentation files. Review, harden, and ship records match on it; verify and waive records still match only the whole tree. A `docs:` setting in STATE.md defines documentation, or turns the exemption off.
Why: A person or reviewer judged the code, which did not change. A test suite can read documentation (this repository's does), so checks stay bound to everything.

## 2026-11-08: Scale the ship gate to the risk of the change since the last release
Context: The ship gate demanded a review and a security record for every release, including documentation-only ones, which spends review on low-risk work.
Decision: `godpowers risk` classifies the change since the latest `v*` tag as low, normal, or high from its paths. The ship gate needs a check for low, a review for normal, and a security record as well for high. Without a base the tier is high.
Why: Attention should follow blast radius, not apply equally to every change. Unknown means high, so the gate only relaxes when the CLI can see what changed.

## 2026-11-08: Do not register a hook that runs the repository's fast check
Context: A per-edit hook could run the STATE.md `fast` command automatically.
Decision: Godpowers ships `godpowers fast` and documents a hook users can add to their own settings, but its installer does not register one.
Why: An installed hook would run a command any cloned repository declares, without a permission prompt. Godpowers runs repository commands only when the agent or user calls the CLI.
