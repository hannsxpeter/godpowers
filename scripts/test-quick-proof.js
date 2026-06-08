#!/usr/bin/env node
/**
 * Quick proof documentation tests.
 *
 * Keeps the first-user proof loop connected to README, runtime expectations,
 * release verification, and the adoption canary.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const quickProof = require('../lib/quick-proof');
const adoptionMetrics = require('../lib/adoption-metrics');
const router = require('../lib/router');
const recipes = require('../lib/recipes');
const { test, report, assert } = require('./test-harness');



function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function assertIncludes(relPath, expected) {
  const text = read(relPath);
  assert(text.includes(expected), `${relPath} missing expected text: ${expected}`);
}

function markdownLinks(text) {
  const links = [];
  const re = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function isExternal(target) {
  return /^[a-z]+:\/\//i.test(target) || target.startsWith('#') || target.startsWith('mailto:');
}

function stripAnchor(target) {
  return target.split('#')[0];
}

const STARTER_ROWS = [
  '| Start a product | `/god-init`, `/god-prd`, `/god-design`, `/god-arch`, `/god-roadmap`, `/god-stack`, `/god-repo`, `/god-build` |',
  '| Add a feature | `/god-reconcile`, `/god-feature`, `/god-sync`, `/god-review` |',
  '| Fix production | `/god-hotfix`, `/god-postmortem`, `/god-status` |',
  '| Audit an existing repo | `/god-preflight`, `/god-archaeology`, `/god-reconstruct`, `/god-audit`, `/god-tech-debt` |',
  '| Ship a release | `/god-sync`, `/god-docs`, `/god-version`, `/god-automation-setup`, `npm run release:check` |',
  '| Maintain project health | `/god-hygiene`, `/god-update-deps`, `/god-docs`, `/god-check-todos` |',
  '| Extend Godpowers | `/god-extension-scaffold --name=@godpowers/my-pack --output=.`, `/god-test-extension`, `/god-extension-add`, `/god-extension-list` |'
];

const STARTER_GOAL_RECIPES = new Map([
  ['Start a product', 'greenfield-fast'],
  ['Add a feature', 'add-feature-mid-arc-pause'],
  ['Fix production', 'production-broken'],
  ['Audit an existing repo', 'brownfield-onboarding'],
  ['Ship a release', 'release-maintenance'],
  ['Maintain project health', 'weekly-health-check'],
  ['Maintain health', 'weekly-health-check'],
  ['Extend Godpowers', 'extension-authoring']
]);

function starterGoals(text) {
  return text.split('\n')
    .filter((line) => /^\| (Start a product|Add a feature|Fix production|Audit an existing repo|Ship a release|Maintain (project )?health|Extend Godpowers) \|/.test(line))
    .map((line) => line.split('|')[1].trim());
}

function starterCommands(text) {
  const rows = text.split('\n').filter((line) => /^\| (Start a product|Add a feature|Fix production|Audit an existing repo|Ship a release|Maintain (project )?health|Extend Godpowers) \|/.test(line));
  return rows.flatMap((row) => [...row.matchAll(/`([^`]+)`/g)].map((match) => match[1]));
}

console.log('\n  Quick proof documentation tests\n');

test('README links to the quick proof and adoption canary', () => {
  assertIncludes('README.md', '[Quick Proof](docs/quick-proof.md)');
  assertIncludes('README.md', '[Adoption Canary](docs/adoption-canary.md)');
});

test('README exposes starter paths before the full reference', () => {
  assertIncludes('README.md', '### Start With A Path');
  for (const phrase of [
    'Start a product',
    'Add a feature',
    'Fix production',
    'Audit an existing repo',
    'Ship a release',
    'Maintain project health',
    'Extend Godpowers'
  ]) {
    assertIncludes('README.md', phrase);
  }
});

test('starter paths stay aligned across public proof docs', () => {
  const readme = read('README.md');
  const quickProofDoc = read('docs/quick-proof.md');
  for (const row of STARTER_ROWS) {
    assert(readme.includes(row), `README.md missing starter row: ${row}`);
    assert(quickProofDoc.includes(row.replace('Maintain project health', 'Maintain health')),
      `docs/quick-proof.md missing starter row: ${row}`);
  }
});

test('starter path slash commands resolve to shipped routes', () => {
  const commands = new Set([
    ...starterCommands(read('README.md')),
    ...starterCommands(read('docs/quick-proof.md'))
  ]);
  for (const command of commands) {
    if (!command.startsWith('/god')) continue;
    const baseCommand = command.split(/\s+/)[0];
    assert(router.getRouting(baseCommand), `missing route for starter command: ${command}`);
    assert(exists(`skills/${baseCommand.slice(1)}.md`), `missing skill for starter command: ${command}`);
  }
});

test('starter path goal labels resolve through front-door recipes', () => {
  const goals = new Set([
    ...starterGoals(read('README.md')),
    ...starterGoals(read('docs/quick-proof.md'))
  ]);
  for (const goal of goals) {
    const expected = STARTER_GOAL_RECIPES.get(goal);
    assert(expected, `missing starter goal recipe expectation for: ${goal}`);
    recipes.clearCache();
    const matches = recipes.matchIntent(goal);
    assert(matches.length > 0, `no recipe match for starter goal: ${goal}`);
    const top = matches[0].recipe.metadata.name;
    assert(top === expected, `expected ${expected} for ${goal}, got ${top}`);
  }
});

test('README names runtime expectations near install', () => {
  assertIncludes('README.md', '### Runtime Expectations');
  assertIncludes('README.md', 'Claude Code');
  assertIncludes('README.md', 'Codex');
  assertIncludes('README.md', 'Degraded hosts');
  assertIncludes('README.md', '[Host capabilities](docs/host-capabilities.md)');
});

test('quick proof covers proof, transcripts, starters, and runtime expectations', () => {
  for (const heading of [
    '# Quick Proof',
    '## What This Proves',
    '## Ten Minute Path',
    '## Outcome Metrics',
    '## Before And After',
    '## Transcript Excerpts',
    '## Starter Paths',
    '## Runtime Expectations',
    '## What To Inspect Next'
  ]) {
    assertIncludes('docs/quick-proof.md', heading);
  }
});

test('quick proof fixture computes /god-prd as next command', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-quick-proof-host-'));
  const proof = quickProof.compute(tmp, {
    hostReport: {
      host: 'test',
      level: 'degraded',
      guarantees: {
        shell: true,
        fileEdit: true,
        node: process.version,
        git: 'git version test',
        npm: 'test',
        gh: null,
        agentSpawn: false,
        extensionAuthoring: false,
        suiteReleaseDryRun: false
      },
      installedAgents: { codex: false, claude: false },
      gaps: ['fresh-context agent spawn not detected']
    }
  });
  assert(proof.dashboard.next.command === '/god-prd',
    `next command: ${proof.dashboard.next.command}`);
  assert(proof.dashboard.planning.prd.status === 'missing',
    `prd: ${proof.dashboard.planning.prd.status}`);
  assert(proof.statePath === 'fixtures/quick-proof/project/.godpowers/state.json',
    `state path: ${proof.statePath}`);
  const rendered = quickProof.render(proof);
  assert(rendered.includes('Godpowers Quick Proof'), 'render missing title');
  assert(rendered.includes('Next: /god-prd'), rendered);
  assert(rendered.includes('Host guarantees: degraded on test'), rendered);
  assert(rendered.includes('Outcome metrics:'), rendered);
  assert(rendered.includes('Commands to first signal: 1'), rendered);
  assert(proof.metrics.nextCommand === '/god-prd', JSON.stringify(proof.metrics));
  assert(proof.metrics.missingPlanningArtifacts === 2, JSON.stringify(proof.metrics));
});

test('quick proof renders dot for the user project when fixture root was passed', () => {
  const proof = quickProof.compute(quickProof.FIXTURE_ROOT, {
    hostReport: {
      host: 'test',
      level: 'full',
      guarantees: {
        shell: true,
        fileEdit: true,
        node: process.version,
        git: 'git version test',
        npm: 'test',
        gh: 'test',
        agentSpawn: true,
        extensionAuthoring: true,
        suiteReleaseDryRun: true
      },
      installedAgents: { codex: true, claude: true },
      gaps: []
    }
  });
  const rendered = quickProof.render(proof);
  assert(rendered.includes('Try it on your project:'), rendered);
  assert(rendered.includes('npx godpowers status --project=. --brief'), rendered);
  assert(rendered.includes('npx godpowers next --project=. --brief'), rendered);
});

test('CLI quick-proof renders the fixture proof', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-quick-proof-cli-'));
  const out = cp.execFileSync(process.execPath,
    [path.join(ROOT, 'bin', 'install.js'), 'quick-proof', '--project', tmp, '--brief'],
    { encoding: 'utf8' });
  assert(out.includes('Godpowers Quick Proof'), out);
  assert(out.includes('Next: /god-prd'), out);
  assert(out.includes('State on disk: fixtures/quick-proof/project/.godpowers/state.json'), out);
  assert(out.includes('Outcome metrics:'), out);
  assert(out.includes('Host gaps:'), out);
});

test('quick proof names the accountable outputs', () => {
  for (const phrase of [
    'disk state',
    'artifacts',
    'validation gates',
    'host guarantees',
    'next action',
    '.godpowers/PROGRESS.md',
    '.godpowers/harden/FINDINGS.md'
  ]) {
    assertIncludes('docs/quick-proof.md', phrase);
  }
});

test('release checklist includes published install verification', () => {
  assertIncludes('docs/RELEASE-CHECKLIST.md', '## Published Install Verification');
  assertIncludes('docs/RELEASE-CHECKLIST.md', 'node scripts/verify-published-install.js godpowers@latest');
  assertIncludes('docs/RELEASE-CHECKLIST.md', 'npx godpowers@latest --claude --global');
  assertIncludes('docs/RELEASE-CHECKLIST.md', 'npx godpowers@latest --codex --global');
  assertIncludes('docs/RELEASE-CHECKLIST.md', 'npx godpowers@latest quick-proof --project=. --brief');
  assertIncludes('docs/RELEASE-CHECKLIST.md', 'npx godpowers@latest status --project=. --brief');
});

test('published install verification script exercises quick-proof and runtime installs', () => {
  assertIncludes('scripts/verify-published-install.js', 'quick-proof');
  assertIncludes('scripts/verify-published-install.js', '--claude');
  assertIncludes('scripts/verify-published-install.js', '--codex');
  assertIncludes('scripts/verify-published-install.js', 'god-orchestrator.toml');
});

test('adoption canary defines pass and failure criteria', () => {
  assertIncludes('docs/adoption-canary.md', '# Adoption Canary');
  assertIncludes('docs/adoption-canary.md', 'node scripts/run-adoption-canary.js <git-url> --output=.godpowers-canary/report.md');
  assertIncludes('docs/adoption-canary.md', '## Canary Runbook');
  assertIncludes('docs/adoption-canary.md', 'commands to first signal');
  assertIncludes('docs/adoption-canary.md', '## Pass Criteria');
  assertIncludes('docs/adoption-canary.md', '## Failure Criteria');
  assertIncludes('docs/adoption-canary.md', '## Feedback Targets');
});

test('adoption canary harness captures CLI-verifiable proof signals', () => {
  assertIncludes('scripts/run-adoption-canary.js', 'quick-proof');
  assertIncludes('scripts/run-adoption-canary.js', 'status');
  assertIncludes('scripts/run-adoption-canary.js', 'next');
  assertIncludes('scripts/run-adoption-canary.js', 'Adoption Canary Report');
  assertIncludes('scripts/run-adoption-canary.js', 'Outcome Metrics');
});

test('adoption metrics summarize quick proof and canary outputs', () => {
  const metrics = adoptionMetrics.canaryMetrics({
    quickProof: 'Next: /god-prd',
    status: 'Godpowers Dashboard\nCurrent status:',
    next: 'Suggested next command:\n  /god-prd'
  });
  assert(metrics.cliSignalsCaptured === 3, JSON.stringify(metrics));
  assert(metrics.quickProofHasNext === true, JSON.stringify(metrics));
  assert(metrics.statusHasDashboard === true, JSON.stringify(metrics));
  assert(metrics.nextHasRecommendation === true, JSON.stringify(metrics));
  const rendered = adoptionMetrics.renderCanary(metrics);
  assert(rendered.includes('CLI signals captured: 3 of 3.'), rendered);
});

test('proof transcript captures the runnable quick-proof output', () => {
  assertIncludes('docs/proof-transcript.md', '# Proof Transcript');
  assertIncludes('docs/proof-transcript.md', 'node bin/install.js quick-proof --project=. --brief');
  assertIncludes('docs/proof-transcript.md', 'Next: /god-prd');
  assertIncludes('docs/proof-transcript.md', 'State on disk: fixtures/quick-proof/project/.godpowers/state.json');
  assertIncludes('docs/proof-transcript.md', 'Outcome metrics:');
});

test('first proof case study is linked and keeps claims scoped', () => {
  assertIncludes('README.md', '[First 10 Minute Proof Case Study](docs/case-studies/first-10-minute-proof.md)');
  assertIncludes('docs/quick-proof.md', '[First 10 Minute Proof Case Study](case-studies/first-10-minute-proof.md)');
  assertIncludes('docs/adoption-canary.md', '[First 10 Minute Proof Case Study](case-studies/first-10-minute-proof.md)');
  assertIncludes('docs/case-studies/first-10-minute-proof.md', '# First 10 Minute Proof Case Study');
  assertIncludes('docs/case-studies/first-10-minute-proof.md', '## What This Does Not Prove');
  assertIncludes('docs/case-studies/first-10-minute-proof.md', 'The first external repository case study is still needed');
});

test('surface discipline and profile-first onboarding stay visible', () => {
  assertIncludes('README.md', 'npx godpowers --claude --global --profile=core');
  assertIncludes('README.md', 'New public command surface should be added only when existing families');
  assertIncludes('docs/reference.md', '### Surface discipline');
  assertIncludes('docs/ROADMAP.md', 'Surface discipline: do not add public commands');
});

test('proof docs local links resolve', () => {
  for (const relPath of [
    'docs/quick-proof.md',
    'docs/adoption-canary.md',
    'docs/proof-transcript.md',
    'docs/case-studies/first-10-minute-proof.md'
  ]) {
    const baseDir = path.dirname(relPath);
    for (const target of markdownLinks(read(relPath))) {
      if (isExternal(target)) continue;
      const localTarget = stripAnchor(target);
      if (!localTarget) continue;
      const resolved = path.normalize(path.join(baseDir, localTarget));
      assert(exists(resolved), `${relPath} links to missing file: ${target}`);
    }
  }
});

test('new proof docs do not contain banned dash characters or decorative emoji', () => {
  const targets = [
    'docs/quick-proof.md',
    'docs/adoption-canary.md',
    'docs/case-studies/first-10-minute-proof.md'
  ];
  for (const relPath of targets) {
    const text = read(relPath);
    assert(!text.includes('\u2013'), `${relPath} contains en dash`);
    assert(!text.includes('\u2014'), `${relPath} contains em dash`);
    assert(!/[\u{1F000}-\u{1FAFF}]/u.test(text), `${relPath} contains emoji`);
  }
});

report();
