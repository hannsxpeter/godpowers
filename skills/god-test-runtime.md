---
name: god-test-runtime
description: |
  Verify a running product through its real user surface for web, API,
  CLI or SDK, mobile or desktop, data or ML, and infrastructure or IaC
  forms. Builds and validates a launch, doctor, drive, evidence, cleanup,
  isolation, feature-map, and completion-evidence profile before execution.

  Triggers on: "god test runtime", "/god-test-runtime", "runtime test",
  "browser test", "verify user path", "run e2e", "run tests"
---

# /god-test-runtime

Verify the selected product form through the same public surface a user or
consumer controls. The command name remains `/god-test-runtime` for
compatibility. Browser automation is one form-specific harness, not the
definition of runtime verification.

## Forms

| Form | Action |
|---|---|
| `/god-test-runtime` | Verify the primary mapped feature with the selected product-form profile |
| `/god-test-runtime --form <id>` | Use an explicit canonical product form |
| `/god-test-runtime audit [target]` | Run the form-specific audit or doctor checks only |
| `/god-test-runtime test [target]` | Drive mapped user paths only |
| `/god-test-runtime --strict` | Promote warnings to errors |
| `/god-test-runtime --no-runtime` | Skip and record the missing runtime proof as a warning |
| `/god-test-runtime --backend agent-browser` | Force agent-browser for web-application only |
| `/god-test-runtime --backend playwright` | Force Playwright for web-application only |
| `/god-test-runtime --backend auto` | Use agent-browser, then Playwright, for web-application only |

## Canonical product forms

| Product form | Primary drive surface |
|---|---|
| `web-application` | Headless browser against an evidenced URL |
| `api-or-service` | Real consumer fixture through HTTP, RPC, events, or worker input |
| `cli-or-sdk` | Clean consumer installation through the public command or API |
| `mobile-or-desktop` | Declared platform build through a device, emulator, or desktop harness |
| `data-or-ml` | Clean-environment pipeline or model reproduction |
| `infrastructure-or-iac` | Static validation, isolated plan, policy check, simulation or sandbox apply |

Select the form with `lib/product-routing.js` before choosing a harness. Do not
infer a browser from generic product language.

## Verification profile gate

Before spawning the specialist, construct one plain object and call
`lib/verification-profile.js` function `validateProfile(profile)`. Do not drive
the product unless the result verdict is `pass`.

The profile must record:

- `launch`: exact start, build, install, or provisioning command plus readiness evidence.
- `doctor`: one read-only check that proves the exact instance is worth driving.
- `drive`: the production-equivalent harness and public interface under test.
- `evidence`: action, resulting user-visible state, and material side effects to retain.
- `cleanup`: teardown scoped to resources created by this run. Cleanup retains the evidence.
- `isolation`: ports, data directories, consumer workspace, profile, device, or sandbox boundaries.
- `features`: a feature map with at least one entry. Each entry records `id`, `userPath`, `drive`, and `observableEndState`.
- `completionEvidence`: every form-specific completion evidence item from `formDefinition(form)`.

A generic test pass cannot replace the selected form's completion evidence.
At least one mapped feature must be driven end to end for a successful run.

## Process

1. Verify `.godpowers/` and `.godpowers/prd/PRD.mdx` exist.
2. Resolve the selected product form and its completion evidence from
   `lib/product-routing.js`.
3. Ground launch, doctor, drive, evidence, cleanup, isolation, and the feature
   map in repository commands, routes, manifests, and acceptance criteria.
4. Run `validateProfile(profile)`. Report every finding and stop before launch
   when the verdict fails.
5. Spawn `god-browser-tester` in fresh context with the validated profile. The
   specialist name remains for compatibility and covers all six forms.
6. Launch the isolated target, run doctor, drive at least one mapped feature,
   capture evidence, and clean up the exact resources created by the run.
7. Confirm cleanup succeeded and evidence survived, then report the result.

## Web application compatibility

For `web-application`, preserve the existing headless browser behavior:

- Resolve a user-provided URL, `state.json.deploy.url`, or
  `state.json.dev-server.url`. Do not guess an unrecorded URL.
- Prefer agent-browser, fall back to Playwright, and always use
  `lib/browser-bridge.js`.
- Never pass `headless: false`.
- Run design audit when DESIGN.mdx exists, including real-DOM contrast and
  token comparison.
- Run PRD acceptance flows through the browser and capture screenshots.

The bridge refuses non-headless launches. A visual session belongs outside
Godpowers runtime verification.

## Evidence and outputs

Write each run under `.godpowers/runtime/<run-id>/`:

- `profile.json`: validated product form, lifecycle contract, and feature map.
- `test-report.json`: pass or fail per mapped feature and requirement.
- `evidence/`: form-appropriate transcripts, responses, logs, screenshots,
  package details, plans, policy results, or reproduced artifact metadata.
- `audit-report.json`: web design findings when a design audit applies.
- `summary.mdx`: human-readable outcome, cleanup result, and deferred coverage.

Executed commands and captured outputs are evidence. The validation result is a
contract check and must not be presented as proof that the user path ran.

## Critical findings

- Any P-MUST requirement fails its mapped user or consumer path.
- Launch or doctor cannot identify a safe instance after a bounded retry.
- The observable end state or required material side effect is absent.
- Isolation fails or cleanup would target resources the run did not create.
- For web applications, WCAG AA contrast fails or component drift exceeds 10 percent.

Critical findings pause default mode and `--yolo`. Other findings flow to
REVIEW-REQUIRED.md as one runtime-verification batch.

## Automatic runs

| Workflow | Scope | Gate semantics |
|---|---|---|
| `/god-build` post-wave | Primary mapped feature | Warning unless the slice requires runtime proof |
| `/god-launch` | Selected form's release path | Hard gate, criticals block |
| `/god-harden` | Form-specific runtime security and accessibility boundary | Warning |
| `/god-design` post-change | Web application design audit only | Warning |

Automatic execution requires an evidenced target and a safe isolation plan. If
either is missing, report what source is needed and do not guess.

## Have-Nots

- Do not select a browser harness for a non-web product by default.
- Do not launch before `validateProfile(profile)` passes.
- Do not count internal setters, test-only endpoints, or repository internals as a user path.
- Do not accept an empty feature map or generic completion evidence.
- Do not drive a shared instance when isolation cannot be established.
- Do not kill by process name or clean resources that this run did not create.
- Do not delete evidence during cleanup.
- Do not mark a P-MUST user-path failure as a warning.

## See also

- `lib/verification-profile.js`: cross-form profile validator.
- `lib/product-routing.js`: canonical product forms and completion evidence.
- `specialists/god-browser-tester.md`: compatibility-named lifecycle owner.
- `lib/browser-bridge.js`: web-only headless browser cascade.
- `lib/runtime-audit.js`: web-only rendered design verification.
- `lib/runtime-test.js`: web-only PRD browser-flow runner.
