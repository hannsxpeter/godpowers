# OWASP Web Top 10:2025 Router

Use this order for current web hardening. Each category must produce one row in
`.godpowers/harden/FINDINGS.mdx` with a reproducible manual test, result, and
finding link or a project-specific Not Applicable justification. Scanner output
cannot satisfy a row by itself.

| Current category | Required manual scope |
|---|---|
| A01:2025 Broken Access Control | Object and function authorization, SSRF, and internal-resource access |
| A02:2025 Security Misconfiguration | Application, framework, cloud, CORS, error, default, and debug configuration |
| A03:2025 Software Supply Chain Failures | Dependency provenance, CI identities, build integrity, signing, substitution, and distribution |
| A04:2025 Cryptographic Failures | Algorithms, key lifecycle, nonce or IV handling, password hashing, and transport policy |
| A05:2025 Injection | Untrusted input through every interpreter and output context |
| A06:2025 Insecure Design | Threat models, abuse cases, rate limits, step-up controls, and secure defaults |
| A07:2025 Authentication Failures | Credentials, sessions, MFA, recovery, rotation, revocation, and throttling |
| A08:2025 Software or Data Integrity Failures | Trust boundaries and integrity checks for code, updates, data, and serialized content |
| A09:2025 Security Logging and Alerting Failures | Detection, alert delivery, ownership, and exercised response |
| A10:2025 Mishandling of Exceptional Conditions | Fail-open paths, abnormal transitions, exhaustion, partial operations, rollback, and recovery |

OWASP moved SSRF into A01 and introduced A10 for exceptional-condition
handling. Do not preserve the 2021 category ordering in a new hardening report.
Use `references/shipping/HARDEN-OWASP-WORKSHEETS.md` for the manual procedures.

When standards freshness is material to a release, verify the current category
authority at `https://owasp.org/Top10/2025/` before recording the walkthrough.
