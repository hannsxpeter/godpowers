#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  captureSnapshot,
  compareSnapshots,
  renderTrajectory,
  serializeSnapshot
} = require('../lib/maintainability-trajectory');
const { EXCLUSION_RULES } = require('../lib/style-stats');
const { test, assert, report } = require('./test-harness');

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-trajectory-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

function write(dir, rel, content) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function captureError(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return null;
}

test('P-MUST-28: an unchanged fixture produces byte-identical snapshots', () => {
  const dir = fixture({
    'src/a.js': [
      "const b = require('./b');",
      'function alpha() {',
      '  return b();',
      '}',
      'module.exports = alpha;'
    ].join('\n'),
    'src/b.js': [
      'function beta() {',
      '  return 1;',
      '}',
      'module.exports = beta;'
    ].join('\n')
  });

  const first = captureSnapshot(dir);
  const second = captureSnapshot(dir);
  assert(serializeSnapshot(first) === serializeSnapshot(second), 'snapshot bytes are stable');
  assert(!serializeSnapshot(first).includes(dir), 'volatile absolute root omitted');
  const comparison = compareSnapshots(first, second);
  assert(Object.values(comparison.deltas).every((value) => value === 0), 'unchanged deltas are zero');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: snapshots include every metric with interpretable sample counts', () => {
  const dir = fixture({
    'src/a.js': [
      '// TODO: sample marker',
      "const b = require('./b');",
      'function alpha() {',
      '  const shared = 1;',
      '  return shared;',
      '}',
      'module.exports = alpha;'
    ].join('\n'),
    'src/b.js': [
      'function beta() {',
      '  const different = 2;',
      '  return different;',
      '}',
      'module.exports = beta;'
    ].join('\n')
  });

  const snapshot = captureSnapshot(dir);
  const names = [
    'sourceLines', 'sourceFiles', 'functionCount', 'functionLengthMedian',
    'functionLengthP90', 'commentDensityPct', 'markerCount',
    'duplicatedBlockCount', 'dependencyEdgeCount', 'dependencyCycleCount'
  ];
  assert(Object.keys(snapshot.metrics).join(',') === names.join(','), 'metric order and names are stable');
  assert(Object.keys(snapshot.samples).join(',') === names.join(','), 'every metric has a sample count');
  assert(snapshot.metrics.sourceFiles === 2, 'source files counted');
  assert(snapshot.metrics.sourceLines > 0, 'source lines counted');
  assert(snapshot.metrics.functionCount === 2, 'functions counted');
  assert(snapshot.metrics.functionLengthMedian > 0, 'median function length counted');
  assert(snapshot.metrics.functionLengthP90 >= snapshot.metrics.functionLengthMedian, 'p90 is ordered');
  assert(snapshot.metrics.commentDensityPct > 0, 'comment density counted');
  assert(snapshot.metrics.markerCount === 1, 'TODO and FIXME markers counted');
  assert(snapshot.metrics.dependencyEdgeCount === 1, 'resolved internal edge counted');
  assert(snapshot.samples.functionLengthMedian === 2, 'function samples reported');
  assert(snapshot.samples.commentDensityPct > 0, 'density samples reported');
  assert(snapshot.samples.duplicatedBlockCount > 0, 'normalized block samples reported');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: growth, duplication, and cycles produce signed field deltas', () => {
  const dir = fixture({
    'src/a.js': [
      "const b = require('./b');",
      'function alpha() {',
      '  return b();',
      '}',
      'module.exports = alpha;'
    ].join('\n'),
    'src/b.js': [
      'function beta() {',
      '  return 1;',
      '}',
      'module.exports = beta;'
    ].join('\n')
  });
  const before = captureSnapshot(dir);

  write(dir, 'src/b.js', [
    "const a = require('./a');",
    '// FIXME: cycle introduced for the fixture',
    'function beta() {',
    '  const shared = 1;',
    '  return shared;',
    '}',
    'function gamma() {',
    '  const shared = 1;',
    '  return shared;',
    '}',
    'module.exports = beta;'
  ].join('\n'));
  write(dir, 'src/c.js', [
    "const a = require('./a');",
    'function delta() {',
    '  const shared = 1;',
    '  return shared;',
    '}',
    'module.exports = delta;'
  ].join('\n'));

  const after = captureSnapshot(dir);
  const trajectory = compareSnapshots(before, after);
  assert(trajectory.deltas.sourceFiles === 1, 'file delta is signed growth');
  assert(trajectory.deltas.sourceLines > 0, 'source-line delta grows');
  assert(trajectory.deltas.functionCount === 2, 'function-count delta grows');
  assert(before.metrics.functionLengthMedian === 4, 'baseline median is controlled');
  assert(after.metrics.functionLengthMedian === 4.5, 'post-change median is controlled');
  assert(trajectory.deltas.functionLengthMedian === 0.5, 'median function length grows');
  assert(before.metrics.functionLengthP90 === 4, 'baseline p90 is controlled');
  assert(after.metrics.functionLengthP90 === 5, 'post-change p90 is controlled');
  assert(trajectory.deltas.functionLengthP90 === 1, 'p90 function length grows');
  assert(before.metrics.commentDensityPct === 0, 'baseline comment density is controlled');
  assert(after.metrics.commentDensityPct === 4.5, 'post-change comment density is controlled');
  assert(trajectory.deltas.commentDensityPct === 4.5, 'comment density grows');
  assert(trajectory.deltas.markerCount === 1, 'marker delta grows');
  assert(trajectory.deltas.duplicatedBlockCount > 0, 'duplication delta grows');
  assert(trajectory.deltas.dependencyEdgeCount === 2, 'edge delta grows');
  assert(trajectory.deltas.dependencyCycleCount === 1, 'one cyclic dependency component is added');
  assert(compareSnapshots(after, before).deltas.sourceFiles === -1, 'reverse comparison is negative');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: scanning is static and never executes repository imports', () => {
  delete global.__godpowersTrajectoryImportExecuted;
  const dir = fixture({
    'src/a.js': [
      "const danger = require('./danger');",
      'function alpha() {',
      '  return danger;',
      '}',
      'module.exports = alpha;'
    ].join('\n'),
    'src/danger.js': [
      'global.__godpowersTrajectoryImportExecuted = true;',
      "throw new Error('must not execute');"
    ].join('\n')
  });

  const snapshot = captureSnapshot(dir);
  assert(snapshot.metrics.dependencyEdgeCount === 1, 'import recognized statically');
  assert(global.__godpowersTrajectoryImportExecuted === undefined, 'import was not executed');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: imports inside line and block comments add no dependency edges', () => {
  const dir = fixture({
    'src/a.js': [
      "const b = require('./b');",
      "// const c = require('./c');",
      "/* import c from './c'; */",
      'function alpha() {',
      '  return b;',
      '}'
    ].join('\n'),
    'src/b.js': 'module.exports = 1;\n',
    'src/c.js': 'module.exports = 2;\n'
  });

  const snapshot = captureSnapshot(dir);
  assert(snapshot.metrics.dependencyEdgeCount === 1, 'only the live import becomes an edge');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: all analyzers share the exported exclusion rules', () => {
  const dir = fixture({
    'src/a.js': 'function keep() { return 1; }\n',
    'node_modules/pkg/a.js': 'function copy() { return 1; }\n',
    'vendor/a.js': 'function copy() { return 1; }\n',
    'coverage/a.js': 'function copy() { return 1; }\n',
    'dist/a.js': 'function copy() { return 1; }\n',
    'build/a.js': 'function copy() { return 1; }\n',
    '.godpowers/a.js': 'function copy() { return 1; }\n'
  });

  const snapshot = captureSnapshot(dir);
  assert(snapshot.metrics.sourceFiles === 1, 'excluded trees do not affect metrics');
  assert(snapshot.exclusionRuleVersion === EXCLUSION_RULES.version, 'snapshot identifies shared rules');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: trajectory rendering is explicit, signed, and report-only', () => {
  const dir = fixture({ 'src/a.js': 'function keep() { return 1; }\n' });
  const before = captureSnapshot(dir);
  write(dir, 'src/b.js', 'function add() { return 2; }\n');
  const after = captureSnapshot(dir);
  const trajectory = compareSnapshots(before, after);
  const rendered = renderTrajectory(trajectory);

  assert(trajectory.mode === 'report-only', 'trajectory mode is report-only');
  assert(trajectory.canFailBuild === false, 'metrics cannot fail the build');
  assert(rendered.includes('Report only: yes'), 'human report states calibration behavior');
  assert(rendered.includes('+1'), 'positive deltas render with an explicit sign');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: invalid roots and inventory limits are rejected before scanning', () => {
  const missing = path.join(os.tmpdir(), `godpowers-missing-${process.pid}-${Date.now()}`);
  const missingError = captureError(() => captureSnapshot(missing));
  assert(missingError && /project root/i.test(missingError.message), 'missing root rejected');

  const dir = fixture({ 'src/a.js': 'module.exports = 1;\n' });
  const fileError = captureError(() => captureSnapshot(path.join(dir, 'src/a.js')));
  assert(fileError && /directory/i.test(fileError.message), 'file root rejected');
  for (const invalid of [0, -1, 1.5, '2']) {
    const error = captureError(() => captureSnapshot(dir, { maxFilesPerLanguage: invalid }));
    assert(error && /maxFilesPerLanguage/.test(error.message), `invalid limit rejected: ${invalid}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: inaccessible roots are rejected when the platform enforces permissions', () => {
  const dir = fixture({ 'src/a.js': 'module.exports = 1;\n' });
  fs.chmodSync(dir, 0o000);
  let platformRejectsAccess = false;
  try {
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.X_OK);
  } catch (_) {
    platformRejectsAccess = true;
  }
  if (platformRejectsAccess) {
    const error = captureError(() => captureSnapshot(dir));
    assert(error && /project root/i.test(error.message), 'inaccessible root rejected');
  }
  fs.chmodSync(dir, 0o700);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: snapshots preserve skipped-file and truncation evidence', () => {
  const dir = fixture({
    'src/a.js': 'module.exports = 1;\n',
    'src/b.js': 'module.exports = 2;\n',
    'src/c.js': 'module.exports = 3;\n',
    'src/large.js': Buffer.alloc(EXCLUSION_RULES.maxFileBytes + 1, 97)
  });

  const skipped = captureSnapshot(dir);
  assert(skipped.scanEvidence.skipped.length === 1, 'oversized file evidence retained');
  assert(skipped.scanEvidence.skipped[0].path === 'src/large.js', 'skipped path is project-relative');
  assert(skipped.scanEvidence.skipped[0].reason === 'too-large', 'skip reason retained');

  const truncated = captureSnapshot(dir, { maxFilesPerLanguage: 2 });
  assert(truncated.metrics.sourceFiles === 2, 'inventory is capped');
  assert(truncated.scanEvidence.truncated.length === 1, 'truncation evidence retained');
  assert(truncated.scanEvidence.truncated[0].language === 'js', 'truncated language named');
  assert(truncated.scanEvidence.truncated[0].limit === 2, 'truncation limit retained');
  assert(truncated.scanEvidence.truncated[0].omitted === 2, 'omitted count retained');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: bounded snapshot scanning reads each included source file once', () => {
  const files = {};
  for (let index = 0; index < 6; index += 1) {
    files[`src/f${index}.js`] = `module.exports = ${index};\n`;
  }
  const dir = fixture(files);
  const originalRead = fs.readFileSync;
  let fixtureReads = 0;
  fs.readFileSync = function countedRead(file, ...args) {
    if (String(file).startsWith(dir)) fixtureReads += 1;
    return originalRead.call(this, file, ...args);
  };
  try {
    const snapshot = captureSnapshot(dir, { maxFilesPerLanguage: 2 });
    assert(snapshot.metrics.sourceFiles === 2, 'only bounded files contribute');
  } finally {
    fs.readFileSync = originalRead;
  }
  assert(fixtureReads === 2, `expected one read for each of 2 files, got ${fixtureReads}`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: comparison rejects incompatible or incomplete snapshot evidence', () => {
  const dir = fixture({ 'src/a.js': 'module.exports = 1;\n' });
  const valid = captureSnapshot(dir);
  const badSchema = JSON.parse(serializeSnapshot(valid));
  badSchema.schemaVersion += 1;
  const schemaError = captureError(() => compareSnapshots(valid, badSchema));
  assert(schemaError && /schema/i.test(schemaError.message), 'schema mismatch rejected');

  const badExclusions = JSON.parse(serializeSnapshot(valid));
  badExclusions.exclusionRuleVersion += 1;
  const exclusionError = captureError(() => compareSnapshots(valid, badExclusions));
  assert(exclusionError && /exclusion/i.test(exclusionError.message), 'exclusion mismatch rejected');

  const incomplete = JSON.parse(serializeSnapshot(valid));
  delete incomplete.samples.sourceLines;
  const incompleteError = captureError(() => compareSnapshots(incomplete, valid));
  assert(incompleteError && /sourceLines/.test(incompleteError.message), 'missing sample rejected');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('P-MUST-28: comparison evidence is isolated from later caller mutation', () => {
  const dir = fixture({ 'src/a.js': 'module.exports = 1;\n' });
  const captured = captureSnapshot(dir);
  const before = JSON.parse(serializeSnapshot(captured));
  const after = JSON.parse(serializeSnapshot(captured));
  const trajectory = compareSnapshots(before, after);
  before.metrics.sourceLines = 999;
  after.samples.sourceLines = 999;

  assert(trajectory.before.metrics.sourceLines === captured.metrics.sourceLines, 'before evidence cloned');
  assert(trajectory.after.samples.sourceLines === captured.samples.sourceLines, 'after evidence cloned');
  assert(Object.isFrozen(trajectory), 'trajectory is immutable');
  assert(Object.isFrozen(trajectory.before.metrics), 'nested metric evidence is immutable');
  fs.rmSync(dir, { recursive: true, force: true });
});

report('maintainability-trajectory tests');
