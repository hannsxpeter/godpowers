'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const project = __dirname;
const source = '/Users/hannsxpeter/Projects/godpowers';
const tracked = ['lib/command-families.js', 'lib/invocation-policy.js', 'SKILL.md', 'skills/god.md', 'skills/god-mode.md', 'skills/god-debug.md', 'skills/god-fast.md', 'specialists/god-debugger.md', 'routing/god-debug.yaml', 'references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md'];
function surfacePath(root,f) {
  if (path.basename(root) === 'godpowers-runtime' && (f === 'SKILL.md' || f.startsWith('skills/'))) {
    const name = f === 'SKILL.md' ? 'godpowers' : path.basename(f,'.md');
    return path.join(root,'..','skills',name,'SKILL.md');
  }
  return path.join(root,f);
}
const digest = root => Object.fromEntries(tracked.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(surfacePath(root, f))).digest('hex')]));
const before = digest(source);
for (const name of ['packed','consumer','host']) fs.rmSync(path.join(project,name),{recursive:true,force:true});
let cases = 0;
function run(command, args, cwd = project, input) {
  const result = cp.spawnSync(command, args, {cwd, input, encoding:'utf8', timeout:15000, maxBuffer:1024*1024, env:{...process.env, npm_config_offline:'true', npm_config_audit:'false', npm_config_fund:'false'}});
  assert.equal(result.error, undefined, `${command} process error`);
  assert.equal(result.status, 0, `${command} failed: ${result.stderr}`);
  return result.stdout;
}
function matrix(root) {
  const {selectRunApproach: select} = require(path.join(root,'lib/command-families'));
  const policies = require(path.join(root,'lib/invocation-policy'));
  const tasks = ['question','assessment','change','bug','project','release'];
  const scopes = ['bounded','cross-cutting','unknown'];
  const risks = ['low','high','unknown'];
  const uncertainties = ['low','high'];
  const mechanicals = [true,false,undefined,'true',1,{},new Boolean(true)];
  for (const task of tasks) for (const scope of scopes) for (const risk of risks) for (const uncertainty of uncertainties) for (const mechanical of mechanicals) {
    const facts = Object.freeze({task,scope,risk,uncertainty,mechanical});
    const result = select(facts);
    const serialized = JSON.parse(JSON.stringify(result));
    assert.equal(serialized.authority,'recommendation-only');
    assert.equal(serialized.invocationPolicy,result.command ? policies.expectedPolicy(result.command) : null);
    if (task === 'question' || task === 'assessment') {
      assert.equal(result.approach,'direct'); assert.equal(result.command,null);
      assert.deepEqual(result.components,['relevant-context','inspection']);
    } else if (task === 'project') {
      assert.equal(result.command,'/god-mode'); assert.equal(serialized.invocationPolicy,'explicit-only');
    } else if (task === 'release') {
      assert.equal(result.command,'/god-ship'); assert.equal(serialized.invocationPolicy,'approval-required');
    } else {
      const eligible = task === 'change' && mechanical === true && scope === 'bounded' && risk === 'low' && uncertainty === 'low';
      assert.equal(result.command === '/god-fast',eligible);
      if (!eligible) { assert.equal(result.approach,'focused'); assert(result.components.includes('specialist-review')); }
      if (task === 'bug') assert.equal(result.command,'/god-debug');
    }
    for (const model of ['gpt-6-astra','unrecognized-model']) assert.deepEqual(select({...facts, model, tokenBudget:0, cost:'free', bypassReview:true, authority:'execute', command:'/god-fast', invocationPolicy:'auto-local'}), result);
    cases += 3;
  }
  const defaults = {task:'change',scope:'bounded',risk:'low',uncertainty:'low',mechanical:true};
  for (const field of ['task','scope','risk','uncertainty']) for (const bad of [undefined,null,'',' LOW','Low','unknown-value',0,false,[],{},new String(defaults[field])]) {
    assert.throws(() => select({...defaults,[field]:bad}),TypeError); cases++;
  }
  for (const bad of [undefined,null,true,'change',[],42]) { assert.throws(() => select(bad),TypeError); cases++; }
  const first = select(defaults); first.components.length=0; first.authority='execute';
  assert.equal(select(defaults).authority,'recommendation-only');
  assert(select(defaults).components.includes('verification'));
}
function contracts(root) {
  const read = f => fs.readFileSync(surfacePath(root,f),'utf8');
  const master = read('SKILL.md').replace(/\s+/g,' ');
  const front = read('skills/god.md').replace(/\s+/g,' ');
  const mode = read('skills/god-mode.md').replace(/\s+/g,' ');
  const debuggerSkill = read('skills/god-debug.md').replace(/\s+/g,' ');
  const specialist = read('specialists/god-debugger.md').replace(/\s+/g,' ');
  const runbook = read('references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md').replace(/\s+/g,' ');
  for (const text of ['"can you fix this?" is a bug request, not a read-only question','Preserve explicit commands before selecting a route','model identity is not evidence that a check can be skipped','Authentication, authorization, secrets, money, destructive data changes, public contracts, and deployment changes require high-risk treatment','Do not turn an assessment into implementation, state initialization, commits, or deployment','cannot remove mandatory stages','or grant commit, publish, deployment, external-write, or scheduling authority','Do not ask again for authority the user has already supplied']) assert(master.includes(text),text);
  assert(front.includes('direct with no command'));
  assert(front.includes('Honor an explicit request for a report or named command'));
  assert(front.includes('front door still does not execute implementation or spawn agents itself'));
  assert(mode.includes('An explicit `/god-mode` requests the full workflow, including resumes'));
  assert(mode.includes('only to conditional steps and context within that contract'));
  assert(debuggerSkill.includes('dispatch god-spec-reviewer first, then god-quality-reviewer only after Stage 1 passes, each in fresh context'));
  assert(debuggerSkill.includes('Both stages must pass'));
  assert(debuggerSkill.includes('The caller commits the reviewed fix'));
  assert(specialist.includes('Return the uncommitted fix'));
  assert(specialist.includes('Do not commit or grade your own fix'));
  assert(runbook.includes('Both stages must pass before the caller commits or closes the fix'));
  assert(runbook.includes('The maker does not grade its own work'));
  const route = require(path.join(root,'lib/router')).getRouting('/god-debug');
  assert.equal(route.metadata['invocation-policy'],'suggestible');
  assert.deepEqual(route.execution.spawns,['god-debugger','god-spec-reviewer','god-quality-reviewer']);
}
matrix(source); contracts(source);
const packDir = path.join(project,'packed'); fs.mkdirSync(packDir);
const packed = JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',packDir],source))[0];
for (const f of tracked) assert(packed.files.some(entry => entry.path === f), `missing package file ${f}`);
const consumer = path.join(project,'consumer'); fs.mkdirSync(consumer);
fs.writeFileSync(path.join(consumer,'package.json'),'{"name":"authority-consumer","private":true}');
run('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--prefix',consumer,path.join(packDir,packed.filename)]);
const installed = path.join(consumer,'node_modules/godpowers');
assert.deepEqual(digest(installed),before);
matrix(installed); contracts(installed);
const host = path.join(project,'host'); fs.mkdirSync(host);
const staleSkill = path.join(host,'.codex/skills/godpowers/SKILL.md');
const staleAgent = path.join(host,'.codex/agents/god-debugger.toml');
fs.mkdirSync(path.dirname(staleSkill),{recursive:true}); fs.writeFileSync(staleSkill,'stale policy without review');
fs.mkdirSync(path.dirname(staleAgent),{recursive:true}); fs.writeFileSync(staleAgent,'stale commit-before-review');
run(process.execPath,[path.join(installed,'bin/install.js'),'--codex','--local','--profile=full'],host);
const runtime = path.join(host,'.codex/godpowers-runtime');
assert.deepEqual(digest(runtime),before);
matrix(runtime); contracts(runtime);
assert.equal(fs.readFileSync(staleSkill,'utf8'),fs.readFileSync(path.join(source,'SKILL.md'),'utf8'));
assert(fs.readFileSync(staleAgent,'utf8').includes('Do not commit or grade your own fix'));
for (const leaf of ['god','god-mode','god-debug']) assert.equal(fs.readFileSync(path.join(host,`.codex/skills/${leaf}/SKILL.md`),'utf8'),fs.readFileSync(path.join(source,`skills/${leaf}.md`),'utf8'));
const python = `import json, subprocess, sys\nroot=sys.argv[1]\nnode=sys.argv[2]\nfacts={'task':'change','scope':'unknown','risk':'unknown','uncertainty':'high','mechanical':True,'model':'gpt-6-astra','tokenBudget':0}\nscript="const fs=require('node:fs');const f=require(process.argv[1]+'/lib/command-families');process.stdout.write(JSON.stringify(f.selectRunApproach(JSON.parse(fs.readFileSync(0,'utf8')))))"\np=subprocess.run([node,'-e',script,root],input=json.dumps(facts),capture_output=True,text=True,check=True,timeout=10)\nr=json.loads(p.stdout)\nassert r['authority']=='recommendation-only'\nassert r['approach']=='focused' and r['command']!='/god-fast'\nassert 'risk-review' in r['components'] and 'specialist-review' in r['components']\nprint('cross-language consumer passed')\n`;
run('python3',['-c',python,runtime,process.execPath]);
assert.deepEqual(digest(source),before,'reviewed behavior changed during proof');
fs.writeFileSync(path.join(project,'proof-summary.json'),JSON.stringify({cases,sourceHashes:before,packageVersion:packed.version,tarballIntegrity:packed.integrity,consumer:'isolated npm package and Codex full-profile runtime',crossLanguage:'Python -> Node -> JSON',lifecycle:'stale policy replaced on local install'},null,2)+'\n');
console.log(`Authority proof passed: ${cases} selector assertions across source, packed, and installed runtime; prompt contracts, stale-copy replacement, and Python consumer passed.`);
