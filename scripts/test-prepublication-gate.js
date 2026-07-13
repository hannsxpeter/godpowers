#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const gate = require('../lib/prepublication-gate');
const { test, assert, report } = require('./test-harness');

console.log('\n  Pre-publication gate tests\n');

function project(name = 'godpowers-prepublication-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

function write(root, relPath, content) {
  const target = path.join(root, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function findings(opts = {}) {
  const count = opts.count === undefined ? 0 : opts.count;
  const launch = opts.launch || (count === 0 ? 'PASSED' : 'BLOCKED');
  const sections = opts.sections || '';
  return [
    '# Security Findings',
    '',
    '| Severity | Count |',
    '|---|---:|',
    `| Critical | ${count} |`,
    '',
    `[DECISION] Launch gate: ${launch}.`,
    '',
    sections
  ].join('\n');
}

function ready(root, updated = '2026-07-13T10:00:00.000Z', content = findings()) {
  write(root, gate.FINDINGS_FILE, content);
  write(root, gate.STATE_FILE, JSON.stringify({
    tiers: {
      'tier-3': {
        harden: { status: 'done', updated }
      }
    }
  }, null, 2));
}

test('records and verifies a fresh hash-bound pass', () => {
  const root = project();
  ready(root);
  const recorded = gate.record(root, { now: '2026-07-13T10:00:01.000Z' });
  assert(recorded.verdict === 'pass', JSON.stringify(recorded));
  assert(recorded.hardeningRevision.startsWith('sha256:'), recorded.hardeningRevision);
  assert(fs.existsSync(path.join(root, gate.GATE_FILE)), 'gate artifact missing');
  const checked = gate.check(root);
  assert(checked.verdict === 'pass', JSON.stringify(checked));
  assert(checked.recordedRevision === checked.hardeningRevision, JSON.stringify(checked));
});

test('invalidates the gate when findings bytes change', () => {
  const root = project();
  ready(root);
  gate.record(root, { now: '2026-07-13T10:00:01.000Z' });
  fs.appendFileSync(path.join(root, gate.FINDINGS_FILE), '\n[DECISION] A later hardening note changed the reviewed bytes.\n');
  const checked = gate.check(root);
  assert(checked.verdict === 'block', JSON.stringify(checked));
  assert(checked.reasons.includes('hardening revision changed after the gate was recorded'), JSON.stringify(checked.reasons));
});

test('invalidates the gate when authoritative hardening state changes', () => {
  const root = project();
  ready(root);
  gate.record(root, { now: '2026-07-13T10:00:01.000Z' });
  ready(root, '2026-07-13T10:00:02.000Z');
  const checked = gate.check(root);
  assert(checked.verdict === 'block', JSON.stringify(checked));
  assert(checked.reasons.includes('authoritative hardening update changed after the gate was recorded'), JSON.stringify(checked.reasons));
  assert(checked.reasons.includes('pre-publication check is not later than the authoritative hardening update'), JSON.stringify(checked.reasons));
});

test('records a blocked artifact when the timestamp is stale', () => {
  const root = project();
  ready(root, '2026-07-13T10:00:02.000Z');
  const recorded = gate.record(root, { now: '2026-07-13T10:00:01.000Z' });
  assert(recorded.verdict === 'block', JSON.stringify(recorded));
  assert(recorded.reasons.some(reason => reason.includes('not later')), JSON.stringify(recorded.reasons));
  const parsed = gate.parseGate(fs.readFileSync(path.join(root, gate.GATE_FILE), 'utf8'));
  assert(parsed.verdict === 'block', JSON.stringify(parsed));
});

test('blocks unresolved and accepted Critical findings', () => {
  const open = gate.parseCriticalFindings(findings({
    count: 1,
    sections: '### [CRITICAL-001] Auth bypass\n- **Status**: Open'
  }));
  assert(open.total === 1 && open.unresolved === 1, JSON.stringify(open));

  const accepted = gate.parseCriticalFindings(findings({
    count: 1,
    launch: 'PASSED',
    sections: '### [CRITICAL-001] Auth bypass\n- **Status**: Accepted-Risk'
  }));
  assert(accepted.accepted === 1 && accepted.unresolved === 1, JSON.stringify(accepted));

  const root = project();
  ready(root, '2026-07-13T10:00:00.000Z', findings({
    count: 1,
    sections: '### [CRITICAL-001] Auth bypass\n- **Status**: Open'
  }));
  const result = gate.record(root, { now: '2026-07-13T10:00:01.000Z' });
  assert(result.verdict === 'block', JSON.stringify(result));
  assert(result.reasons.some(reason => reason.includes('Critical')), JSON.stringify(result.reasons));
});

test('recognizes fixed Critical entries and YAML finding shape', () => {
  const fixed = gate.parseCriticalFindings(findings({
    count: 1,
    launch: 'PASSED',
    sections: '### [CRITICAL-001] Fixed issue\n- Status: Verified.'
  }));
  assert(fixed.resolved === 1 && fixed.unresolved === 0, JSON.stringify(fixed));

  const yaml = gate.parseCriticalFindings('severity: critical\nstatus: resolved\n\nseverity: critical\nstatus: wip\n');
  assert(yaml.total === 2 && yaml.resolved === 1 && yaml.unresolved === 1, JSON.stringify(yaml));

  const missingEntry = gate.parseCriticalFindings('| Critical | 2 |\n### [CRITICAL-001] One\n- Status: Fixed');
  assert(missingEntry.total === 2 && missingEntry.unresolved === 1, JSON.stringify(missingEntry));
});

test('fails closed on missing, invalid, or incomplete authority', () => {
  const missing = project();
  const missingSnapshot = gate.snapshot(missing);
  const missingEvaluation = gate.evaluateSnapshot(missingSnapshot);
  assert(missingEvaluation.verdict === 'block', JSON.stringify(missingEvaluation));
  assert(missingEvaluation.reasons.some(reason => reason.includes(gate.FINDINGS_FILE)), JSON.stringify(missingEvaluation));

  const invalid = project();
  write(invalid, gate.FINDINGS_FILE, findings());
  write(invalid, gate.STATE_FILE, '{bad json');
  const invalidResult = gate.check(invalid);
  assert(invalidResult.verdict === 'block', JSON.stringify(invalidResult));
  assert(invalidResult.reasons.some(reason => reason.includes(gate.STATE_FILE)), JSON.stringify(invalidResult.reasons));

  const pending = project();
  ready(pending);
  const state = JSON.parse(fs.readFileSync(path.join(pending, gate.STATE_FILE), 'utf8'));
  state.tiers['tier-3'].harden.status = 'pending';
  write(pending, gate.STATE_FILE, JSON.stringify(state));
  const pendingResult = gate.record(pending, { now: '2026-07-13T10:00:01.000Z' });
  assert(pendingResult.verdict === 'block', JSON.stringify(pendingResult));
});

test('fails closed on a missing or malformed gate artifact', () => {
  const root = project();
  ready(root);
  const missing = gate.check(root);
  assert(missing.reasons.includes(`missing or invalid ${gate.GATE_FILE}`), JSON.stringify(missing.reasons));
  write(root, gate.GATE_FILE, '# no frontmatter');
  const malformed = gate.check(root);
  assert(malformed.verdict === 'block', JSON.stringify(malformed));
  assert(gate.parseGate('not a gate') === null, 'invalid gate should return null');
});

test('parses and renders stable gate artifacts', () => {
  const rendered = gate.renderGate({
    checkedAt: '2026-07-13T10:00:01.000Z',
    hardeningRevision: gate.sha256('findings'),
    hardeningUpdatedAt: null,
    criticals: { total: 1, unresolved: 1, accepted: 0 },
    verdict: 'block',
    reasons: ['one blocker']
  });
  const parsed = gate.parseGate(rendered);
  assert(parsed['schema-version'] === 1, JSON.stringify(parsed));
  assert(parsed.hardening_updated_at === null, JSON.stringify(parsed));
  assert(parsed.critical_unresolved === 1, JSON.stringify(parsed));
  assert(rendered.includes('## Blocking Reasons'), rendered);
});

test('renders a concise operator result', () => {
  const text = gate.renderResult({
    verdict: 'block',
    hardeningRevision: null,
    criticals: { unresolved: 2 },
    gateFile: gate.GATE_FILE,
    reasons: ['stale revision']
  });
  assert(text.includes('Verdict: block'), text);
  assert(text.includes('- stale revision'), text);
});

test('parses command arguments and rejects unknown flags', () => {
  const first = gate.parseArgs(['node', 'gate', '--record', '--project=/tmp/example', '--json']);
  assert(first.mode === 'record' && first.projectRoot === '/tmp/example' && first.json === true, JSON.stringify(first));
  const second = gate.parseArgs(['node', 'gate', '--check', '--project', '/tmp/two']);
  assert(second.mode === 'check' && second.projectRoot === '/tmp/two', JSON.stringify(second));
  let message = '';
  try {
    gate.parseArgs(['node', 'gate', '--unknown']);
  } catch (error) {
    message = error.message;
  }
  assert(message.includes('Unknown argument'), message);
});

test('record rejects an invalid checked_at value', () => {
  const root = project();
  ready(root);
  let message = '';
  try {
    gate.record(root, { now: 'not-a-date' });
  } catch (error) {
    message = error.message;
  }
  assert(message.includes('Invalid checked_at'), message);
});

report('Pre-publication gate tests');
