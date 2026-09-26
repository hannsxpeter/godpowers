/**
 * Gates enforced by code.
 *
 * stop: used by the Stop hook. Blocks finishing a turn when code changed in
 *       this session and no passing (or waived) check of the project's declared
 *       command matches the code.
 * ship: used by /god-ship. Requires a passing check, review, and security
 *       record for the current code, a clean STATE.md, and no open critical
 *       risk.
 */

const path = require('path');

const { layout, cliCommand } = require('./paths');
const stateStore = require('./state');
const evidence = require('./evidence');
const gitTools = require('./git');

const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.markdown', '.rst', '.adoc']);
const DOC_NAMES = new Set(['LICENSE', 'LICENSE.txt', 'NOTICE', 'NOTICE.txt', 'AUTHORS', 'COPYING', 'CHANGELOG', 'CODEOWNERS']);

/** Documentation by extension (markdown, reStructuredText, AsciiDoc) or exact file name. */
function isDocPath(rel) {
  return DOC_EXTENSIONS.has(path.extname(rel).toLowerCase()) || DOC_NAMES.has(path.basename(rel));
}

function isDocsOnly(paths) {
  return Array.isArray(paths) && paths.length > 0 && paths.every(isDocPath);
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
  if (isDocsOnly(changed)) return allow('only documentation changed', { tree, changed });
  const { records } = evidence.readAll(root);
  const status = evidence.statusFor(records, tree, { command: declaredCheck(state) });
  if (status.check === 'pass' || status.check === 'waived') return allow(`check ${status.check}`, { tree, changed });
  const what = status.check === 'fail'
    ? `The last run of the project check (${status.lastCheck.command}) failed on the current code.`
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

/** Ship gate. Returns { ok, tree, checks: [{ name, ok, detail, severity }] }. */
function shipGate(root) {
  const cli = cliCommand();
  const checks = [];
  const kind = layout(root);
  if (kind !== 'v7') {
    checks.push(check('project', false, kind === 'v6'
      ? `godpowers 6 layout: run \`${cli} migrate\` first`
      : `no .godpowers/STATE.md: run \`${cli} init\` first`));
    return { ok: false, tree: null, checks };
  }
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

  const tree = gitTools.treeFingerprint(root);
  const command = declaredCheck(state);
  let status;
  if (tree) {
    status = evidence.statusFor(records, tree, { command });
  } else {
    // Outside git nothing can be bound to code; use the latest records.
    const counted = records.filter(r => r.kind !== 'verify' || !command || r.command === evidence.redact(command));
    const latest = kindName => [...counted].reverse().find(r => r.kind === kindName) || null;
    const lastCheck = [...counted].reverse().find(r => r.kind === 'verify' || r.kind === 'waive') || null;
    status = {
      check: !lastCheck ? 'none' : lastCheck.kind === 'waive' ? 'waived' : lastCheck.ok ? 'pass' : 'fail',
      review: latest('review') ? latest('review').verdict : 'none',
      harden: latest('harden') ? latest('harden').verdict : 'none'
    };
    checks.push(check('git', false, 'not a git repository: evidence cannot be bound to the code', 'warning'));
  }
  const noCheck = state.data.verify === 'none';
  if (status.check === 'pass') checks.push(check('verify', true, 'passing project check on the current code'));
  else if (noCheck && status.check === 'waived') checks.push(check('verify', false, 'waived: the project declares no automated check (verify: none)', 'warning'));
  else checks.push(check('verify', false, status.check === 'none'
    ? `no run of the project check on the current code: run \`${verifyHint(state)}\``
    : `last project check on the current code is "${status.check}": fix it and run \`${verifyHint(state)}\``));
  checks.push(check('review', status.review === 'pass', status.review === 'pass'
    ? 'review passed on the current code'
    : 'no passing review on the current code: run /god-review'));
  checks.push(check('harden', status.harden === 'pass', status.harden === 'pass'
    ? 'security pass on the current code'
    : 'no passing security record on the current code: run /god-harden'));

  const critical = stateStore.openRisks(state, 'critical');
  checks.push(check('risks', critical.length === 0, critical.length
    ? `open critical risk: ${critical.map(r => r.text).join('; ')}`
    : 'no open critical risks'));
  const high = stateStore.openRisks(state, 'high');
  if (high.length) checks.push(check('high-risks', false, `open high risk: ${high.map(r => r.text).join('; ')}`, 'warning'));

  return { ok: checks.every(c => c.severity !== 'error'), tree, checks };
}

module.exports = { isDocPath, isDocsOnly, declaredCheck, stopGate, shipGate, verifyHint };
