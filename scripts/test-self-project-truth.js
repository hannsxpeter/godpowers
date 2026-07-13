#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const truth = require('../lib/self-project-truth');
const state = require('../lib/state');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

function validProject() {
  const root = mkProject('godpowers-self-truth-');
  const version = '9.9.9';
  writeRel(root, 'package.json', JSON.stringify({ name: 'godpowers', version, description: '2 slash commands' }));
  writeRel(root, 'packages/mcp/package.json', JSON.stringify({ name: '@godpowers/mcp', version }));
  writeRel(root, 'package-lock.json', JSON.stringify({
    name: 'godpowers', version, packages: { '': { version }, 'packages/mcp': { version } }
  }));
  writeRel(root, 'skills/god.md', 'one');
  writeRel(root, 'skills/god-mode.md', 'two');
  writeRel(root, 'specialists/god-orchestrator.md', 'agent');
  writeRel(root, 'workflows/full.yaml', 'name: full');
  writeRel(root, 'routing/recipes/start.yaml', 'name: start');
  const counts = '2 slash commands, 1 agents, 1 workflows, 1 recipes';
  writeRel(root, 'README.md', `![Version](https://img.shields.io/badge/version-${version}-blue)\n${counts}\n`);
  writeRel(root, 'RELEASE.md', `# Godpowers ${version} Release\n\n${counts}\n`);
  writeRel(root, 'USERS.md', `The current source version is v${version}.\n`);
  writeRel(root, 'agents/context.md', `The current repository version is \`${version}\`.\n${counts}\n`);
  writeRel(root, 'docs/reference.md', `Complete reference for v${version}.\n`);
  writeRel(root, 'docs/ROADMAP.md', `Current source: v${version}.\n`);

  const current = state.init(root, 'godpowers');
  current.tiers['tier-0'] = {
    orchestration: { status: 'pending' },
    preflight: { status: 'pending' },
    archaeology: { status: 'pending' },
    'tech-debt': { status: 'pending' },
    'greenfield-simulation': { status: 'pending' },
    greenfieldify: { status: 'pending' },
    sync: { status: 'pending' }
  };
  current['lifecycle-phase'] = 'steady-state-active';
  for (const [tierKey, tier] of Object.entries(current.tiers)) {
    for (const stepKey of Object.keys(tier)) {
      const id = `${tierKey}.${stepKey}`;
      const canonical = truth.REQUIRED_ARTIFACTS[id];
      tier[stepKey] = {
        status: 'done',
        artifact: canonical
          ? canonical.replace(/^\.godpowers\//, '')
          : 'runs/test/HANDOFF.mdx'
      };
    }
  }
  current.tiers['tier-1'].design = { status: 'not-required' };
  current.tiers['tier-1'].product = { status: 'not-required' };
  current.deliverables = { requirements: { total: 2, done: 2 } };
  writeRel(root, '.godpowers/runs/test/HANDOFF.mdx', '# Handoff\n');
  for (const relPath of Object.values(truth.REQUIRED_ARTIFACTS)) writeRel(root, relPath, '# Evidence\n');
  writeRel(root, '.godpowers/REQUIREMENTS.mdx', '- [x] **P-MUST-01** One\n- [x] **P-MUST-02** Two\n');
  const hashes = truth.ROADMAP_HASH_SOURCES.map((relPath) => {
    const content = fs.readFileSync(path.join(root, relPath), 'utf8');
    return `- [DECISION] Source hash \`${relPath}\`: \`${truth.sha(content)}\`.`;
  });
  writeRel(root, '.godpowers/roadmap/ROADMAP.mdx', [
    '# Roadmap',
    '',
    '- [DECISION] Evidence generated at: `2026-07-13T12:00:00.000Z`.',
    `- [DECISION] Source version: \`${version}\`.`,
    ...hashes
  ].join('\n'));
  for (const tier of Object.values(current.tiers)) {
    for (const step of Object.values(tier)) {
      if (!step.artifact) continue;
      if (step.artifact.endsWith('/STATE.mdx')) continue;
      const artifact = path.join(root, '.godpowers', step.artifact);
      step['artifact-hash'] = truth.sha(fs.readFileSync(artifact, 'utf8'));
    }
  }
  state.write(root, current);
  return root;
}

test('self-project truth passes aligned release evidence', () => {
  const root = validProject();
  const result = truth.check(root);
  assert(result.verdict === 'pass', truth.render(result));
});

test('self-project truth blocks stale version, lifecycle, and requirement counts', () => {
  const root = validProject();
  writeRel(root, 'agents/context.md', 'The current repository version is `1.0.0`.\n2 slash commands, 1 agents, 1 workflows, 1 recipes\n');
  const current = state.read(root);
  current['lifecycle-phase'] = 'in-arc';
  current.deliverables.requirements.done = 1;
  state.write(root, current);
  const result = truth.check(root);
  assert(result.verdict === 'fail', 'contradictions should fail');
  assert(result.findings.some((item) => item.id === 'version:agents/context.md'), truth.render(result));
  assert(result.findings.some((item) => item.id === 'state:lifecycle'), truth.render(result));
  assert(result.findings.some((item) => item.id === 'requirements:counts'), truth.render(result));
});

test('self-project truth blocks missing artifacts and stale roadmap hashes', () => {
  const root = validProject();
  fs.unlinkSync(path.join(root, '.godpowers', 'arch', 'ARCH.mdx'));
  writeRel(root, 'package.json', JSON.stringify({ name: 'godpowers', version: '9.9.9', description: '2 slash commands', changed: true }));
  const result = truth.check(root);
  assert(result.verdict === 'fail', 'stale evidence should fail');
  assert(result.findings.some((item) => item.id === 'artifact:tier-1.arch'), truth.render(result));
  assert(result.findings.some((item) => item.id === 'roadmap:hash:package.json'), truth.render(result));
});

test('self-project truth blocks a reduced lifecycle step inventory', () => {
  const root = validProject();
  const current = state.read(root);
  delete current.tiers['tier-3'].observe;
  state.write(root, current);
  const result = truth.check(root);
  assert(result.verdict === 'fail', 'missing required step should fail');
  assert(result.findings.some((item) => item.id === 'state:required:tier-3.observe'), truth.render(result));
});

test('self-project truth blocks internally valid views generated from stale state', () => {
  const root = validProject();
  const current = state.read(root);
  current.project.name = 'changed-after-view-generation';
  state.write(root, current, { refreshViews: false });
  const result = truth.check(root);
  assert(result.verdict === 'fail', 'stale generated progress should fail');
  assert(result.findings.some((item) => item.id === 'progress:current'), truth.render(result));
});

test('self-project truth blocks artifact hash drift', () => {
  const root = validProject();
  const current = state.read(root);
  current.tiers['tier-1'].arch['artifact-hash'] = truth.sha('original');
  state.write(root, current);
  writeRel(root, '.godpowers/arch/ARCH.mdx', '# Changed evidence\n');
  const result = truth.check(root);
  assert(result.verdict === 'fail', 'artifact hash drift should fail');
  assert(result.findings.some((item) => item.id === 'artifact-hash:tier-1.arch'), truth.render(result));
});

report('Self-project truth behavioral tests');
