/**
 * `godpowers fast`: a quick, file-local check.
 *
 * STATE.md may declare `fast: <command>`. `{files}` in the command expands to
 * the files to check, each quoted for the shell (so write it bare, never
 * inside quotes). The command runs only when
 * the user or agent calls `fast`; nothing here registers a hook (`fast --hook` is the handler a user can register
 * in their own settings), and the
 * result is never written to the evidence ledger.
 */

const fs = require('fs');
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
 * True when any `{files}` in the command sits inside single or double quotes
 * (POSIX rules: no escapes inside single quotes, backslash escapes inside
 * double quotes). Quoted, the shell would expand the names, so a file called
 * `$(touch x)` would run code.
 */
function placeholderInQuotes(command) {
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (command.startsWith(PLACEHOLDER, i)) {
      if (quote) return true;
      i += PLACEHOLDER.length - 1;
    } else if (quote === "'") {
      if (char === "'") quote = null;
    } else if (quote === '"') {
      if (char === '\\') i++;
      else if (char === '"') quote = null;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === '\\' && process.platform !== 'win32') {
      i++;
    }
  }
  return false;
}

// A control character (a newline included) cannot be quoted safely for every shell.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** A relative path that starts with `-` would reach the command as an option. */
function optionSafe(rel) {
  return rel.startsWith('-') ? `./${rel}` : rel;
}

/**
 * Run the declared fast command. Returns { declared: false } when STATE.md
 * has none; otherwise { declared: true, command, files, skipped, run } where
 * `run` is the evidence.runCommand result, or null when nothing needed to run.
 */
async function fast(root, { files: given = [], timeoutSeconds, onRun } = {}) {
  const command = declared(root);
  if (!command) return { declared: false };
  if (placeholderInQuotes(command)) {
    throw new Error(`${PLACEHOLDER} must be bare in the fast command, not inside quotes: Godpowers quotes each file name itself. Write it as \`fast: eslint ${PLACEHOLDER}\`.`);
  }
  const listed = given.length ? normalizeFiles(root, given) : gitTools.workingChanges(root);
  const unsafe = listed.filter(rel => CONTROL_CHARS.test(rel));
  const files = listed.filter(rel => !CONTROL_CHARS.test(rel)).map(optionSafe);
  if (process.platform === 'win32') {
    // cmd.exe expands %VAR% even inside double quotes, and a quote cannot be escaped reliably.
    const bad = files.find(rel => /[%"]/.test(rel));
    if (bad) throw new Error(`cannot pass "${bad}" to the fast command on Windows: cmd.exe would expand % or misread a quote in the name. Rename the file or run the check by hand.`);
  }
  if (command.includes(PLACEHOLDER) && files.length === 0) return { declared: true, command, files, unsafe, skipped: true, run: null };
  const expanded = expand(command, files);
  if (onRun) onRun(expanded);
  const run = await evidence.runCommand(expanded, {
    cwd: root,
    timeoutSeconds: timeoutSeconds === undefined ? DEFAULT_TIMEOUT_SECONDS : timeoutSeconds
  });
  return { declared: true, command, files, unsafe, skipped: false, run };
}

/**
 * `target` resolved through symlinks: the deepest existing ancestor is
 * resolved and the missing tail appended. Null for a dangling symlink or a
 * loop.
 */
function realPathOf(target) {
  const tail = [];
  let current = target;
  for (;;) {
    try {
      return path.join(fs.realpathSync(current), ...tail);
    } catch (_) {
      try {
        fs.lstatSync(current);
        return null; // it exists but cannot be resolved: a dangling symlink or a loop
      } catch (__) {
        // missing: try the parent
      }
      const parent = path.dirname(current);
      if (parent === current) return null;
      tail.unshift(path.basename(current));
      current = parent;
    }
  }
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
  // Resolve symlinks on both sides, so a link inside the project that points
  // outside it (or into .godpowers/) is not followed.
  const rootReal = realPathOf(root);
  const real = realPathOf(path.resolve(root, given));
  if (!rootReal || !real) return null;
  const rel = path.relative(rootReal, real);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  const normal = rel.split(path.sep).join('/');
  const lower = normal.toLowerCase();
  return lower === '.godpowers' || lower.startsWith('.godpowers/') ? null : normal;
}

const HOW_TO_DECLARE = 'No fast check declared. Add `fast: <command>` to the frontmatter of .godpowers/STATE.md; `{files}` in the command expands to the changed files, for example `fast: eslint {files}`.';

module.exports = { DEFAULT_TIMEOUT_SECONDS, HOW_TO_DECLARE, quoteArg, declared, normalizeFiles, expand, placeholderInQuotes, hookFile, fast };
