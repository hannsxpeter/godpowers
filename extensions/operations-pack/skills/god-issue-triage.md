---
name: god-issue-triage
description: |
  Verify incoming issues or external pull requests, recommend exactly one
  category and one state, and wait for maintainer approval before tracker
  mutations. Triggers on: "god issue triage", "/god-issue-triage",
  "triage this issue", "what needs triage"
extension: "@godpowers/operations-pack"
---

# /god-issue-triage

<!-- Implements: P-COULD-05 -->

Triage work that arrived from outside the project's own planning flow.

## Role vocabulary

Every evaluated item has exactly one category:

- `bug`: shipped or documented behavior is broken.
- `enhancement`: the request adds or improves behavior.

Every evaluated item has exactly one state:

- `needs-triage`: a maintainer still needs to decide.
- `needs-info`: the reporter must provide a specific missing fact.
- `ready-for-agent`: verified and sufficiently specified for delegated work.
- `ready-for-human`: specified, but judgment, access, or manual work prevents delegation.
- `wontfix`: closed with a recorded reason.

Conflicting category or state roles block all mutation until the maintainer
chooses the authoritative role.

## Process

1. Read the full item, comments, labels, author, and attached change. Do not
   treat a cheap listing response as complete issue context.
2. Search the repository by domain concept for an existing implementation and
   inspect `.out-of-scope/` for a prior rejected concept.
3. Verify the claim before recommending `ready-for-agent`. Reproduce a bug with
   the reporter's steps, or check out and test an external pull request. Record
   confirmed, failed to reproduce, or insufficient detail.
4. Recommend one category and one state with the evidence and proposed tracker
   changes. Wait for explicit maintainer approval of the labels, comment, close,
   or linked story before any tracker mutation.
5. After maintainer approval, apply only the approved transition and verify the
   final item has exactly one category and exactly one state.

For `ready-for-agent`, post a durable behavior-focused brief. After separate
maintainer approval, optionally create a linked `STORY-*` artifact through the
existing Godpowers story flow. Do not embed transient line numbers in the brief.

## Wontfix records

- Already implemented: point to the existing behavior and close only after
  maintainer approval. Never add an already implemented request to
  `.out-of-scope/` because it is not a rejected concept.
- Rejected bug: explain the decision and close after approval.
- Rejected enhancement: create or update one concept-level
  `.out-of-scope/<concept>.md` record after approval, link the item, explain the
  durable reason, then close.

## Have-Nots

- OPS-01: mutate a tracker before maintainer approval.
- OPS-02: assign zero or multiple categories or states.
- OPS-03: mark work ready for an agent without claim verification or an explicit
  insufficient-evidence record.
- OPS-04: classify already implemented work as a rejected enhancement.
- OPS-05: create a local story without approval or without linking the source item.
