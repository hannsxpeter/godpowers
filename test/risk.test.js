const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const risk = require('../lib/risk');
const gitTools = require('../lib/git');
const { write, git, stateText, v7Repo, run } = require('./helpers');

/** A Godpowers repo tagged v1.0.0 at its first commit. */
function releasedRepo(stateOverrides) {
  const root = v7Repo(stateOverrides);
  git(root, 'tag', 'v1.0.0');
  // A tag on HEAD itself is not a base; the release is measured from the one before.
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  return root;
}

const classify = root => risk.classify(root, { base: gitTools.releaseBase(root) });

test('built-in patterns catch auth, secrets, migrations, payments, and deploy configuration', () => {
  const root = releasedRepo();
  const high = [
    'src/auth/login.ts', 'auth/index.js', 'src/oauth/callback.js', 'api/session/store.js', 'lib/crypto/keys.js', 'src/auth.js', 'src/OAuth.ts',
    'config/password_reset.rb', 'app/secrets.yml', 'src/credentials.json', '.env', '.env.production', 'db/migrations/001.sql', 'db/schema.sql',
    'prisma/schema.prisma', 'src/payments/charge.js', 'src/billing/plan.js', 'src/checkout/cart.js', '.github/workflows/ci.yml', '.gitlab-ci.yml',
    '.circleci/config.yml', 'Dockerfile', 'services/api/Dockerfile', 'docker-compose.prod.yml', 'compose.yaml.yml', 'deploy/run.sh', 'infra/main.tf',
    'main.tf', 'k8s/pod.yaml', 'charts/helm/values.yaml', 'src/Security/Policy.cs', 'Web/SESSION/Token.js'
  ];
  const quiet = ['src/app.js', 'README.md', 'lib/author.js', 'src/authority.js', 'docs/guide.md', 'src/environment.js', 'test/app.test.js', 'src/authentication.js'];
  for (const rel of high) {
    write(root, rel, 'x');
  }
  for (const rel of quiet) write(root, rel, 'x');
  const result = classify(root);
  assert.equal(result.tier, 'high');
  const found = result.high.map(h => h.path).sort();
  assert.deepEqual(found, high.slice().sort(), 'every high-risk path is found');
  assert.deepEqual(result.other.slice().sort(), quiet.slice().sort(), 'nothing else is');
  assert.ok(result.high.every(h => risk.HIGH_RISK_PATTERNS.includes(h.pattern)));
});

test('tiers: high, normal, low, and low when nothing changed', () => {
  const root = releasedRepo();
  let result = classify(root);
  assert.equal(result.tier, 'low');
  assert.match(result.reason, /nothing changed since v1\.0\.0/);
  assert.deepEqual(result.base, gitTools.releaseBase(root));

  write(root, 'README.md', 'docs');
  write(root, 'test/app.test.js', 'tests');
  write(root, '.godpowers/DECISIONS.md', 'bookkeeping is left out');
  result = classify(root);
  assert.equal(result.tier, 'low');
  assert.match(result.reason, /only documentation and test files changed since v1\.0\.0/);
  assert.deepEqual(result.other.sort(), ['README.md', 'test/app.test.js']);

  write(root, 'src/app.js', 'changed');
  result = classify(root);
  assert.equal(result.tier, 'normal');
  assert.match(result.reason, /no high-risk paths since v1\.0\.0; 1 code path changed/);
  assert.equal(result.other[0], 'src/app.js', 'code paths are listed first');
  assert.deepEqual(result.high, []);

  write(root, 'src/auth/token.js', 'changed');
  result = classify(root);
  assert.equal(result.tier, 'high');
  assert.deepEqual(result.high, [{ path: 'src/auth/token.js', pattern: '**/auth/**' }]);
  assert.match(result.reason, /1 changed path matches high-risk patterns since v1\.0\.0/);
});

test('a documentation file that matches a high-risk glob is still high', () => {
  const root = releasedRepo();
  write(root, 'docs/login.md', 'how to log in');
  assert.equal(classify(root).tier, 'high');
});

test('without a base the tier is high and says why', () => {
  const root = v7Repo();
  const result = risk.classify(root, { base: null });
  assert.equal(result.tier, 'high');
  assert.equal(result.base, null);
  assert.match(result.reason, /nothing to compare against/);
  assert.deepEqual(risk.classify(root).high, []);
});

test('STATE.md risk: globs add to the built-in patterns, case-insensitively', () => {
  const root = releasedRepo({ risk: 'src/Billing-Core/**, *.proto' });
  write(root, 'src/billing-core/ledger.js', 'x');
  write(root, 'api/Thing.PROTO', 'x');
  write(root, 'src/app.js', 'x');
  const result = classify(root);
  assert.equal(result.tier, 'high');
  assert.deepEqual(result.high, [
    { path: 'api/Thing.PROTO', pattern: '*.proto' },
    { path: 'src/billing-core/ledger.js', pattern: 'src/Billing-Core/**' }
  ]);
  assert.deepEqual(result.other, ['src/app.js']);
  assert.deepEqual(risk.patternsFor(null), risk.HIGH_RISK_PATTERNS);
});

test('the docs setting decides what keeps a change low', () => {
  const root = releasedRepo({ docs: 'none' });
  write(root, 'README.md', 'docs');
  assert.equal(classify(root).tier, 'normal', 'with docs: none a README is code');
  const globs = releasedRepo({ docs: 'site/**' });
  write(globs, 'site/page.js', 'x');
  assert.equal(classify(globs).tier, 'low');
  write(globs, 'README.md', 'not listed, so code');
  assert.equal(classify(globs).tier, 'normal');
});

test('deleting, renaming, and staging count as changes', () => {
  const root = releasedRepo();
  fs.rmSync(path.join(root, 'src/app.js'));
  assert.equal(classify(root).tier, 'normal');
  git(root, 'checkout', 'src/app.js');
  fs.mkdirSync(path.join(root, 'src/auth'));
  git(root, 'mv', 'src/app.js', 'src/auth/app.js');
  assert.equal(classify(root).tier, 'high', 'the new path is high-risk');
  git(root, 'mv', 'src/auth/app.js', 'src/app.js');
  write(root, 'README.md', 'committed docs');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'docs');
  assert.equal(classify(root).tier, 'low', 'committed changes since the base count too');
});

test('risk through the CLI: text, json, --base, and a refused ref', async () => {
  const root = releasedRepo();
  const sha = git(root, 'rev-parse', 'HEAD');
  const tagged = git(root, 'rev-parse', 'v1.0.0');
  write(root, 'src/app.js', 'x');
  for (let i = 0; i < 12; i++) write(root, `src/f${String(i).padStart(2, '0')}.js`, 'x');
  let result = await run(['risk'], { cwd: root });
  assert.equal(result.code, 0);
  const lines = result.out.trim().split('\n');
  assert.equal(lines[0], `Risk: normal since v1.0.0 (${tagged.slice(0, 7)})`);
  assert.match(lines[1], /no high-risk paths since v1\.0\.0; 13 code paths changed/);
  assert.equal(lines.length, 2 + 10 + 1);
  assert.equal(lines[lines.length - 1], '  and 3 more');
  write(root, 'db/migrations/001.sql', 'x');
  result = await run(['risk'], { cwd: root });
  assert.match(result.out, /^Risk: high since v1\.0\.0/);
  assert.match(result.out, /  db\/migrations\/001\.sql \(\*\*\/migrations\/\*\*\)/);
  const json = JSON.parse((await run(['risk', '--json', '--base', 'HEAD'], { cwd: root })).out);
  assert.equal(json.tier, 'high');
  assert.equal(json.base.ref, 'HEAD');
  assert.equal(json.base.sha, sha);
  assert.deepEqual(json.high, [{ path: 'db/migrations/001.sql', pattern: '**/migrations/**' }]);
  const refused = await run(['risk', '--base=--output=risk-output'], { cwd: root });
  assert.equal(refused.code, 2);
  assert.match(refused.err, /cannot start with "-"/);
  assert.equal(fs.existsSync(path.join(root, 'risk-output')), false);
  assert.equal((await run(['risk', '--base=nope'], { cwd: root })).code, 2);
  assert.equal((await run(['risk', '--base=HEAD:src/app.js'], { cwd: root })).code, 2);
});

test('risk without a tag says there is no base and exits 0 as high', async () => {
  const root = v7Repo();
  const result = await run(['risk'], { cwd: root });
  assert.equal(result.code, 0);
  assert.match(result.out, /^Risk: high \(no base to compare against\)\nnothing to compare against/);
  assert.equal(JSON.parse((await run(['risk', '--json'], { cwd: root })).out).base, null);
});

test('Compose files with either extension are deployment configuration', () => {
  const names = ['compose.yaml', 'docker-compose.yaml', 'docker-compose.prod.yml', 'compose.yml', 'docker-compose.override.yaml', 'services/web/compose.prod.yaml'];
  for (const name of names) {
    const fresh = releasedRepo();
    write(fresh, name, 'services: {}');
    const result = classify(fresh);
    assert.equal(result.tier, 'high', name);
    assert.equal(result.high[0].path, name);
  }
  const root = releasedRepo();
  write(root, 'composer.json', '{}');
  write(root, 'src/decompose.yaml', 'x');
  assert.equal(classify(root).tier, 'normal', 'look-alikes are not compose files');
});

test('a changed path with a control character in its name is high, whatever it looks like', async () => {
  for (const name of ['src/auth/token\n.js', 'README\n.md', 'test/a\u001b.test.js', 'src/x\u0085y.js']) {
    const root = releasedRepo();
    write(root, name, 'x');
    const result = classify(root);
    assert.equal(result.tier, 'high', JSON.stringify(name));
    assert.deepEqual(result.high, [{ path: name, pattern: 'unusual file name' }]);
  }
  const root = releasedRepo();
  write(root, 'docs/guide\n.md', 'x');
  const text = risk.formatRisk(classify(root));
  assert.match(text, /docs\/guide\\u000a\.md \(unusual file name\)/);
  assert.equal(text.includes('\n.md'), false, 'the name is not printed raw');
  const json = JSON.parse((await run(['risk', '--json'], { cwd: root })).out);
  assert.equal(json.tier, 'high');
  assert.equal(json.high[0].pattern, 'unusual file name');
});

test('a change that cannot be listed is high, not low', () => {
  const source = releasedRepo();
  const bare = path.join(require('./helpers').tempDir(), 'bare.git');
  git(source, 'clone', '-q', '--bare', source, bare);
  const base = { ref: 'HEAD', sha: git(bare, 'rev-parse', 'HEAD') };
  const result = risk.classify(bare, { base });
  assert.equal(result.tier, 'high');
  assert.match(result.reason, /could not list the changes since HEAD: .*no work tree/);
  assert.deepEqual(result.high, []);
  assert.equal(risk.classify(source, { base: { ref: 'HEAD', sha: '0'.repeat(40) } }).tier, 'high', 'a failing git call too');
});

test('a nearby tag that is not a release does not become the base, and a tag on HEAD is skipped', () => {
  const root = releasedRepo();
  write(root, 'src/auth/token.js', 'x');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'auth');
  git(root, 'tag', 'vnext');
  assert.equal(classify(root).tier, 'high', 'vnext is not a base, so the auth change since v1.0.0 still counts');
  git(root, 'tag', 'v1.1.0');
  const result = classify(root);
  assert.equal(result.base.ref, 'v1.0.0', 'the tag on HEAD is skipped');
  assert.equal(result.tier, 'high');
});

test('agent instruction files and prompts are not documentation, so they keep a change out of the low tier', () => {
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'skills/god/SKILL.md', '.claude/commands/ship.md', 'prompts/system.md', 'docs/agents/review.md', '.cursorrules', '.github/copilot-instructions.md']) {
    const root = releasedRepo();
    write(root, name, 'x');
    assert.equal(classify(root).tier, 'normal', name);
  }
  const root = releasedRepo();
  write(root, 'README.md', 'docs');
  assert.equal(classify(root).tier, 'low');
});

test('the docs rule in force is the intersection of the base commit\'s and the working one', () => {
  const root = releasedRepo();
  write(root, '.godpowers/STATE.md', stateText({ docs: 'src/**' }));
  write(root, 'src/app.js', 'x');
  assert.equal(classify(root).tier, 'normal', 'code is not documentation because STATE.md now says so');
  const loose = releasedRepo({ docs: 'src/**' });
  write(loose, 'src/app.js', 'x');
  assert.equal(classify(loose).tier, 'low', 'a rule that was already in place at the base');
});

test('a risk: glob at the base still counts after the working STATE.md drops it', () => {
  const root = releasedRepo({ risk: 'src/**' });
  write(root, '.godpowers/STATE.md', stateText());
  write(root, 'src/app.js', 'x');
  assert.equal(classify(root).tier, 'high');
});
