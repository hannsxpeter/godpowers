const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const frontmatter = require('../lib/frontmatter');
const install = require('../lib/install');

const SRC = path.join(__dirname, '..');
const pkg = require('../package.json');
const readText = rel => fs.readFileSync(path.join(SRC, rel), 'utf8');
const COMMANDS = ['god', 'god-init', 'god-plan', 'god-build', 'god-review', 'god-harden', 'god-ship', 'god-status'];

test('every skill has a name matching its folder and a description', () => {
  const names = install.listSkills(SRC);
  assert.deepEqual(names.sort(), [...COMMANDS, 'godpowers'].sort());
  for (const name of names) {
    const doc = frontmatter.parse(readText(`skills/${name}/SKILL.md`));
    assert.deepEqual(doc.diagnostics, [], name);
    assert.equal(doc.data.name, name);
    assert.ok(doc.data.description && doc.data.description.length > 40, name);
  }
});

test('every agent has a name, description, and tools, and skills only reference shipped agents and commands', () => {
  const agents = install.listAgents(SRC).map(file => file.replace(/\.md$/, ''));
  assert.deepEqual(agents, ['god-executor', 'god-planner', 'god-reviewer', 'god-security-auditor']);
  for (const name of agents) {
    const doc = frontmatter.parse(readText(`agents/${name}.md`));
    assert.equal(doc.data.name, name);
    assert.ok(doc.data.description);
    assert.ok(doc.data.tools);
  }
  const shipped = new Set([...COMMANDS, 'godpowers', ...agents]);
  for (const rel of [...install.listSkills(SRC).map(n => `skills/${n}/SKILL.md`), ...agents.map(a => `agents/${a}.md`), 'README.md']) {
    for (const ref of readText(rel).match(/\bgod(?:-[a-z]+)+\b/g) || []) {
      assert.ok(shipped.has(ref), `${rel} references ${ref}, which is not shipped`);
    }
  }
});

test('version numbers agree across the package, plugin, marketplace, and changelog', () => {
  const plugin = JSON.parse(readText('.claude-plugin/plugin.json'));
  const market = JSON.parse(readText('.claude-plugin/marketplace.json'));
  assert.equal(plugin.version, pkg.version);
  assert.equal(market.plugins[0].version, pkg.version);
  assert.equal(market.plugins[0].name, plugin.name);
  assert.match(readText('CHANGELOG.md'), new RegExp(`## \\[${pkg.version.replace(/\./g, '\\.')}\\]`));
  assert.equal(pkg.dependencies, undefined, 'no production dependencies');
});

test('the README documents every command and the CLI', () => {
  const readme = readText('README.md');
  for (const name of COMMANDS) assert.ok(readme.includes(`/${name}`), name);
  for (const command of ['init', 'migrate', 'clean', 'status', 'verify', 'record', 'gate', 'lint', 'doctor', 'budget']) {
    assert.ok(readme.includes(`godpowers ${command}`) || readme.includes(`godpowers@7 ${command}`), command);
  }
});
