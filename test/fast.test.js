const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const fastTools = require('../lib/fast');
const { tempDir, write, git, v7Repo, run } = require('./helpers');

const pick = result => [result.code, result.out, result.err];

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

const payload = input => JSON.stringify({ tool_name: 'Edit', tool_input: input });

test('--hook checks the one edited file and is silent when the check passes', async () => {
  const root = fastRepo();
  write(root, 'other.js', 'also changed');
  const before = ledgerText(root);
  const absolute = await run(['fast', '--hook'], { cwd: root, stdin: payload({ file_path: path.join(root, 'src', 'app.js') }) });
  assert.deepEqual([absolute.code, absolute.out, absolute.err], [0, '', '']);
  const failing = await run(['fast', '--hook'], { cwd: root, stdin: payload({ path: 'src/app.js' }), env: { FAST_EXIT: '4' } });
  assert.equal(failing.code, 2);
  assert.equal(failing.out, '');
  assert.deepEqual(JSON.parse(failing.err.split('\n')[0]), ['src/app.js']);
  assert.match(failing.err, /godpowers fast FAILED: node args\.js \{files\} \(1 file, exit 4\)\n$/);
  assert.equal(ledgerText(root), before, 'the ledger is untouched');
});

test('--hook falls back to the changed files, and ignores paths outside the project or in .godpowers', async () => {
  const root = fastRepo();
  write(root, 'changed.js', 'x');
  for (const stdin of ['', 'not json', '{}', payload({ file_path: '/etc/passwd' }), payload({ file_path: '../up.js' }), payload({ file_path: '.godpowers/PLAN.md' }), payload({ file_path: 7 })]) {
    const result = await run(['fast', '--hook'], { cwd: root, stdin, env: { FAST_EXIT: '5' } });
    assert.equal(result.code, 2, stdin);
    assert.deepEqual(JSON.parse(result.err.split('\n')[0]), ['changed.js'], stdin);
  }
});

test('--hook exits 0 silently without a project, a declared check, or anything to check', async () => {
  const bare = tempDir();
  assert.deepEqual(pick(await run(['fast', '--hook'], { cwd: bare, stdin: payload({ file_path: 'a.js' }) })), [0, '', '']);
  const undeclared = v7Repo();
  assert.deepEqual(pick(await run(['fast', '--hook'], { cwd: undeclared, stdin: payload({ file_path: 'README.md' }) })), [0, '', '']);
  const clean = fastRepo();
  assert.deepEqual(pick(await run(['fast', '--hook'], { cwd: clean, env: { FAST_EXIT: '3' } })), [0, '', '']);
});

test('--hook fails open on an internal error', async () => {
  const root = fastRepo();
  write(root, 'new.js', 'x');
  const result = await run(['fast', '--hook', '--timeout', 'soon'], { cwd: root });
  assert.equal(result.code, 0);
  assert.equal(result.out, '');
  assert.match(result.err, /^godpowers fast --hook: skipped \(.*--timeout must be a number/);
});

// Run `body` with process.platform pretending to be `name`. Native Windows stays unproven.
async function onPlatform(name, body) {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  try {
    Object.defineProperty(process, 'platform', { value: name });
    return await body();
  } finally {
    Object.defineProperty(process, 'platform', platform);
  }
}

test('placeholderInQuotes sees {files} inside single or double quotes only', () => {
  const inside = ['echo "{files}"', "echo '{files}'", 'echo "a $(x) {files}"', 'echo "a\\" {files}"', 'echo "{files}', "echo 'a'\"{files}\"", 'x "{files}" {files}'];
  const bare = ['echo {files}', 'echo "a" {files}', "echo 'a' \"b\" {files}", 'echo \\"{files}', 'echo "a\\"" {files}', "echo '\\' {files}", 'echo plain'];
  for (const command of inside) assert.equal(fastTools.placeholderInQuotes(command), true, command);
  for (const command of bare) assert.equal(fastTools.placeholderInQuotes(command), false, command);
});

test('a quoted {files} is refused, so a file name cannot run code', async () => {
  for (const declared of ['node args.js "{files}"', "node args.js '{files}'"]) {
    const root = fastRepo(declared);
    write(root, '$(touch INJECTED).js', 'x');
    const result = await run(['fast'], { cwd: root });
    assert.equal(result.code, 2, declared);
    assert.match(result.err, /\{files\} must be bare/);
    assert.match(result.err, /quotes each file name itself/);
    assert.equal(fs.existsSync(path.join(root, 'INJECTED')), false);
    const hook = await run(['fast', '--hook'], { cwd: root, stdin: payload({ file_path: '$(touch INJECTED).js' }) });
    assert.equal(hook.code, 0, 'the hook fails open');
    assert.equal(hook.out, '');
    assert.match(hook.err, /^godpowers fast --hook: skipped \(\{files\} must be bare[^\n]*\)\n$/);
    assert.equal(fs.existsSync(path.join(root, 'INJECTED')), false);
  }
});

test('file names that start with a dash reach the command as ./ paths', async () => {
  const root = fastRepo();
  write(root, '-rf.js', 'x');
  write(root, 'sub/-dash.js', 'x');
  const changed = await fastJson(root);
  assert.deepEqual(changed.json.files, ['./-rf.js', 'sub/-dash.js']);
  assert.deepEqual(JSON.parse(changed.json.tail.trim()), ['./-rf.js', 'sub/-dash.js']);
  const explicit = await fastTools.fast(root, { files: ['--config=evil.js', './-rf.js'] });
  assert.deepEqual(explicit.files, ['./--config=evil.js', './-rf.js']);
  assert.deepEqual(JSON.parse(explicit.run.tail.trim()), ['./--config=evil.js', './-rf.js']);
  const hook = await run(['fast', '--hook'], { cwd: root, stdin: payload({ file_path: '--config=evil.js' }), env: { FAST_EXIT: '4' } });
  assert.equal(hook.code, 2);
  assert.deepEqual(JSON.parse(hook.err.split('\n')[0]), ['./--config=evil.js']);
});

test('on Windows a file name with % or a quote is refused, and the hook fails open', async () => {
  const root = fastRepo();
  write(root, '100%.js', 'x');
  await onPlatform('win32', async () => {
    const result = await run(['fast'], { cwd: root });
    assert.equal(result.code, 2);
    assert.match(result.err, /cannot pass "100%\.js" to the fast command on Windows/);
    const quoted = await run(['fast', 'say "hi".js'], { cwd: root });
    assert.equal(quoted.code, 2);
    assert.match(quoted.err, /say "hi"\.js/);
    const hook = await run(['fast', '--hook'], { cwd: root, stdin: payload({ file_path: '100%.js' }) });
    assert.equal(hook.code, 0);
    assert.match(hook.err, /^godpowers fast --hook: skipped \(cannot pass "100%\.js"[^\n]*\)\n$/);
  });
  const elsewhere = await fastJson(root);
  assert.equal(elsewhere.code, 0, 'POSIX shells quote these names safely');
  assert.deepEqual(elsewhere.json.files, ['100%.js']);
});

test('a path with a control character is skipped with a note on stderr', async () => {
  const root = fastRepo();
  write(root, 'tab\there.js', 'x');
  write(root, 'ok.js', 'x');
  const result = await fastJson(root, ['ok.js', 'new\nline.js', 'tab\there.js']);
  assert.deepEqual(result.json.files, ['ok.js']);
  assert.deepEqual(JSON.parse(result.json.tail.trim()), ['ok.js']);
  assert.match(result.err, /^godpowers fast: skipped 2 file\(s\) with control characters in the name: "new\\nline\.js", "tab\\there\.js"\n$/);
  const changed = await fastJson(root);
  assert.deepEqual(changed.json.files, ['ok.js']);
  assert.match(changed.err, /skipped 1 file\(s\) .*"tab\\there\.js"/);
  const only = await fastJson(root, ['new\nline.js']);
  assert.equal(only.code, 0);
  assert.deepEqual(only.json.files, []);
  assert.match(only.err, /skipped 1 file/);
  const hook = await run(['fast', '--hook'], { cwd: root, stdin: payload({ file_path: 'new\nline.js' }), env: { FAST_EXIT: '4' } });
  assert.equal(hook.code, 0, 'nothing is left to check');
  assert.match(hook.err, /skipped 1 file/);
});

test('hookFile follows symlinks, so a link out of the project or into .godpowers is refused', { skip: process.platform === 'win32' }, () => {
  const root = fastRepo();
  const outside = tempDir();
  write(outside, 'secret.js', 'x');
  fs.symlinkSync(path.join(outside, 'secret.js'), path.join(root, 'link.js'));
  fs.symlinkSync(outside, path.join(root, 'linkdir'));
  fs.symlinkSync(path.join(root, '.godpowers'), path.join(root, 'own'));
  fs.symlinkSync(path.join(root, 'nowhere.js'), path.join(root, 'dangling.js'));
  fs.symlinkSync(path.join(root, 'src'), path.join(root, 'inside'));
  const hook = file => fastTools.hookFile(root, payload({ file_path: file }));
  assert.equal(hook('link.js'), null);
  assert.equal(hook('linkdir/new.js'), null);
  assert.equal(hook('linkdir/secret.js'), null);
  assert.equal(hook('own/STATE.md'), null);
  assert.equal(hook('dangling.js'), null);
  assert.equal(hook('inside/app.js'), 'src/app.js', 'a link that stays inside the project resolves to its target');
  assert.equal(hook('src/new-file.js'), 'src/new-file.js', 'a file that does not exist yet is fine');
  assert.equal(hook(path.join(root, 'src', 'app.js')), 'src/app.js');
});

test('hookFile ignores .godpowers in any letter case', () => {
  const root = fastRepo();
  for (const file of ['.godpowers/PLAN.md', '.GODPOWERS/PLAN.md', '.GodPowers', path.join(root, '.Godpowers', 'x.md')]) {
    assert.equal(fastTools.hookFile(root, payload({ file_path: file })), null, file);
  }
});

test('the command is printed on stderr before it runs, except in JSON and passing hook runs', async () => {
  const root = fastRepo();
  write(root, 'a b.js', 'x');
  const text = await run(['fast'], { cwd: root });
  assert.equal(text.err, "Running: node args.js 'a b.js'\n");
  assert.equal(text.code, 0);
  const json = await fastJson(root);
  assert.equal(json.err, '');
  const hook = await run(['fast', '--hook'], { cwd: root, stdin: payload({ file_path: 'a b.js' }) });
  assert.deepEqual(pick(hook), [0, '', '']);
  const plain = fastRepo('node args.js plain');
  assert.equal((await run(['fast'], { cwd: plain })).err, 'Running: node args.js plain\n');
  const nothing = fastRepo();
  assert.equal((await run(['fast'], { cwd: nothing })).err, '', 'nothing runs, nothing is printed');
});
