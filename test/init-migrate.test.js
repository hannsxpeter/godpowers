const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const initTools = require('../lib/init');
const migrateTools = require('../lib/migrate');
const stateStore = require('../lib/state');
const lint = require('../lib/lint');
const { layout } = require('../lib/paths');
const { tempDir, write, read, git, gitRepo } = require('./helpers');

test('detectVerify finds the check command for common ecosystems', () => {
  const cases = [
    [{ 'package.json': '{"scripts":{"test":"node --test"}}' }, 'npm test'],
    [{ 'package.json': '{"scripts":{"test":"vitest"}}', 'pnpm-lock.yaml': '' }, 'pnpm test'],
    [{ 'package.json': '{"scripts":{"test":"jest"}}', 'yarn.lock': '' }, 'yarn test'],
    [{ 'package.json': '{"scripts":{"test":"bun test"}}', 'bun.lock': '' }, 'bun run test'],
    [{ 'package.json': '{"scripts":{"test":"echo \\"Error: no test specified\\" && exit 1"}}', 'go.mod': '' }, 'go test ./...'],
    [{ 'package.json': 'not json', 'Cargo.toml': '' }, 'cargo test'],
    [{ Makefile: 'build:\n\ttrue\ntest:\n\ttrue\n' }, 'make test'],
    [{ 'pyproject.toml': '' }, 'pytest'],
    [{ gradlew: '' }, './gradlew test'],
    [{ 'pom.xml': '' }, 'mvn test'],
    [{ 'mix.exs': '' }, 'mix test'],
    [{ 'deno.json': '{}' }, 'deno test'],
    [{}, null]
  ];
  for (const [files, expected] of cases) {
    const root = tempDir();
    for (const [name, content] of Object.entries(files)) write(root, name, content);
    assert.equal(initTools.detectVerify(root), expected, JSON.stringify(files));
  }
});

test('init creates the project, then reports it exists; legacy projects are refused', () => {
  const root = tempDir();
  write(root, 'package.json', '{"name":"app","scripts":{"test":"node --test"}}');
  const result = initTools.init(root, { goal: 'Ship the app.' });
  assert.equal(result.status, 'created');
  assert.equal(result.verify, 'npm test');
  assert.equal(result.agents, 'created');
  const state = stateStore.read(root);
  assert.equal(state.data.project, path.basename(root));
  assert.equal(state.data.stage, 'plan');
  assert.equal(state.goal, 'Ship the app.');
  assert.equal(read(root, '.godpowers/evidence.jsonl'), '');
  assert.equal(lint.lintProject(root).errors, 0);
  assert.equal(initTools.init(root).status, 'exists');
  const bare = tempDir();
  assert.equal(initTools.init(bare, { project: 'named', agentsMd: false }).agents, 'skipped');
  assert.equal(fs.existsSync(path.join(bare, 'AGENTS.md')), false);
  const v6 = tempDir();
  write(v6, '.godpowers/state.json', '{}');
  assert.equal(initTools.init(v6).status, 'legacy');
});

test('stageFromTiers maps 6.x tier statuses onto 7.x stages', () => {
  const tiers = (prd, build, harden, deploy, launch) => ({
    'tier-1': { prd, arch: 'done', roadmap: 'done', design: 'not-required' },
    'tier-2': { build },
    'tier-3': { harden, deploy, launch }
  });
  assert.equal(migrateTools.stageFromTiers(undefined), 'plan');
  assert.equal(migrateTools.stageFromTiers(tiers('pending', 'pending', 'pending', 'pending', 'pending')), 'plan');
  assert.equal(migrateTools.stageFromTiers(tiers('done', 'in-progress', 'pending', 'pending', 'pending')), 'build');
  assert.equal(migrateTools.stageFromTiers(tiers('done', 'done', 'pending', 'pending', 'pending')), 'harden');
  assert.equal(migrateTools.stageFromTiers(tiers({ status: 'done' }, 'done', 'done', 'done', 'pending')), 'ship');
  assert.equal(migrateTools.stageFromTiers(tiers('done', 'done', 'done', 'done', 'done')), 'done');
});

function v6Project() {
  const root = tempDir();
  write(root, 'package.json', '{"scripts":{"test":"node --test"}}');
  write(root, '.godpowers/state.json', JSON.stringify({
    project: { name: 'legacy-app' },
    tiers: {
      'tier-1': { prd: { status: 'done' }, arch: { status: 'done' }, roadmap: { status: 'done' } },
      'tier-2': { build: { status: 'in-progress' } }
    }
  }));
  write(root, '.godpowers/PROGRESS.mdx', '# progress');
  write(root, '.godpowers/prd/PRD.mdx', '# PRD');
  write(root, '.godpowers/arch/ARCH.mdx', '# ARCH');
  write(root, '.godpowers/harden/FINDINGS.mdx', '# Findings');
  write(root, '.godpowers/todos/TODOS.mdx', '- [ ] thing');
  write(root, 'AGENTS.md', '# Rules\n\n<!-- godpowers:begin -->\n## Godpowers project\nold block\n<!-- godpowers:end -->\n');
  write(root, 'CLAUDE.md', '<!-- godpowers:begin -->\n## Godpowers project\n\nSee AGENTS.md.\n<!-- godpowers:end -->\n');
  return root;
}

test('migrate dry run reports the plan without writing', () => {
  const root = v6Project();
  const result = migrateTools.migrate(root, { dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.project, 'legacy-app');
  assert.equal(result.stage, 'build');
  assert.equal(result.verify, 'npm test');
  assert.deepEqual(result.moves.sort(), ['PROGRESS.mdx', 'arch', 'harden', 'prd', 'state.json', 'todos']);
  assert.deepEqual(result.context.map(a => a.file), ['AGENTS.md', 'CLAUDE.md']);
  assert.equal(layout(root), 'v6');
  assert.ok(fs.existsSync(path.join(root, 'CLAUDE.md')));
});

test('migrate archives 6.x files, writes the 7.x files, and cleans instruction files', () => {
  const root = v6Project();
  const result = migrateTools.migrate(root);
  assert.equal(result.ok, true);
  assert.equal(layout(root), 'v7');
  assert.ok(fs.existsSync(path.join(root, '.godpowers/archive/v6/prd/PRD.mdx')));
  assert.ok(fs.existsSync(path.join(root, '.godpowers/archive/v6/state.json')));
  const state = stateStore.read(root);
  assert.equal(state.data.project, 'legacy-app');
  assert.equal(state.data.stage, 'build');
  assert.equal(state.data.verify, 'npm test');
  assert.match(state.goal, /archive\/v6\/prd\/PRD\.mdx/);
  assert.match(state.now, /FINDINGS\.mdx/);
  assert.match(state.now, /TODOS\.mdx/);
  assert.match(read(root, '.godpowers/PLAN.md'), /Architecture: `\.godpowers\/archive\/v6\/arch\/ARCH\.mdx`/);
  assert.match(read(root, '.godpowers/DECISIONS.md'), /## \d{4}-\d{2}-\d{2}: Move to the Godpowers 7 layout/);
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
  const agents = read(root, 'AGENTS.md');
  assert.match(agents, /^# Rules/);
  assert.match(agents, /npx -y godpowers@7 verify/);
  assert.doesNotMatch(agents, /old block/);
  assert.equal(lint.lintProject(root).errors, 0);
  assert.equal(migrateTools.migrate(root).reason, 'already on the 7.x layout');
  assert.equal(migrateTools.migrate(tempDir()).reason, 'no Godpowers 6 project here');
});

test('migrate uses a fresh archive name and tolerates a broken state.json', () => {
  const root = tempDir();
  write(root, '.godpowers/state.json', '{not json');
  write(root, '.godpowers/archive/v6/old.txt', 'earlier archive');
  const result = migrateTools.migrate(root, { agentsMd: false });
  assert.equal(result.ok, true);
  assert.equal(result.project, path.basename(root));
  assert.equal(result.stage, 'plan');
  assert.match(path.basename(result.archiveDir), /^v6-\d+$/);
  assert.equal(result.agents, 'skipped');
  assert.equal(stateStore.read(root).goal.startsWith('Not set yet'), true);
});

test('init keeps existing history and adds a union merge rule for the ledger in git repos', () => {
  const root = gitRepo();
  write(root, '.godpowers/DECISIONS.md', '# Decisions\n\n## 2026-01-01: Keep me\n');
  write(root, '.godpowers/evidence.jsonl', '{"kept":true}\n');
  write(root, '.gitattributes', '*.png binary');
  assert.equal(initTools.init(root).status, 'created');
  assert.match(read(root, '.godpowers/DECISIONS.md'), /Keep me/);
  assert.equal(read(root, '.godpowers/evidence.jsonl'), '{"kept":true}\n');
  assert.equal(read(root, '.gitattributes'), '*.png binary\n.godpowers/evidence.jsonl merge=union\n');
  assert.equal(initTools.ensureUnionMerge(root), false, 'added once');
  assert.equal(git(root, 'check-attr', 'merge', '.godpowers/evidence.jsonl'), '.godpowers/evidence.jsonl: merge: union');
  assert.equal(initTools.ensureUnionMerge(tempDir()), false, 'not outside git');
});

test('migrate archives every instruction file it changes', () => {
  const root = v6Project();
  migrateTools.migrate(root);
  assert.match(read(root, '.godpowers/archive/v6/instruction-files/AGENTS.md'), /old block/);
  assert.match(read(root, '.godpowers/archive/v6/instruction-files/CLAUDE.md'), /See AGENTS\.md/);
});
