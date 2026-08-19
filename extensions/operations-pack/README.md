# @godpowers/operations-pack

Optional operational workflows for Godpowers maintainers.

The pack provides:

- `/god-issue-triage`, which verifies an incoming tracker claim, recommends one
  category and one state, and waits for maintainer approval before mutation.
- `/god-setup-wizard`, which generates a Bash script for manual setup steps that
  require a human, a dashboard, a secret, or an irreversible confirmation.

Install through the existing extension command:

```text
/god-extension-add @godpowers/operations-pack
```

Neither skill adds automatic external authority to core Godpowers. Triage is a
recommendation until a maintainer approves the exact tracker mutations. A setup
wizard is generated and statically checked by an agent, then run by a human.
