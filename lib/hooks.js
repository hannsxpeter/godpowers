/**
 * Hook handlers for Claude Code and Codex. Both hosts send the same JSON on
 * stdin and accept the same JSON on stdout for these events.
 *
 *   session-start  prints a three-line project brief and records the session's
 *                  starting tree fingerprint
 *   stop           asks the agent to verify before finishing when code changed
 *                  in this session without a passing check (see lib/gate.js)
 *   pre-tool-use   blocks `git commit` while `godpowers lint` reports errors
 *
 * Hooks fail open: an internal error never blocks the host, it is reported to
 * the user as a system message instead.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { findProjectRoot, layout, cliCommand } = require('./paths');
const stateStore = require('./state');
const gate = require('./gate');
const lint = require('./lint');
const status = require('./status');
const gitTools = require('./git');

// `git [global options] commit`, anywhere in a compound command.
const COMMIT_RE = /(?:^|[\s;&|(])git(?:\s+(?:-C\s+\S+|-c\s+\S+|--[\w-]+(?:=\S+)?))*\s+commit(?=[\s;&|)]|$)/;

function projectRootFor(input) {
  return findProjectRoot(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

function sessionPath(root, sessionId) {
  const key = crypto.createHash('sha1').update(path.resolve(root)).digest('hex').slice(0, 16);
  const id = String(sessionId || 'default').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80);
  return path.join(os.tmpdir(), 'godpowers-sessions', key, `${id}.json`);
}

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Remove session files older than a week. Best effort. */
function pruneSessions() {
  const dir = path.join(os.tmpdir(), 'godpowers-sessions');
  let projects;
  try {
    projects = fs.readdirSync(dir);
  } catch (_) {
    return;
  }
  const cutoff = Date.now() - SESSION_MAX_AGE_MS;
  for (const project of projects) {
    const projectDir = path.join(dir, project);
    try {
      for (const file of fs.readdirSync(projectDir)) {
        const full = path.join(projectDir, file);
        if (fs.statSync(full).mtimeMs < cutoff) fs.rmSync(full, { force: true });
      }
    } catch (_) {
      // Another session may be pruning at the same time.
    }
  }
}

function readSession(root, sessionId) {
  try {
    return JSON.parse(fs.readFileSync(sessionPath(root, sessionId), 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeSession(root, sessionId, data) {
  const file = sessionPath(root, sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
}

function gateOff(root) {
  if (process.env.GODPOWERS_GATE === 'off') return true;
  const state = stateStore.read(root);
  return Boolean(state && state.data.gate === 'off');
}

function sessionStart(input) {
  const root = projectRootFor(input);
  const kind = layout(root);
  if (kind === 'none') return null;
  if (kind === 'v6') {
    return { text: `Godpowers: this project still uses the 6.x layout. Run \`${cliCommand()} migrate --dry-run\` to see the switch; 7.x gates stay off until then.` };
  }
  if (!readSession(root, input.session_id)) {
    pruneSessions();
    writeSession(root, input.session_id, { baseline: gitTools.snapshot(root), started: new Date().toISOString(), nudged: [] });
  }
  return { text: status.brief(status.collect(root)) };
}

function stop(input) {
  const root = projectRootFor(input);
  if (layout(root) !== 'v7' || gateOff(root)) return null;
  const session = readSession(root, input.session_id) || { baseline: null, nudged: [] };
  const result = gate.stopGate(root, { baseline: session.baseline });
  if (!result.block) return null;
  const nudged = Array.isArray(session.nudged) ? session.nudged : [];
  // One nudge per code state: after that the turn may end, with a warning the
  // first time so the user knows the change is unverified.
  if (nudged.includes(result.tree)) {
    return input.stop_hook_active
      ? { json: { systemMessage: 'Godpowers: finishing without a passing check on the current changes.' } }
      : null;
  }
  writeSession(root, input.session_id, { ...session, nudged: [...nudged, result.tree].slice(-20) });
  if (input.turn_id !== undefined) return { json: { decision: 'block', reason: result.reason } };
  return { json: { hookSpecificOutput: { hookEventName: 'Stop', additionalContext: result.reason } } };
}

function preToolUse(input) {
  if (input.tool_name !== 'Bash') return null;
  const command = input.tool_input && typeof input.tool_input.command === 'string' ? input.tool_input.command : '';
  if (!COMMIT_RE.test(command)) return null;
  const root = projectRootFor(input);
  if (layout(root) !== 'v7' || gateOff(root)) return null;
  const result = lint.lintProject(root);
  if (result.errors === 0) return null;
  const errors = result.diagnostics.filter(d => d.severity === 'error').slice(0, 10)
    .map(d => `- ${d.file}:${d.line} ${d.message}`);
  const reason = [`godpowers lint found ${result.errors} error(s) in .godpowers/:`, ...errors, 'Fix them, then commit again.'].join('\n');
  return { json: { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } } };
}

const HANDLERS = { 'session-start': sessionStart, stop, 'pre-tool-use': preToolUse };

/** Run one hook event. Returns { stdout } and never throws. */
function runHook(event, stdinText) {
  const handler = HANDLERS[event];
  if (!handler) return { stdout: JSON.stringify({ systemMessage: `godpowers: unknown hook "${event}"` }) };
  try {
    const input = stdinText && stdinText.trim() ? JSON.parse(stdinText) : {};
    const result = handler(input);
    if (!result) return { stdout: '' };
    if (result.json) return { stdout: JSON.stringify(result.json) };
    return { stdout: result.text || '' };
  } catch (error) {
    return { stdout: JSON.stringify({ systemMessage: `godpowers ${event} hook error: ${error.message}` }) };
  }
}

module.exports = { COMMIT_RE, sessionPath, pruneSessions, readSession, writeSession, sessionStart, stop, preToolUse, runHook };
