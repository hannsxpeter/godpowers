const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const cli = require('../lib/cli');
const evidence = require('../lib/evidence');
const gitTools = require('../lib/git');
const { tempDir, write, git, run, stateText, v7Repo } = require('./helpers');

const BIN = path.join(__dirname, '..', 'bin', 'godpowers.js');
const VERSION = require('../package.json').version;

test('parseArgs handles commands, values, flags, runtimes, and short options', () => {
  assert.deepEqual(cli.parseArgs(['verify', 'npm test', '--claim', 'unit tests', '--json']), {
    command: 'verify', args: ['npm test'], opts: { claim: 'unit tests', json: true }, runtimes: [], verifyMode: 'quoted'
  });
  assert.deepEqual(cli.parseArgs(['--claude', '--codex', '-g', '-u']).runtimes, ['claude', 'codex']);
  assert.deepEqual(cli.parseArgs(['--claude', '-g', '-u']).opts, { global: true, uninstall: true });
  assert.equal(cli.parseArgs(['record', 'review', '--summary=ok']).opts.summary, 'ok');
  assert.deepEqual(cli.parseArgs(['verify', '--', '--weird']).args, ['--weird']);
  assert.throws(() => cli.parseArgs(['init', '--verify']), /--verify needs a value/);
  assert.throws(() => cli.parseArgs(['-x']), /unknown option -x/);
  assert.throws(() => cli.parseArgs(['record', 'review', '--pass=false']), /--pass does not take a value/);
});

test('verify keeps the command exactly as typed', () => {
  const command = argv => cli.verifyCommand(cli.parseArgs(argv));
  assert.equal(command(['verify', 'node', '-e', 'console.log(1)']), "node -e 'console.log(1)'");
  assert.equal(command(['verify', 'pytest', '-k', 'not slow', '--timeout', '5']), "pytest -k 'not slow' --timeout 5");
  assert.equal(command(['verify', 'npm test', '--claim', 'x', '--watch']), 'npm test --watch');
  assert.equal(command(['verify', '--claim', 'c', 'npm', 'test']), 'npm test');
  assert.equal(command(['verify', 'echo', "it's"]), "echo 'it'\\''s'");
  assert.equal(command(['verify']), null);
  assert.equal(cli.parseArgs(['verify', 'tsc', '--project', 'x']).opts.project, undefined, "the command's own flags pass through");
});

test('help, version, and errors', async () => {
  assert.match((await run(['--help'])).out, /Install \(default: Claude Code, global\)/);
  assert.match((await run(['help'])).out, /gate ship/);
  const help = (await run(['help'])).out;
  assert.match(help, /tests \[--base <ref>\] \[--json\]/);
  assert.match(help, /risk \[--base <ref>\] \[--json\]/);
  assert.match(help, /gate ship \[--base <ref>\] \[--json\]/);
  assert.equal((await run(['--version'])).out.trim(), VERSION);
  assert.equal((await run(['version'])).out.trim(), VERSION);
  const unknown = await run(['deploy']);
  assert.equal(unknown.code, 2);
  assert.match(unknown.err, /unknown command "deploy"/);
  const noHost = await run([], { isTTY: false });
  assert.equal(noHost.code, 2);
  assert.match(noHost.err, /no host selected/);
});

test('install and uninstall through the CLI', async () => {
  const home = tempDir('gp-home-');
  const installed = await run(['--claude', '--codex', '--global'], { env: { HOME: home, USERPROFILE: home } });
  assert.equal(installed.code, 0);
  assert.match(installed.out, /Claude Code: 9 skills/);
  assert.match(installed.out, /open \/hooks in Codex once/);
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/god/SKILL.md')));
  const removed = await run(['--claude', '--uninstall'], { env: { HOME: home, USERPROFILE: home } });
  assert.match(removed.out, /Claude Code: removed/);
  const again = await run(['--claude', '-u'], { env: { HOME: home, USERPROFILE: home } });
  assert.match(again.out, /nothing to remove/);
  const tty = await run([], { isTTY: true, env: { HOME: home, USERPROFILE: home } });
  assert.match(tty.out, /Claude Code: 9 skills/);
  const project = tempDir('gp-local-');
  const local = await run(['--cursor', '--local'], { cwd: project });
  assert.equal(local.code, 0);
  assert.ok(fs.existsSync(path.join(project, '.cursor/rules/god.md')));
  const all = await run(['--all'], { env: { HOME: home, USERPROFILE: home } });
  assert.match(all.out, /Pi: 9 skills/);
});

test('init, status, lint, and doctor on a new project', async () => {
  const root = tempDir();
  write(root, 'package.json', '{"scripts":{"test":"node -e 0"}}');
  const init = await run(['init', '--goal', 'Ship it.'], { cwd: root });
  assert.equal(init.code, 0);
  assert.match(init.out, /Verify command: npm test/);
  assert.match((await run(['init'], { cwd: root })).out, /Already initialized/);
  const status = await run(['status'], { cwd: root });
  assert.match(status.out, /Project: .*\nStage: {3}plan\nGoal: {4}Ship it\./);
  assert.match(status.out, /not a git repo/);
  assert.equal(JSON.parse((await run(['status', '--json'], { cwd: root })).out).stage, 'plan');
  assert.equal((await run(['lint'], { cwd: root })).code, 0);
  assert.equal(JSON.parse((await run(['lint', '--json', '--notes'], { cwd: root })).out).errors, 0);
  assert.match((await run(['doctor', '--project', root])).out, /godpowers 7/);
  assert.equal(JSON.parse((await run(['doctor', '--json', '--project', root])).out).project.layout, 'v7');
  const legacy = tempDir();
  write(legacy, '.godpowers/state.json', '{}');
  const refused = await run(['init', '--json'], { cwd: legacy });
  assert.equal(refused.code, 1);
  assert.equal(JSON.parse(refused.out).status, 'legacy');
  assert.equal((await run(['init'], { cwd: legacy })).code, 1);
  assert.match((await run(['status'], { cwd: legacy })).out, /Godpowers 6 layout/);
  assert.match((await run(['status'], { cwd: tempDir() })).out, /No Godpowers project here/);
});

test('verify, record, and gates through the CLI', async () => {
  const root = v7Repo();
  const pass = await run(['verify', 'node -e "console.log(42)"', '--claim', 'answer'], { cwd: root });
  assert.equal(pass.code, 0);
  assert.match(pass.out, /42\n\nPASS: node -e "console\.log\(42\)" \(exit 0, [\d.]+s\) recorded as ev_/);
  const byDefault = await run(['verify'], { cwd: root });
  assert.equal(byDefault.code, 0, 'falls back to the verify command in STATE.md');
  const fail = await run(['verify', '--json', 'node', '-e', 'process.exit(4)'], { cwd: root });
  assert.equal(fail.code, 1);
  assert.equal(JSON.parse(fail.out).exit, 4);
  assert.equal(JSON.parse(fail.out).command, "node -e 'process.exit(4)'");
  assert.match((await run(['verify', 'node -e "process.exit(1)"'], { cwd: root })).out, /FAIL/);
  assert.match((await run(['verify', 'node -e 0', '--timeout', '10m'], { cwd: root })).err, /--timeout must be a number/);
  const changed = await run(['verify', 'node -e "require(\'fs\').writeFileSync(\'gen.txt\', String(Date.now()))"'], { cwd: root });
  assert.match(changed.out, /Files changed while the check ran/);
  assert.match((await run(['verify', '--waive', 'no harness'], { cwd: root })).out, /Recorded waiver/);
  assert.equal(JSON.parse((await run(['verify', '--waive', 'again', '--json'], { cwd: root })).out).kind, 'waive');
  assert.equal((await run(['gate', 'stop'], { cwd: root })).code, 0);
  let ship = await run(['gate', 'ship'], { cwd: root });
  assert.equal(ship.code, 1);
  assert.match(ship.out, /x review/);
  assert.match(ship.out, /Ship gate: BLOCKED/);
  await run(['verify'], { cwd: root });
  assert.match((await run(['record', 'review', '--pass', '--summary', 'clean'], { cwd: root })).out, /Recorded review pass/);
  assert.equal(JSON.parse((await run(['record', 'harden', '--pass', '--summary', 'ok', '--json'], { cwd: root })).out).verdict, 'pass');
  ship = await run(['gate'], { cwd: root });
  assert.equal(ship.code, 0);
  assert.match(ship.out, /Ship gate: PASS/);
  assert.equal(JSON.parse((await run(['gate', 'ship', '--json'], { cwd: root })).out).ok, true);
  write(root, 'src/app.js', 'changed');
  const stop = await run(['gate', 'stop'], { cwd: root });
  assert.equal(stop.code, 1);
  assert.match(stop.out, /Godpowers gate/);
  assert.equal(JSON.parse((await run(['gate', 'stop', '--json'], { cwd: root })).out).block, true);
  assert.match((await run(['gate', 'launch'], { cwd: root })).err, /gate must be "ship" or "stop"/);
  assert.match((await run(['record', 'review', '--summary', 'x'], { cwd: root })).err, /exactly one of --pass or --fail/);
  assert.match((await run(['record', 'review', '--pass'], { cwd: root })).err, /--summary/);
  write(root, '.godpowers/STATE.md', stateText({ verify: 'none' }));
  assert.match((await run(['verify'], { cwd: root })).err, /verify needs a command/);
  assert.equal((await run(['lint'], { cwd: root })).code, 0);
  write(root, '.godpowers/STATE.md', '---\ngodpowers: 7\n---\n');
  assert.equal((await run(['lint'], { cwd: root })).code, 1);
});

test('clean removes 6.x blocks and reports what it did', async () => {
  const root = tempDir();
  write(root, 'CLAUDE.md', '<!-- godpowers:begin -->\n## Godpowers project\nold\n<!-- godpowers:end -->\n');
  write(root, 'AGENTS.md', '# Keep\n\n<!-- pillars:begin -->\n# Godpowers Project Context\n<!-- pillars:end -->\n');
  const dry = await run(['clean', '--dry-run'], { cwd: root });
  assert.match(dry.out, /would be cleaned AGENTS\.md\nwould be deleted CLAUDE\.md/);
  assert.ok(fs.existsSync(path.join(root, 'CLAUDE.md')));
  assert.deepEqual(JSON.parse((await run(['clean', '--json', '--project', root])).out).map(a => a.action), ['cleaned', 'deleted']);
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
  assert.match((await run(['clean'], { cwd: root })).out, /No Godpowers 6 instruction blocks found/);
});

test('migrate, budget, and hook through the CLI', async () => {
  const legacy = tempDir();
  write(legacy, '.godpowers/state.json', '{"project":{"name":"old"}}');
  const dry = await run(['migrate', '--dry-run'], { cwd: legacy });
  assert.match(dry.out, /Would migrate old/);
  assert.match(dry.out, /Run again without --dry-run/);
  assert.equal(JSON.parse((await run(['migrate', '--dry-run', '--json'], { cwd: legacy })).out).ok, true);
  assert.match((await run(['migrate'], { cwd: legacy })).out, /Migrated old/);
  const nothing = await run(['migrate'], { cwd: legacy });
  assert.equal(nothing.code, 1);
  assert.match(nothing.out, /already on the 7\.x layout/);
  assert.equal((await run(['migrate', '--json'], { cwd: legacy })).code, 1);
  const budget = await run(['budget']);
  assert.equal(budget.code, 0);
  assert.match(budget.out, /Within budget/);
  assert.equal(JSON.parse((await run(['budget', '--json'])).out).violations.length, 0);
  const root = v7Repo();
  const hook = await run(['hook', 'session-start'], { stdin: JSON.stringify({ cwd: root, session_id: `cli-${Date.now()}` }) });
  assert.match(hook.out, /^Godpowers: demo/);
  assert.equal((await run(['hook', 'stop'], { stdin: '', cwd: tempDir(), env: { CLAUDE_PROJECT_DIR: '' } })).out, '');
});

test('the bin script runs as a real process', () => {
  const result = spawnSync(process.execPath, [BIN, '--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), VERSION);
  const hook = spawnSync(process.execPath, [BIN, 'hook', 'stop'], { input: '{"cwd":"/nonexistent-dir"}', encoding: 'utf8' });
  assert.equal(hook.status, 0);
  const bad = spawnSync(process.execPath, [BIN, 'nope'], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
});

test('hooks read large and late stdin payloads through the real binary', async () => {
  const root = v7Repo();
  write(root, '.godpowers/STATE.md', stateText({ risks: ['- not a valid risk line'] }));
  const payload = JSON.stringify({
    cwd: root,
    tool_name: 'Bash',
    tool_input: { command: 'git commit -m x' },
    last_assistant_message: 'x'.repeat(200 * 1024)
  });
  const big = spawnSync(process.execPath, [BIN, 'hook', 'pre-tool-use'], { input: payload, encoding: 'utf8' });
  assert.equal(JSON.parse(big.stdout).hookSpecificOutput.permissionDecision, 'deny', 'a 200 KB payload is read in full');
  const late = await new Promise(resolve => {
    const child = spawn(process.execPath, [BIN, 'hook', 'pre-tool-use'], { stdio: ['pipe', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('close', () => resolve(out));
    setTimeout(() => child.stdin.end(payload), 300);
  });
  assert.equal(JSON.parse(late).hookSpecificOutput.permissionDecision, 'deny', 'a payload written late is still read');
});

test('killing verify also stops the check it started', async t => {
  if (process.platform === 'win32') return t.skip('POSIX signals');
  const root = v7Repo();
  const pidFile = path.join(root, '.godpowers', 'child.pid');
  const child = spawn(process.execPath, [BIN, 'verify', `node -e "require('fs').writeFileSync('${pidFile}', String(process.pid)); setInterval(() => {}, 1000)"`], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 100 && !fs.existsSync(pidFile); i++) await new Promise(r => setTimeout(r, 50));
  const checkPid = Number(fs.readFileSync(pidFile, 'utf8'));
  child.kill('SIGTERM');
  await new Promise(resolve => child.on('close', resolve));
  await new Promise(r => setTimeout(r, 300));
  assert.throws(() => process.kill(checkPid, 0), /ESRCH/, 'the check process is gone');
});

test('parseArgs collects repeated --dismiss values and accepts --force for verify', () => {
  assert.deepEqual(cli.parseArgs(['record', 'review', '--dismiss', 'a: b', '--dismiss=c: d', '--summary', 's']).opts, {
    dismiss: ['a: b', 'c: d'], summary: 's'
  });
  assert.throws(() => cli.parseArgs(['record', 'review', '--dismiss']), /--dismiss needs a value/);
  assert.equal(cli.parseArgs(['verify', 'npm test', '--force']).opts.force, true);
  assert.equal(cli.verifyCommand(cli.parseArgs(['verify', 'npm test', '--force'])), 'npm test');
  assert.equal(cli.parseArgs(['verify', '--force', 'npm', 'test']).opts.force, true);
  assert.equal(cli.parseArgs(['verify', 'npm', 'test', '--force']).opts.force, undefined, 'split form: belongs to the command');
});

test('verify reuses a passing record unless forced', async () => {
  const root = v7Repo();
  const cmd = 'node -e "console.log(7)"';
  const count = () => fs.readFileSync(path.join(root, '.godpowers/evidence.jsonl'), 'utf8').split('\n').filter(Boolean).length;
  assert.equal((await run(['verify', cmd], { cwd: root })).code, 0);
  const reused = await run(['verify', cmd], { cwd: root });
  assert.equal(reused.code, 0);
  assert.match(reused.out, /^Reused passing record ev_\S+ from \S+: .* already passed on this code\. Inputs outside git \(installed dependencies, environment\) are not covered; --force runs it again\./);
  assert.doesNotMatch(reused.out, /PASS:/);
  assert.equal(count(), 1);
  const json = JSON.parse((await run(['verify', cmd, '--json'], { cwd: root })).out);
  assert.equal(json.reused, true);
  assert.equal(json.record.kind, 'verify');
  assert.equal(count(), 1);
  assert.match((await run(['verify', cmd, '--force'], { cwd: root })).out, /PASS:/);
  assert.equal(count(), 2);
  assert.match((await run(['verify', '--force', cmd], { cwd: root })).out, /PASS:/);
  assert.match((await run(['verify', 'node -e "console.log(8)"'], { cwd: root })).out, /PASS:/, 'different command runs');
  write(root, 'src/app.js', 'module.exports = 2;\n');
  assert.match((await run(['verify', cmd], { cwd: root })).out, /PASS:/, 'changed tree runs');
  assert.equal(count(), 5);
});

// Lines in the ledger, and a helper to run verify and say whether it ran the command.
const ledgerLines = root => fs.readFileSync(path.join(root, '.godpowers/evidence.jsonl'), 'utf8').split('\n').filter(Boolean);
const ranIt = result => /^(?:[\s\S]*\n\n)?(PASS|FAIL):/.test(result.out) && !/^Reused/.test(result.out);

test('a record for one secret value is not reused for another command that redacts the same', async () => {
  const root = v7Repo();
  const one = 'PASSWORD=hunter-one node -e "console.log(1)"';
  const two = 'PASSWORD=hunter-two node -e "console.log(1)"';
  assert.equal(ranIt(await run(['verify', one], { cwd: root })), true);
  assert.equal(evidence.readAll(root).records[0].command, 'PASSWORD=[redacted] node -e "console.log(1)"');
  assert.match((await run(['verify', one], { cwd: root })).out, /^Reused passing record/, 'the exact command is reused');
  assert.equal(ranIt(await run(['verify', two], { cwd: root })), true, 'a different secret runs the check');
  assert.equal(ledgerLines(root).length, 2);
});

test('verify does not reuse a forged record, a record from another key, or anything in a damaged ledger', async () => {
  const root = v7Repo();
  const cmd = 'node -e "console.log(2)"';
  const { tree, code } = gitTools.fingerprints(root, require('../lib/docs').forRoot(root));
  const forged = { kind: 'verify', tree, code, command: cmd, claim: null, exit: 0, ok: true, timedOut: false, ms: 1, tail: '' };
  evidence.append(root, forged);
  assert.deepEqual(evidence.readAll(root).problems, [], 'the forgery is validly chained');
  assert.equal(ranIt(await run(['verify', cmd], { cwd: root })), true, 'a record without a local signature is not reused');
  evidence.append(root, { ...forged, local: 'ab'.repeat(32) });
  assert.equal(ranIt(await run(['verify', cmd], { cwd: root })), true, 'a record with a made-up signature is not reused');

  assert.match((await run(['verify', cmd], { cwd: root })).out, /^Reused passing record/, 'the run just made is reused');
  const otherHome = path.join(tempDir(), '.godpowers');
  assert.equal(ranIt(await run(['verify', cmd], { cwd: root, env: { GODPOWERS_HOME: otherHome } })), true, 'another machine key does not vouch for it');
  assert.match((await run(['verify', cmd], { cwd: root, env: { GODPOWERS_HOME: otherHome } })).out, /^Reused passing record/);
  assert.match(fs.readFileSync(path.join(otherHome, 'local.key'), 'utf8'), /^[0-9a-f]{64}$/);

  fs.appendFileSync(path.join(root, '.godpowers/evidence.jsonl'), 'not json\n');
  assert.equal(ranIt(await run(['verify', cmd], { cwd: root, env: { GODPOWERS_HOME: otherHome } })), true, 'an integrity error anywhere turns reuse off');
});

test('verify runs and records normally when the key cannot be created, and never prints the key', async () => {
  const root = v7Repo();
  const blocker = write(tempDir(), 'file', 'x');
  const cmd = 'node -e "console.log(3)"';
  const env = { GODPOWERS_HOME: path.join(blocker, 'home') };
  const first = await run(['verify', cmd], { cwd: root, env });
  assert.equal(first.code, 0, first.err);
  assert.equal(ranIt(first), true);
  assert.equal(ranIt(await run(['verify', cmd], { cwd: root, env })), true, 'no key, no reuse');
  assert.equal(ledgerLines(root).length, 2);
  assert.equal(JSON.parse(ledgerLines(root)[0]).local, undefined);
  const home = path.join(tempDir(), '.godpowers');
  const out = (await run(['verify', cmd, '--json'], { cwd: root, env: { GODPOWERS_HOME: home } })).out;
  const key = fs.readFileSync(path.join(home, 'local.key'), 'utf8');
  assert.equal(out.includes(key), false);
  const reused = await run(['verify', cmd], { cwd: root, env: { GODPOWERS_HOME: home } });
  assert.equal(reused.out.includes(key) || reused.err.includes(key), false);
});

test('reviews, status, stats, and the reuse message cope with odd ledger fields and print no control characters', async () => {
  const root = v7Repo();
  const esc = '\u001b';
  evidence.append(root, { kind: 'review', verdict: 'fail', head: 12345, dismissed: 'one finding', summary: `bad${esc}[31m\nline two`, tree: 't', code: 'c' });
  evidence.append(root, { kind: 'review', verdict: 'fail', head: { not: 'a string' }, dismissed: [7, null, `x${esc}y\u009b`], summary: 's', tree: 't', code: 'c' });
  evidence.append(root, { kind: 'review', verdict: 'fail', head: `${esc}abcdefghij`, dismissed: 3, summary: 'third', tree: 't', code: 'c', time: `2026-01-01${esc}` });
  const reviews = await run(['reviews'], { cwd: root });
  assert.equal(reviews.code, 0, reviews.err);
  assert.doesNotMatch(reviews.out.replace(/\n/g, ''), /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/);
  assert.match(reviews.out, /Round 1: fail no commit at \S+: bad\[31mline two\n  dismissed: one finding/);
  assert.match(reviews.out, /dismissed: xy\n/);
  const status = await run(['status'], { cwd: root });
  assert.equal(status.code, 0, status.err);
  assert.doesNotMatch(status.out.replace(/\n/g, ''), /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/);
  const stats = await run(['stats'], { cwd: root });
  assert.equal(stats.code, 0, stats.err);
  assert.doesNotMatch(stats.out.replace(/\n/g, ''), /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/);
  const cmd = 'node -e "console.log(4)"';
  await run(['verify', cmd], { cwd: root });
  const reused = await run(['verify', cmd], { cwd: root });
  assert.match(reused.out, /^Reused passing record/);
  assert.doesNotMatch(reused.out.replace(/\n$/, ''), /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/);
});

test('verify runs again after a failed latest run and after changedDuringRun', async () => {
  const root = v7Repo();
  const failing = 'node -e "process.exit(1)"';
  assert.equal((await run(['verify', failing], { cwd: root })).code, 1);
  assert.equal((await run(['verify', failing], { cwd: root })).code, 1, 'a failed record is never reused');
  const changer = 'node -e "require(\'fs\').writeFileSync(\'gen.txt\', String(Date.now()))"';
  assert.match((await run(['verify', changer], { cwd: root })).out, /Files changed while/);
  fs.rmSync(path.join(root, 'gen.txt'));
  assert.match((await run(['verify', changer], { cwd: root })).out, /Files changed while/, 'changedDuringRun is not reused');
});

test('record review reports rounds, dismissals, and the three-round warning', async () => {
  const root = v7Repo();
  const fail = (extra = []) => run(['record', 'review', '--fail', '--summary', 'found issues', ...extra], { cwd: root });
  const none = await run(['reviews'], { cwd: root });
  assert.equal(none.code, 0);
  assert.match(none.out, /No passing review yet\./);
  assert.match((await fail(['--dismiss', 'naming: house style', '--dismiss', 'perf: not hot'])).out, /Review round 1 since the last pass\./);
  assert.match((await fail()).out, /Review round 2/);
  const third = await fail();
  assert.match(third.out, /Review round 3/);
  assert.match(third.out, /3 failed review rounds since the last pass: stop and rethink the approach \(re-plan, or ask the user\) before another round\./);
  const text = await run(['reviews'], { cwd: root });
  assert.match(text.out, /Round 1: fail \w{7} at \S+: found issues\n  dismissed: naming: house style\n  dismissed: perf: not hot/);
  assert.match(text.out, /3 failed review rounds/);
  const json = JSON.parse((await run(['reviews', '--json'], { cwd: root })).out);
  assert.equal(json.failedSinceLastPass, 3);
  assert.equal(json.rounds[0].dismissed.length, 2);
  assert.match((await run(['status'], { cwd: root })).out, /Rounds:  3 failed review round\(s\) since the last pass\n3 failed review rounds/);
  assert.equal(JSON.parse((await run(['status', '--json'], { cwd: root })).out).failedReviewRounds, 3);
  assert.match((await run(['record', 'review', '--pass', '--summary', 'clean'], { cwd: root })).out, /Review round 4 since the last pass\.\n?$/);
  const after = await run(['reviews'], { cwd: root });
  assert.match(after.out, /Last passing review: \w{7} at \S+: clean\nNo review rounds since the last pass\./);
  assert.doesNotMatch((await run(['status'], { cwd: root })).out, /Rounds:/);
  const bad = await run(['record', 'harden', '--pass', '--summary', 'ok', '--dismiss', 'a: b'], { cwd: root });
  assert.equal(bad.code, 2);
  assert.match(bad.err, /--dismiss only applies to record review/);
});

test('the tiered ship gate through the CLI: tier, --base, JSON, and a refused ref', async () => {
  const root = v7Repo();
  const noBase = await run(['gate', 'ship'], { cwd: root });
  assert.match(noBase.out, /\+ tier\s+high risk: nothing to compare against/);
  assert.equal(JSON.parse((await run(['gate', 'ship', '--json'], { cwd: root })).out).tier, 'high');
  assert.equal(JSON.parse((await run(['gate', 'ship', '--json'], { cwd: root })).out).base, null);
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  write(root, 'README.md', 'docs only');
  assert.equal((await run(['verify'], { cwd: root })).code, 0);
  const ship = await run(['gate', 'ship'], { cwd: root });
  assert.equal(ship.code, 0, ship.out);
  assert.match(ship.out, /\+ tier\s+low risk since v1\.0\.0 \(\w{7}\): only documentation and test files changed since v1\.0\.0/);
  assert.match(ship.out, /\+ review\s+not required for a low-risk change/);
  assert.match(ship.out, /Ship gate: PASS/);
  const json = JSON.parse((await run(['gate', 'ship', '--json'], { cwd: root })).out);
  assert.equal(json.tier, 'low');
  assert.equal(json.base.ref, 'v1.0.0');
  write(root, 'src/auth/token.js', 'x');
  assert.equal((await run(['gate', 'ship'], { cwd: root })).code, 1, 'a high-risk path needs a check on the new code');
  const head = await run(['gate', 'ship', '--base', 'HEAD', '--json'], { cwd: root });
  assert.equal(JSON.parse(head.out).base.ref, 'HEAD');
  const refused = await run(['gate', 'ship', '--base=--output=x'], { cwd: root });
  assert.equal(refused.code, 2);
  assert.match(refused.err, /cannot start with "-"/);
});
