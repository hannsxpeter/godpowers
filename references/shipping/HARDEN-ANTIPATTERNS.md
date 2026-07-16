# HARDEN Antipatterns

## 1. The Compliance-Only Audit

**Sample**: Auditor runs OWASP top-10 checklist; checks all boxes; ships.

**Why it fails**: OWASP top-10 is a floor, not a ceiling. A compliant
system can still leak through application-specific vulnerabilities the
checklist doesn't cover.

**Fix**: Adversarial review with named threat models. Auditor asks
"what would an attacker who has X try?" and traces the attack path
through actual code, not through a checklist.

## 2. The Findings Without Owner

**Sample**: HARDEN/FINDINGS.md lists 12 findings. None have owners or
deadlines.

**Why it fails**: Findings without owners are graveyards. Three months
later they're still open and no one remembers why.

**Fix**: Every finding gets an owner, severity, and a deadline. CRITICAL
findings block launch. HIGH findings have a deadline within the next
sprint. Open findings auto-surface in /god-status until closed.

## 3. The Untested Remediation

**Sample**: Finding closed because "we added validation." No test
demonstrates the validation works against the original attack.

**Why it fails**: Remediation that wasn't tested may not actually fix
the issue. Regression is invisible.

**Fix**: Each remediation lands with a regression test that fails
without the fix and passes with it. Closed findings link to the test.

## 4. The Auth Boundary Confusion

**Sample**: The system has authentication (who you are) but the team
treats it as authorization (what you can do).

**Why it fails**: Logged-in users can take actions they should not be
allowed to. Authorization is a separate layer.

**Fix**: Document auth boundaries explicitly: identity (who), session
(active), permissions (what). Each layer has its own tests.

**Caller-path parity**: enumerate every path that reaches a privileged
operation (interactive session, API key or bearer token, a publicly
exported backend function, an action whose authorization runs in a
non-writable query context, an agent or tool call) and prove the SAME
authentication, tenant-suspension, step-up or MFA, and role gate fires
on each. Enforce suspension and step-up at the data or function tier,
not only at a page or edge gate. Common misses: an API key still valid
after the tenant is suspended; MFA enforced on pages but not on the
token endpoint or API; a role checked in the wrapper while the raw
exported function stays public; a step-up keyed to a host context the
resource does not actually require.

## 5. The Trusted Input

**Sample**: Backend trusts data from frontend because "we control both."

**Why it fails**: Anyone can call the backend directly. Frontend
validation prevents accidents, not attacks.

**Fix**: Every input is untrusted. Validation runs on the boundary
between layers, not just at the UI.

**Ownership-bound selectors**: any identifier, email, slug, or hostname
taken from the request or from model output that selects a record must
be bound to the authenticated principal before that record is read,
charged, mutated, or state-transitioned; for an email or hostname the
caller must prove control (a verified session or an out-of-band code).
The highest-risk cases are public checkout (never attach or charge an
existing member by unverified email), unauthenticated verification
endpoints (never transition another tenant's state by hostname), and
agent or tool arguments (never act on a model-chosen id without an
ownership check). Test with a cross-tenant id, a foreign email, and a
model-named id, each asserting denial.

## 6. The Outdated Threat Model

**Sample**: Threat model written at /god-init has not been updated even
though the system added a payment integration and a public API.

**Fix**: Threat model is a living document. /god-feature, /god-deploy,
and any change touching trust boundaries triggers a HARDEN review of
the affected boundary.

## 7. The Unreconciled Money Flow

**Sample**: A guard exists at each step (signature check, idempotency
store, permission helper) but the amounts on the two sides of the flow
are never proven equal, so a charge strands with no invoice, a refund
does not reverse an already-released marketplace transfer, or a
reschedule changes the price while the paid invoice stays unchanged.

**Why it fails**: The controls are present but not wired to reconcile.
A control-presence audit reads them as green while money is taken with
no fulfillment, double-refunded, or double-paid.

**Fix**: Trace every money flow end to end (charge to invoice to
settlement to refund to payout or transfer) and assert the amounts
reconcile at each hop, with add-ons, discounts, credits, and tax
counted on both sides. Confirm provider status before marking a local
record final. Reverse a released transfer when its charge is refunded.
Reconcile the settled invoice on any later price or status change. Test
by driving a paid order through an add-on change, a refund, and a
payout, and asserting the ledger balances.

## 8. The Dead Control or Unlawful Transition

**Sample**: An operator-configurable flag (approval-required, a hold, a
lock) is stored and shown in the UI but never read on the enforcement
path, or a lifecycle transition frees a still-committed resource
(inventory slot, physical-access grant, credit hold) before its end or
runs out of lifecycle order.

**Why it fails**: The control looks present in the schema and UI, but
the behavior it promises never happens, so operators trust a safety
that is not there and resources are released early.

**Fix**: For every gating flag, trace the branch that READS it and
prove it changes behavior; for every state machine, define legal
transitions and reject any that release a resource before the entity's
end or that run out of order, applying the same guard (end time, grace
period) on manual and automatic paths. Test a flag set on that changes
behavior and an early-release or illegal transition that is rejected.
