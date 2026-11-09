const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const fastTools = require('../lib/fast');
const { write, git, v7Repo, run } = require('./helpers');

// Prints the arguments it receives as JSON, and exits with FAST_EXIT if set.
const ARGS_SCRIPT = 'console.log(JSON.stringify(process.argv.slice(2))); process.exit(Number(process.env.FAST_EXIT || 0));\n';

function fastRepo(fast = 'node args.js {files}') {
  const root = v7Repo({ fast });
  write(root, 'args.js', ARGS_SCRIPT);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'script');
  return root;
}

const ledgerText = root => fs.readFileSync(path.join(root, '.godpowers', 'evidence.jsonl'), 'utf8');

async function fastJson(root, args = [], options = {}) {
  const result = await run(['fast', '--json', ...args], { cwd: root, ...options });
  return { ...result, json: result.out.trim().startsWith('{') ? JSON.parse(result.out) : null };
}

test('runs the declared command on the changed and untracked files, and never writes the ledger', async () => {
  const root = fastRepo();
  write(root, 'src/app.js', 'edited');
  write(root, 'new.js', 'untracked');
  write(root, '.godpowers/DECISIONS.md', 'edited bookkeeping');
  const before = ledgerText(root);
  const result = await fastJson(root);
  assert.equal(result.code, 0);
  assert.deepEqual(result.json.files, ['new.js', 'src/app.js']);
  assert.equal(result.json.command, 'node args.js {files}');
  assert.deepEqual(JSON.parse(result.json.tail.trim()), ['new.js', 'src/app.js']);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.exit, 0);
  assert.equal(result.json.timedOut, false);
  assert.equal(typeof result.json.ms, 'number');
  assert.equal(ledgerText(root), before);
  const text = await run(['fast'], { cwd: root });
  assert.equal(text.code, 0);
  assert.match(text.out, /\["new\.js","src\/app\.js"\]\n\nPASS: node args\.js \{files\} \(2 files, \d+\.\ds\)/);
  assert.equal(ledgerText(root), before);
});

test('explicit files replace the changed files', async () => {
  const root = fastRepo();
  write(root, 'src/app.js', 'edited');
  const result = await fastJson(root, ['lib/a.js', './lib/b.js', 'lib/a.js', path.join(root, 'abs.js')]);
  assert.deepEqual(result.json.files, ['lib/a.js', 'lib/b.js', 'abs.js']);
  assert.deepEqual(JSON.parse(result.json.tail.trim()), ['lib/a.js', 'lib/b.js', 'abs.js']);
});

test('a deleted file is left out, and with nothing changed {files} runs nothing', async () => {
  const root = fastRepo();
  fs.rmSync(path.join(root, 'src', 'app.js'));
  let result = await run(['fast'], { cwd: root });
  assert.equal(result.code, 0);
  assert.equal(result.out.trim(), 'No changed files: nothing to check.');
  result = await fastJson(root);
  assert.equal(result.code, 0);
  assert.deepEqual(result.json, { command: 'node args.js {files}', files: [], exit: 0, ok: true, timedOut: false, ms: 0, tail: '' });
});

test('a command without {files} runs as it is', async () => {
  const root = fastRepo('node args.js plain');
  const result = await fastJson(root);
  assert.equal(result.code, 0);
  assert.deepEqual(result.json.files, []);
  assert.deepEqual(JSON.parse(result.json.tail.trim()), ['plain']);
});

test('an undeclared fast check explains how to declare one and exits 2', async () => {
  for (const root of [v7Repo(), v7Repo({ fast: 'none' }), v7Repo({ fast: '' })]) {
    const result = await run(['fast'], { cwd: root });
    assert.equal(result.code, 2);
    assert.match(result.out, /fast: <command>/);
    assert.match(result.out, /\.godpowers\/STATE\.md/);
    assert.match(result.out, /\{files\}/);
  }
  const json = await fastJson(v7Repo());
  assert.equal(json.code, 2);
  assert.equal(json.json.command, null);
});

test('paths with spaces and quotes reach the command unchanged', async () => {
  const root = fastRepo();
  const names = ["my file.js", "it's here.js", 'semi;colon $HOME `x`.js', 'plain.js'];
  for (const name of names) write(root, name, 'x');
  const result = await fastJson(root);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.json.tail.trim()), [...names].sort());
  const explicit = await fastJson(root, ["it's here.js", 'my file.js']);
  assert.deepEqual(JSON.parse(explicit.json.tail.trim()), ["it's here.js", 'my file.js']);
});

test('quoteArg uses POSIX single quotes and Windows double quotes', () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  try {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    assert.equal(fastTools.quoteArg('src/a-b.js'), 'src/a-b.js');
    assert.equal(fastTools.quoteArg("it's a"), "'it'\\''s a'");
    Object.defineProperty(process, 'platform', { value: 'win32' });
    assert.equal(fastTools.quoteArg('my file.js'), '"my file.js"');
    assert.equal(fastTools.quoteArg('plain.js'), 'plain.js');
  } finally {
    Object.defineProperty(process, 'platform', platform);
  }
});

test('a failing command returns its exit code, and a timeout returns 1', async () => {
  const root = fastRepo();
  write(root, 'new.js', 'x');
  const failed = await fastJson(root, [], { env: { FAST_EXIT: '3' } });
  assert.equal(failed.code, 3);
  assert.equal(failed.json.ok, false);
  assert.equal(failed.json.exit, 3);
  const text = await run(['fast'], { cwd: root, env: { FAST_EXIT: '3' } });
  assert.equal(text.code, 3);
  assert.match(text.out, /FAIL: node args\.js \{files\} \(1 file, \d+\.\ds, exit 3\)/);
  const slow = fastRepo('node -e "setTimeout(() => {}, 20000)"');
  const timed = await fastJson(slow, ['--timeout', '1']);
  assert.equal(timed.code, 1);
  assert.equal(timed.json.timedOut, true);
  assert.equal(timed.json.ok, false);
  assert.match((await run(['fast', '--timeout', '10m'], { cwd: root })).err, /--timeout must be a number/);
});
