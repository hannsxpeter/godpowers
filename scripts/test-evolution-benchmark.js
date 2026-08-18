#!/usr/bin/env node

const fs = require('fs');
const dgram = require('dgram');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { test, asyncTest, assert, mkProject, report } = require('./test-harness');
const benchmark = require('../lib/evolution-benchmark');
const maintainability = require('../lib/maintainability-trajectory');

const SCENARIO_ROOT = path.join(
  __dirname,
  '..',
  'fixtures',
  'evolution',
  'maintainability-sequence'
);

function evidenceDir() {
  return mkProject('godpowers-evolution-evidence-test-');
}

function scenarioCopy(prefix) {
  const parent = mkProject(prefix || 'godpowers-evolution-scenario-test-');
  const target = path.join(parent, 'scenario');
  fs.cpSync(SCENARIO_ROOT, target, { recursive: true });
  return target;
}

function runCompleteScenario(options = {}) {
  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const outputDir = evidenceDir();
  const run = benchmark.createRun(scenario, { evidenceDir: outputDir });
  const tempRoot = run.projectRoot;
  for (let index = 0; index < scenario.checkpointIds.length; index += 1) {
    benchmark.recordCheckpoint(run, options.forCheckpoint
      ? options.forCheckpoint(index, run)
      : {});
  }
  const summary = benchmark.summarize(run);
  return { scenario, summary, outputDir, tempRoot };
}

test('P-MUST-29: bundled scenario declares exactly six ordered checkpoints', () => {
  assert(typeof maintainability.snapshot === 'function', 'snapshot API alias missing');
  assert(typeof maintainability.diff === 'function', 'diff API alias missing');
  assert(typeof maintainability.render === 'function', 'render API alias missing');
  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  assert(scenario.checkpointIds.length === 6, `count: ${scenario.checkpointIds.length}`);
  assert(JSON.stringify(scenario.checkpointIds) === JSON.stringify([
    '01-defaults',
    '02-overrides',
    '03-validation',
    '04-subscriptions',
    '05-snapshots',
    '06-audit'
  ]), `order: ${JSON.stringify(scenario.checkpointIds)}`);
});

test('P-MUST-29: checkpoint recording reads only the current hidden requirement', () => {
  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  assert(fs.existsSync(path.join(run.projectRoot, '.git')), 'temporary project is not a git repository');
  const clean = spawnSync('git', ['status', '--short'], {
    cwd: run.projectRoot,
    env: { PATH: process.env.PATH || '' },
    encoding: 'utf8'
  });
  assert(clean.status === 0 && clean.stdout === '', `temporary repository is dirty: ${clean.stdout}`);
  const original = fs.readFileSync;
  const reads = [];
  fs.readFileSync = function observed(file, ...args) {
    const resolved = path.resolve(String(file));
    if (resolved.includes(`${path.sep}checkpoints${path.sep}`)) reads.push(resolved);
    return original.call(fs, file, ...args);
  };
  try {
    benchmark.recordCheckpoint(run);
  } finally {
    fs.readFileSync = original;
  }
  assert(reads.length === 1, `checkpoint reads: ${JSON.stringify(reads)}`);
  assert(reads[0].endsWith(`${path.sep}01-defaults.json`), `read: ${reads[0]}`);
  benchmark.summarize(run);
});

test('P-MUST-29: every checkpoint records required behavior and changeability evidence', () => {
  const { summary } = runCompleteScenario();
  assert(summary.verdict === 'pass', `verdict: ${summary.verdict}`);
  assert(summary.checkpoints.length === 6, `records: ${summary.checkpoints.length}`);
  for (const checkpoint of summary.checkpoints) {
    assert(Number.isInteger(checkpoint.attempts) && checkpoint.attempts >= 1, 'attempts missing');
    assert(checkpoint.behaviorPassed === true, `${checkpoint.id}: behavior failed`);
    assert(Number.isInteger(checkpoint.reworkLines) && checkpoint.reworkLines >= 0, 'rework missing');
    assert(Number.isInteger(checkpoint.changedLines) && checkpoint.changedLines > 0, 'changed lines missing');
    assert(checkpoint.maintainabilityDelta && checkpoint.maintainabilityDelta.deltas,
      'maintainability delta missing');
    assert(checkpoint.accepted === true, `${checkpoint.id}: not accepted`);
    assert(checkpoint.handoffComplete === true, `${checkpoint.id}: handoff incomplete`);
  }
});

test('P-MUST-29: machine evidence is byte-stable and human summary is useful', () => {
  const first = runCompleteScenario();
  const second = runCompleteScenario();
  const firstBytes = fs.readFileSync(first.summary.evidencePath, 'utf8');
  const secondBytes = fs.readFileSync(second.summary.evidencePath, 'utf8');
  assert(firstBytes === secondBytes, 'machine evidence drifted across identical runs');
  assert(Buffer.byteLength(firstBytes, 'utf8') <= benchmark.MAX_EVIDENCE_BYTES,
    'machine evidence exceeded its byte limit');
  const firstHuman = fs.readFileSync(first.summary.humanSummaryPath, 'utf8');
  const secondHuman = fs.readFileSync(second.summary.humanSummaryPath, 'utf8');
  assert(firstHuman === secondHuman, 'human summary drifted across identical runs');
  const human = benchmark.render(first.summary);
  assert(human.includes('6/6 checkpoints accepted'), `summary: ${human}`);
  assert(human.includes('Evidence:'), `summary missing evidence pointer: ${human}`);
  assert(human.includes('behavior=pass(0)'), `summary missing behavior result: ${human}`);
  assert(human.includes('handoff=complete'), `summary missing handoff result: ${human}`);
  assert(human.includes('maintainability={'), `summary missing maintainability delta: ${human}`);
  assert(firstHuman === `${human}\n`, 'retained human summary differs from renderer');
  assert(Buffer.byteLength(firstHuman, 'utf8') <= benchmark.MAX_SUMMARY_BYTES,
    'human summary exceeded its byte limit');
});

test('P-MUST-29: failed behavior or incomplete handoff produces a failing verdict', () => {
  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  benchmark.recordCheckpoint(run, {
    handoff: { goal: 'incomplete' },
    forceBehaviorFailure: true,
    attempts: 2,
    reworkLines: 4
  });
  const summary = benchmark.summarize(run);
  assert(summary.verdict === 'fail', `verdict: ${summary.verdict}`);
  assert(summary.checkpoints[0].behaviorPassed === false, 'behavior failure lost');
  assert(summary.checkpoints[0].handoffComplete === false, 'incomplete handoff accepted');
  assert(summary.checkpoints[0].accepted === false, 'failed checkpoint accepted');
});

test('P-MUST-29: pass and fail paths clean temporary repositories but retain evidence', () => {
  const passing = runCompleteScenario();
  assert(!fs.existsSync(passing.tempRoot), `pass temp root retained: ${passing.tempRoot}`);
  assert(fs.existsSync(passing.summary.evidencePath), 'pass evidence missing');
  assert(fs.existsSync(passing.summary.humanSummaryPath), 'pass human summary missing');

  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const outputDir = evidenceDir();
  const run = benchmark.createRun(scenario, { evidenceDir: outputDir });
  const tempRoot = run.projectRoot;
  benchmark.recordCheckpoint(run, { forceBehaviorFailure: true });
  const failed = benchmark.summarize(run);
  assert(!fs.existsSync(tempRoot), `fail temp root retained: ${tempRoot}`);
  assert(fs.existsSync(failed.evidencePath), 'fail evidence missing');
  assert(fs.existsSync(failed.humanSummaryPath), 'fail human summary missing');
});

test('P-MUST-29: CLI runs offline with model credentials removed', () => {
  const outputDir = evidenceDir();
  const env = { PATH: process.env.PATH || '' };
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'lib', 'evolution-benchmark.js'),
    '--scenario', SCENARIO_ROOT,
    '--evidence-dir', outputDir
  ], { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  assert(result.status === 0, `status ${result.status}: ${result.stderr}`);
  assert(result.stdout.includes('6/6 checkpoints accepted'), `stdout: ${result.stdout}`);
  assert(fs.readdirSync(outputDir).some(name => name.endsWith('.json')), 'CLI evidence missing');
});

test('P-MUST-29: CLI exits nonzero for a failed checkpoint and still retains evidence', () => {
  const scenarioRoot = scenarioCopy('godpowers-evolution-failing-');
  const firstFile = path.join(scenarioRoot, 'checkpoints', '01-defaults.json');
  const first = JSON.parse(fs.readFileSync(firstFile, 'utf8'));
  first.assertValue = 'deliberate-mismatch';
  fs.writeFileSync(firstFile, `${JSON.stringify(first, null, 2)}\n`);
  fs.writeFileSync(path.join(scenarioRoot, 'checkpoints', '02-overrides.json'), '{ future content must stay unread');
  const outputDir = evidenceDir();
  const beforeTemps = new Set(fs.readdirSync(os.tmpdir())
    .filter(name => name.startsWith('godpowers-evolution-project-')));
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'lib', 'evolution-benchmark.js'),
    '--scenario', scenarioRoot,
    '--evidence-dir', outputDir
  ], { cwd: path.join(__dirname, '..'), env: { PATH: process.env.PATH || '' }, encoding: 'utf8' });
  const leaked = fs.readdirSync(os.tmpdir())
    .filter(name => name.startsWith('godpowers-evolution-project-') && !beforeTemps.has(name));
  assert(result.status !== 0, `unexpected success: ${result.stdout}`);
  const jsonName = fs.readdirSync(outputDir).find(name => name.endsWith('.json'));
  assert(jsonName, 'failure evidence missing');
  const evidence = JSON.parse(fs.readFileSync(path.join(outputDir, jsonName), 'utf8'));
  assert(evidence.completedCheckpointCount === 1, `continued after failure: ${evidence.completedCheckpointCount}`);
  assert(evidence.checkpoints[0].id === '01-defaults', JSON.stringify(evidence.checkpoints));
  assert(!/unexpected token|json/i.test(result.stderr), `future checkpoint was parsed: ${result.stderr}`);
  assert(fs.readdirSync(outputDir).some(name => name.endsWith('.md')), 'failure human summary missing');
  assert(leaked.length === 0, `failure temp roots leaked: ${leaked.join(', ')}`);
});

test('P-MUST-29: malformed scenarios and out-of-order records fail closed', () => {
  const badRoot = mkProject('godpowers-evolution-bad-');
  fs.writeFileSync(path.join(badRoot, 'manifest.json'), JSON.stringify({
    schemaVersion: 1,
    id: 'bad',
    checkpointIds: ['one']
  }));
  let badScenario = null;
  try {
    benchmark.loadScenario(badRoot);
  } catch (error) {
    badScenario = error;
  }
  assert(badScenario && /exactly 6/i.test(badScenario.message), 'bad scenario accepted');

  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  let orderError = null;
  try {
    benchmark.recordCheckpoint(run, { checkpointId: '03-validation' });
  } catch (error) {
    orderError = error;
  }
  assert(orderError && /next checkpoint/i.test(orderError.message), 'out-of-order checkpoint accepted');
  benchmark.summarize(run);
});

test('P-MUST-29: scenario manifests and checkpoints cannot escape through symlinks', () => {
  const external = mkProject('godpowers-evolution-external-');
  const externalManifest = path.join(external, 'manifest.json');
  fs.writeFileSync(externalManifest, fs.readFileSync(path.join(SCENARIO_ROOT, 'manifest.json')));

  const manifestScenario = scenarioCopy('godpowers-evolution-manifest-link-');
  const manifestPath = path.join(manifestScenario, 'manifest.json');
  fs.rmSync(manifestPath);
  fs.symlinkSync(externalManifest, manifestPath);
  let manifestError;
  try {
    benchmark.loadScenario(manifestScenario);
  } catch (error) {
    manifestError = error;
  }
  assert(manifestError && /symlink/i.test(manifestError.message), 'symlinked manifest was accepted');

  const checkpointScenario = scenarioCopy('godpowers-evolution-checkpoint-link-');
  const checkpointPath = path.join(checkpointScenario, 'checkpoints', '01-defaults.json');
  const externalCheckpoint = path.join(external, 'checkpoint.json');
  fs.writeFileSync(externalCheckpoint, fs.readFileSync(checkpointPath));
  fs.rmSync(checkpointPath);
  fs.symlinkSync(externalCheckpoint, checkpointPath);
  let checkpointError;
  try {
    benchmark.loadScenario(checkpointScenario);
  } catch (error) {
    checkpointError = error;
  }
  assert(checkpointError && /symlink/i.test(checkpointError.message), 'symlinked checkpoint was accepted');
});

test('P-MUST-29: baseline VCS metadata and Git hooks cannot influence the temporary repository', () => {
  const hostileScenario = scenarioCopy('godpowers-evolution-vcs-metadata-');
  const hostileGit = path.join(hostileScenario, 'baseline', '.git', 'hooks');
  fs.mkdirSync(hostileGit, { recursive: true });
  fs.writeFileSync(path.join(hostileGit, 'pre-commit'), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
  const hostile = benchmark.loadScenario(hostileScenario);
  let metadataError;
  try {
    benchmark.createRun(hostile, { evidenceDir: evidenceDir() });
  } catch (error) {
    metadataError = error;
  }
  assert(metadataError && /version-control metadata/i.test(metadataError.message),
    'baseline .git metadata was accepted');

  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  const marker = path.join(evidenceDir(), 'hook-ran');
  const attackerHooks = path.join(evidenceDir(), 'attacker-hooks');
  fs.mkdirSync(attackerHooks, { recursive: true });
  fs.writeFileSync(
    path.join(attackerHooks, 'pre-commit'),
    `#!/bin/sh\nprintf ran > ${JSON.stringify(marker)}\nexit 91\n`,
    { mode: 0o755 }
  );
  const configured = spawnSync('git', ['config', '--local', 'core.hooksPath', attackerHooks], {
    cwd: run.projectRoot,
    env: { PATH: process.env.PATH || '' },
    encoding: 'utf8'
  });
  assert(configured.status === 0, `could not configure adversarial hooks path: ${configured.stderr}`);
  const record = benchmark.recordCheckpoint(run);
  assert(record.accepted === true, 'hardened Git command was influenced by repository hook config');
  assert(!fs.existsSync(marker), 'repository-configured Git hook executed');
  benchmark.summarize(run);
});

test('P-MUST-29: baseline copying enforces traversal and byte limits', () => {
  assert(Number.isInteger(benchmark.MAX_BASELINE_DEPTH), 'baseline depth cap missing');
  assert(Number.isInteger(benchmark.MAX_BASELINE_BYTES), 'baseline byte cap missing');

  const deepScenario = scenarioCopy('godpowers-evolution-deep-baseline-');
  let current = path.join(deepScenario, 'baseline');
  for (let depth = 0; depth <= benchmark.MAX_BASELINE_DEPTH; depth += 1) {
    current = path.join(current, 'd');
    fs.mkdirSync(current);
  }
  fs.writeFileSync(path.join(current, 'deep.txt'), 'deep');
  let deepError;
  try {
    benchmark.createRun(benchmark.loadScenario(deepScenario), { evidenceDir: evidenceDir() });
  } catch (error) {
    deepError = error;
  }
  assert(deepError && /baseline traversal depth/i.test(deepError.message),
    'deep baseline tree was not bounded');

  const largeScenario = scenarioCopy('godpowers-evolution-large-baseline-');
  const oversized = path.join(largeScenario, 'baseline', 'oversized.bin');
  fs.writeFileSync(oversized, '');
  fs.truncateSync(oversized, benchmark.MAX_BASELINE_BYTES + 1);
  let largeError;
  try {
    benchmark.createRun(benchmark.loadScenario(largeScenario), { evidenceDir: evidenceDir() });
  } catch (error) {
    largeError = error;
  }
  assert(largeError && /baseline byte limit/i.test(largeError.message),
    'oversized baseline tree was not bounded');
});

test('P-MUST-29: executable network guard denies UDP, fetch, and child processes', () => {
  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  const probes = [
    "require('dgram').createSocket({ type: 'udp4', lookup() {} });",
    "fetch('http://127.0.0.1:9');",
    "require('child_process').spawn('/usr/bin/env', []);"
  ];
  for (const probe of probes) {
    const result = spawnSync(process.execPath, ['--require', run.guardPath, '-e', probe], {
      cwd: run.projectRoot,
      env: { NODE_NO_WARNINGS: '1' },
      encoding: 'utf8'
    });
    assert(result.status !== 0, `network guard probe unexpectedly passed: ${probe}`);
    assert(/network access is disabled/i.test(result.stderr), `unexpected guard error: ${result.stderr}`);
  }
  benchmark.summarize(run);
});

test('P-MUST-29: interruption retains partial evidence and removes temporary state', () => {
  const outputDir = evidenceDir();
  const markerRoot = mkProject('godpowers-evolution-interrupt-marker-');
  const marker = path.join(markerRoot, 'run.json');
  const modulePath = path.join(__dirname, '..', 'lib', 'evolution-benchmark.js');
  const child = [
    `const fs = require('fs');`,
    `const benchmark = require(${JSON.stringify(modulePath)});`,
    `const scenario = benchmark.loadScenario(${JSON.stringify(SCENARIO_ROOT)});`,
    `let run = benchmark.createRun(scenario, { evidenceDir: ${JSON.stringify(outputDir)} });`,
    `fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({ projectRoot: run.projectRoot, guardPath: run.guardPath }));`,
    `benchmark.installSignalCleanup(() => run);`,
    `process.kill(process.pid, 'SIGTERM');`,
    `setInterval(() => {}, 1000);`
  ].join('\n');
  const result = spawnSync(process.execPath, ['-e', child], {
    cwd: path.join(__dirname, '..'),
    env: { PATH: process.env.PATH || '' },
    encoding: 'utf8',
    timeout: 10_000
  });
  assert(result.status === 143, `interrupt status ${result.status}: ${result.stderr}`);
  const paths = JSON.parse(fs.readFileSync(marker, 'utf8'));
  assert(!fs.existsSync(paths.projectRoot), `interrupted project retained: ${paths.projectRoot}`);
  assert(!fs.existsSync(paths.guardPath), `interrupted guard retained: ${paths.guardPath}`);
  const evidenceName = fs.readdirSync(outputDir).find(name => name.endsWith('.json'));
  assert(evidenceName, 'interruption evidence was not retained');
  const evidence = JSON.parse(fs.readFileSync(path.join(outputDir, evidenceName), 'utf8'));
  assert(evidence.verdict === 'fail' && evidence.completedCheckpointCount === 0,
    `unexpected interruption evidence: ${JSON.stringify(evidence)}`);
});

test('P-MUST-29: checkpoint inputs, scalar fields, and numeric evidence are bounded', () => {
  const oversizedRoot = scenarioCopy('godpowers-evolution-oversized-');
  const oversizedFile = path.join(oversizedRoot, 'checkpoints', '01-defaults.json');
  const oversized = JSON.parse(fs.readFileSync(oversizedFile, 'utf8'));
  oversized.requirement = 'x'.repeat(benchmark.MAX_CHECKPOINT_BYTES);
  fs.writeFileSync(oversizedFile, JSON.stringify(oversized));
  const oversizedScenario = benchmark.loadScenario(oversizedRoot);
  const oversizedRun = benchmark.createRun(oversizedScenario, { evidenceDir: evidenceDir() });
  let oversizedError;
  try {
    benchmark.recordCheckpoint(oversizedRun);
  } catch (error) {
    oversizedError = error;
  }
  assert(oversizedError && /byte limit/i.test(oversizedError.message), 'oversized checkpoint was accepted');
  benchmark.summarize(oversizedRun);

  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  for (const input of [{ attempts: 0 }, { attempts: '2' }, { reworkLines: -1 }, { reworkLines: 1.5 }]) {
    let metricError;
    try {
      benchmark.recordCheckpoint(run, input);
    } catch (error) {
      metricError = error;
    }
    assert(metricError && /safe integer/i.test(metricError.message), `invalid metric accepted: ${JSON.stringify(input)}`);
    assert(run.nextIndex === 0, 'invalid metric mutated checkpoint order');
  }
  benchmark.summarize(run);
});

test('P-MUST-29: malformed canonical handoff evidence cannot be accepted', () => {
  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  const malformed = {
    goal: 'checkpoint',
    constraints: [],
    requirementIds: [],
    status: 'nonsense',
    completedWork: [],
    inProgressWork: [],
    blockers: [],
    changedFiles: [],
    verificationResults: [],
    decisions: [],
    nextAction: 'continue',
    criticalRefs: [],
    evidenceRefs: []
  };
  const record = benchmark.recordCheckpoint(run, { handoff: malformed });
  assert(record.handoffComplete === false, 'malformed handoff was marked complete');
  assert(record.accepted === false, 'malformed handoff was accepted');
  benchmark.summarize(run);
});

test('P-MUST-29: explicit falsy handoffs remain incomplete instead of receiving defaults', () => {
  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  for (const handoff of [null, false, '', 0]) {
    const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
    const record = benchmark.recordCheckpoint(run, { handoff });
    assert(record.handoffComplete === false, `falsy handoff was completed: ${JSON.stringify(handoff)}`);
    assert(record.accepted === false, `falsy handoff was accepted: ${JSON.stringify(handoff)}`);
    benchmark.summarize(run);
  }
});

asyncTest('P-MUST-29: custom callback and promise DNS resolvers cannot bypass the guard', async () => {
  const server = dgram.createSocket('udp4');
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.bind(0, '127.0.0.1', resolve);
  });
  server.on('message', (message, remote) => {
    const response = Buffer.from(message);
    response[2] = 0x81;
    response[3] = 0x80;
    response.writeUInt16BE(0, 6);
    response.writeUInt16BE(0, 8);
    response.writeUInt16BE(0, 10);
    server.send(response, remote.port, remote.address);
  });

  const scenario = benchmark.loadScenario(SCENARIO_ROOT);
  const run = benchmark.createRun(scenario, { evidenceDir: evidenceDir() });
  const port = server.address().port;
  const probes = [
    [
      "const dns = require('dns');",
      'const resolver = new dns.Resolver();',
      `resolver.setServers(['127.0.0.1:${port}']);`,
      "resolver.resolve4('example.test', error => process.exit(error && error.code !== 'ENODATA' ? 2 : 0));"
    ].join('\n'),
    [
      "const dns = require('dns');",
      'const resolver = new dns.promises.Resolver();',
      `resolver.setServers(['127.0.0.1:${port}']);`,
      "resolver.resolve4('example.test').then(() => process.exit(0)).catch(error => process.exit(error.code === 'ENODATA' ? 0 : 2));"
    ].join('\n')
  ];

  try {
    for (const probe of probes) {
      const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['--require', run.guardPath, '-e', probe], {
          cwd: run.projectRoot,
          env: { NODE_NO_WARNINGS: '1' },
          stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.once('error', reject);
        child.once('close', status => resolve({ status, stdout, stderr }));
      });
      assert(result.status !== 0, `custom resolver unexpectedly reached local DNS: ${result.stdout}`);
      assert(/network access is disabled/i.test(result.stderr), `unexpected resolver guard error: ${result.stderr}`);
    }
  } finally {
    server.close();
    benchmark.summarize(run);
  }
});

report();
