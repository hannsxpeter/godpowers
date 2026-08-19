#!/usr/bin/env node
// Implements: P-MUST-33
/**
 * Dependency-free static checks for release-sensitive JavaScript surfaces.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const proseLint = require('../lib/prose-lint');

const ROOT = path.resolve(__dirname, '..');
const CHECK_DIRS = ['bin', 'lib', 'scripts', 'tests', 'packages'];

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  + ${name}`);
  passed++;
}

function fail(name, message) {
  console.error(`  x ${name}: ${message}`);
  failed++;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function walkMatching(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMatching(full, predicate, out);
    } else if (entry.isFile() && predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function test(name, fn) {
  try {
    fn();
    pass(name);
  } catch (e) {
    fail(name, e.message);
  }
}

console.log('\n  Static checks\n');

const jsFiles = CHECK_DIRS.flatMap(dir => walk(path.join(ROOT, dir))).sort();

test('JavaScript files parse with node --check', () => {
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    if (result.status !== 0) {
      throw new Error(`${path.relative(ROOT, file)} failed syntax check\n${result.stderr || result.stdout}`);
    }
  }
});

test('package test script delegates to scripts/run-tests.js', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.scripts.test !== 'node scripts/run-tests.js') {
    throw new Error(`unexpected test script: ${pkg.scripts.test}`);
  }
});

test('P-MUST-25: every workflow specialist resolves to a valid context contract', () => {
  const contextBudget = require('../lib/context-budget');
  const specialistDir = path.join(ROOT, 'specialists');
  const workflowDir = path.join(ROOT, 'workflows');
  const failures = [];
  const specialistFiles = fs.readdirSync(specialistDir)
    .filter(name => name.endsWith('.md'))
    .sort();
  for (const specialistName of specialistFiles) {
    const validation = contextBudget.validateAgentContract(path.join(specialistDir, specialistName));
    if (!validation.valid) {
      failures.push(`${specialistName}: ${validation.errors.join(', ')}`);
    }
  }
  const workflowFiles = fs.readdirSync(workflowDir)
    .filter(name => name.endsWith('.yaml'))
    .sort();
  const references = [];
  for (const workflowName of workflowFiles) {
    const text = fs.readFileSync(path.join(workflowDir, workflowName), 'utf8');
    const pattern = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      references.push({ workflowName, ref: match[1], agent: match[1].split('@')[0] });
    }
  }
  for (const reference of references) {
    const file = path.join(specialistDir, `${reference.agent}.md`);
    if (!fs.existsSync(file)) {
      failures.push(`${reference.workflowName}: ${reference.ref} has no specialist contract`);
      continue;
    }
    const validation = contextBudget.validateAgentContract(file);
    if (!validation.valid) {
      failures.push(`${reference.workflowName}: ${reference.agent}: ${validation.errors.join(', ')}`);
    } else if (validation.contract.name !== reference.agent) {
      failures.push(
        `${reference.workflowName}: ${reference.agent} resolves to contract ${validation.contract.name}`
      );
    }
  }
  if (references.length === 0) failures.push('workflow YAML contains no uses references');
  if (failures.length > 0) throw new Error(failures.join('; '));
});

// Every scripts/test-*.js on disk must run in the full suite. A hand-curated
// allowlist here once guarded only 9 of ~90 suites, so the most load-bearing
// suites (install smoke, dogfood, doc surface counts) could have been dropped
// from the runner silently. Deriving the invariant from disk means new suites
// are covered automatically and a removal requires a named tombstone entry.
const TEST_SUITE_TOMBSTONES = new Set([
  'test-harness.js' // shared assertion harness, not a runnable suite
]);

test('full test runner includes every on-disk test suite', () => {
  const runner = require('./run-tests');
  const commands = runner.TEST_COMMANDS.map(([command, args]) => [command, ...args].join(' '));
  const onDisk = fs.readdirSync(path.join(ROOT, 'scripts'))
    .filter(name => /^test-.*\.js$/.test(name))
    .filter(name => !TEST_SUITE_TOMBSTONES.has(name))
    .sort();
  const missing = onDisk.filter(name => !commands.some(command => command.includes(`scripts/${name}`)));
  if (missing.length > 0) {
    throw new Error(
      `test suites on disk but missing from TEST_COMMANDS: ${missing.join(', ')}. `
      + 'Add them to scripts/run-tests.js, or add a tombstone entry here with a reason.'
    );
  }
  const ghosts = commands
    .map(command => (command.match(/scripts\/(test-[^ ]+\.js)/) || [])[1])
    .filter(Boolean)
    .filter(name => !fs.existsSync(path.join(ROOT, 'scripts', name)));
  if (ghosts.length > 0) {
    throw new Error(`TEST_COMMANDS references missing suites: ${ghosts.join(', ')}`);
  }
  if (!commands.some(command => command.includes('--workspace @godpowers/mcp test'))) {
    throw new Error('@godpowers/mcp protocol test is missing from TEST_COMMANDS');
  }
});

test('install file helpers stay outside bin/install.js', () => {
  const installer = fs.readFileSync(path.join(ROOT, 'bin', 'install.js'), 'utf8');
  if (!installer.includes("require('../lib/installer-core')")) {
    throw new Error('bin/install.js does not delegate installer core behavior');
  }
  if (/function\s+copyRecursive\s*\(/.test(installer)) {
    throw new Error('copyRecursive should live in lib/installer-files.js');
  }
  if (installer.split('\n').length > 350) {
    throw new Error('bin/install.js should remain a thin CLI entry point');
  }
});

test('CLI dispatch coverage boundary stays in lib', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const coverageLib = pkg.scripts['coverage:lib'] || '';
  const installer = fs.readFileSync(path.join(ROOT, 'bin', 'install.js'), 'utf8');
  const dispatch = fs.readFileSync(path.join(ROOT, 'lib', 'cli-dispatch.js'), 'utf8');
  const dispatchTest = fs.readFileSync(path.join(ROOT, 'scripts', 'test-cli-dispatch.js'), 'utf8');

  if (!coverageLib.includes('--include=lib/**/*.js')) {
    throw new Error('coverage:lib must include the extracted lib CLI dispatch surface');
  }
  if (/--include(?:=|\s+)bin\//.test(coverageLib) || coverageLib.includes('bin/**/*.js')) {
    throw new Error('coverage:lib must not force bin/install.js into the lib-only ratchet');
  }
  if (!installer.includes("require('../lib/cli-dispatch')")) {
    throw new Error('bin/install.js must delegate command dispatch to lib/cli-dispatch.js');
  }
  if (/const\s+COMMAND_RUNNERS\s*=|function\s+runDashboardCommand\s*\(|function\s+runGateCommand\s*\(/.test(installer)) {
    throw new Error('bin/install.js must not recreate CLI command dispatch behavior');
  }
  if (!/const\s+COMMAND_RUNNERS\s*=\s*\{/.test(dispatch) || !dispatch.includes('function runCommand(')) {
    throw new Error('lib/cli-dispatch.js must own the command runner table and runCommand');
  }
  if (!dispatchTest.includes("require('../bin/install')") || !dispatchTest.includes("require('../lib/cli-dispatch')")) {
    throw new Error('scripts/test-cli-dispatch.js must exercise both installer and lib dispatch surfaces');
  }
  if (!dispatchTest.includes('installer.COMMAND_RUNNERS === cliDispatch.COMMAND_RUNNERS') ||
    !dispatchTest.includes('installer.runCommand === cliDispatch.runCommand')) {
    throw new Error('scripts/test-cli-dispatch.js must prove the installer re-exports lib dispatch');
  }
});

test('frontmatter parsing stays in shared helper', () => {
  const offenders = jsFiles
    .filter(file => path.relative(ROOT, file) !== 'lib/frontmatter.js')
    .filter(file => {
      const text = fs.readFileSync(file, 'utf8');
      return /function\s+parse(?:Agent)?Frontmatter\s*\(/.test(text) ||
        /const\s+parse(?:Agent)?Frontmatter\s*=\s*\([^)]*\)\s*=>\s*\{/.test(text) ||
        /match\(\s*\/\^---\\n\(\[\\s\\S\]\*\?\)\\n---\//.test(text);
    });
  if (offenders.length > 0) {
    throw new Error(`inline frontmatter parsers in ${offenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('test files use the shared harness', () => {
  const offenders = walk(path.join(ROOT, 'scripts'))
    .filter(file => /scripts\/test-.*\.js$/.test(file) && !file.endsWith('test-harness.js'))
    .filter(file => /let passed = 0|function\s+test\s*\(/.test(fs.readFileSync(file, 'utf8')));
  if (offenders.length > 0) {
    throw new Error(`duplicated harness in ${offenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('async file APIs exist on load-bearing modules', () => {
  const state = require('../lib/state');
  const intent = require('../lib/intent');
  const workflows = require('../lib/workflow-runner');
  const gate = require('../lib/gate');
  for (const [name, fn] of [
    ['state.readAsync', state.readAsync],
    ['state.writeAsync', state.writeAsync],
    ['intent.readAsync', intent.readAsync],
    ['workflow.writePlanAsync', workflows.writePlanAsync],
    ['workflow.readPlanAsync', workflows.readPlanAsync],
    ['gate.checkAsync', gate.checkAsync]
  ]) {
    if (typeof fn !== 'function') throw new Error(`${name} missing`);
  }
});

test('tier skills delegate verification to executable gate', () => {
  const tiers = ['prd', 'design', 'arch', 'roadmap', 'stack', 'repo', 'build', 'harden'];
  const missing = [];
  for (const tier of tiers) {
    const rel = `skills/god-${tier}.md`;
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const verification = text.match(/## Verification\n([\s\S]*?)(?=\n## |\n# |\s*$)/);
    if (!verification || !verification[1].includes(`npx godpowers gate --tier=${tier} --project=.`)) {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing gate verification in ${missing.join(', ')}`);
  }
});

test('tier routes declare executable gate commands', () => {
  const tiers = ['prd', 'design', 'arch', 'roadmap', 'stack', 'repo', 'build', 'harden'];
  const missing = [];
  for (const tier of tiers) {
    const rel = `routing/god-${tier}.yaml`;
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (!text.includes(`gate-command: npx godpowers gate --tier=${tier} --project=.`)) {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing gate-command route metadata in ${missing.join(', ')}`);
  }
});

test('routing prerequisites use state initialized predicate instead of PROGRESS view file checks', () => {
  const routingDir = path.join(ROOT, 'routing');
  const recipeDir = path.join(routingDir, 'recipes');
  const targets = [
    ...fs.readdirSync(routingDir)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map(file => path.join(routingDir, file)),
    ...fs.readdirSync(recipeDir)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map(file => path.join(recipeDir, file)),
    path.join(ROOT, 'scripts', 'gen-routing.js'),
    path.join(ROOT, 'scripts', 'gen-recipes.js')
  ];
  const progressPredicate = /file:\.godpowers\/PROGRESS\.(?:md|mdx)\b/;
  const offenders = targets.filter(file => (
    progressPredicate.test(fs.readFileSync(file, 'utf8'))
  ));
  if (offenders.length > 0) {
    throw new Error(`PROGRESS view file route predicates in ${offenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('command skills do not mutate PROGRESS views directly', () => {
  const skillsDir = path.join(ROOT, 'skills');
  const writerPatterns = [
    /\b(?:Update|update|Record|record|Mark|mark|Write|write|Append|append|Truncate|truncate)\s+`?(?:\.godpowers\/)?PROGRESS\.(?:md|mdx)`?/,
    /`?(?:\.godpowers\/)?PROGRESS\.(?:md|mdx)`?\s+(?:updates?|writes?|mutations?|status\s*=|status\b)/i,
    /\bwrites?\s+[^.\n]*\bPROGRESS\.(?:md|mdx)\b/i
  ];
  const offenders = [];
  for (const file of fs.readdirSync(skillsDir).filter(name => name.endsWith('.md')).sort()) {
    const full = path.join(skillsDir, file);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (writerPatterns.some(pattern => pattern.test(line))) {
        offenders.push(`skills/${file}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`direct PROGRESS view writer instructions in ${offenders.join(', ')}`);
  }
});

test('command skills treat PROGRESS views as generated or legacy fallback only', () => {
  const skillsDir = path.join(ROOT, 'skills');
  const readPattern = /\b(?:Read|read|Check|check|Verify|verify|Detect|detect|derive|derives|re-derive|re-derives|re-derived|auto-detect|auto-detects)\b.*`?(?:\.godpowers\/)?PROGRESS\.(?:md|mdx)`?/;
  const allowedContext = /\b(?:fallback|legacy|generated|human-readable view|human view|migration|migrate|import|view)\b/i;
  const offenders = [];
  for (const file of fs.readdirSync(skillsDir).filter(name => name.endsWith('.md')).sort()) {
    const full = path.join(skillsDir, file);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (readPattern.test(line) && !allowedContext.test(line)) {
        offenders.push(`skills/${file}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`PROGRESS view authority reads in ${offenders.join(', ')}`);
  }
});

test('shipped skill, specialist, and Pillars prose has no sycophancy filler (U-14 self-dogfood)', () => {
  const voiceLint = require('../lib/voice-lint');
  const offenders = [];
  for (const dir of ['skills', 'specialists', 'agents']) {
    const base = path.join(ROOT, dir);
    for (const file of fs.readdirSync(base).filter(name => name.endsWith('.md')).sort()) {
      for (const hit of voiceLint.scan(fs.readFileSync(path.join(base, file), 'utf8'))) {
        offenders.push(`${dir}/${file}:${hit.line} ("${hit.phrase}")`);
      }
    }
  }
  if (offenders.length > 0) {
    throw new Error(`U-14 sycophancy or gratitude loop in shipped prose: ${offenders.join(', ')}`);
  }
});

const PROSE_SCOPE = ['skills', 'specialists', 'agents', 'references'];
const PROSE_WARNING_BASELINE = 0;

test('P-MUST-33: prose self-dogfood scans skills, specialists, agents, and references', () => {
  const files = [];
  for (const directory of PROSE_SCOPE) {
    const base = path.join(ROOT, directory);
    if (!fs.existsSync(base)) throw new Error(`prose scope missing: ${directory}`);
    const scoped = walkMatching(base, file => /\.mdx?$/.test(file)).sort();
    if (scoped.length === 0) throw new Error(`prose scope has no eligible files: ${directory}`);
    files.push(...scoped);
  }

  const warnings = [];
  for (const file of files.sort()) {
    const content = fs.readFileSync(file, 'utf8');
    const first = proseLint.scan(content);
    const second = proseLint.scan(content);
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      throw new Error(`nondeterministic prose findings: ${path.relative(ROOT, file)}`);
    }
    for (const finding of first) {
      const valid = finding && typeof finding.ruleId === 'string' &&
        Number.isInteger(finding.line) && finding.line > 0 &&
        Number.isInteger(finding.column) && finding.column > 0 &&
        typeof finding.excerpt === 'string' && finding.excerpt.length <= 160 &&
        typeof finding.message === 'string' && typeof finding.suggestion === 'string';
      if (!valid) {
        throw new Error(`malformed prose finding: ${path.relative(ROOT, file)} ${JSON.stringify(finding)}`);
      }
      warnings.push({ file: path.relative(ROOT, file), ...finding });
    }
  }

  console.log(`    Prose self-dogfood baseline: ${PROSE_WARNING_BASELINE} warnings across ${files.length} files.`);
  for (const warning of warnings) {
    console.log(`    Prose warning ${warning.file}:${warning.line} ${warning.ruleId}: ${warning.excerpt}`);
  }
  if (warnings.length > PROSE_WARNING_BASELINE) {
    throw new Error(
      `unreviewed prose warning growth: baseline ${PROSE_WARNING_BASELINE}, actual ${warnings.length}`
    );
  }
});

test('state-backed gates do not require markdown STATE view artifacts', () => {
  const artifactMap = require('../lib/artifact-map');
  const expected = {
    design: { tierKey: 'tier-1', subStepKey: 'design' },
    build: { tierKey: 'tier-2', subStepKey: 'build' }
  };
  const offenders = [];
  for (const [tier, step] of Object.entries(expected)) {
    const artifacts = artifactMap.requiredArtifactsForTier(tier) || [];
    for (const artifact of artifacts) {
      if (/\.godpowers\/[^/]+\/STATE\.(?:md|mdx)$/.test(artifact.path)) {
        offenders.push(`${tier}:${artifact.path}`);
      }
    }
    const actual = artifactMap.stateStepForTier(tier);
    if (!actual || actual.tierKey !== step.tierKey || actual.subStepKey !== step.subStepKey) {
      offenders.push(`${tier}:missing-state-step`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(`markdown state gate authority in ${offenders.join(', ')}`);
  }
});

test('state view owner covers Godpowers-owned STATE.mdx views', () => {
  const stateViews = require('../lib/state-views');
  const expected = {
    design: '.godpowers/design/STATE.mdx',
    build: '.godpowers/build/STATE.mdx',
    deploy: '.godpowers/deploy/STATE.mdx',
    observe: '.godpowers/observe/STATE.mdx',
    launch: '.godpowers/launch/STATE.mdx'
  };
  const missing = [];
  for (const [step, relPath] of Object.entries(expected)) {
    if (!stateViews.STATE_VIEW_PATHS || stateViews.STATE_VIEW_PATHS[step] !== relPath) {
      missing.push(`${step}:${relPath}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing generated state view ownership for ${missing.join(', ')}`);
  }
});

test('route and workflow handoffs use state.json instead of generated state views', () => {
  const generatedStateView = /\.godpowers\/(?:design|build|deploy|observe|launch)\/STATE\.(?:md|mdx)/;
  const files = [
    ...walkMatching(path.join(ROOT, 'routing'), file => /\.ya?ml$/.test(file)),
    ...walkMatching(path.join(ROOT, 'workflows'), file => /\.ya?ml$/.test(file)),
    path.join(ROOT, 'scripts', 'gen-routing.js')
  ];
  const offenders = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (generatedStateView.test(line)) {
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`generated state view route handoffs in ${offenders.join(', ')}`);
  }
});

test('runtime modules read generated STATE views only through the view owner', () => {
  const generatedStateView = /\.godpowers\/(?:design|build|deploy|observe|launch)\/STATE\.(?:md|mdx)/;
  const allowed = new Set([
    'lib/state-views.js',
    'scripts/static-check.js',
    'scripts/test-gate.js',
    'scripts/test-state-advance.js',
    'scripts/test-state-views.js'
  ]);
  const files = [
    ...walkMatching(path.join(ROOT, 'lib'), file => file.endsWith('.js')),
    ...walkMatching(path.join(ROOT, 'scripts'), file => file.endsWith('.js'))
  ];
  const offenders = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (allowed.has(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (generatedStateView.test(line)) {
        offenders.push(`${rel}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`direct runtime generated STATE view reads in ${offenders.join(', ')}`);
  }
});

test('prompts do not direct-edit generated STATE views', () => {
  const generatedStateView = /`?(?:\.godpowers\/)?(?:design|build|deploy|observe|launch)\/STATE\.(?:md|mdx)`?/;
  const directAction = /\b(?:Write|write|Update|update|Append|append|Record|record|Mark|mark|Modify|modify)\b/;
  const allowedGeneratedContext = /\b(?:generated|regenerate|regenerates|refreshes|state-views\.js|view|views|checksum warning|managed)\b/i;
  const files = [
    path.join(ROOT, 'SKILL.md'),
    ...walkMatching(path.join(ROOT, 'skills'), file => file.endsWith('.md')),
    ...walkMatching(path.join(ROOT, 'specialists'), file => file.endsWith('.md'))
  ];
  const offenders = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (generatedStateView.test(line) && directAction.test(line) && !allowedGeneratedContext.test(line)) {
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`direct generated STATE view edit prompts in ${offenders.join(', ')}`);
  }
});

test('loop parameters have one home and the runbook quotes it', () => {
  // The repair budget once existed twice with two values (runbook: 3,
  // executor-repair inline default: 2), so whether a failure got a third try
  // depended on which layer classified it. lib/loop-config.js is now the only
  // home; code resolves through it and the runbook prose is asserted against
  // the exported default (the derive-from-code pattern from
  // test-doc-surface-counts.js).
  const loopConfig = require('../lib/loop-config');
  const repairAttempts = loopConfig.DEFAULTS['repair-attempts'];

  const executorRepair = fs.readFileSync(path.join(ROOT, 'lib', 'executor-repair.js'), 'utf8');
  if (!executorRepair.includes("require('./loop-config')")) {
    throw new Error('lib/executor-repair.js must resolve its budget default through lib/loop-config.js');
  }
  if (/input\.budget\s*:\s*\d/.test(executorRepair)) {
    throw new Error('lib/executor-repair.js must not carry an inline numeric budget default');
  }

  const runbook = fs.readFileSync(
    path.join(ROOT, 'references', 'orchestration', 'GOD-ORCHESTRATOR-RUNBOOK.md'), 'utf8');
  const quoted = [...runbook.matchAll(/(\d+)\s+(?:repair\s+)?attempts/g)].map((m) => Number(m[1]));
  if (quoted.length === 0) {
    throw new Error('runbook no longer quotes the repair-attempt budget; keep prose and loop-config in sync');
  }
  const forked = quoted.filter((n) => n !== repairAttempts);
  if (forked.length > 0) {
    throw new Error(
      `runbook quotes repair-attempt value(s) ${[...new Set(forked)].join(', ')} but `
      + `lib/loop-config.js repair-attempts is ${repairAttempts}. One number, one home.`
    );
  }

  for (const [rel, forbidden] of [
    ['lib/change-metrics.js', /DEFAULT_TARGET\s*=\s*[\d.]/],
    ['lib/reaudit.js', /DEFAULT_CADENCE_DAYS\s*=\s*\d/]
  ]) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (!text.includes("require('./loop-config')")) {
      throw new Error(`${rel} must resolve its default through lib/loop-config.js`);
    }
    if (forbidden.test(text)) {
      throw new Error(`${rel} must not carry an inline numeric default; lib/loop-config.js owns it`);
    }
  }
});

test('harden findings parsing stays in the shared verdict module', () => {
  // lib/findings-verdict.js is the only verdict authority for
  // .godpowers/harden/FINDINGS.mdx. Two independent parsers of that artifact
  // once disagreed on accepted risk and one trusted the auditor's own
  // "Launch gate: PASSED" summary line; this guard keeps the parser singular.
  const allowed = new Set(['lib/findings-verdict.js']);
  const parseMarkers = [/Launch gate/, /CRITICAL-/];
  const offenders = [];
  for (const file of walkMatching(path.join(ROOT, 'lib'), f => f.endsWith('.js'))) {
    const rel = path.relative(ROOT, file);
    if (allowed.has(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (parseMarkers.some(pattern => pattern.test(text))) {
      offenders.push(rel);
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `harden findings parse markers outside lib/findings-verdict.js: ${offenders.join(', ')}. `
      + 'Resolve findings verdicts through findings-verdict.verdict(projectRoot, policy).'
    );
  }
});

test('public runtime modules expose JSDoc type contracts', () => {
  const modules = [
    'lib/state.js',
    'lib/intent.js',
    'lib/workflow-runner.js',
    'lib/agent-refs.js',
    'lib/installer-core.js'
  ];
  const missing = modules.filter((rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return !/@typedef/.test(text);
  });
  if (missing.length > 0) {
    throw new Error(`missing @typedef in ${missing.join(', ')}`);
  }
});

test('god-mode delegates long-form runbook content', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'god-mode.md'), 'utf8');
  const runbook = path.join(ROOT, 'references', 'orchestration', 'GOD-MODE-RUNBOOK.md');
  if (skill.split('\n').length > 220) {
    throw new Error('skills/god-mode.md should stay as a concise dispatch contract');
  }
  if (!fs.existsSync(runbook)) {
    throw new Error('God Mode runbook reference missing');
  }
});

test('agent prompts delegate oversized runbook content', () => {
  const maxBytes = 20000;
  const agentsDir = path.join(ROOT, 'specialists');
  const agentFiles = fs.readdirSync(agentsDir)
    .filter(file => /^god-.*\.md$/.test(file))
    .map(file => path.join(agentsDir, file));
  const oversized = agentFiles.filter(file => fs.statSync(file).size > maxBytes);
  if (oversized.length > 0) {
    throw new Error(`oversized agent prompts: ${oversized.map(file => path.relative(ROOT, file)).join(', ')}`);
  }

  const orchestrator = fs.readFileSync(path.join(ROOT, 'specialists', 'god-orchestrator.md'), 'utf8');
  const runbook = path.join(ROOT, 'references', 'orchestration', 'GOD-ORCHESTRATOR-RUNBOOK.md');
  if (!fs.existsSync(runbook)) {
    throw new Error('God orchestrator runbook reference missing');
  }
  if (!orchestrator.includes('GOD-ORCHESTRATOR-RUNBOOK.md')) {
    throw new Error('god-orchestrator must point to its delegated runbook');
  }
});

test('specialist agents expose structured contract frontmatter', () => {
  const validator = require('../lib/agent-validator');
  const result = validator.auditAll(ROOT);
  if (result.summary.agentCount < 40) {
    throw new Error(`expected at least 40 specialist agents, got ${result.summary.agentCount}`);
  }
  if (result.summary.structuredContractCount !== result.summary.agentCount) {
    throw new Error(
      `structured contracts ${result.summary.structuredContractCount}/${result.summary.agentCount}`
    );
  }
  const contractFindings = result.allFindings.filter(f => f.kind && f.kind.includes('contract-frontmatter'));
  if (contractFindings.length > 0) {
    throw new Error(`contract frontmatter findings: ${contractFindings.map(f => f.agent).join(', ')}`);
  }
});

test('legacy roadmap reconciliation delegates to god-reconciler', () => {
  const routing = fs.readFileSync(path.join(ROOT, 'routing', 'god-roadmap-check.yaml'), 'utf8');
  if (!routing.includes('spawns: [god-reconciler]')) {
    throw new Error('/god-roadmap-check must spawn god-reconciler');
  }

  const adapter = fs.readFileSync(path.join(ROOT, 'specialists', 'god-roadmap-reconciler.md'), 'utf8');
  if (!adapter.includes('compatibility adapter') || !adapter.includes('god-reconciler')) {
    throw new Error('god-roadmap-reconciler must remain a compatibility adapter');
  }

  const activeFiles = [
    'SKILL.md',
    'skills/god-roadmap-check.md',
    'skills/god-sync.md',
    'lib/repo-doc-sync.js',
    'lib/repo-surface-sync.js',
    'lib/route-quality-sync.js',
    'lib/recipe-coverage-sync.js'
  ];
  for (const rel of activeFiles) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (text.includes('god-roadmap-reconciler')) {
      throw new Error(`${rel} should point active reconciliation to god-reconciler`);
    }
  }
});

test('dashboard contract stays shared between status and next', () => {
  const contract = path.join(ROOT, 'references', 'shared', 'DASHBOARD-CONTRACT.md');
  if (!fs.existsSync(contract)) {
    throw new Error('shared dashboard contract missing');
  }
  for (const rel of ['skills/god-status.md', 'skills/god-next.md']) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (!text.includes('DASHBOARD-CONTRACT.md')) {
      throw new Error(`${rel} does not reference the shared dashboard contract`);
    }
    if (text.split('\n').length > 180) {
      throw new Error(`${rel} should stay concise after dashboard delegation`);
    }
  }
});

test('skills, specialists, and Pillars use shared locking pointer without inline sections', () => {
  const locking = path.join(ROOT, 'references', 'shared', 'LOCKING.md');
  if (!fs.existsSync(locking)) {
    throw new Error('shared locking reference missing');
  }

  const markdownFiles = ['skills', 'specialists', 'agents']
    .flatMap(dir => walkMatching(path.join(ROOT, dir), file => file.endsWith('.md')));
  const sectionOffenders = markdownFiles.filter(file => /^#{2,}\s+Locking\b/m.test(fs.readFileSync(file, 'utf8')));
  if (sectionOffenders.length > 0) {
    throw new Error(`inline locking sections in ${sectionOffenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }

  const pointer = 'Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.';
  const mutatingSkills = [
    'god-arch.md',
    'god-build.md',
    'god-deploy.md',
    'god-design.md',
    'god-feature.md',
    'god-harden.md',
    'god-hotfix.md',
    'god-launch.md',
    'god-link.md',
    'god-migrate.md',
    'god-observe.md',
    'god-prd.md',
    'god-redo.md',
    'god-refactor.md',
    'god-repair.md',
    'god-repo.md',
    'god-restore.md',
    'god-roadmap.md',
    'god-rollback.md',
    'god-scan.md',
    'god-skip.md',
    'god-stack.md',
    'god-story-build.md',
    'god-story-close.md',
    'god-story.md',
    'god-sync.md',
    'god-undo.md',
    'god-update-deps.md',
    'god-upgrade.md'
  ];
  const missingPointers = mutatingSkills
    .map(file => path.join(ROOT, 'skills', file))
    .filter(file => !fs.readFileSync(file, 'utf8').includes(pointer));
  if (missingPointers.length > 0) {
    throw new Error(`missing shared locking pointer in ${missingPointers.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('release gate enforces lib coverage floor', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (!pkg.scripts['coverage:lib'] || !pkg.scripts['coverage:lib'].includes('--check-coverage --lines 90')) {
    throw new Error('coverage:lib must enforce a 90 percent line floor');
  }
  if (!pkg.scripts['coverage:lib'].includes('--include=lib/**/*.js')) {
    throw new Error('coverage:lib must scope the floor to lib/**/*.js');
  }
  if (!pkg.scripts['release:check'].includes('npm run coverage:lib')) {
    throw new Error('release:check must run coverage:lib');
  }
  if (!pkg.scripts['release:check'].includes('npm run pack:mcp:check')) {
    throw new Error('release:check must run @godpowers/mcp package checks');
  }
});

test('MCP companion stays outside main package dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    throw new Error('main package must not add production dependencies for MCP');
  }
  if (!Array.isArray(pkg.workspaces) || !pkg.workspaces.includes('packages/mcp')) {
    throw new Error('packages/mcp workspace missing');
  }
  const mcpPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'mcp', 'package.json'), 'utf8'));
  if (mcpPkg.name !== '@godpowers/mcp') {
    throw new Error(`unexpected MCP package name: ${mcpPkg.name}`);
  }
  if (!mcpPkg.dependencies || !mcpPkg.dependencies['@modelcontextprotocol/server']) {
    throw new Error('@godpowers/mcp must own the MCP v2 server dependency');
  }
  if (mcpPkg.dependencies['@modelcontextprotocol/sdk']) {
    throw new Error('@godpowers/mcp must not ship the legacy MCP SDK as a production dependency');
  }
  if (!mcpPkg.devDependencies || !mcpPkg.devDependencies['@modelcontextprotocol/client']
    || !mcpPkg.devDependencies['@modelcontextprotocol/sdk']) {
    throw new Error('@godpowers/mcp protocol tests must cover modern and legacy clients');
  }
  if (!mcpPkg.engines || mcpPkg.engines.node !== '>=20.0.0') {
    throw new Error('@godpowers/mcp v2 server must declare Node.js >=20.0.0');
  }
});

// ARCH ADR-002 records that the core package needs no production dependency.
// The check above reads only `dependencies`, so `optionalDependencies` and
// `peerDependencies` could have carried one with nothing in the repository
// noticing: the override guard inspects the lockfile, and `npm audit` fires only
// on a KNOWN advisory, so a clean production dependency slipped through every
// gate. This names the invariant instead of hoping a file hash notices the diff.
const ROOT_MANIFEST_KEYS = [
  'name', 'version', 'description', 'bin', 'engines', 'files', 'license',
  'author', 'repository', 'homepage', 'bugs', 'keywords', 'scripts',
  'workspaces', 'devDependencies'
];
// Present only while a security pin is in force; see the dependency policy in
// CONTRIBUTING.md and scripts/test-dependency-overrides.js.
const ROOT_MANIFEST_OPTIONAL_KEYS = ['overrides', 'overrides-rationale'];

test('root manifest keeps its declared shape', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const allowed = new Set([...ROOT_MANIFEST_KEYS, ...ROOT_MANIFEST_OPTIONAL_KEYS]);

  const unexpected = Object.keys(pkg).filter(key => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new Error(
      `package.json has unexpected top-level key(s): ${unexpected.join(', ')}. `
      + 'Add them to ROOT_MANIFEST_KEYS in this file in the same commit, or remove them.'
    );
  }

  const missing = ROOT_MANIFEST_KEYS.filter(key => pkg[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`package.json is missing required top-level key(s): ${missing.join(', ')}`);
  }

  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    if (pkg[field] && Object.keys(pkg[field]).length > 0) {
      throw new Error(`ADR-002: root package must declare no ${field}`);
    }
  }
});

test('publish workflow includes MCP companion package', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'publish.yml'), 'utf8');
  if (Array.isArray(pkg.workspaces) && pkg.workspaces.includes('packages/mcp')) {
    if (!workflow.includes('npm pack --workspace @godpowers/mcp --json')
      || !workflow.includes('npm publish "$tarball" --provenance --access public')) {
      throw new Error('publish.yml must publish @godpowers/mcp when the workspace exists');
    }
    for (const required of [
      'staging_tag="release-${version//./-}"',
      'Pack exact release candidates',
      'dist.integrity',
      'dist.shasum',
      'does not match the packed release candidate',
      'Verify the exact package pair before promotion',
      'for attempt in {1..12}',
      'Registry did not expose the exact packed candidate',
      'npm dist-tag add "@godpowers/mcp@$version" latest',
      'npm dist-tag add "godpowers@$version" latest',
      'Registry state is uncertain; refusing to publish.'
    ]) {
      if (!workflow.includes(required)) {
        throw new Error(`publish.yml is missing recoverable pair publication contract: ${required}`);
      }
    }
  }
});

test('skill metadata source of truth is executable', () => {
  const surface = require('../lib/skill-surface');
  const commands = surface.commandNames();
  if (!commands.includes('/god-mode') || commands.length < 100) {
    throw new Error(`unexpected command surface: ${commands.length}`);
  }
});

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
