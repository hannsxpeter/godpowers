# OWASP Web Top 10:2025 Manual Walkthrough

Use during `/god-harden` after reading
`references/shipping/HARDEN-OWASP-2025-ROUTER.md`. Record the exact request,
fault injection, fixture, or reproduction procedure and observed result for
every applicable category. A code-read or scanner result can support evidence,
but cannot replace the manual procedure.

## A01:2025 Broken Access Control

- [ ] Inventory object, function, tenant, and administrative authorization boundaries.
- [ ] Probe unauthenticated, wrong-user, wrong-tenant, and wrong-role access.
- [ ] Test user-controlled URLs against localhost, private networks, cloud metadata, redirects, and alternate IP encodings.
- [ ] Confirm denial occurs at the service boundary and leaves no unauthorized state change.

## A02:2025 Security Misconfiguration

- [ ] Verify production framework, cloud, storage, CORS, proxy, and error configuration.
- [ ] Remove default accounts, sample data, debug endpoints, and unnecessary features.
- [ ] Exercise verbose errors and confirm sensitive internals are not returned.
- [ ] Verify security headers and environment separation where the form uses HTTP.

## A03:2025 Software Supply Chain Failures

- [ ] Run the ecosystem dependency audit and classify every unresolved result.
- [ ] Verify lockfile or equivalent dependency identity and registry provenance.
- [ ] Inspect CI identities, action or image pinning, secret scope, and build isolation.
- [ ] Verify release artifact integrity, signing or provenance, package substitution defenses, and distribution identity.

## A04:2025 Cryptographic Failures

- [ ] Verify current algorithms, parameter sizes, password hashing, and random generation.
- [ ] Trace key creation, storage, rotation, revocation, backup, and destruction.
- [ ] Verify nonce or IV uniqueness and authenticated encryption where applicable.
- [ ] Verify transport policy and the handling of sensitive data at rest and in logs.

## A05:2025 Injection

- [ ] Inventory user, URL, header, file, webhook, queue, and imported-data inputs.
- [ ] Trace each untrusted value through SQL, shell, template, HTML, LDAP, XML, and other interpreters.
- [ ] Verify parameterization, contextual output encoding, schema validation, and command argument boundaries.
- [ ] Probe malformed, nested, oversized, and encoded payloads through the real boundary.

## A06:2025 Insecure Design

- [ ] Map threat actors, trust boundaries, abuse cases, and high-impact state transitions.
- [ ] Exercise rate limits, anti-automation controls, bulk-operation safeguards, and step-up controls.
- [ ] Probe race conditions, negative values, repeated actions, and business-rule bypasses.
- [ ] Confirm secure defaults and failure behavior match the deployed architecture.

## A07:2025 Authentication Failures

- [ ] Probe credential stuffing, enumeration, throttling, lockout, and recovery paths.
- [ ] Verify session fixation defense, expiry, rotation, revocation, logout, and concurrent-session policy.
- [ ] Verify MFA and step-up behavior for sensitive accounts or operations where required.
- [ ] Confirm tokens are scoped, time-bound, securely stored, and invalid after revocation.

## A08:2025 Software or Data Integrity Failures

- [ ] Identify code, update, artifact, serialized-content, webhook, and critical-data trust boundaries.
- [ ] Verify signatures, hashes, MACs, allowlists, or equivalent integrity checks at those boundaries.
- [ ] Probe unsafe deserialization, unsigned updates, replay, and tampered import data.
- [ ] Confirm integrity failure blocks the operation and produces actionable evidence.

## A09:2025 Security Logging and Alerting Failures

- [ ] Verify authentication, authorization, administrative, integrity, and abuse events are recorded.
- [ ] Confirm logs exclude secrets and unauthorized sensitive data.
- [ ] Trigger one controlled suspicious event through the production-equivalent telemetry path.
- [ ] Verify detection, alert delivery, owner acknowledgment, and the linked response procedure.

## A10:2025 Mishandling of Exceptional Conditions

Inventory every external dependency, state transition, asynchronous job,
transaction boundary, parser, and resource limit. Exercise applicable cases:

1. Timeout, connection reset, malformed response, and dependency unavailability.
2. Partial success across a multi-step write, including retry and duplicate delivery.
3. Disk, memory, queue, connection-pool, file-descriptor, and request-size exhaustion.
4. Unexpected enum values, nulls, empty collections, oversized values, and invalid transitions.
5. Authorization, policy, or validation dependency failure.
6. Rollback failure and recovery after restart between steps.

A pass requires secure failure, bounded resource use, no unauthorized state
transition, no sensitive error leakage, idempotent or compensating recovery
where required, and an observable alert for operator action. A catch-all that
returns success, silently drops work, or bypasses a control is a finding.

## Completion evidence

The walkthrough passes only when all ten 2025 rows contain:

- The exact manual procedure or justified Not Applicable scope.
- The observed result and evidence location.
- A linked finding when the result does not pass.
- A reviewer and review timestamp.

For non-web forms, retain the current 2025 category names and adapt the manual
boundary to the product form. For example, test command arguments and package
distribution for a CLI or SDK, pipeline inputs and lineage for Data or ML, and
plan, state, provider, and policy boundaries for Infrastructure or IaC.
