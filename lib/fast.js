/**
 * `godpowers fast`: a quick, file-local check.
 *
 * STATE.md may declare `fast: <command>`. `{files}` in the command expands to
 * the files to check, each quoted for the shell. The command runs only when
 * the user or agent calls `fast`; nothing here registers a hook, and the
 * result is never written to the evidence ledger.
 */

const path = require('path');

const evidence = require('./evidence');
const gitTools = require('./git');
const stateStore = require('./state');

const DEFAULT_TIMEOUT_SECONDS = 120;
const PLACEHOLDER = '{files}';

/** Quote one shell word so the command runs exactly as it was typed. */
function quoteArg(arg) {
  if (/^[A-Za-z0-9_/.,:=@%+-]+$/.test(arg)) return arg;
  if (process.platform === 'win32') return `"${arg.replace(/"/g, '\\"')}"`;
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/** The declared fast command, or null. */
function declared(root) {
  const state = stateStore.read(root);
  const value = state && state.data ? state.data.fast : null;
  const command = typeof value === 'string' ? value.trim() : '';
  return command && command.toLowerCase() !== 'none' ? command : null;
}

/** Explicit file arguments as unique project-relative paths with forward slashes. */
function normalizeFiles(root, args) {
  const files = args.map(arg => {
    const rel = path.isAbsolute(arg) ? path.relative(root, arg) : arg;
    return path.normalize(rel).split(path.sep).join('/');
  });
  return [...new Set(files)];
}

function expand(command, files) {
  return command.split(PLACEHOLDER).join(files.map(quoteArg).join(' '));
}

/**
 * Run the declared fast command. Returns { declared: false } when STATE.md
 * has none; otherwise { declared: true, command, files, skipped, run } where
 * `run` is the evidence.runCommand result, or null when nothing needed to run.
 */
async function fast(root, { files: given = [], timeoutSeconds } = {}) {
  const command = declared(root);
  if (!command) return { declared: false };
  const files = given.length ? normalizeFiles(root, given) : gitTools.workingChanges(root);
  if (command.includes(PLACEHOLDER) && files.length === 0) return { declared: true, command, files, skipped: true, run: null };
  const run = await evidence.runCommand(expand(command, files), {
    cwd: root,
    timeoutSeconds: timeoutSeconds === undefined ? DEFAULT_TIMEOUT_SECONDS : timeoutSeconds
  });
  return { declared: true, command, files, skipped: false, run };
}

const HOW_TO_DECLARE = 'No fast check declared. Add `fast: <command>` to the frontmatter of .godpowers/STATE.md; `{files}` in the command expands to the changed files, for example `fast: eslint {files}`.';

module.exports = { DEFAULT_TIMEOUT_SECONDS, HOW_TO_DECLARE, quoteArg, declared, normalizeFiles, expand, fast };
