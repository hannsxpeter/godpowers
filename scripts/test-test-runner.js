#!/usr/bin/env node
// Implements: P-MUST-24

const fs = require('fs');
const path = require('path');

const { test, assert, mkProject, report } = require('./test-harness');
const {
  parseOptions,
  runCommands,
  renderAgentSummary
} = require('./run-tests');

function writer() {
  let text = '';
  return {
    stream: {
      write(chunk) {
        text += String(chunk);
      }
    },
    read() {
      return text;
    }
  };
}

function sequencedSpawn(results, calls) {
  let index = 0;
  return (command, args, options) => {
    calls.push({ command, args, options });
    const result = results[index++];
    if (Array.isArray(options.stdio)) {
      if (result.stdout) fs.writeSync(options.stdio[1], result.stdout);
      if (result.stderr) fs.writeSync(options.stdio[2], result.stderr);
      return { status: result.status, error: result.error };
    }
    return result;
  };
}

function tickingClock() {
  let tick = 0;
  return () => {
    tick += 100;
    return tick;
  };
}

function assertFailurePosition(failureIndex) {
  const commands = Array.from({ length: 120 }, (_, index) => ['node', [`fixture-${index}.js`]]);
  const results = commands.map((_, index) => index === failureIndex
    ? { status: 23, stdout: '', stderr: `fixture diagnostic ${index}\n` }
    : { status: 0, stdout: 'Results: 1 passed, 0 failed\n', stderr: '' });
  const calls = [];
  const summary = runCommands(commands, {
    agentOutput: true,
    logRoot: mkProject(`godpowers-test-runner-position-${failureIndex}-`),
    now: tickingClock(),
    spawnSync: sequencedSpawn(results, calls)
  });
  const rendered = renderAgentSummary(summary);

  assert(calls.length === failureIndex + 1, `failure at ${failureIndex} should stop subsequent commands`);
  assert(rendered.includes(`node fixture-${failureIndex}.js`), `failure at ${failureIndex} should identify its command`);
  assert(rendered.includes('exit 23'), `failure at ${failureIndex} should identify its exit status`);
  assert(rendered.includes('elapsed '), `failure at ${failureIndex} should report elapsed time`);
  assert(rendered.includes(`fixture diagnostic ${failureIndex}`), `failure at ${failureIndex} should include diagnostics`);
  assert(rendered.includes(summary.logPath), `failure at ${failureIndex} should include the retained-log path`);
  assert(rendered.split('\n').length <= 25, `failure at ${failureIndex} should stay within 25 lines`);
  assert(Buffer.byteLength(rendered) <= 32 * 1024, `failure at ${failureIndex} should stay within 32 KiB`);
}

test('P-MUST-24: compact and JSON output remain opt-in', () => {
  assert(JSON.stringify(parseOptions([])) === JSON.stringify({ agentOutput: false, json: false }), 'normal mode should be the default');
  assert(JSON.stringify(parseOptions(['--agent-output'])) === JSON.stringify({ agentOutput: true, json: false }), '--agent-output should select compact text');
  assert(JSON.stringify(parseOptions(['--json'])) === JSON.stringify({ agentOutput: true, json: true }), '--json should select compact JSON');
});

test('P-MUST-24: compact success aggregates at least 100 child commands', () => {
  const calls = [];
  const logRoot = mkProject('godpowers-test-runner-pass-');
  const commands = Array.from({ length: 120 }, (_, index) => ['node', [`suite-${index}.js`]]);
  const results = commands.map(() => ({
    status: 0,
    stdout: '  + works\n\n  Results: 2 passed, 0 failed\n',
    stderr: ''
  }));
  const summary = runCommands(commands, {
    agentOutput: true,
    logRoot,
    now: () => 1000,
    spawnSync: sequencedSpawn(results, calls)
  });

  const rendered = renderAgentSummary(summary);
  assert(summary.status === 0, 'compact success should return status 0');
  assert(calls.length === 120, 'compact success should execute every command');
  assert(rendered.includes('PASS 120 test commands'), 'compact output should aggregate successful commands');
  assert(rendered.includes('240 passed'), 'stable test counts should be aggregated');
  assert(!rendered.includes('  + works'), 'raw successful child output should not be rendered');
  assert(rendered.split('\n').length <= 25, 'at least 100 successful commands should stay within 25 lines');
  assert(Buffer.byteLength(rendered) <= 32 * 1024, 'aggregated successful output should stay within 32 KiB');
  assert(calls.every(call => Array.isArray(call.options.stdio)), 'compact mode should stream child output to file descriptors');
});

test('P-MUST-24: compact execution stops at the first failure and preserves its status', () => {
  const calls = [];
  const summary = runCommands([
    ['node', ['passes.js']],
    ['node', ['fails.js']],
    ['node', ['must-not-run.js']]
  ], {
    agentOutput: true,
    logRoot: mkProject('godpowers-test-runner-stop-'),
    now: () => 1000,
    spawnSync: sequencedSpawn([
      { status: 0, stdout: '1 passed\n', stderr: '' },
      { status: 7, stdout: '', stderr: 'failure detail\n' },
      { status: 0, stdout: 'unexpected\n', stderr: '' }
    ], calls)
  });

  assert(calls.length === 2, 'commands after the first failure must not run');
  assert(summary.status === 7, 'the exact failing exit status should propagate');
  assert(summary.commands.length === 2, 'the summary should include only attempted commands');
  assert(summary.failure.command === 'node fails.js', 'the failing command should be identified');
});

test('P-MUST-24: beginning failure output is complete and bounded', () => {
  assertFailurePosition(0);
});

test('P-MUST-24: middle failure output is complete and bounded', () => {
  assertFailurePosition(59);
});

test('P-MUST-24: end failure output is complete and bounded', () => {
  assertFailurePosition(119);
});

test('P-MUST-24: diagnostics are bounded while the private retained log is complete', () => {
  const lines = Array.from({ length: 300 }, (_, index) => `failure-line-${index}`);
  const logRoot = mkProject('godpowers-test-runner-log-');
  const summary = runCommands([
    ['node', ['fails-loudly.js']]
  ], {
    agentOutput: true,
    logRoot,
    now: () => 1000,
    spawnSync: (_command, _args, options) => {
      const childStdout = `${lines.join('\n')}\n`;
      const childStderr = 'focused-root-cause\n';
      if (Array.isArray(options.stdio)) {
        fs.writeSync(options.stdio[1], childStdout);
        fs.writeSync(options.stdio[2], childStderr);
        return { status: 9 };
      }
      return { status: 9, stdout: childStdout, stderr: childStderr };
    }
  });

  const diagnostics = summary.failure.diagnostics;
  const log = fs.readFileSync(summary.logPath, 'utf8');
  const directoryMode = fs.statSync(path.dirname(summary.logPath)).mode & 0o777;
  const fileMode = fs.statSync(summary.logPath).mode & 0o777;
  assert(Buffer.byteLength(diagnostics) <= 8192, 'rendered diagnostics should stay within 8 KiB');
  assert(diagnostics.split('\n').length <= 40, 'rendered diagnostics should stay within 40 lines');
  assert(diagnostics.includes('focused-root-cause'), 'focused stderr should survive diagnostic bounding');
  assert(log.includes('failure-line-0'), 'the retained log should include the start of stdout');
  assert(log.includes('failure-line-299'), 'the retained log should include the end of stdout');
  assert(log.includes('focused-root-cause'), 'the retained log should include stderr');
  assert(path.isAbsolute(summary.logPath), 'the retained log path should be absolute');
  assert(directoryMode === 0o700, `the retained log directory should be private, got ${directoryMode.toString(8)}`);
  assert(fileMode === 0o600, `the retained log should be private, got ${fileMode.toString(8)}`);
});

test('P-MUST-24: compact execution streams exact child bytes without a maxBuffer ceiling', () => {
  const raw = Buffer.from([0x00, 0xff, 0xfe, 0x41, 0xc3, 0x28, 0x0a]);
  let spawnOptions = null;
  const summary = runCommands([
    ['node', ['binary-output.js']]
  ], {
    agentOutput: true,
    logRoot: mkProject('godpowers-test-runner-bytes-'),
    now: () => 1000,
    spawnSync: (_command, _args, options) => {
      spawnOptions = options;
      assert(Array.isArray(options.stdio), 'compact child output should use streaming file descriptors');
      fs.writeSync(options.stdio[1], raw);
      return { status: 0 };
    }
  });
  const retained = fs.readFileSync(summary.logPath);

  assert(!Object.prototype.hasOwnProperty.call(spawnOptions, 'maxBuffer'), 'streaming execution should not impose a maxBuffer ceiling');
  assert(retained.indexOf(raw) >= 0, 'the retained log should contain the exact child byte sequence');
  assert(retained.indexOf(Buffer.from([0xef, 0xbf, 0xbd])) === -1, 'the retained log should not replace invalid UTF-8 bytes');
});

test('P-MUST-24: JSON output carries status, command results, diagnostics, and log path', () => {
  const summary = runCommands([
    ['node', ['json.js']]
  ], {
    agentOutput: true,
    json: true,
    logRoot: mkProject('godpowers-test-runner-json-'),
    now: () => 1000,
    spawnSync: (_command, _args, options) => {
      if (Array.isArray(options.stdio)) {
        fs.writeSync(options.stdio[2], 'json failure\n');
        return { status: 5 };
      }
      return { status: 5, stdout: '', stderr: 'json failure\n' };
    }
  });
  const parsed = JSON.parse(renderAgentSummary(summary, { json: true }));

  assert(parsed.status === 5, 'JSON should preserve the exact exit status');
  assert(parsed.commands.length === 1, 'JSON should include attempted command results');
  assert(parsed.failure.diagnostics.includes('json failure'), 'JSON should include bounded diagnostics');
  assert(parsed.logPath === summary.logPath, 'JSON should include the complete retained log path');
});

test('P-MUST-24: normal mode preserves inherited output and legacy presentation', () => {
  const calls = [];
  const stdout = writer();
  const stderr = writer();
  const summary = runCommands([
    ['node', ['normal.js']]
  ], {
    now: () => 1000,
    spawnSync: sequencedSpawn([
      { status: 0 }
    ], calls),
    stdout: stdout.stream,
    stderr: stderr.stream
  });

  assert(calls.length === 1, 'normal mode should run the command');
  assert(calls[0].options.stdio === 'inherit', 'normal mode should preserve inherited child output');
  assert(stdout.read() === '\n> node normal.js\n\n\nAll test commands passed in 0.0s.\n', 'normal presentation should remain unchanged');
  assert(stderr.read() === '', 'normal success should not write to stderr');
  assert(summary.status === 0 && summary.logPath === null, 'normal mode should not create a retained log');
});

report('Compact test runner tests');
