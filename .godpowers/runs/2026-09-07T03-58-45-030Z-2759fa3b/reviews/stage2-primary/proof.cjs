const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const assert = require('assert/strict');
const meta = require('./meta.json');
const packageRoot = path.join(meta.root, 'node_modules/godpowers');
const target = path.join(meta.root, 'host-project');
fs.mkdirSync(target, { recursive: true });
const run = (command, args, cwd = meta.source) => cp.execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
for (const file of ['test-command-families.js', 'test-invocation-policy.js', 'test-debug-feedback-loop.js']) {
  run(process.execPath, [path.join(meta.source, 'scripts', file)]);
}
const files = ['lib/command-families.js', 'lib/invocation-policy.js', 'SKILL.md', 'skills/god.md', 'skills/god-mode.md', 'skills/god-debug.md', 'specialists/god-debugger.md', 'routing/god-debug.yaml', 'references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md', 'references/building/BLAST-RADIUS.md'];
for (const file of files) assert.equal(fs.readFileSync(path.join(packageRoot, file), 'utf8'), fs.readFileSync(path.join(meta.source, file), 'utf8'), file);
const family = require(path.join(packageRoot, 'lib/command-families.js'));
const policy = require(path.join(packageRoot, 'lib/invocation-policy.js'));
let count = 0;
for (const task of ['question', 'assessment', 'change', 'bug', 'project', 'release']) {
 for (const scope of ['bounded', 'cross-cutting', 'unknown']) {
  for (const risk of ['low', 'high', 'unknown']) {
   for (const uncertainty of ['low', 'high']) {
    for (const mechanical of [undefined, false, true, 'true', 1, null, {}]) {
     const facts = { task, scope, risk, uncertainty, mechanical };
     const result = family.selectRunApproach(facts);
     assert.equal(result.authority, 'recommendation-only');
     assert.equal(result.command === '/god-fast', task === 'change' && scope === 'bounded' && risk === 'low' && uncertainty === 'low' && mechanical === true);
     assert.equal(result.invocationPolicy, result.command ? policy.expectedPolicy(result.command) : null);
     assert.deepEqual(family.selectRunApproach({ ...facts, model: 'strong-model', tokenBudget: 1 }), result);
     assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
     if (result.approach === 'focused' && task !== 'release') assert(result.components.includes('specialist-review'));
     count++;
    }
   }
  }
 }
}
for (const field of ['task', 'scope', 'risk', 'uncertainty']) {
 for (const value of [undefined, null, false, 1, [], {}, 'LOW', '']) {
  assert.throws(() => family.selectRunApproach({task:'change',scope:'bounded',risk:'low',uncertainty:'low',[field]:value}), TypeError);
 }
}
for (const value of [undefined, null, [], true, 'question', 1]) assert.throws(() => family.selectRunApproach(value), TypeError);
assert(!fs.existsSync(path.join(target, '.godpowers')));
for (const host of ['claude', 'codex']) {
 run(process.execPath, [path.join(packageRoot, 'bin/install.js'), '--'+host, '--local', '--profile=full'], target);
 const config = path.join(target, '.'+host);
 for (const file of files.filter(file => file !== 'SKILL.md' && !file.startsWith('skills/'))) {
  assert.equal(fs.readFileSync(path.join(config, 'godpowers-runtime', file), 'utf8'), fs.readFileSync(path.join(packageRoot, file), 'utf8'), host+':'+file);
 }
 const installed = require(path.join(config, 'godpowers-runtime/lib/command-families.js'));
 assert.equal(installed.selectRunApproach({task:'project',scope:'cross-cutting',risk:'high',uncertainty:'high'}).invocationPolicy, 'explicit-only');
 const masterPath = host === 'codex' ? 'skills/godpowers/SKILL.md' : 'skills/godpowers.md';
 assert(fs.readFileSync(path.join(config, masterPath), 'utf8').includes('selectRunApproach(assessment)'));
 const debugPath = host === 'codex' ? 'skills/god-debug/SKILL.md' : 'skills/god-debug.md';
 const debug = fs.readFileSync(path.join(config, debugPath), 'utf8');
 assert(debug.indexOf('god-spec-reviewer first') < debug.indexOf('then god-quality-reviewer'));
 assert(debug.includes('Both stages must pass'));
 const agentPath = path.join(config,'agents/god-debugger.md');
 assert(fs.readFileSync(agentPath, 'utf8').includes('Return the uncommitted fix'));
 const parse = require(path.join(config,'godpowers-runtime/lib/intent.js')).parseSimpleYaml;
 const route = parse(fs.readFileSync(path.join(config,'godpowers-routing/god-debug.yaml'),'utf8'));
 assert.deepEqual(route.execution.spawns, ['god-debugger','god-spec-reviewer','god-quality-reviewer']);
}
const child = run('sh', ['-c', "node -e 'const f=require(process.argv[1]);process.stdout.write(JSON.stringify(f.selectRunApproach(JSON.parse(process.argv[2]))))' \"$1\" \"$2\"", 'adaptive-review', path.join(target,'.codex/godpowers-runtime/lib/command-families.js'), JSON.stringify({task:'project',scope:'bounded',risk:'low',uncertainty:'low'})], target);
const crossLanguage = JSON.parse(child);
assert.equal(crossLanguage.invocationPolicy, 'explicit-only');
assert.equal(crossLanguage.authority, 'recommendation-only');
assert(!fs.existsSync(path.join(target,'.godpowers')));
console.log(JSON.stringify({ok:true,validAssessments:count,invalidInputs:38,focusedSuites:3,installedHosts:['claude','codex'],sourceCopiesMatched:files.length,crossLanguageConsumer:'POSIX shell to Node JSON',projectStateCreated:false}));
