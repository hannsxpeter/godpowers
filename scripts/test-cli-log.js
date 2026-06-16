#!/usr/bin/env node

const cliLog = require('../lib/cli-log');
const { test, assert, report } = require('./test-harness');

function capture(stream, fn) {
  const original = stream.write.bind(stream);
  const chunks = [];
  stream.write = (chunk) => { chunks.push(String(chunk)); return true; };
  try {
    fn();
  } finally {
    stream.write = original;
  }
  return chunks.join('');
}

test('log/success/warn write to stdout with the expected prefixes', () => {
  const out = capture(process.stdout, () => {
    cliLog.log('plain');
    cliLog.success('ok');
    cliLog.warn('careful');
  });
  assert(out.includes('  plain'), 'log indents the message');
  assert(out.includes('+\x1b[0m ok'), 'success uses the green + marker');
  assert(out.includes('!\x1b[0m careful'), 'warn uses the yellow ! marker');
});

test('error writes to stderr with the red x marker', () => {
  const err = capture(process.stderr, () => cliLog.error('boom'));
  assert(err.includes('x\x1b[0m boom'), 'error uses the red x marker on stderr');
});

report('cli-log tests');
