# Product Requirements Document

## Problem Statement

[DECISION] DevOps engineers running shell-based deployment pipelines lose
context when scrolling through 1000+ line CI logs to find the failed step.
Today they grep manually, often missing the actual root cause because
upstream errors scroll past the screen.

[HYPOTHESIS] A tool that highlights the first failing step and surfaces
contextual lines (5 before, 5 after) would cut median triage time from
12 minutes to under 2 minutes. We will validate with 5 DevOps engineers
running their existing CI logs through the tool before /god-build.

## Target Users

[DECISION] Primary: DevOps engineers running self-hosted CI pipelines
(GitHub Actions self-hosted, Jenkins, Drone) at companies with 50-500
engineers, where CI failures are routine and triage time directly
impacts deploy velocity.

## Success Metrics

- [DECISION] Tool installed by 200 unique users within 90 days of launch,
  measured via brew analytics + npm downloads.
- [DECISION] Median time-to-failure-identification under 30 seconds for
  a 1000-line log within 90 days of launch, measured via timed user
  studies with 10 engineers.

## Functional Requirements

### MUST (V1 launch blockers)
- [DECISION] Read CI logs from stdin or file argument. Acceptance: tool
  accepts both `cilog file.txt` and `cat file.txt | cilog`.
- [DECISION] Detect first FAILED step using known CI markers (GitHub
  Actions, Jenkins, Drone formats). Acceptance: regression suite of 50
  real CI logs identifies the right line in 95% of cases.
- [DECISION] Output a focused report: failed step name, line number,
  error excerpt, 5 lines of context above and below. Acceptance: report
  fits in 80x40 terminal without horizontal scrolling.

### SHOULD (V1 if time permits)
- [HYPOTHESIS] Color output via tput, gracefully degrading on non-tty
  outputs. Validation: ship behind `--color` flag; promote to default if
  user feedback is positive.

### COULD (post-V1)
- [HYPOTHESIS] Web upload mode (paste log, get shareable link)

## Non-Functional Requirements

| Category | Requirement | Source |
|----------|-------------|--------|
| Latency | Process 10MB log in under 500ms on a 2-core CI runner | [DECISION] |
| Portability | Static binary for macOS arm64/amd64 + Linux amd64 | [DECISION] |
| Footprint | Binary size under 5MB | [DECISION] |
| Dependencies | Zero runtime deps; no Node, Python, or Ruby required | [DECISION] |

## Scope and No-Gos

### In scope for V1
- CLI usage from terminal or piped from stdin
- GitHub Actions, Jenkins, Drone CI formats

### Explicitly NOT in scope
- [DECISION] Web service / SaaS hosting
- [DECISION] Real-time CI watching (polling running jobs)
- [DECISION] AI-based root cause inference
- [DECISION] CircleCI, GitLab CI, Buildkite formats (post-V1)

## Appetite

[DECISION] Time budget: 3 weeks from /god-init to launch.
[DECISION] Resource budget: solo developer + this AI system.
[DECISION] Technical constraints: must compile to a single static binary;
distributed via Homebrew + npm + GitHub Releases.

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Implementation language: Go or Rust? | hprincivil | 2026-05-15 | |
| Telemetry: opt-in or none at all? | hprincivil | 2026-05-18 | |
