#!/usr/bin/env node
/**
 * Offline incremental-evolution benchmark.
 *
 * A scenario manifest reveals only ordered checkpoint identifiers. Each
 * checkpoint document is read immediately before it is applied to an isolated
 * temporary project. Final evidence is retained outside that project.
 */

// Implements: P-MUST-29

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { writeFileAtomic, writeJsonAtomic } = require('./atomic-write');
const maintainability = require('./maintainability-trajectory');
const sliceHandoff = require('./slice-handoff');

const SCENARIO_SCHEMA_VERSION = 1;
const CHECKPOINT_COUNT = 6;
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_MANIFEST_BYTES = 16 * 1024;
const MAX_CHECKPOINT_BYTES = 16 * 1024;
const MAX_SCALAR_BYTES = 4 * 1024;
const MAX_EVIDENCE_BYTES = 256 * 1024;
const MAX_SUMMARY_BYTES = 128 * 1024;
const MAX_BASELINE_BYTES = 64 * 1024 * 1024;
const MAX_BASELINE_ENTRIES = 5000;
const MAX_BASELINE_DEPTH = 48;
const HANDOFF_STATUSES = new Set(['completed', 'failed']);
const VERIFICATION_STATUSES = new Set(['pass', 'passed', 'fail', 'failed']);
const VCS_METADATA_NAMES = new Set(['.git', '.hg', '.svn', '.bzr', '_darcs']);

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`)
    && relative !== '..'
    && !path.isAbsolute(relative));
}

function assertContainedEntry(rootReal, candidate, label, type) {
  let stat;
  try {
    stat = fs.lstatSync(candidate);
  } catch (_) {
    throw new Error(`${label} does not exist`);
  }
  if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
  if (type === 'directory' && !stat.isDirectory()) throw new Error(`${label} must be a directory`);
  if (type === 'file' && !stat.isFile()) throw new Error(`${label} must be a regular file`);
  const real = fs.realpathSync(candidate);
  if (!isInside(rootReal, real)) throw new Error(`${label} resolves outside the scenario root`);
  return { stat, real };
}

function readJsonBounded(rootReal, file, label, maxBytes) {
  const entry = assertContainedEntry(rootReal, file, label, 'file');
  if (entry.stat.size > maxBytes) {
    throw new Error(`${label} exceeds the ${maxBytes}-byte limit`);
  }
  return JSON.parse(fs.readFileSync(entry.real, 'utf8'));
}

function assertScalar(value, label, options = {}) {
  if (typeof value !== 'string' || (options.nonempty !== false && value.trim() === '')) {
    throw new Error(`${label} is missing`);
  }
  if (Buffer.byteLength(value, 'utf8') > (options.maxBytes || MAX_SCALAR_BYTES)) {
    throw new Error(`${label} exceeds the ${options.maxBytes || MAX_SCALAR_BYTES}-byte limit`);
  }
}

function validateCheckpointIds(ids) {
  if (!Array.isArray(ids) || ids.length !== CHECKPOINT_COUNT) {
    throw new Error(`evolution scenario must declare exactly ${CHECKPOINT_COUNT} checkpoints`);
  }
  const unique = new Set();
  for (const id of ids) {
    if (typeof id !== 'string' || !SAFE_ID.test(id)) {
      throw new Error(`invalid checkpoint identifier: ${String(id)}`);
    }
    if (unique.has(id)) throw new Error(`duplicate checkpoint identifier: ${id}`);
    unique.add(id);
  }
}

function loadScenario(scenarioRoot) {
  const root = path.resolve(scenarioRoot);
  let rootStat;
  try {
    rootStat = fs.lstatSync(root);
  } catch (_) {
    throw new Error('scenario root does not exist');
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('scenario root must be a non-symlink directory');
  }
  const rootReal = fs.realpathSync(root);
  const manifest = readJsonBounded(
    rootReal,
    path.join(root, 'manifest.json'),
    'scenario manifest',
    MAX_MANIFEST_BYTES
  );
  if (manifest.schemaVersion !== SCENARIO_SCHEMA_VERSION) {
    throw new Error('evolution scenario schema version is incompatible');
  }
  if (typeof manifest.id !== 'string' || !SAFE_ID.test(manifest.id)) {
    throw new Error('evolution scenario id is invalid');
  }
  validateCheckpointIds(manifest.checkpointIds);
  const checkpoints = path.join(root, 'checkpoints');
  assertContainedEntry(rootReal, checkpoints, 'scenario checkpoints directory', 'directory');
  for (const id of manifest.checkpointIds) {
    assertContainedEntry(rootReal, path.join(checkpoints, `${id}.json`), `checkpoint ${id}`, 'file');
  }
  const baseline = path.join(root, 'baseline');
  assertContainedEntry(rootReal, baseline, 'scenario baseline', 'directory');
  return Object.freeze({
    id: manifest.id,
    root,
    rootReal,
    baseline,
    checkpointIds: Object.freeze(manifest.checkpointIds.slice())
  });
}

function copyDirectory(source, target, state = { entries: 0, bytes: 0 }, depth = 0) {
  if (depth > MAX_BASELINE_DEPTH) {
    throw new Error(`scenario baseline traversal depth exceeds ${MAX_BASELINE_DEPTH}`);
  }
  fs.mkdirSync(target, { recursive: true });
  const entries = [];
  const directory = fs.opendirSync(source);
  try {
    let entry;
    while ((entry = directory.readSync()) !== null) {
      state.entries += 1;
      if (state.entries > MAX_BASELINE_ENTRIES) {
        throw new Error(`scenario baseline exceeds ${MAX_BASELINE_ENTRIES} entries`);
      }
      entries.push(entry);
    }
  } finally {
    directory.closeSync();
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (VCS_METADATA_NAMES.has(entry.name.toLowerCase())) {
      throw new Error(`scenario baseline cannot contain version-control metadata: ${entry.name}`);
    }
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    const stat = fs.lstatSync(from);
    if (stat.isSymbolicLink()) throw new Error('scenario baseline cannot contain symlinks');
    if (stat.isDirectory()) copyDirectory(from, to, state, depth + 1);
    else if (stat.isFile()) {
      state.bytes += stat.size;
      if (state.bytes > MAX_BASELINE_BYTES) {
        throw new Error(`scenario baseline byte limit exceeds ${MAX_BASELINE_BYTES}`);
      }
      fs.copyFileSync(from, to);
    }
  }
}

function networkGuardText() {
  return [
    "'use strict';",
    "const deny = () => { throw new Error('network access is disabled by the evolution benchmark'); };",
    "const patch = (value, keys) => { for (const key of keys) if (value && typeof value[key] === 'function') value[key] = deny; };",
    "const net = require('net');",
    "patch(net, ['connect', 'createConnection']);",
    "patch(net.Socket && net.Socket.prototype, ['connect']);",
    "const tls = require('tls');",
    "patch(tls, ['connect']);",
    "patch(tls.TLSSocket && tls.TLSSocket.prototype, ['connect']);",
    "for (const name of ['http', 'https']) patch(require(name), ['request', 'get']);",
    "const http2 = require('http2');",
    "patch(http2, ['connect']);",
    "const dns = require('dns');",
    "patch(dns, ['lookup', 'lookupService', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse']);",
    "patch(dns.promises, ['lookup', 'lookupService', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse']);",
    "patch(dns.Resolver && dns.Resolver.prototype, ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse']);",
    "patch(dns.promises && dns.promises.Resolver && dns.promises.Resolver.prototype, ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse']);",
    "const dgram = require('dgram');",
    "patch(dgram, ['createSocket']);",
    "patch(dgram.Socket && dgram.Socket.prototype, ['bind', 'connect', 'send']);",
    "const childProcess = require('child_process');",
    "patch(childProcess, ['exec', 'execFile', 'fork', 'spawn', 'execSync', 'execFileSync', 'spawnSync']);",
    "const workerThreads = require('worker_threads');",
    "patch(workerThreads, ['Worker']);",
    "const cluster = require('cluster');",
    "patch(cluster, ['fork']);",
    "if (typeof globalThis.fetch === 'function') globalThis.fetch = deny;",
    "if (typeof globalThis.WebSocket === 'function') globalThis.WebSocket = deny;",
    ''
  ].join('\n');
}

function createGitSafetyRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-evolution-git-'));
  const hooksPath = path.join(root, 'hooks');
  const templatePath = path.join(root, 'template');
  fs.mkdirSync(hooksPath, { mode: 0o700 });
  fs.mkdirSync(templatePath, { mode: 0o700 });
  return { root, hooksPath, templatePath };
}

function runGit(projectRoot, args, gitSafety) {
  if (!gitSafety || !gitSafety.hooksPath || !gitSafety.templatePath) {
    throw new Error('temporary repository Git safety configuration is required');
  }
  const hardenedArgs = [
    '-c', `core.hooksPath=${gitSafety.hooksPath}`,
    '-c', 'commit.gpgSign=false',
    ...args
  ];
  const result = spawnSync('git', hardenedArgs, {
    cwd: projectRoot,
    env: {
      PATH: process.env.PATH || '',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: os.devNull,
      GIT_CONFIG_COUNT: '0',
      GIT_TEMPLATE_DIR: gitSafety.templatePath
    },
    encoding: 'utf8'
  });
  if (result.status !== 0 || result.error) {
    throw new Error(`temporary repository git command failed: ${args.join(' ')}: ${result.stderr || result.error.message}`);
  }
  return result.stdout;
}

function commitProject(projectRoot, message, gitSafety) {
  runGit(projectRoot, ['add', '-A'], gitSafety);
  runGit(projectRoot, [
    '-c', 'user.name=Godpowers Benchmark',
    '-c', 'user.email=benchmark@godpowers.local',
    'commit', '--quiet', '--allow-empty', '-m', message
  ], gitSafety);
}

function createRun(scenario, opts = {}) {
  if (!scenario || !Array.isArray(scenario.checkpointIds)) {
    throw new Error('validated evolution scenario is required');
  }
  const evidenceDir = path.resolve(opts.evidenceDir || fs.mkdtempSync(
    path.join(os.tmpdir(), 'godpowers-evolution-evidence-')
  ));
  fs.mkdirSync(evidenceDir, { recursive: true });
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-evolution-project-'));
  const gitSafety = createGitSafetyRoot();
  const guardPath = path.join(evidenceDir, `.network-guard-${process.pid}-${Date.now()}.cjs`);
  try {
    copyDirectory(scenario.baseline, projectRoot);
    runGit(projectRoot, ['init', '--quiet'], gitSafety);
    commitProject(projectRoot, 'benchmark baseline', gitSafety);
    fs.writeFileSync(guardPath, networkGuardText(), { mode: 0o600 });
    return {
      scenario,
      projectRoot,
      evidenceDir,
      evidencePath: path.join(evidenceDir, `${scenario.id}.json`),
      humanSummaryPath: path.join(evidenceDir, `${scenario.id}.md`),
      guardPath,
      gitSafety,
      nextIndex: 0,
      records: [],
      currentSnapshot: maintainability.captureSnapshot(projectRoot),
      failed: false,
      closed: false
    };
  } catch (error) {
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(guardPath, { force: true });
    fs.rmSync(gitSafety.root, { recursive: true, force: true });
    throw error;
  }
}

function validateCheckpoint(spec, expectedId) {
  if (!spec || spec.id !== expectedId) throw new Error(`checkpoint ${expectedId} id is invalid`);
  assertScalar(spec.requirement, `checkpoint ${expectedId} requirement`);
  if (!spec.feature || typeof spec.feature.name !== 'string'
    || !SAFE_ID.test(spec.feature.name)
    || typeof spec.feature.value !== 'string') {
    throw new Error(`checkpoint ${expectedId} feature is invalid`);
  }
  assertScalar(spec.feature.value, `checkpoint ${expectedId} feature value`, { nonempty: false });
  if (spec.assertValue !== undefined) {
    assertScalar(spec.assertValue, `checkpoint ${expectedId} assertion value`, { nonempty: false });
  }
}

function readFeatureState(projectRoot) {
  const file = path.join(projectRoot, '.benchmark-state.json');
  if (!fs.existsSync(file)) return [];
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CHECKPOINT_BYTES) {
    throw new Error('benchmark feature state is invalid or oversized');
  }
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(state.features) ? state.features : [];
}

function sourceText(features) {
  const rows = features.map(feature => `  ${JSON.stringify(feature.name)}: ${JSON.stringify(feature.value)}`);
  return [
    "'use strict';",
    '',
    'const features = Object.freeze({',
    rows.join(',\n'),
    '});',
    '',
    'function getFeature(name) {',
    "  if (!Object.prototype.hasOwnProperty.call(features, name)) throw new Error(`unknown feature: ${name}`);",
    '  return features[name];',
    '}',
    '',
    'function listFeatures() {',
    '  return Object.keys(features);',
    '}',
    '',
    'module.exports = { getFeature, listFeatures };',
    ''
  ].join('\n');
}

function behaviorText(features, assertionValues = features) {
  return [
    "'use strict';",
    "const assert = require('assert');",
    "const config = require('../src/config');",
    `const expected = ${JSON.stringify(assertionValues)};`,
    'assert.deepStrictEqual(config.listFeatures(), expected.map(item => item.name));',
    'for (const item of expected) assert.strictEqual(config.getFeature(item.name), item.value);',
    "assert.throws(() => config.getFeature('missing'), /unknown feature/);",
    ''
  ].join('\n');
}

function lines(text) {
  return text === '' ? [] : text.replace(/\r\n/g, '\n').split('\n');
}

function lineChangeCount(beforeText, afterText) {
  const before = lines(beforeText);
  const after = lines(afterText);
  const previous = new Array(after.length + 1).fill(0);
  for (let left = 1; left <= before.length; left += 1) {
    const current = new Array(after.length + 1).fill(0);
    for (let right = 1; right <= after.length; right += 1) {
      current[right] = before[left - 1] === after[right - 1]
        ? previous[right - 1] + 1
        : Math.max(previous[right], current[right - 1]);
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
  }
  const common = previous[after.length];
  return before.length + after.length - (2 * common);
}

function currentText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function applyFeature(projectRoot, feature, assertionValue) {
  const prior = readFeatureState(projectRoot);
  if (prior.some(item => item.name === feature.name)) {
    throw new Error(`duplicate benchmark feature: ${feature.name}`);
  }
  const features = prior.concat([{ name: feature.name, value: feature.value }]);
  const sourceFile = path.join(projectRoot, 'src', 'config.js');
  const testFile = path.join(projectRoot, 'test', 'behavior.js');
  const beforeSource = currentText(sourceFile);
  const beforeTest = currentText(testFile);
  const nextSource = sourceText(features);
  const asserted = features.map(item => item.name === feature.name && assertionValue !== undefined
    ? { ...item, value: assertionValue }
    : item);
  const nextTest = behaviorText(features, asserted);
  fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
  fs.mkdirSync(path.dirname(testFile), { recursive: true });
  fs.writeFileSync(sourceFile, nextSource);
  fs.writeFileSync(testFile, nextTest);
  writeJsonAtomic(path.join(projectRoot, '.benchmark-state.json'), { features });
  return {
    changedFiles: ['src/config.js', 'test/behavior.js'],
    changedLines: lineChangeCount(beforeSource, nextSource) + lineChangeCount(beforeTest, nextTest)
  };
}

function positiveInteger(value, fallback, label) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
  return value;
}

function nonnegativeInteger(value, fallback, label) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative safe integer`);
  }
  return value;
}

function defaultHandoff(spec, result, index, total) {
  const behaviorPassed = result.behaviorPassed;
  return {
    goal: spec.requirement,
    constraints: ['offline', 'one-checkpoint-at-a-time'],
    requirementIds: [`P-MUST-29-CHECKPOINT-${index + 1}`],
    status: behaviorPassed ? 'completed' : 'failed',
    completedWork: behaviorPassed ? result.changedFiles.slice() : [],
    inProgressWork: [],
    blockers: behaviorPassed ? [] : ['behavior verification failed'],
    changedFiles: result.changedFiles.slice(),
    verificationResults: [{
      command: 'node test/behavior.js',
      status: behaviorPassed ? 'pass' : 'fail',
      evidenceRef: 'test/behavior.js'
    }],
    decisions: [`Applied ${spec.feature.name} at checkpoint ${index + 1}.`],
    nextAction: index + 1 < total ? `Reveal checkpoint ${index + 2}.` : 'Compare final evidence.',
    criticalRefs: [`checkpoints/${spec.id}.json`],
    evidenceRefs: {
      checkpoint: `checkpoints/${spec.id}.json`,
      verification: 'test/behavior.js'
    }
  };
}

function handoffComplete(handoff) {
  if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) return false;
  try {
    sliceHandoff.serialize(handoff);
  } catch (_) {
    return false;
  }
  if (!HANDOFF_STATUSES.has(handoff.status)) return false;
  if (!Array.isArray(handoff.requirementIds) || handoff.requirementIds.length === 0
    || handoff.requirementIds.some(value => typeof value !== 'string' || !value.trim())) return false;
  if (!Array.isArray(handoff.verificationResults) || handoff.verificationResults.length === 0) return false;
  if (handoff.verificationResults.some(result => !result || typeof result !== 'object'
    || typeof result.command !== 'string' || !result.command.trim()
    || !VERIFICATION_STATUSES.has(String(result.status || '').toLowerCase()))) return false;
  if (!handoff.evidenceRefs || typeof handoff.evidenceRefs !== 'object'
    || Array.isArray(handoff.evidenceRefs)
    || Object.keys(handoff.evidenceRefs).length === 0
    || Object.values(handoff.evidenceRefs).some(value => typeof value !== 'string' || !value.trim())) return false;
  return true;
}

function runBehavior(run, forcedFailure) {
  if (forcedFailure) return { passed: false, status: 1 };
  const result = spawnSync(process.execPath, [
    '--require', run.guardPath,
    path.join(run.projectRoot, 'test', 'behavior.js')
  ], {
    cwd: run.projectRoot,
    env: { NODE_NO_WARNINGS: '1' },
    encoding: 'utf8',
    timeout: 10_000
  });
  return { passed: result.status === 0 && !result.error, status: result.status === null ? 1 : result.status };
}

function recordCheckpoint(run, input = {}) {
  if (!run || run.closed) throw new Error('evolution run is closed');
  if (run.failed) throw new Error('evolution run stopped at the first failed checkpoint');
  const expectedId = run.scenario.checkpointIds[run.nextIndex];
  if (!expectedId) throw new Error('all evolution checkpoints are already recorded');
  if (input.checkpointId && input.checkpointId !== expectedId) {
    throw new Error(`next checkpoint is ${expectedId}`);
  }
  const attempts = positiveInteger(input.attempts, 1, 'checkpoint attempts');
  const reworkLines = nonnegativeInteger(input.reworkLines, 0, 'checkpoint rework lines');
  const checkpointFile = path.join(run.scenario.root, 'checkpoints', `${expectedId}.json`);
  const spec = readJsonBounded(
    run.scenario.rootReal,
    checkpointFile,
    `checkpoint ${expectedId}`,
    MAX_CHECKPOINT_BYTES
  );
  validateCheckpoint(spec, expectedId);

  const applied = applyFeature(run.projectRoot, spec.feature, spec.assertValue);
  const behavior = runBehavior(run, input.forceBehaviorFailure === true);
  const after = maintainability.captureSnapshot(run.projectRoot);
  const trajectory = maintainability.compareSnapshots(run.currentSnapshot, after);
  const handoff = input.handoff === undefined
    ? defaultHandoff(spec, {
      behaviorPassed: behavior.passed,
      changedFiles: applied.changedFiles
    }, run.nextIndex, run.scenario.checkpointIds.length)
    : input.handoff;
  const complete = handoffComplete(handoff);
  const record = {
    id: expectedId,
    ordinal: run.nextIndex + 1,
    requirement: spec.requirement,
    attempts,
    behaviorPassed: behavior.passed,
    behaviorStatus: behavior.status,
    reworkLines,
    changedLines: applied.changedLines,
    maintainabilityDelta: trajectory,
    accepted: behavior.passed && complete,
    handoffComplete: complete,
    changedFiles: applied.changedFiles
  };
  run.records.push(record);
  run.currentSnapshot = after;
  run.nextIndex += 1;
  run.failed = !record.accepted;
  commitProject(run.projectRoot, `checkpoint ${record.ordinal}: ${record.id}`, run.gitSafety);
  return record;
}

function evidenceFor(run) {
  const accepted = run.records.filter(record => record.accepted).length;
  const complete = run.records.length === run.scenario.checkpointIds.length;
  return {
    schemaVersion: 1,
    scenarioId: run.scenario.id,
    checkpointCount: run.scenario.checkpointIds.length,
    completedCheckpointCount: run.records.length,
    acceptedCheckpointCount: accepted,
    verdict: complete && accepted === run.scenario.checkpointIds.length ? 'pass' : 'fail',
    checkpoints: run.records
  };
}

function cleanupRun(run) {
  if (!run || run.closed) return;
  fs.rmSync(run.projectRoot, { recursive: true, force: true });
  fs.rmSync(run.guardPath, { force: true });
  if (run.gitSafety && run.gitSafety.root) {
    fs.rmSync(run.gitSafety.root, { recursive: true, force: true });
  }
  run.closed = true;
}

function summarize(run) {
  if (!run) throw new Error('evolution run is required');
  if (run.closed) return run.summary;
  const evidence = evidenceFor(run);
  const summary = {
    ...evidence,
    evidencePath: run.evidencePath,
    humanSummaryPath: run.humanSummaryPath
  };
  try {
    writeJsonAtomic(run.evidencePath, evidence, {
      validateContent(content) {
        if (Buffer.byteLength(content, 'utf8') > MAX_EVIDENCE_BYTES) {
          throw new Error(`evolution evidence exceeds the ${MAX_EVIDENCE_BYTES}-byte limit`);
        }
      }
    });
    writeFileAtomic(run.humanSummaryPath, `${render(summary)}\n`, {
      validateContent(content) {
        if (Buffer.byteLength(content, 'utf8') > MAX_SUMMARY_BYTES) {
          throw new Error(`evolution summary exceeds the ${MAX_SUMMARY_BYTES}-byte limit`);
        }
      }
    });
  } finally {
    cleanupRun(run);
  }
  run.summary = Object.freeze(summary);
  return run.summary;
}

function installSignalCleanup(getRun) {
  if (typeof getRun !== 'function') throw new Error('signal cleanup requires a run accessor');
  const handlers = new Map();
  for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    const handler = () => {
      const activeRun = getRun();
      try {
        if (activeRun && !activeRun.closed) summarize(activeRun);
      } catch (error) {
        if (activeRun && !activeRun.closed) cleanupRun(activeRun);
        process.stderr.write(`Evolution benchmark interruption cleanup failed: ${error.message}\n`);
      }
      process.exit(code);
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }
  return () => {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  };
}

function render(summary) {
  const total = summary.checkpointCount;
  const accepted = summary.acceptedCheckpointCount;
  const lines = [
    `Evolution benchmark ${summary.verdict.toUpperCase()}: ${accepted}/${total} checkpoints accepted.`
  ];
  for (const record of summary.checkpoints) {
    lines.push(`${record.accepted ? 'PASS' : 'FAIL'} ${record.ordinal}/${total} ${record.id}: `
      + `behavior=${record.behaviorPassed ? 'pass' : 'fail'}(${record.behaviorStatus}), `
      + `accepted=${record.accepted}, handoff=${record.handoffComplete ? 'complete' : 'incomplete'}, `
      + `${record.changedLines} changed lines, ${record.attempts} attempt(s), ${record.reworkLines} rework lines, `
      + `maintainability=${JSON.stringify(record.maintainabilityDelta.deltas)}.`);
  }
  lines.push(`Evidence: ${path.basename(summary.evidencePath)}`);
  lines.push(`Human summary: ${path.basename(summary.humanSummaryPath)}`);
  return lines.join('\n');
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--scenario') options.scenarioRoot = argv[++index];
    else if (arg === '--evidence-dir') options.evidenceDir = argv[++index];
    else throw new Error(`unknown evolution benchmark option: ${arg}`);
  }
  return options;
}

function main() {
  let run;
  const removeSignalCleanup = installSignalCleanup(() => run);
  try {
    const options = parseArgs(process.argv.slice(2));
    const scenarioRoot = options.scenarioRoot || path.join(
      __dirname,
      '..',
      'fixtures',
      'evolution',
      'maintainability-sequence'
    );
    const scenario = loadScenario(scenarioRoot);
    run = createRun(scenario, { evidenceDir: options.evidenceDir });
    while (!run.failed && run.nextIndex < scenario.checkpointIds.length) recordCheckpoint(run);
    const summary = summarize(run);
    process.stdout.write(`${render(summary)}\n`);
    process.stdout.write(`Output directory: ${path.dirname(summary.evidencePath)}\n`);
    if (summary.verdict !== 'pass') process.exitCode = 1;
  } catch (error) {
    if (run && !run.closed) summarize(run);
    process.stderr.write(`Evolution benchmark failed: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    removeSignalCleanup();
  }
}

if (require.main === module) main();

module.exports = {
  SCENARIO_SCHEMA_VERSION,
  CHECKPOINT_COUNT,
  MAX_MANIFEST_BYTES,
  MAX_CHECKPOINT_BYTES,
  MAX_SCALAR_BYTES,
  MAX_EVIDENCE_BYTES,
  MAX_SUMMARY_BYTES,
  MAX_BASELINE_BYTES,
  MAX_BASELINE_ENTRIES,
  MAX_BASELINE_DEPTH,
  loadScenario,
  createRun,
  recordCheckpoint,
  summarize,
  render,
  lineChangeCount,
  cleanupRun,
  installSignalCleanup
};
