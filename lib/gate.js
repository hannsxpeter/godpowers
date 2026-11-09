/**
 * Gates enforced by code.
 *
 * stop: used by the Stop hook. Blocks finishing a turn when code changed in
 *       this session and no passing (or waived) check of the project's declared
 *       command matches the code.
 * ship: used by /god-ship. Requires a passing check, and by risk tier (see
 *       risk.js) a passing review (normal and high) and security record
 *       (high) for the current code, a clean STATE.md, and no open critical
 *       risk.
 */

const { layout, cliCommand, DIR } = require('./paths');
const match = require('./match');
const { plain, ledgerText } = require('./policy');
const stateStore = require('./state');
const evidence = require('./evidence');
const gitTools = require('./git');
const docs = require('./docs');
const riskTools = require('./risk');
const testguard = require('./testguard');

const { isDocPath } = docs;

/** True when every path is documentation (by default the built-in rule). */
function isDocsOnly(paths, isDoc = isDocPath) {
  return Array.isArray(paths) && paths.length > 0 && paths.every(isDoc);
}

function gateDisabled(state) {
  return process.env.GODPOWERS_GATE === 'off' || (state && state.data && state.data.gate === 'off');
}

function declaredCheck(state) {
  const cmd = state && state.data && state.data.verify;
  return cmd && cmd !== 'none' ? String(cmd) : null;
}

function verifyHint(state) {
  return declaredCheck(state) ? `${cliCommand()} verify` : `${cliCommand()} verify "<your check command>"`;
}

/**
 * Decide whether a session may stop.
 * `baseline` is the snapshot ({ fingerprint, files }) taken when the session
 * started; without one, HEAD is the reference.
 * Returns { block, reason, tree, changed }.
 */
function stopGate(root, { baseline = null } = {}) {
  const allow = (why, extra = {}) => ({ block: false, reason: why, ...extra });
  if (layout(root) !== 'v7') return allow('not a godpowers 7 project');
  const state = stateStore.read(root);
  if (gateDisabled(state)) return allow('gate is off');
  if (!gitTools.isRepo(root)) return allow('not a git repository');
  const current = gitTools.snapshot(root);
  if (!current) return allow('could not fingerprint the working tree');
  const tree = current.fingerprint;
  const reference = baseline && baseline.fingerprint ? baseline : gitTools.headSnapshot(root);
  if (reference && reference.fingerprint === tree) return allow('no code changed', { tree });
  const changed = reference ? gitTools.changedPaths(reference.files, current.files) : null;
  // The rule committed at HEAD limits the working one, so editing STATE.md
  // cannot turn code into documentation.
  const isDoc = docs.both(docs.docPredicate(state), docs.atCommit(root, gitTools.headCommit(root)));
  if (isDocsOnly(changed, isDoc)) return allow('only documentation changed', { tree, changed });
  const { records } = evidence.readAll(root);
  const status = evidence.statusFor(records, tree, { command: declaredCheck(state) });
  if (status.check === 'pass' || status.check === 'waived') return allow(`check ${status.check}`, { tree, changed });
  const what = status.check === 'fail'
    ? `The last run of the project check (${ledgerText(status.lastCheck.command)}) failed on the current code.`
    : `No run of the project check${declaredCheck(state) ? ` (${declaredCheck(state)})` : ''} matches the current code.`;
  const files = Array.isArray(changed) && changed.length
    ? ` Changed: ${changed.slice(0, 5).join(', ')}${changed.length > 5 ? `, and ${changed.length - 5} more` : ''}.`
    : '';
  return {
    block: true,
    tree,
    changed,
    reason: `Godpowers gate: code changed in this session. ${what}${files} Run \`${verifyHint(state)}\` and fix failures before finishing. If no automated check can cover this change, record why with \`${cliCommand()} verify --waive "<reason>"\`, then finish and say it is unverified.`
  };
}

function check(name, ok, detail, severity = 'error') {
  return { name, ok, detail, severity: ok ? 'ok' : severity };
}

const setting = value => [...new Set(match.parseList(value))].sort().join(', ');

/**
 * STATE.md settings that decide what counts as documentation or high risk and
 * that changed between the base commit and the working tree, as text. A STATE.md
 * missing at the base counts as no settings.
 */
function changedSettings(root, base, state) {
  const before = gitTools.showAt(root, base.sha, `${DIR}/STATE.md`);
  const was = before === null ? {} : stateStore.parse(before).data;
  return ['docs', 'risk']
    .filter(key => setting(was[key]) !== setting(state.data[key]))
    .map(key => `${key}: "${plain(setting(was[key]))}" at ${base.ref} is now "${plain(setting(state.data[key]))}"`);
}

/**
 * Ship gate. `base` is the git ref to measure the change from (default: the
 * latest v* tag). Returns { ok, tree, tier, base, checks: [{ name, ok,
 * detail, severity }] }.
 */
function shipGate(root, { base: baseRef } = {}) {
  const cli = cliCommand();
  const checks = [];
  const kind = layout(root);
  if (kind !== 'v7') {
    checks.push(check('project', false, kind === 'v6'
      ? `godpowers 6 layout: run \`${cli} migrate\` first`
      : `no .godpowers/STATE.md: run \`${cli} init\` first`));
    return { ok: false, tree: null, tier: null, base: null, checks };
  }
  const base = gitTools.baseFor(root, baseRef);
  const risk = riskTools.classify(root, { base });
  const state = stateStore.read(root);
  const stateErrors = stateStore.validate(state).filter(d => d.severity === 'error');
  checks.push(check('state', stateErrors.length === 0, stateErrors.length
    ? `STATE.md has ${stateErrors.length} error(s): run \`${cli} lint\``
    : 'STATE.md is valid'));

  const { records, problems } = evidence.readAll(root);
  const broken = problems.filter(p => p.severity === 'error');
  checks.push(check('ledger', broken.length === 0, broken.length
    ? `evidence.jsonl has ${broken.length} invalid or edited record(s): run \`${cli} lint\``
    : 'evidence ledger is intact'));

  const { tree, code } = gitTools.fingerprints(root, docs.docPredicate(state));
  const command = declaredCheck(state);
  let status;
  if (tree) {
    status = evidence.statusFor(records, tree, { command, code });
  } else {
    // Outside git nothing can be bound to code; use the latest records.
    const ranDeclared = command ? evidence.commandMatcher(command) : null;
    const counted = records.filter(r => r.kind !== 'verify' || !ranDeclared || ranDeclared(r));
    const latest = kindName => [...counted].reverse().find(r => r.kind === kindName) || null;
    const lastCheck = [...counted].reverse().find(r => r.kind === 'verify' || r.kind === 'waive') || null;
    status = {
      check: !lastCheck ? 'none' : lastCheck.kind === 'waive' ? 'waived' : lastCheck.ok ? 'pass' : 'fail',
      review: latest('review') ? latest('review').verdict : 'none',
      harden: latest('harden') ? latest('harden').verdict : 'none',
      viaCode: {}
    };
    checks.push(check('git', false, 'not a git repository: evidence cannot be bound to the code', 'warning'));
  }
  checks.push(check('tier', true, `${risk.tier} risk${base ? ` since ${riskTools.describeBase(base)}` : ''}: ${risk.reason}`));
  const noCheck = state.data.verify === 'none';
  if (status.check === 'pass') checks.push(check('verify', true, 'passing project check on the current code'));
  else if (noCheck && status.check === 'waived') checks.push(check('verify', false, 'waived: the project declares no automated check (verify: none)', 'warning'));
  else checks.push(check('verify', false, status.check === 'none'
    ? `no run of the project check on the current code: run \`${verifyHint(state)}\``
    : `last project check on the current code is "${status.check}": fix it and run \`${verifyHint(state)}\``));
  const docsNote = kind => (status.viaCode[kind] ? ' (documentation changed since)' : '');
  const notRequired = () => (risk.tier === 'low' ? risk.reason : `no high-risk paths since ${base.ref}`);
  // A record the tier does not require still warns when it failed on this code.
  const judged = (name, required, passDetail, missing, failedWord) => {
    if (required) return check(name, status[name] === 'pass', status[name] === 'pass' ? passDetail : missing);
    if (status[name] === 'fail') return check(name, false, `the last ${failedWord} failed on the current code (not required for a ${risk.tier}-risk change)`, 'warning');
    return check(name, true, `not required for a ${risk.tier}-risk change (${notRequired()})`);
  };
  checks.push(judged('review', risk.tier !== 'low', `review passed on the current code${docsNote('review')}`, 'no passing review on the current code: run /god-review', 'review'));
  checks.push(judged('harden', risk.tier === 'high', `security pass on the current code${docsNote('harden')}`, 'no passing security record on the current code: run /god-harden', 'security record'));
  if (base) {
    const settings = changedSettings(root, base, state);
    if (settings.length) {
      checks.push(check('settings', false, `STATE.md changed what counts as documentation or high risk since ${base.ref} (${settings.join('; ')}): check that the change widens nothing`, 'warning'));
    }
    let findings = [];
    try {
      findings = testguard.compute(root, base);
    } catch (error) {
      checks.push(check('tests', false, `the test guard could not run since ${base.ref}: ${plain(error.message)}`, 'warning'));
    }
    if (findings.length) {
      const first = findings.slice(0, 3).map(f => `${f.kind} ${f.line ? `${f.file}:${f.line}` : f.file}`).join('; ');
      checks.push(check('tests', false, `${findings.length} test-guard finding(s) since ${base.ref}: ${first}${findings.length > 3 ? '; ...' : ''} (run \`${cli} tests\`)`, 'warning'));
    }
  }

  const critical = stateStore.openRisks(state, 'critical');
  checks.push(check('risks', critical.length === 0, critical.length
    ? `open critical risk: ${critical.map(r => r.text).join('; ')}`
    : 'no open critical risks'));
  const high = stateStore.openRisks(state, 'high');
  if (high.length) checks.push(check('high-risks', false, `open high risk: ${high.map(r => r.text).join('; ')}`, 'warning'));

  return { ok: checks.every(c => c.severity !== 'error'), tree, tier: risk.tier, base, checks };
}

module.exports = { isDocPath, isDocsOnly, declaredCheck, stopGate, shipGate, verifyHint };
