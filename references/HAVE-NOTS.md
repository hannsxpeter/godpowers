# Godpowers Have-Nots Catalog

> Named failure modes that disqualify an artifact. Each is grep-testable.
> Spawned agents check their tier's have-nots before declaring done.
> god-auditor uses this catalog to score retroactively.

This document is the canonical source. If a have-not appears in an agent file
that contradicts this document, this document wins.

---

## Universal Have-Nots (apply to ALL artifacts and code)

### U-01 AI-slop
Output passes the substitution test. Replace the product name with a competitor's;
if the sentence still reads true, the content decides nothing. Fail.

- **Bad**: "Our platform delivers a seamless, best-in-class user experience."
  Swap in any competitor and it still reads true, so it decides nothing.
- **Good**: "Checkout completes in two taps because we store the card token after
  the first purchase; a competitor asking for full card entry cannot claim this."
  It names a specific mechanism a rival could not copy verbatim.

### U-02 Unlabeled sentence
A sentence is not tagged DECISION, HYPOTHESIS, or OPEN QUESTION. Anything
unlabeled is theater. Fail.

- **Bad**: "We will probably use Postgres." Unlabeled and hedged; the reader
  cannot tell if it is a decision, a guess, or an open question.
- **Good**: "DECISION: Use Postgres for the primary store (relational data, team
  familiarity); flip to DynamoDB if sustained writes exceed 5k/s." One label, a
  rationale, and a flip point.

### U-03 Phantom resume
Agent claims a tier is "done" but the artifact is missing from disk. Fail.

### U-04 Ghost handoff
A tier is invoked before its upstream artifact exists on disk. Fail.

### U-05 Rubber-stamp orchestration
PROGRESS.mdx says "done" with no corresponding artifact on disk. Fail.

- **Bad**: the orchestrator marks tier-1.prd done because the PM agent replied
  "PRD complete", but `.godpowers/prd/PRD.mdx` does not exist on disk.
- **Good**: the orchestrator confirms `.godpowers/prd/PRD.mdx` exists and clears
  the have-nots gate before advancing state; the agent's claim is not the proof.

### U-06 Silence as skip
A tier is absent from PROGRESS.mdx (neither done nor skipped). Fail.

### U-07 Paper artifact
The document exists but the mechanism it describes does not. Example: a runbook
that has never been executed. Fail.

### U-08 Em or en dashes
Em dash (U+2014) or en dash (U+2013) used in any output. Fail. Use commas,
colons, semicolons, parentheses, or hyphens for ranges.

### U-09 Decorative emoji
Emoji used as decoration in code, docs, commit messages. Fail. Use words or
real icons (SVG/icon library) when a visual marker is genuinely needed.

### U-10 Phantom reference
Document references another artifact that does not exist on disk. Fail.

### U-11 Date-not-real
Timestamp claimed in artifact is in the future or before the project started.
Fail.

### U-12 Theater sentences
Sentences that read fine but say nothing measurable, decidable, or testable.
Fail.

### U-13 MDX-unsafe artifact content
Artifact body contains content that breaks MDX compilation or violates the
ASCII policy: a bare `<` followed by a letter outside code, a bare `{` or `}`
outside code, an HTML comment (`<!--`) outside code, or a banned character
(em dash U+2014, en dash U+2013, smart quotes U+2018/U+2019/U+201C/U+201D,
ellipsis U+2026, unicode arrows, emoji). Inline code spans and fenced code
blocks are exempt from the structural checks; banned characters fail
everywhere. Fail.

### U-14 Sycophancy or gratitude loop
Output contains gratitude-loop or forced-engagement filler: thanking the person
merely for their message, praising the question, help-eagerness ("happy to
help"), a "hope this helps" sign-off, or soliciting continued engagement ("let
me know if you", "feel free to reach out", "is there anything else"). This is the
mechanical enforcement of the honest-voice section of `references/shared/VOICE.md`
via `lib/voice-lint.js`. Fail.

- **Bad**: "Great question! Happy to help. Let me know if you'd like anything
  else." Three filler phrases, zero information.
- **Good**: "Done. Tests pass; the migration is reversible. Next: run `/god-ship`."
  States the outcome and the next step, nothing else.

---

## Tier 0: Orchestration Have-Nots

### O-01 Mode not detected
PROGRESS.mdx missing the Mode field. Fail.

### O-02 Scale not detected
PROGRESS.mdx missing the Scale field. Fail.

### O-03 Tier missing from ledger
A canonical tier is absent from the PROGRESS.mdx tier table. Fail.

### O-04 Status outside vocabulary
A tier's status is not one of: pending, in-flight, done, skipped, imported,
failed, re-invoked. Fail.

### O-05 Decisions log empty after pause
god-orchestrator paused for human input but did not record the resolution in
the Decisions Log. Fail.

### O-06 YOLO decisions silent
--yolo flag was used but no YOLO-DECISIONS log was emitted. Fail.

### O-07 Invisible auto-invoke
Automatic local helper or specialist work ran without reporting the trigger,
agent status, helper result, changed artifacts, and next route. Fail.

### O-08 Stale dashboard closeout
A command completed without a disk-derived dashboard, action brief, or
recommended next command. Fail.

### O-09 Sync-back ambiguity
Imported legacy planning, BMAD, or Superpowers context exists but the project does not say
whether managed sync-back is enabled, disabled, or not applicable. Fail.

### O-10 Host guarantees hidden
The workflow relies on shell, git, npm, release tooling, or fresh-context
agent spawning without reporting host guarantee level. Fail.

---

## Tier 1: Planning Have-Nots

### PRD Have-Nots

#### P-01 Generic problem statement
Problem statement passes substitution test. Fail.

#### P-02 Generic target user
Target user is "developers", "users", "teams", or any unfilled noun. Must be
specific persona with role and context. Fail.

#### P-03 Metric without number
Success metric has no numeric target. Fail.

#### P-04 Metric without timeline
Success metric has no time bound (date, days, weeks). Fail.

#### P-05 Metric without measurement method
Success metric does not specify HOW it will be measured. Fail.

#### P-06 Requirement without acceptance criteria
A functional requirement has no observable acceptance criterion. Fail.

#### P-07 No-gos empty
Scope and No-Gos section is empty or missing. Fail.

#### P-08 Open question without owner
An open question has no named owner. Fail.

#### P-09 Open question without due date
An open question has no due date. "TBD" is not a date. Fail.

#### P-10 Solution-first PRD
Problem statement names the solution. The PRD frames the problem; the
architecture proposes the solution. Fail.

#### P-11 Feature laundry list
Functional requirements are an unprioritized list with no MUST/SHOULD/COULD
classification. Fail.

#### P-12 Hollow PRD
All sections are filled but no decisions are made. Every claim is
[HYPOTHESIS] with no validation plans. Fail.

#### P-13 Moving-target PRD
PRD edited silently after downstream tiers consumed it. Edits must be tracked
and downstream tiers must be re-validated. Fail.

#### P-14 Assumption-soup PRD
PRD is full of "we assume users will love it" or "users want X" without
research or hypothesis labels. Fail.

#### P-15 NFR absent
Non-functional requirements section is missing or empty. Fail.

### Architecture Have-Nots

#### A-01 Box without responsibility
A diagram component has no clear single responsibility. Fail.

#### A-02 Shared responsibility unjustified
Two components share the same responsibility without explicit justification.
Fail.

#### A-03 NFR not mapped
An NFR from the PRD has no corresponding architectural choice in the
NFR-to-Architecture map. Fail.

#### A-04 ADR without flip point
An ADR has no flip point (condition under which the decision reverses). Fail.

#### A-05 "Scalable" without numbers
The word "scalable" appears without quantification (users, requests/sec, data
volume, latency targets). Fail.

#### A-06 Trust boundary missing
An external integration has no trust boundary documented. Fail.

#### A-07 Data ownership unassigned
A data entity has no owner service. Fail.

#### A-08 Architecture theater
Diagrams exist but no load-bearing decisions are documented. Fail.

#### A-09 Cargo-cult cloud-native
Kubernetes/Kafka/microservices for a 10-user CRUD app. Complexity must match
scale from PRD. Fail.

#### A-10 Stackitecture
Stack chosen and called architecture. Architecture is system shape; stack is
tool selection. Distinct documents. Fail.

#### A-11 Resume-driven architecture
Choice motivated by "looks good on resume" rather than fit-for-PRD. Fail.

#### A-12 Paper-tiger architecture
Looks robust on paper but fails first real load. NFR validation must include
worst-case analysis. Fail.

#### A-13 ADR inflation
An ADR records a decision that is easy to reverse, obvious without context, or
not the result of a real tradeoff. Fail.

### Domain Glossary Have-Nots

#### DG-01 Canonical term without avoided aliases
A glossary term names the canonical language but does not list avoided aliases.
Fail.

#### DG-02 Implementation detail in glossary
The domain glossary stores implementation details, stack choices, code paths,
or technical scratch notes. The glossary is domain language only. Fail.

#### DG-03 Unresolved ambiguity without owner or due date
An ambiguity is recorded without an owner or due date. Fail.

#### DG-04 Relationship uses non-canonical term
A relationship references a term that is not defined in the glossary language
section. Fail.

#### DG-05 Definition does behavior work
A definition describes what the system does instead of what the term is. Fail.

### Roadmap Have-Nots

#### R-01 Generic milestone goal
Milestone goal passes substitution test. Fail.

#### R-02 Subjective completion gate
Completion gate is "feels done" or "looks good" rather than observable. Fail.

#### R-03 Speculative feature
Roadmap milestone includes a feature not in the PRD. Fail.

#### R-04 No prioritization
All milestones are the same size. No real ordering. Fail.

#### R-05 No dependency edges
Milestones have no documented dependencies. Fail.

#### R-06 Fictional precision
Day-level dates without a documented capacity input (team size, velocity).
Fail.

#### R-07 Empty Later
Later section is missing or empty. No long-term direction. Fail.

#### R-08 Quarter-stuffing
All four quarters are equally full. Real prioritization tapers. Fail.

#### R-09 Shelf roadmap
Roadmap written once, never consulted. Must show update timestamps. Fail.

#### R-10 Roadmap theater
Gantt aesthetics with no actual commitments. Fail.

### Stack Have-Nots

#### S-01 Choice without flip point
Tech choice has no documented flip point. Fail.

#### S-02 Choice without lock-in cost
Tech choice has no lock-in cost classification. Fail.

#### S-03 Pairing incompatibility
Chosen technologies don't work together (e.g., ORM doesn't support DB). Fail.

#### S-04 High lock-in danger
High lock-in choice with likely flip point in <6 months without mitigation
plan. Fail.

#### S-05 "Best practice" without rationale
Choice justified by "industry best practice" without specific tie to ARCH or
PRD. Fail.

---

## Tier 2: Building Have-Nots

### Repo Scaffold Have-Nots

#### RP-01 README is template
README contains TODO markers, lorem ipsum, or placeholder text. Fail.

#### RP-02 No test directory
No test directory structure exists. Fail.

#### RP-03 No CI/CD
No CI/CD pipeline configured. Fail.

#### RP-04 No linter
No linter configured for the chosen language. Fail.

#### RP-05 No formatter
No formatter configured. Fail.

#### RP-06 .gitignore missing or generic
.gitignore is missing or doesn't match the chosen stack. Fail.

#### RP-07 SECURITY.md absent
SECURITY.md (vulnerability reporting) is missing. Fail.

#### RP-08 Scaffold-only
Repo structure exists but features are stubbed with TODOs or fake data. Fail.

### Build Have-Nots

#### B-01 Code before test (TDD violation)
Implementation written before its test. Fail. Implementation must be deleted
and rewritten test-first.

#### B-02 Test passes immediately on RED
Test was added but did not fail before implementation. Fail. The test is
wrong; fix it until it fails for the right reason.

#### B-03 Single-stage review
Only one review stage performed. Both spec compliance AND code quality must
pass. Fail.

#### B-04 Fat commit
Multiple unrelated slices in one commit. Fail.

#### B-05 Context rot
Agent reused degraded context window instead of getting a fresh one. Fail.

#### B-06 Stub in production code
Implementation contains TODO, placeholder, or fake data in non-test code. Fail.

#### B-07 Test suite failing on commit
Commit made while any test is failing. Fail.

#### B-08 Linter warnings on commit
Commit made with unresolved linter warnings. Fail.

#### B-09 No regression test for bug fix
Bug fix committed without a regression test that reproduces the bug. Fail.

#### B-10 Tests skipped or marked TODO
Test files contain `it.skip`, `xit`, `@Ignore`, or equivalent without
justification. Fail.

#### B-11 Implementation detail tested
Tests verify implementation details (private methods, internal state) rather
than behavior. Fragile and adds little value. Fail.

#### B-12 Hidden coupling
Slice modifies code outside its declared file paths. Fail.

---

## Tier 3: Shipping Have-Nots

### Deploy Have-Nots

#### D-01 Different build per environment
Each environment builds its own artifact. Fail. Build once; promote the same
artifact.

#### D-02 No rollback plan
Deploy procedure has no documented rollback steps. Fail.

#### D-03 Untested rollback
Rollback documented but never executed in staging. Paper rollback. Fail.

#### D-04 TCP-only health check
Health check is just a port check. Must be application-level. Fail.

#### D-05 No smoke test
No post-deploy smoke test that hits real endpoints. Fail.

#### D-06 Paper canary
Canary label exists but no actual traffic split. Fail.

#### D-07 No environment parity
Dev/staging/prod use different config shapes. Fail.

#### D-08 Manual deploy steps
Production deploy requires a human running commands. Fail. Must be automated.

### Observe Have-Nots

#### OB-01 SLO without error budget policy
SLO defined but no concrete action when budget is exhausted. Paper SLO. Fail.

#### OB-02 Cause-based alert
Alert fires on a cause ("CPU at 90%") not a symptom ("users seeing errors").
Fail.

#### OB-03 Alert without runbook
Alert fires with no linked runbook for the on-call to follow. Fail.

#### OB-04 Untested runbook
Runbook exists but has never been dry-run. Paper runbook. Fail.

#### OB-05 Blind dashboard
Dashboard not tied to any SLO. Vanity metrics. Fail.

#### OB-06 Sensitive data in logs
Logs contain passwords, tokens, full PII, or other sensitive data. Fail.

#### OB-07 Alert fatigue
Alert that's fired more than 3x in 24 hours and ignored. Either tune or delete.
Fail.

#### OB-08 No tracing
Multi-service architecture with no distributed tracing. Fail.

### Launch Have-Nots

#### L-01 Generic landing copy
Landing copy passes substitution test. Reads generic. Fail.

#### L-02 OG card unrendered
OG meta tags exist but card was never visually verified. Fail.

#### L-03 Same copy across channels
Identical message posted to Show HN, Product Hunt, Reddit, Twitter. Fail.

#### L-04 Silent launch
Signups have no source attribution (no UTMs, no referrer tracking). Fail.

#### L-05 No D-7 to D+7 plan
Launch has no day-by-day runbook spanning the launch window. Fail.

#### L-06 Decoration-word landing
Hero contains "powerful", "seamless", "cutting-edge", "revolutionary",
"robust" without quantification. Fail.

#### L-07 No post-launch follow-up
No plan for D+1 to D+7 (responding to comments, gathering feedback,
iterating). Fail.

#### L-08 "We'll figure out marketing later"
Launch tier marked done with no actual launch artifacts. Public activation
without a fresh hash-bound `.godpowers/launch/PREPUBLICATION.mdx` pass also
fails.

### Harden Have-Nots

#### H-01 Scanner-only security
Findings come only from automated scanners. No manual review. Fail.

#### H-02 Auth boundaries not tested
Auth/authz boundaries assumed from code reading, not actually probed. Fail.

#### H-03 No input validation audit
User input paths not systematically reviewed. Fail.

#### H-04 Rate limiting not verified
Rate limiting claimed but not tested with actual abuse simulation. Fail.

#### H-05 OWASP categories skipped
An OWASP Web Top 10:2025 category lacks a reproducible manual procedure and
result, or is marked Not Applicable without project-specific justification.
Fail.

#### H-06 Findings without severity
Finding exists but has no Critical/High/Medium/Low classification. Fail.

#### H-07 Critical without remediation
Critical finding presented to user with no remediation options. Fail.

#### H-08 Hardening as ritual
Annual pen test only, nothing between. Fail.

#### H-09 Compliance without security
Compliance checklist green but app still has exploitable holes. Fail.

#### H-10 Dependency CVEs ignored
Known CVEs in dependencies with no remediation plan. Fail.

#### H-11 Paper trust boundaries
Trust boundaries declared in docs but absent in code. Fail.

---

## Workflow-Specific Have-Nots

These apply to artifacts produced by focused workflows (postmortem, spike,
migration, docs, deps).

### Postmortem Have-Nots

#### PM-01 Vague action items
Action items like "communicate better" or "more tests" without specifics. Fail.

#### PM-02 Action item without owner
Action item has no named owner. Fail.

#### PM-03 Action item without due date
Action item has no specific due date. Fail.

#### PM-04 Action item without success criterion
No observable way to know the action item worked. Fail.

#### PM-05 Symptom-level root cause
Root cause is the symptom, not the underlying mechanism. Didn't go deep
enough. Fail.

#### PM-06 No class-of-bug identified
Postmortem describes only the instance, not the broader pattern that could
produce similar incidents. Fail.

#### PM-07 Person-blaming language
Phrasing blames individuals ("Alice forgot X") instead of systems ("the
deploy script does not check X"). Fail.

#### PM-08 Runbooks not updated
Incident revealed runbook gaps; gaps not addressed. Fail.

### Spike Have-Nots

#### SP-01 Time-box exceeded silently
Spent significantly more than time-box without escalating to user. Fail.

#### SP-02 Built a feature instead of a proof
Spike code is production-grade or merge-ready instead of throwaway. Fail.

#### SP-03 Findings without evidence
Claims like "this approach is faster" without numbers, code excerpts, or
test results backing them. Fail.

#### SP-04 No recommendation
Findings list options but make no recommendation. "It depends" with no
decision support. Fail.

#### SP-05 Spike code merged to main
Spike code reaches production rather than being deleted or rewritten cleanly
in a real workflow. Fail.

### Migration Have-Nots

#### MG-01 Big-bang plan
No incremental slices; everything migrates at once. Fail.

#### MG-02 No expand-contract
Old version removed before new version proven. Fail.

#### MG-03 No rollback per slice
Each migration step lacks an independent rollback. Fail.

#### MG-04 Tests not added before migration
Insufficient test coverage on affected surface; migration proceeded anyway.
Fail.

#### MG-05 Metrics not gating progression
Slices ship without verifying production metrics before next slice. Fail.

#### MG-06 Old code removed before 100% migrated
Contract phase started before expand phase complete. Fail.

#### MG-07 Just-upgrade-and-pray
No risk assessment, no compensation plan. Fail.

### Docs Have-Nots

#### DC-01 Doc claim contradicts code
A claim in docs is not true of the actual code. Fail.

#### DC-02 Substitution-test passes
Doc paragraph reads true for any product. Fail.

#### DC-03 Examples don't run
Code examples in docs would error if executed. Fail.

#### DC-04 Runbook untested
Runbook in docs has never been executed. Fail.

#### DC-05 Diagrams represent past or future state
Diagrams reflect what was, not what is, or what's planned, not what's
shipped. Fail.

### Deps Have-Nots

#### DP-01 Critical CVE not addressed
Critical CVE found and not addressed without explicit deferral rationale.
Fail.

#### DP-02 Multiple major updates batched
Two or more major version bumps in one commit. Fail.

#### DP-03 No regression tests run
Updates committed without running tests after each. Fail.

#### DP-04 Bulk update without per-package commits
All updates in one commit, losing bisect-ability. Fail.

#### DP-05 Lockfile not committed
Dep changes committed but lockfile not updated or not staged. Fail.

#### DP-06 Changelog not consulted
Updates applied without reading changelog for breaking changes. Fail.

---

## Reference Tally

- Universal: 14
- Tier 0 Orchestration: 10
- Tier 1 PRD: 15
- Tier 1 Architecture: 13
- Tier 1 Roadmap: 10
- Tier 1 Stack: 5
- Tier 1 Domain Glossary: 5
- Tier 2 Repo: 8
- Tier 2 Build: 12
- Tier 3 Deploy: 8
- Tier 3 Observe: 8
- Tier 3 Launch: 8
- Tier 3 Harden: 11
- Workflow Postmortem: 8
- Workflow Spike: 5
- Workflow Migration: 7
- Workflow Docs: 5
- Workflow Deps: 6

**Total: 158 named have-nots.**

Each is grep-testable. Each is a documented failure mode. Together they form
the mechanical quality definition for Godpowers output.
