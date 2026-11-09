/**
 * `godpowers fast`: a quick, file-local check.
 *
 * STATE.md may declare `fast: <command>`. `{files}` in the command expands to
 * the files to check, each quoted for the shell. The command runs only when
 * the user or agent calls `fast`; nothing here registers a hook (`fast --hook` is the handler a user can register
 * in their own settings), and the
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

/**
 * The file a PostToolUse hook payload names (`tool_input.file_path` or
 * `tool_input.path`) as a project-relative path, or null when the payload has
 * none, is not JSON, or points outside the project or into `.godpowers/`.
 */
function hookFile(root, stdinText) {
  let input;
  try {
    input = stdinText && stdinText.trim() ? JSON.parse(stdinText) : null;
  } catch {
    return null;
  }
  const toolInput = input && typeof input === 'object' ? input.tool_input : null;
  if (!toolInput || typeof toolInput !== 'object') return null;
  const given = [toolInput.file_path, toolInput.path].find(value => typeof value === 'string' && value.trim());
  if (!given) return null;
  const rel = path.relative(root, path.resolve(root, given));
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  const normal = rel.split(path.sep).join('/');
  return normal === '.godpowers' || normal.startsWith('.godpowers/') ? null : normal;
}

const HOW_TO_DECLARE = 'No fast check declared. Add `fast: <command>` to the frontmatter of .godpowers/STATE.md; `{files}` in the command expands to the changed files, for example `fast: eslint {files}`.';

module.exports = { DEFAULT_TIMEOUT_SECONDS, HOW_TO_DECLARE, quoteArg, declared, normalizeFiles, expand, hookFile, fast };
