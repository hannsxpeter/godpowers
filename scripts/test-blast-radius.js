#!/usr/bin/env node
// Implements: P-MUST-36, P-MUST-37, P-MUST-38, P-MUST-39, P-MUST-40, P-MUST-41, P-MUST-42, P-MUST-43
/**
 * Contract tests for the shared blast-radius safety case.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const evidence = require('../lib/evidence');
const state = require('../lib/state');
const { test, report, assert, mkProject, writeRel } = require('./test-harness');

const ROOT = path.join(__dirname, '..');
const PROTOCOL_PATH = 'references/building/BLAST-RADIUS.md';
const CONSUMERS = [
  'skills/god-review.md',
  'skills/god-build.md',
  'specialists/god-executor.md',
  'specialists/god-quality-reviewer.md',
  'references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md'
];
const BOUNDARY_CLASSES = [
  'dependency implementation',
  'pinned dependency version',
  'local dependency patches',
  'lifecycle or ordering timing',
  'serialized or public API contracts',
  'database or disk-state fields',
  'configuration or feature flags',
  'generated or installed surfaces',
  'npm package surfaces',
  'cross-language consumers'
];
const SAFETY_FACT_FIELDS = [
  'Condition',
  'Boundary',
  'Consequence if false',
  'Evidence level',
  'Evidence citation'
];
const RISK_ENTRY_FIELDS = [
  'likelihood',
  'impact',
  'location or boundary',
  'evidence level',
  'evidence citation',
  'verification method'
];
const ADVERSARIAL_FIXTURES = [
  {
    id: 'pinned-dependency-only-risk',
    boundary: 'dependency implementation',
    visibility: 'pinned implementation differs from the source-level assumption',
    files: {
      'src/caller.js': [
        "const pinned = require('pinned-lib');",
        'exports.normalize = (value) => pinned.normalize(value);'
      ].join('\n'),
      'node_modules/pinned-lib/package.json': '{"name":"pinned-lib","version":"1.0.0","main":"index.js"}\n',
      'node_modules/pinned-lib/index.js': 'exports.normalize = (value) => value.trimEnd();\n',
      'package-lock.json': [
        '{',
        '  "lockfileVersion": 3,',
        '  "packages": {',
        '    "node_modules/pinned-lib": { "version": "1.0.0" }',
        '  }',
        '}'
      ].join('\n')
    },
    directProbe: {
      kind: 'node',
      source: [
        "const caller = require('./src/caller');",
        "if (caller.normalize('value') !== 'value') process.exit(1);"
      ].join('\n')
    },
    boundaryProbe: {
      kind: 'node',
      boundary: 'dependency implementation',
      source: [
        "const caller = require('./src/caller');",
        "if (caller.normalize(' value ') !== 'value') {",
        "  console.error('pinned implementation differs from the source-level assumption');",
        '  process.exit(1);',
        '}'
      ].join('\n')
    }
  },
  {
    id: 'lifecycle-ordering',
    boundary: 'lifecycle or ordering timing',
    visibility: 'failure appears only after the lifecycle transition order',
    files: {
      'src/lifecycle.js': 'exports.sequence = (actions) => actions.slice();\n'
    },
    directProbe: {
      kind: 'node',
      source: [
        "const lifecycle = require('./src/lifecycle');",
        "const events = lifecycle.sequence(['start', 'publish']);",
        "if (events.join(',') !== 'start,publish') process.exit(1);"
      ].join('\n')
    },
    boundaryProbe: {
      kind: 'node',
      boundary: 'lifecycle or ordering timing',
      source: [
        "const lifecycle = require('./src/lifecycle');",
        "const events = lifecycle.sequence(['start', 'close', 'publish']);",
        "if (events.indexOf('publish') > events.indexOf('close')) {",
        "  console.error('failure appears only after the lifecycle transition order');",
        '  process.exit(1);',
        '}'
      ].join('\n')
    }
  },
  {
    id: 'serialized-consumer',
    boundary: 'serialized or public API contracts',
    visibility: 'a downstream reader depends on the serialized field',
    files: {
      'src/producer.js': 'module.exports = (id) => JSON.stringify({ userId: id });\n',
      'consumers/reader.js': [
        'module.exports = (payload) => {',
        '  const parsed = JSON.parse(payload);',
        '  return parsed.user_id;',
        '};'
      ].join('\n')
    },
    directProbe: {
      kind: 'node',
      source: [
        "const produce = require('./src/producer');",
        "if (JSON.parse(produce('u-1')).userId !== 'u-1') process.exit(1);"
      ].join('\n')
    },
    boundaryProbe: {
      kind: 'node',
      boundary: 'serialized or public API contracts',
      source: [
        "const produce = require('./src/producer');",
        "const consume = require('./consumers/reader');",
        "if (consume(produce('u-1')) !== 'u-1') {",
        "  console.error('a downstream reader depends on the serialized field');",
        '  process.exit(1);',
        '}'
      ].join('\n')
    }
  },
  {
    id: 'installed-copy-drift',
    boundary: 'generated or installed surfaces',
    visibility: 'the installed copy differs from repository source',
    files: {
      'src/runtime.js': "module.exports = '6.2.0';\n",
      'installed/runtime.js': "module.exports = '6.1.0';\n"
    },
    directProbe: {
      kind: 'node',
      source: "if (require('./src/runtime') !== '6.2.0') process.exit(1);"
    },
    boundaryProbe: {
      kind: 'node',
      boundary: 'generated or installed surfaces',
      source: [
        "const source = require('./src/runtime');",
        "const installed = require('./installed/runtime');",
        'if (installed !== source) {',
        "  console.error('the installed copy differs from repository source');",
        '  process.exit(1);',
        '}'
      ].join('\n')
    }
  },
  {
    id: 'missing-package-file',
    boundary: 'npm package surfaces',
    visibility: 'the tarball omits a required runtime file',
    files: {
      'package.json': [
        '{',
        '  "name": "blast-radius-package-fixture",',
        '  "version": "1.0.0",',
        '  "files": ["dist/index.js"],',
        '  "main": "dist/index.js"',
        '}'
      ].join('\n'),
      'dist/index.js': [
        "const fs = require('fs');",
        "const path = require('path');",
        "module.exports = () => fs.readFileSync(path.join(__dirname, 'protocol.md'), 'utf8').trim();"
      ].join('\n'),
      'dist/protocol.md': 'packaged protocol\n'
    },
    directProbe: {
      kind: 'node',
      source: "if (require('./dist')() !== 'packaged protocol') process.exit(1);"
    },
    boundaryProbe: {
      kind: 'node',
      boundary: 'npm package surfaces',
      source: [
        "const { execFileSync } = require('child_process');",
        "const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--dry-run'], { encoding: 'utf8' }))[0];",
        "if (!packed.files.some((file) => file.path === 'dist/protocol.md')) {",
        "  console.error('the tarball omits a required runtime file');",
        '  process.exit(1);',
        '}'
      ].join('\n')
    }
  },
  {
    id: 'cross-language-invocation',
    boundary: 'cross-language consumers',
    visibility: 'a non-JavaScript caller observes the invocation contract',
    files: {
      'src/status.js': [
        "function status() { return 'ready'; }",
        "if (require.main === module) process.stdout.write(status());",
        'module.exports = status;'
      ].join('\n'),
      'consumers/status-check.sh': [
        'value="$(node src/status.js)"',
        'if [ "$value" != "READY" ]; then',
        "  printf '%s\\n' 'a non-JavaScript caller observes the invocation contract' >&2",
        '  exit 1',
        'fi'
      ].join('\n')
    },
    directProbe: {
      kind: 'node',
      source: "if (require('./src/status')() !== 'ready') process.exit(1);"
    },
    boundaryProbe: {
      kind: 'shell',
      boundary: 'cross-language consumers',
      file: 'consumers/status-check.sh'
    }
  }
];
const SURFACE_COUNTS = Object.freeze({
  skills: 124,
  routes: 124,
  recipes: 45,
  workflows: 13,
  specialists: 41
});
const FIXTURE_TIMEOUT_MS = 10_000;
const FIXTURE_MAX_BUFFER_BYTES = 1024 * 1024;

function read(relativePath) {
  const file = path.join(ROOT, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function assertIncludes(content, expected, message) {
  assert(content.includes(expected), message || `missing ${expected}`);
}

function assertPhrase(content, expected, message) {
  const normalizedContent = content.replace(/\s+/g, ' ').toLowerCase();
  const normalizedExpected = expected.replace(/\s+/g, ' ').toLowerCase();
  assert(normalizedContent.includes(normalizedExpected), message || `missing ${expected}`);
}

function section(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start === -1) return '';
  const bodyStart = start + marker.length;
  const next = content.indexOf('\n## ', bodyStart);
  return content.slice(bodyStart, next === -1 ? content.length : next);
}

function table(content, heading) {
  const lines = section(content, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));
  assert(lines.length >= 2, `${heading} table is missing`);
  const cells = (line) => line.slice(1, -1).split('|').map((value) => value.trim());
  const headers = cells(lines[0]);
  const body = lines.slice(1).filter((line) => !/^\|[-: |]+\|$/.test(line));
  return body.map((line) => {
    const values = cells(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function countFiles(directory, matcher) {
  return fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && matcher.test(entry.name))
    .length;
}

function citationVerdict(record, expected) {
  if (!record) return 'absent';
  if (record.kind !== 'executed') return 'attested-only';
  if (record.exit_code === -1) return 'timed-out';
  if (record.verified !== true || record.exit_code !== 0) return 'failed';
  if (record.claim !== expected.claim) return 'mismatched-claim';
  if (record.command !== expected.command) return 'mismatched-command';
  if (record.substep !== expected.substep) return 'mismatched-substep';
  const timestamp = Date.parse(record.timestamp);
  if (!Number.isFinite(timestamp)) return 'stale';
  if (timestamp < Date.parse(expected.reviewWindowStartedAt)) return 'pre-change';
  if (timestamp < Date.parse(expected.lastBehaviorChangeAt)) return 'stale';
  return 'accepted';
}

function assertOrderedPhrases(content, phrases, file) {
  const normalized = content.replace(/\s+/g, ' ').toLowerCase();
  let previous = -1;
  for (const phrase of phrases) {
    const index = normalized.indexOf(phrase.toLowerCase());
    assert(index > previous, `${file} is missing or misorders: ${phrase}`);
    previous = index;
  }
}

function executeFixtureProbe(project, probe, spawn = spawnSync) {
  const command = probe.kind === 'shell' ? 'sh' : process.execPath;
  const args = probe.kind === 'shell' ? [probe.file] : ['-e', probe.source];
  const result = spawn(command, args, {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env },
    timeout: FIXTURE_TIMEOUT_MS,
    maxBuffer: FIXTURE_MAX_BUFFER_BYTES
  });
  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');
  const outputCapped = Boolean(result.error && result.error.code === 'ENOBUFS');
  const status = typeof result.status === 'number' && !timedOut && !outputCapped
    ? result.status
    : 1;
  return {
    status,
    detected: status !== 0,
    timedOut,
    outputCapped,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function runAdversarialFixture(fixture) {
  const project = mkProject(`godpowers-blast-radius-${fixture.id}-`);
  for (const [relativePath, content] of Object.entries(fixture.files)) {
    writeRel(project, relativePath, content);
  }

  const directRun = executeFixtureProbe(project, fixture.directProbe);
  const boundaryRun = executeFixtureProbe(project, fixture.boundaryProbe);
  return {
    direct: {
      ...directRun,
      detected: directRun.status !== 0
    },
    boundary: {
      ...boundaryRun,
      boundary: fixture.boundaryProbe.boundary,
      detected: boundaryRun.status !== 0,
      diagnostics: `${boundaryRun.stdout}\n${boundaryRun.stderr}`.trim()
    }
  };
}

console.log('\n  Blast-radius safety-case contract tests\n');

test('P-MUST-36: one shared protocol is shipped and consumed by existing review contracts', () => {
  const protocol = read(PROTOCOL_PATH);
  assert(protocol.length > 0, `${PROTOCOL_PATH} is missing`);
  for (const consumer of CONSUMERS) {
    assertIncludes(read(consumer), PROTOCOL_PATH, `${consumer} does not consume the shared protocol`);
  }
  assertPhrase(read('skills/god-review.md'), 'two-stage', '/god-review lost its two-stage contract');
});

test('P-MUST-37: the protocol defines exactly one safety fact and five non-combinable levels', () => {
  const protocol = read(PROTOCOL_PATH);
  assertIncludes(protocol, 'exactly one load-bearing safety fact');
  const fields = table(protocol, 'Load-Bearing Safety Fact').map((row) => row.Field);
  assert(JSON.stringify(fields) === JSON.stringify(SAFETY_FACT_FIELDS), `safety fact fields: ${fields.join(', ')}`);
  for (let level = 1; level <= 5; level += 1) {
    assertIncludes(protocol, `| ${level} |`, `evidence level ${level} is missing`);
  }
  assertIncludes(protocol, 'Levels 1 through 3 are `UNPROVEN`');
  assertIncludes(protocol, 'cannot be combined');
});

test('P-MUST-38: proof states and impact drive blocking or warning verdicts', () => {
  const protocol = read(PROTOCOL_PATH);
  for (const section of ['Confirmed Risks', 'Cleared Risks', 'Unproven Claims', 'Before Merge']) {
    assertIncludes(protocol, `## ${section}`, `output section ${section} is missing`);
  }
  for (const impact of [
    'authentication or authorization',
    'secrets',
    'state corruption or loss',
    'destructive action',
    'installer or published package',
    'public or serialized contract',
    'verification-ledger integrity'
  ]) {
    assertIncludes(protocol, impact, `high-impact class ${impact} is missing`);
  }
  assertIncludes(protocol, 'High-impact `UNPROVEN`');
  assertIncludes(protocol, 'Stage 2 FAIL');
  assertIncludes(protocol, 'Lower-impact `UNPROVEN`');
  assertIncludes(protocol, 'exact next proof');

  const schemas = table(protocol, 'Risk Entry Schema');
  assert(schemas.length === 3, `risk schemas: ${schemas.length}`);
  for (const schema of schemas) {
    for (const field of RISK_ENTRY_FIELDS) {
      assertPhrase(schema['Required fields'], field, `${schema.Section} is missing ${field}`);
    }
  }
  const bySection = new Map(schemas.map((schema) => [schema.Section, schema]));
  assertPhrase(bySection.get('Confirmed Risks')['Allowed evidence'], 'levels 4 or 5');
  assertPhrase(bySection.get('Cleared Risks')['Allowed evidence'], 'levels 4 or 5');
  assertPhrase(bySection.get('Unproven Claims')['Allowed evidence'], 'levels 1 through 3');

  const verdicts = table(protocol, 'Verdict Matrix');
  const byCondition = new Map(verdicts.map((row) => [row.Condition, row.Outcome]));
  assertPhrase(byCondition.get('Confirmed blocking risk'), 'Stage 2 FAIL');
  assertPhrase(byCondition.get('High-impact `UNPROVEN`'), 'Stage 2 FAIL');
  assertPhrase(byCondition.get('Lower-impact `UNPROVEN`'), 'warning with exact next proof');
  assertPhrase(byCondition.get('Safety case FAIL'), 'Stage 2 FAIL');
  assertPhrase(byCondition.get('Safety case PASS and all nine quality dimensions PASS'), 'Stage 2 PASS');
});

test('P-MUST-39: every review records all 10 boundary classes with evidence-backed N/A', () => {
  const protocol = read(PROTOCOL_PATH);
  assert(BOUNDARY_CLASSES.length === 10, 'test boundary inventory drifted');
  for (const boundary of BOUNDARY_CLASSES) {
    assertIncludes(protocol, boundary, `boundary class ${boundary} is missing`);
  }
  assertIncludes(protocol, 'evidence-backed `N/A`');
  const fixtureRows = table(protocol, 'Adversarial Fixtures');
  assert(fixtureRows.length === ADVERSARIAL_FIXTURES.length, `fixture rows: ${fixtureRows.length}`);
  for (const fixture of ADVERSARIAL_FIXTURES) {
    assert(BOUNDARY_CLASSES.includes(fixture.boundary), `${fixture.id} uses an unknown boundary`);
    assert(fixture.visibility.length > 20, `${fixture.id} has no failure visibility`);
    const row = fixtureRows.find((candidate) => candidate.Fixture === fixture.id);
    assert(row, `${fixture.id} fixture row is missing`);
    assert(row['Expected boundary'] === fixture.boundary, `${fixture.id} boundary mismatch`);
    assert(row['Failure visibility'] === fixture.visibility, `${fixture.id} visibility mismatch`);
  }
});

for (const fixture of ADVERSARIAL_FIXTURES) {
  test(`P-MUST-39: ${fixture.id} escapes direct callers and fails at ${fixture.boundary}`, () => {
    const result = runAdversarialFixture(fixture);
    assert(result.direct.status === 0, `${fixture.id} direct-caller probe did not appear safe`);
    assert(result.direct.detected === false, `${fixture.id} direct-caller probe detected the hidden failure`);
    assert(result.boundary.status !== 0, `${fixture.id} boundary probe did not detect the hidden failure`);
    assert(result.boundary.detected === true, `${fixture.id} boundary probe lacks detection evidence`);
    assert(result.boundary.boundary === fixture.boundary, `${fixture.id} detected at the wrong boundary`);
    assertPhrase(result.boundary.diagnostics, fixture.visibility, `${fixture.id} lacks failure visibility`);
  });
}

test('P-MUST-39: fixed adversarial probes fail closed at 10 seconds', () => {
  let options;
  const fakeSpawn = (_command, _args, received) => {
    options = received;
    return { status: null, stdout: '', stderr: '', error: { code: 'ETIMEDOUT' } };
  };
  const result = executeFixtureProbe(process.cwd(), { kind: 'node', source: 'process.exit(0)' }, fakeSpawn);
  assert(options.timeout === 10_000, `fixture timeout: ${options && options.timeout}`);
  assert(options.maxBuffer === 1024 * 1024, `fixture maxBuffer: ${options && options.maxBuffer}`);
  assert(result.status !== 0 && result.detected === true, 'timed-out probe did not fail closed');
  assert(result.timedOut === true, 'timed-out probe lacks timeout evidence');
});

test('P-MUST-39: fixed adversarial probes fail closed at the 1 MiB output cap', () => {
  let options;
  const fakeSpawn = (_command, _args, received) => {
    options = received;
    return { status: null, stdout: '', stderr: '', error: { code: 'ENOBUFS' } };
  };
  const result = executeFixtureProbe(process.cwd(), { kind: 'node', source: 'process.exit(0)' }, fakeSpawn);
  assert(options.timeout === 10_000, `fixture timeout: ${options && options.timeout}`);
  assert(options.maxBuffer === 1024 * 1024, `fixture maxBuffer: ${options && options.maxBuffer}`);
  assert(result.status !== 0 && result.detected === true, 'output-capped probe did not fail closed');
  assert(result.outputCapped === true, 'output-capped probe lacks cap evidence');
});

test('P-MUST-40: an executed focused probe creates the exact durable claim record', () => {
  const project = mkProject('godpowers-blast-radius-evidence-');
  state.init(project, 'blast-radius-evidence');
  const claim = 'the focused blast-radius fixture exits successfully';
  const command = `${process.execPath} -e "process.exit(0)"`;
  const result = evidence.verify(command, {
    substep: 'tier-2.build',
    claim,
    projectRoot: project
  });
  const ledger = path.join(project, '.godpowers', 'ledger', 'verifications.jsonl');
  const records = fs.readFileSync(ledger, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const record = records.find((entry) => entry.id === result.record.id);

  assert(record && record.kind === 'executed', 'executed ledger record missing');
  assert(record.claim === claim, 'ledger claim mismatch');
  assert(record.command === command, 'ledger command mismatch');
  assert(record.substep === 'tier-2.build', 'canonical substep mismatch');
  assert(record.exit_code === 0, 'successful exit code missing');
  assert(typeof record.timestamp === 'string' && record.timestamp.length > 0, 'timestamp missing');
  assert(record.verified === true, 'verified verdict missing');

  const expected = {
    claim,
    command,
    substep: 'tier-2.build',
    reviewWindowStartedAt: new Date(Date.parse(record.timestamp) - 2000).toISOString(),
    lastBehaviorChangeAt: new Date(Date.parse(record.timestamp) - 1000).toISOString()
  };
  assert(citationVerdict(record, expected) === 'accepted', 'fresh matching record was rejected');

  const base = { ...record, timestamp: '2026-08-19T10:06:00.000Z' };
  const fixtureExpected = {
    claim: base.claim,
    command: base.command,
    substep: base.substep,
    reviewWindowStartedAt: '2026-08-19T10:00:00.000Z',
    lastBehaviorChangeAt: '2026-08-19T10:05:00.000Z'
  };
  const rejectionFixtures = [
    { name: 'absent', record: null, verdict: 'absent' },
    { name: 'failed', record: { ...base, verified: false, exit_code: 1 }, verdict: 'failed' },
    { name: 'timed-out', record: { ...base, verified: false, exit_code: -1 }, verdict: 'timed-out' },
    { name: 'attested-only', record: { ...base, kind: 'attested' }, verdict: 'attested-only' },
    { name: 'mismatched claim', record: { ...base, claim: 'different' }, verdict: 'mismatched-claim' },
    { name: 'mismatched command', record: { ...base, command: 'different' }, verdict: 'mismatched-command' },
    { name: 'mismatched substep', record: { ...base, substep: 'tier-3.harden' }, verdict: 'mismatched-substep' },
    { name: 'stale', record: { ...base, timestamp: '2026-08-19T10:02:00.000Z' }, verdict: 'stale' },
    { name: 'pre-change', record: { ...base, timestamp: '2026-08-19T09:59:00.000Z' }, verdict: 'pre-change' }
  ];
  for (const fixture of rejectionFixtures) {
    assert(citationVerdict(fixture.record, fixtureExpected) === fixture.verdict, `${fixture.name} record was accepted`);
  }

  const protocol = read(PROTOCOL_PATH);
  const citationRows = table(protocol, 'Citation Acceptance');
  const decisions = new Set(citationRows.map((row) => row.Decision));
  for (const fixture of rejectionFixtures) {
    assert(decisions.has(fixture.verdict), `protocol lacks ${fixture.verdict} citation decision`);
  }
  assert(decisions.has('accepted'), 'protocol lacks accepted citation decision');

  assertIncludes(protocol, 'failed, timed-out, attested-only, mismatched, stale, or pre-change');
  assertIncludes(protocol, 'npx godpowers verify');
  assertPhrase(protocol, 'trusted workspace');
  assertPhrase(protocol, 'does not authenticate');
  assertPhrase(protocol, 'rewrite all trusted files and recompute the chain');

  for (const consumer of [
    'skills/god-review.md',
    'skills/god-build.md',
    'specialists/god-quality-reviewer.md',
    'references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md'
  ]) {
    const content = read(consumer);
    assertIncludes(content, 'resolveReviewEvidence', `${consumer} does not call the local resolver`);
    assertPhrase(content, 'sanitized');
    assertPhrase(content, 'do not pass raw ledger records');
  }
});

test('P-MUST-41: runtime reproduction is conditional on an evidenced runnable target', () => {
  const protocol = read(PROTOCOL_PATH);
  assertIncludes(protocol, 'Runtime reproduction is required only');
  assertIncludes(protocol, 'evidenced runnable target');
  assertIncludes(protocol, 'level 5 `N/A`');
  assertIncludes(protocol, 'missing runnable target');
  const outcomes = table(protocol, 'Runtime Applicability');
  const keyed = new Map(outcomes.map((row) => [`${row['Runtime-dependent']}|${row['Evidenced runnable target']}`, row.Outcome]));
  assert(keyed.get('no|no') === 'level 5 `N/A` with observed reason', 'deterministic local outcome drifted');
  assert(keyed.get('no|yes') === 'level 5 `N/A` with observed reason', 'irrelevant target outcome drifted');
  assert(keyed.get('yes|yes') === 'level 5 reproduction required', 'runtime target outcome drifted');
  assert(keyed.get('yes|no') === 'Unproven Claim with owner, impact, and exact evidence needed', 'missing target outcome drifted');
});

test('P-MUST-42: wide changes get two independent fresh-context Stage 2 passes', () => {
  const protocol = read(PROTOCOL_PATH);
  assertIncludes(protocol, 'at least 3 boundary classes');
  assertPhrase(protocol, 'at least 2 high-impact classes');
  assertPhrase(protocol, 'at least 2 independent');
  assertIncludes(protocol, 'fresh contexts');
  assertPhrase(protocol, 'Reviewer agreement cannot raise an evidence level');

  for (const consumer of [
    'skills/god-review.md',
    'skills/god-build.md',
    'references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md'
  ]) {
    const content = read(consumer);
    assertPhrase(content, 'at least 3', `${consumer} is missing the wide boundary threshold`);
    assertPhrase(content, 'at least 2 high-impact', `${consumer} is missing the high-impact threshold`);
    assertPhrase(content, '2 independent', `${consumer} is missing the independent pass count`);
    assertPhrase(content, 'fresh context', `${consumer} is missing fresh-context independence`);
    assertOrderedPhrases(content, [
      'classify bounded or wide before acting on the provisional first-pass verdict',
      'if wide, always run a second independent safety case in a fresh context, even when the provisional first-pass verdict is fail',
      'after all required passes finish, reconcile the safety cases and issue the final stage 2 verdict'
    ], consumer);
  }

  const modes = table(protocol, 'Bounded And Wide Review');
  const bounded = modes.find((row) => row.Classification === 'bounded');
  const wide = modes.find((row) => row.Classification === 'wide');
  assert(bounded && bounded['Required independent passes'] === '1', 'bounded review must use one pass');
  assertPhrase(bounded['Final verdict timing'], 'after the first pass');
  assert(wide && wide['Required independent passes'] === 'at least 2', 'wide review must use two passes');
  assertPhrase(wide['First-pass FAIL behavior'], 'preserve provisional FAIL and still run the second pass');
  assertPhrase(wide['Final verdict timing'], 'after reconciliation');
});

test('P-MUST-43: static candidates stay unproven and public surface stays unchanged', () => {
  const protocol = read(PROTOCOL_PATH);
  for (const candidate of ['lib/impact.js', 'grep', 'AST', 'LSP', 'import graph']) {
    assertIncludes(protocol, candidate, `static candidate ${candidate} is missing`);
  }
  assertIncludes(protocol, 'candidate discovery');
  assertPhrase(protocol, 'does not prove behavioral safety');

  const packageJson = JSON.parse(read('package.json'));
  assert(Object.keys(packageJson.dependencies || {}).length === 0, 'production dependency was added');
  assert(countFiles('skills', /^god.*\.md$/) === SURFACE_COUNTS.skills, 'slash skill count changed');
  assert(countFiles('routing', /^god.*\.yaml$/) === SURFACE_COUNTS.routes, 'route count changed');
  assert(countFiles('routing/recipes', /\.yaml$/) === SURFACE_COUNTS.recipes, 'recipe count changed');
  assert(countFiles('workflows', /\.yaml$/) === SURFACE_COUNTS.workflows, 'workflow count changed');
  assert(countFiles('specialists', /^god.*\.md$/) === SURFACE_COUNTS.specialists, 'specialist count changed');
});

test('executor proposes the candidate and quality reviewer owns the verdict', () => {
  const executor = read('specialists/god-executor.md');
  const reviewer = read('specialists/god-quality-reviewer.md');
  assertIncludes(executor, 'candidate safety fact');
  assertIncludes(executor, 'must not grade');
  assertPhrase(reviewer, 'independently verify or replace');
  assertIncludes(reviewer, 'Safety Case Verdict');
});

test('focused suite is registered and the shared protocol is package guarded', () => {
  assertIncludes(read('scripts/run-tests.js'), "['scripts/test-blast-radius.js']");
  assertIncludes(read('scripts/check-package-contents.js'), `'${PROTOCOL_PATH}'`);
});

report();
