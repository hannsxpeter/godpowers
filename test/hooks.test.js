const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const hooks = require('../lib/hooks');
const evidence = require('../lib/evidence');
const { tempDir, write, stateText, v7Repo } = require('./helpers');

let counter = 0;
const sessionId = () => `test-${process.pid}-${Date.now()}-${counter++}`;
const run = (event, input) => {
  const { stdout } = hooks.runHook(event, JSON.stringify(input));
  return stdout ? (stdout.startsWith('{') ? JSON.parse(stdout) : stdout) : null;
};

test('session-start prints a brief for 7.x, a hint for 6.x, and nothing elsewhere', () => {
  const root = v7Repo();
  const id = sessionId();
  const brief = run('session-start', { cwd: root, session_id: id, source: 'startup' });
  assert.match(brief, /^Godpowers: demo \| stage build \| checks none on current code \| open risks: none/);
  assert.match(brief, /\nGoal: Ship a demo\.\nNext: Run \/god with the goal/);
  const session = hooks.readSession(root, id);
  assert.match(session.baseline.fingerprint, /^[0-9a-f]{64}$/);
  assert.ok(session.baseline.files['src/app.js']);
  write(root, 'src/app.js', 'changed later');
  run('session-start', { cwd: root, session_id: id, source: 'resume' });
  assert.equal(hooks.readSession(root, id).baseline.fingerprint, session.baseline.fingerprint, 'resume keeps the original baseline');
  const v6 = tempDir();
  write(v6, '.godpowers/state.json', '{}');
  assert.match(run('session-start', { cwd: v6, session_id: sessionId() }), /6\.x layout/);
  assert.equal(run('session-start', { cwd: tempDir(), session_id: sessionId() }), null);
});

test('stop nudges once per tree, in the shape each host expects', async () => {
  const root = v7Repo();
  const id = sessionId();
  run('session-start', { cwd: root, session_id: id });
  assert.equal(run('stop', { cwd: root, session_id: id, stop_hook_active: false }), null, 'no change, no nudge');
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const claude = run('stop', { cwd: root, session_id: id, stop_hook_active: false });
  assert.equal(claude.hookSpecificOutput.hookEventName, 'Stop');
  assert.match(claude.hookSpecificOutput.additionalContext, /Godpowers gate/);
  const repeat = run('stop', { cwd: root, session_id: id, stop_hook_active: true });
  assert.match(repeat.systemMessage, /without a passing check/);
  assert.equal(run('stop', { cwd: root, session_id: id, stop_hook_active: false }), null, 'a later turn on the same code is not nudged again');
  const file = hooks.sessionPath(root, id);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const codexId = sessionId();
  run('session-start', { cwd: root, session_id: codexId });
  write(root, 'src/app.js', 'module.exports = 3;\n');
  const codex = run('stop', { cwd: root, session_id: codexId, turn_id: 't1', stop_hook_active: false });
  assert.equal(codex.decision, 'block');
  assert.match(codex.reason, /verify/);
  await evidence.verify(root, 'node -e "process.exit(0)"');
  assert.equal(run('stop', { cwd: root, session_id: codexId, turn_id: 't2' }), null);
});

test('stop does nothing for 6.x projects or when the gate is off', () => {
  const v6 = tempDir();
  write(v6, '.godpowers/state.json', '{}');
  assert.equal(run('stop', { cwd: v6, session_id: sessionId() }), null);
  const root = v7Repo();
  write(root, '.godpowers/STATE.md', stateText().replace('stage: build', 'stage: build\ngate: off'));
  write(root, 'src/app.js', 'changed');
  assert.equal(run('stop', { cwd: root, session_id: sessionId() }), null);
});

test('pre-tool-use blocks commits only while lint has errors', () => {
  const root = v7Repo();
  const commit = { cwd: root, tool_name: 'Bash', tool_input: { command: 'git add -A && git commit -m "x"' } };
  assert.equal(run('pre-tool-use', commit), null);
  write(root, '.godpowers/STATE.md', stateText({ risks: ['- critical: not a checkbox'] }));
  const denied = run('pre-tool-use', commit);
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /godpowers lint found 1 error/);
  assert.equal(run('pre-tool-use', { ...commit, tool_input: { command: 'npm test' } }), null);
  assert.equal(run('pre-tool-use', { ...commit, tool_name: 'Edit' }), null);
  assert.equal(run('pre-tool-use', { ...commit, tool_input: {} }), null);
  assert.equal(run('pre-tool-use', { ...commit, cwd: tempDir() }), null);
  process.env.GODPOWERS_GATE = 'off';
  try {
    assert.equal(run('pre-tool-use', commit), null);
  } finally {
    delete process.env.GODPOWERS_GATE;
  }
  for (const yes of ['git commit -m x', 'git add -A && git commit', 'git -C sub commit -m x', 'git --no-pager commit --amend', '(cd a; git -c user.name=x commit)']) {
    assert.ok(hooks.COMMIT_RE.test(yes), yes);
  }
  for (const no of ['git log --grep commit', 'git commit-tree abc', 'echo commit', 'legit commit']) {
    assert.ok(!hooks.COMMIT_RE.test(no), no);
  }
});

test('hooks fail open with a system message on bad input or unknown events', () => {
  assert.match(JSON.parse(hooks.runHook('stop', '{not json').stdout).systemMessage, /stop hook error/);
  assert.match(JSON.parse(hooks.runHook('nope', '{}').stdout).systemMessage, /unknown hook "nope"/);
  const saved = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = tempDir();
  try {
    assert.equal(hooks.runHook('stop', '').stdout, '', 'empty input falls back to CLAUDE_PROJECT_DIR');
  } finally {
    if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = saved;
  }
  const root = tempDir();
  const file = hooks.sessionPath(root, 'weird/../id');
  assert.ok(!file.includes('/../id'));
  hooks.writeSession(root, 'weird/../id', { ok: true });
  assert.deepEqual(hooks.readSession(root, 'weird/../id'), { ok: true });
  fs.rmSync(file);
});

test('old session files are pruned', () => {
  const root = tempDir();
  hooks.writeSession(root, 'old-session', { baseline: null });
  const file = hooks.sessionPath(root, 'old-session');
  const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  fs.utimesSync(file, old, old);
  hooks.pruneSessions();
  assert.equal(fs.existsSync(file), false);
});
