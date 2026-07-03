# Auto-Invoke Visibility

Godpowers has two kinds of automatic work:

- Agent work: the host AI tool spawns a specialist such as `god-updater`,
  `god-context-writer`, `god-design-reviewer`, or `god-standards-check`.
- Local runtime work: JavaScript helpers update disk directly, such as
  `lib/reverse-sync.run`, `lib/pillars.applyArtifactSync`, or
  `lib/checkpoint.syncFromState`.

Both must be accountable to the user. Local runtime work is not a background
agent, but routine helper names do not need to lead the default transcript.

## Default Visibility Shape

```text
Synced project artifacts after the change. Details were written to .godpowers/SYNC-LOG.mdx.
```

Use one concise sentence when automatic work changes artifacts, creates review
items, changes the recommendation, or blocks progress. Otherwise write details
to the relevant log and keep the user-facing closeout focused on the next
command.

Use a detailed `Auto-invoked:` card only for `--verbose`, debugging,
release-gate evidence, or a direct user request for automation internals.

## Godpowers Dashboard

Every command that completes, pauses, or proposes work uses the same status
model, but the full dashboard is not printed by default.

When the runtime bundle is available, this model is computed by
`lib/dashboard.js`:

```js
const dashboard = require('./lib/dashboard');
const result = dashboard.compute(projectRoot);
console.log(dashboard.render(result, { brief: true }));
```

```text
Action brief:
  Next: <one command or user decision>
  Why: <one sentence tied to disk state>
  Readiness: <ready | needs attention>
  Attention: <none or top blockers, with overflow count>
  Host guarantees: <full | degraded | unknown>

Next commands:
- <recommended command>: <one sentence reason>
- /god-status --full: See the complete dashboard and proactive checks.
```

`/god-status --full` renders the complete dashboard with planning visibility,
deliverable progress, proactive checks, open items, and next commands.

The action brief is the default onboarding surface. The full proactive checks
remain available through `/god-status --full` and release-gate evidence.

Workflow progress and audit scores are separate metrics. The dashboard
`Progress` line is only workflow step completion from state. Audit or hygiene
scores must be labeled as audit scores in the surrounding closeout, not reused
as workflow progress.

Workflow YAML may use `local-helper-groups` to avoid repeating closeout helper
sets. Serialized plans must still expand those groups into explicit
`local-helpers` so logs and verbose output can show every local runtime action.

Route closeouts that use contextual or choice-based next values must use
`Next commands:` with concrete commands. Verbose output may include the
`success-path.outcome` type, label, reason, and allowed next commands.

## Already Automatic

| Area | Current trigger | Visibility requirement |
|---|---|---|
| Final sync | `/god-mode` completion | Show a concise sync note and `SYNC-LOG.md` path when artifacts changed |
| Feature sync | Feature-addition recipes | Show `/god-sync` recommendation and `SYNC-LOG.md` path when review is needed |
| Reverse-sync | `/god-sync`, `/god-scan`, code-touching workflows | Log helper details, show findings only when links or review items changed |
| Pillars sync | Artifact truth changes | Show changed pillar files, otherwise log no-op |
| Repo documentation sync | `/god-sync`, `/god-docs`, `/god-doctor`, `/god-status`, `/god-mode` | Show only fixes or recommendations that change the next command |
| Host capability detection | `/god-status`, `/god-next`, `/god-doctor`, `/god-sync`, release closeout | Show full, degraded, or unknown host guarantees |
| Dogfood runner | `/god-dogfood`, `npx godpowers dogfood`, release readiness checks | Show scenario names, pass/fail counts, and fixture paths |
| Checkpoint sync | State mutation checkpoints | Show `.godpowers/CHECKPOINT.mdx` created, updated, no-op, or skipped |
| Context refresh | `/god-sync`, `/god-init`, `/god-context` | Show `god-context-writer` spawn or no-op |
| Standards checks | Routed stage boundaries | Show gate, artifact, pass/fail, and next route |
| Spawn trace checks | Route-quality sync and release closeout | Require `agent.start` and `agent.end` for agent-spawning routes |
| Preflight | Brownfield and bluefield starts | Show why it ran and which route it unlocked |
| DESIGN/PRODUCT gate | Design or product artifact changed | Show `god-design-reviewer` verdict before propagation |

## Good Auto-Invoke Candidates

| Candidate | Trigger | Benefit | Guardrail |
|---|---|---|---|
| `/god-status` summary | After `/god-sync`, `/god-scan`, and `/god-mode` | Confirms disk-derived status without user asking | Read-only only |
| `/god-next` route | After any successful standalone command | Prevents dead-stop endings | Must include `Next commands:` when no work starts |
| `/god-scan --linkage-only` | After code edits that include `Implements:` or `Source:` annotations | Keeps linkage current without full sync | Report local runtime only |
| Checkpoint refresh | After any state.json write | Makes new sessions resume accurately | Never overwrite user content outside checkpoint |
| Context refresh dry-run | After AGENTS.md or pillar changes | Shows whether tool pointers would change | Default to no-op unless configured |
| Repo docs refresh | After README, release, contribution, security, support, or public count surfaces change | Keeps public repo docs aligned with runtime facts | Auto-fix mechanical claims only |
| `/god-review-changes` suggestion | When REVIEW-REQUIRED.md gains entries | Gives the user a concrete review path | Do not auto-clear review items |
| `/god-hygiene` suggestion | After a full project run or every 30 days | Keeps docs, deps, and quality current | Suggest by default, auto-run only when requested |
| Runtime verification | After frontend-visible changes | Catches blank screens and layout regressions | Auto-run only when local app target is known |
| Host capability detection | Dashboard, next-route, doctor, sync, and release surfaces | Makes host limits explicit before users rely on automation | Read-only only |
| Dogfood runner | Before release, after migration/sync-back/host/extension/suite changes, or by user request | Exercises messy-project fixtures that unit tests cannot represent | Run only shipped fixtures unless user supplies a project |
| Strict release readiness | Scheduled or manual pre-release checks | Prevents stale root docs, docs, agents, skills, routing, workflows, schema, templates, references, hooks, lib, scripts, tests, fixtures, GitHub workflows, package metadata, git tag, GitHub release, npm, and local install surfaces from drifting silently | Read-only, fail closed, no publish |
| Automation setup execution | After exact provider, template, cadence, and scope approval | Lets the host LLM configure safe automation for the user | Record only after host setup succeeds |

## Proactive Matrix

| Level | Behavior | Default action | Examples |
|---|---|---|---|
| 1 | Read-only suggestion | Run by default | `/god-next` route, status summary, hygiene suggestion |
| 2 | Local helper | Run when directly triggered | checkpoint sync, linkage scan, Pillars sync plan, repo-doc-sync, repo-surface-sync, route-quality-sync, recipe-coverage-sync, release-surface-sync, host-capabilities, dogfood-runner |
| 3 | Scoped specialist agent | Spawn only with bounded evidence | design review, docs drift check, browser test with known URL, dogfood failure triage |
| 4 | Human-owned action | Require explicit approval | production launch, publish, destructive repair |

## Level 1 Auto-Suggest

Run or compute these by default in closeouts:

- `/god-next` after successful commands.
- `/god-status` style summary after `/god-sync`, `/god-scan`, and `/god-mode`.
- `/god-review-changes` suggestion when `REVIEW-REQUIRED.md` has pending
  entries.
- `/god-hygiene` suggestion after full project runs, long idle periods, or stale
  review queues.
- `/god-locate` suggestion when `CHECKPOINT.md` is missing, stale, or conflicts
  with `state.json`.

## Level 2 Auto-Run Local Helpers

Run these automatically when the trigger is direct, then log details. Display a
concise note only when artifacts changed, review items were created, or the
recommendation changed:

- `lib/checkpoint.syncFromState` after `state.json` or `PROGRESS.md` changes.
- Lightweight reverse-sync or linkage scan after code or artifact edits.
- Pillars sync planning after durable artifact truth changes.
- Context refresh dry-run after AI tool instruction files change.
- Progress recomputation after commands that change artifacts.
- Host capability detection when dashboard, next-route, doctor, sync, or
  release surfaces need host guarantee language.
- Dogfood runner when `/god-dogfood`, `npx godpowers dogfood`, or release
  readiness checks directly request fixture execution.
- Strict release readiness when a scheduled release check runs. It must report
  unchecked surfaces as blockers instead of treating absent evidence as pass.

## Level 3 Auto-Spawn Agents

Spawn these only when the scope is bounded and the trigger is visible:

- `god-design-reviewer` after `DESIGN.md` or `PRODUCT.md` changes.
- `god-updater` after feature, hotfix, refactor, build, deploy, observe,
  launch, harden, docs, upgrade, or dependency workflows change code or
  artifacts.
- `god-docs-writer` in drift-check mode when docs changed after code changed,
  or code changed after docs that claim current behavior.
- `god-browser-tester` when frontend-visible files changed and a known local,
  preview, staging, or production URL is evidenced.
- `god-harden-auditor` inside security workflows, or as a suggestion after
  security-sensitive files changed.
- `god-deps-auditor` inside dependency workflows, or as a suggestion after
  dependency files changed.
- `god-automation-engineer` after approved complex automation setup.
- `/god-automation-status` as a read-only provider report when automation
  support may be available.
- `god-greenfieldifier`, `god-context-writer`, or `god-coordinator` after a
  bounded dogfood scenario fails in migration, context, or Mode D suite scope.

## Non-Candidates

Do not auto-invoke these without explicit user intent:

- deployed staging against a guessed URL
- provider dashboard or credential checks
- production launch
- broad dependency upgrades
- destructive repairs
- review item clearing
- git stage, commit, push, or publish
- schedule, routine, background agent, API trigger, or CI workflow creation
  without explicit user approval
- `.godpowers/automations.json` writes before host setup success

## User Promise

If Godpowers does something automatically, the user should see what changed,
where to inspect the log, and what to do next. Detailed helper names are
available through verbose output and logs.
