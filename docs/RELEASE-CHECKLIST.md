# Release Checklist

Use this checklist before publishing a public Godpowers release.

## Version And Notes

- Confirm `package.json` has the intended version.
- Confirm `README.md`, `CHANGELOG.md`, and `RELEASE.md` mention the same version.
- Confirm `CHANGELOG.md` explains user-visible changes, guardrails, and release risks.
- Confirm `RELEASE.md` explains what is stable, what changed, and what is deferred.
- Confirm `lib/repo-doc-sync.detect(projectRoot)` reports `fresh` before publishing.
- Confirm `lib/repo-surface-sync.detect(projectRoot)` reports `fresh` before publishing.
- Confirm `lib/route-quality-sync.detect(projectRoot)` reports `fresh` before publishing.
- Confirm `lib/recipe-coverage-sync.detect(projectRoot)` reports `fresh` before publishing.
- Confirm `lib/release-surface-sync.detect(projectRoot)` reports `fresh` before publishing.
- For background or delegated release checks, use the `strict-release-readiness`
  automation template and treat any unchecked surface as a blocker.

Strict release readiness must cover:

- Root docs: `README.md`, `CHANGELOG.md`, `RELEASE.md`, `CONTRIBUTING.md`,
  `SUPPORT.md`, `USERS.md`, `ARCHITECTURE.md`, `ARCHITECTURE-MAP.md`,
  `AGENTS.md`, and `SKILL.md`.
- `docs/`, including release checklist, roadmap, reference, validation,
  concepts, getting started, feature awareness, auto-invoke visibility, and
  repo sync docs.
- `agents/`, including pillar files and specialist agent contracts.
- `skills/`, including command skills and release-visible examples.
- `routing/`, including command routes and high-frequency recipes.
- `workflows/`, including arc, suite, docs, deps, hygiene, and audit workflows.
- `schema/`, `templates/`, `references/`, and `hooks/`.
- `lib/`, including sync detectors, release guardrails, host capabilities,
  automation providers, and runtime helpers.
- `scripts/`, `tests/`, and `fixtures/`.
- `.github/workflows/`, including CI, publish, and pack publish gates.
- Package and published surfaces: `package.json`, `package-lock.json`,
  npm payload, npm latest, git tag, GitHub release, and local install.

## Local Verification

Run the one-command release gate:

```bash
npm run release:check
```

This includes:

- Full test suite through `npm test`.
- Security and surface audit through `npm run test:audit`.
- Package contents assertion through `npm run pack:check`.
- Repository documentation sync tests through `node scripts/test-repo-doc-sync.js`.
- Repository surface sync tests through `node scripts/test-repo-surface-sync.js`.
- Automation surface sync tests through `node scripts/test-automation-surface-sync.js`.
- Host capability tests through `node scripts/test-host-capabilities.js`.
- Extension authoring scaffold tests through `node scripts/test-extension-authoring.js`.
- Dogfood runner tests through `node scripts/test-dogfood-runner.js`.
- Extension publish readiness tests through `node scripts/test-extensions-publish.js`.
- Mode D suite tests through `node scripts/test-mode-d.js`.
- Installer smoke tests through `node scripts/test-install-smoke.js`.

Before publish, confirm release-surface sync still sees those dogfood,
extension, suite, and installer gates through `package.json` or the delegated
test runner in `scripts/run-tests.js`.

Run the static release-sensitive lint gate separately when release prose,
installer decomposition, async runtime APIs, agent reference validation, or God
Mode runbook delegation changes:

```bash
npm run lint
```

## Package Surface

Confirm the npm payload includes:

- `bin/install.js`
- `SKILL.md`
- `skills/`
- `agents/`
- `templates/`
- `references/`
- `routing/`
- `workflows/`
- `schema/`
- `lib/`
- `fixtures/`
- `extensions/`

Confirm the npm payload excludes:

- `.github/`
- `docs/`
- `scripts/`
- `tests/`
- `examples/`
- `node_modules/`
- generated `*.tgz` files

## Git And Npm

- Commit release changes on `main`.
- Push `main`.
- Create a `vX.Y.Z` git tag on the release commit.
- Push the tag.
- Prefer the tag-triggered GitHub publish workflow for npm provenance.
- Create the GitHub release from the same tag and attach tarballs created from
  the verified release commit when GitHub release assets are needed.
- If the workflow cannot run, publish the verified tarball with
  `npm publish godpowers-X.Y.Z.tgz --access public` and record that provenance
  is unavailable for that publish.
- Verify `npm view godpowers@latest version` after publish.
- Verify the local installer can install the published version.

## Published Install Verification

After publish, verify the artifact users receive from npm, not only the local
repository checkout.

Run these checks from a temporary directory:

```bash
node scripts/verify-published-install.js godpowers@latest
npm view godpowers@latest version
npx godpowers@latest --claude --global
npx godpowers@latest --codex --global
npx godpowers@latest quick-proof --project=. --brief
npx godpowers@latest quick-proof --project=. --inspect-project --brief
npx godpowers@latest status --project=. --brief
npx godpowers@latest next --project=. --brief
```

Confirm:

- npm latest matches the intended release version.
- `node scripts/verify-published-install.js godpowers@latest` passes against
  the registry artifact instead of the local checkout.
- Claude install writes skills, agents, references, runtime files, and the
  version marker.
- Codex install writes skill directories plus `agents/*.toml` metadata.
- `quick-proof --project=. --brief` reads the shipped quick-proof fixture and
  recommends `/god-prd`.
- `quick-proof --project=. --inspect-project --brief` labels current-project
  inspection explicitly and performs no writes.
- `status --project=. --brief` returns a dashboard-shaped report instead of a
  module resolution error.
- `next --project=. --brief` reports missing state honestly when no
  `.godpowers/` directory exists.
- Any degraded host capability is reported plainly.

If a network or registry issue blocks this verification, record the blocker in
the release notes and do not claim the published install has been verified.

## Post-Release

- Keep package tarballs out of the repository.
- Record any release follow-up as a GitHub issue or backlog item.
- Do not start the next version until the published package, git tag, and docs agree.
