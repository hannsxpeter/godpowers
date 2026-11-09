/**
 * `godpowers fast`: a quick, file-local check.
 *
 * STATE.md may declare `fast: <command>`. Every `{files}` in the command
 * becomes `"$@"`, and the command runs as `/bin/sh -c <script> godpowers-fast
 * <file>...` with the files in the argument list, so a file name is only ever
 * data and never shell source, wherever `{files}` sits (inside quotes or
 * backticks too). Windows has no such interface, so a command with `{files}`
 * is refused there. The command runs only when the user or agent calls `fast`;
 * nothing here registers a hook (`fast --hook` is the handler a user can
 * register in their own settings), and the result is never written to the
 * evidence ledger.
 */

const fs = require('fs');
const path = require('path');

const evidence = require('./evidence');
const gitTools = require('./git');
const stateStore = require('./state');

const DEFAULT_TIMEOUT_SECONDS = 120;
const PLACEHOLDER = '{files}';
const ARGUMENTS = '"$@"';
const NO_WINDOWS = `\`${PLACEHOLDER}\` is not supported on Windows; declare a command without it`;

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

/** The script to run: every `{files}` replaced by `"$@"`. */
function scriptFor(command) {
  return command.split(PLACEHOLDER).join(ARGUMENTS);
}

// A control character (a newline included) in a name is skipped with a note: it cannot be shown or logged faithfully.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** A relative path that starts with `-` would reach the command as an option. */
function optionSafe(rel) {
  return rel.startsWith('-') ? `./${rel}` : rel;
}

/**
 * Run the declared fast command. Returns { declared: false } when STATE.md
 * has none; otherwise { declared: true, command, files, unsafe, escaped, skipped, run } where
 * `run` is the evidence.runCommand result, or null when nothing needed to run.
 */
async function fast(root, { files: given = [], timeoutSeconds, onRun } = {}) {
  const command = declared(root);
  if (!command) return { declared: false };
  const takesFiles = command.includes(PLACEHOLDER);
  if (takesFiles && process.platform === 'win32') throw new Error(NO_WINDOWS);
  const listed = given.length ? normalizeFiles(root, given) : gitTools.workingChanges(root);
  const unsafe = listed.filter(rel => CONTROL_CHARS.test(rel));
  // Every candidate, from arguments or from git, must stay inside the project once symlinks are followed.
  const { inside, outside: escaped } = splitContained(root, listed.filter(rel => !CONTROL_CHARS.test(rel)));
  const files = inside.map(optionSafe);
  if (takesFiles && files.length === 0) return { declared: true, command, files, unsafe, escaped, skipped: true, run: null };
  const script = takesFiles ? scriptFor(command) : command;
  if (onRun) onRun(script, takesFiles ? files : null);
  const run = await evidence.runCommand(script, {
    cwd: root,
    timeoutSeconds: timeoutSeconds === undefined ? DEFAULT_TIMEOUT_SECONDS : timeoutSeconds,
    args: takesFiles ? files : undefined
  });
  return { declared: true, command, files, unsafe, escaped, skipped: false, run };
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

/** `real` relative to `rootReal` (both symlink-resolved), or null when it is the root itself or outside it. */
function insideRoot(rootReal, real) {
  if (!rootReal || !real) return null;
  const rel = path.relative(rootReal, real);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  return rel;
}

/**
 * Split project-relative paths into those that stay inside the project once
 * symlinks are followed and those that do not (a link out, a dangling link, a
 * loop, or a `..` path).
 */
function splitContained(root, rels) {
  const rootReal = realPathOf(root);
  const inside = [];
  const outside = [];
  for (const rel of rels) {
    (insideRoot(rootReal, realPathOf(path.resolve(root, rel))) === null ? outside : inside).push(rel);
  }
  return { inside, outside };
}

/**
 * What a PostToolUse hook payload names (`tool_input.file_path` or
 * `tool_input.path`): { named: false } when it names no path or is not JSON,
 * otherwise { named: true, file }, where `file` is the project-relative path,
 * or null when the path points outside the project (a symlink out included)
 * or into `.godpowers/`. A caller must not fall back to other files when a
 * path was named and rejected.
 */
function hookTarget(root, stdinText) {
  let input;
  try {
    input = stdinText && stdinText.trim() ? JSON.parse(stdinText) : null;
  } catch {
    return { named: false, file: null };
  }
  const toolInput = input && typeof input === 'object' ? input.tool_input : null;
  if (!toolInput || typeof toolInput !== 'object') return { named: false, file: null };
  const given = [toolInput.file_path, toolInput.path].find(value => typeof value === 'string' && value.trim());
  if (!given) return { named: false, file: null };
  // Resolve symlinks on both sides, so a link inside the project that points
  // outside it (or into .godpowers/) is not followed.
  const rel = insideRoot(realPathOf(root), realPathOf(path.resolve(root, given)));
  if (rel === null) return { named: true, file: null };
  const normal = rel.split(path.sep).join('/');
  const lower = normal.toLowerCase();
  return { named: true, file: lower === '.godpowers' || lower.startsWith('.godpowers/') ? null : normal };
}

/** The file a hook payload names as a project-relative path, or null (see hookTarget). */
function hookFile(root, stdinText) {
  return hookTarget(root, stdinText).file;
}

const HOW_TO_DECLARE = 'No fast check declared. Add `fast: <command>` to the frontmatter of .godpowers/STATE.md; `{files}` in the command is replaced by the changed files, passed as arguments (not on Windows), for example `fast: eslint {files}`.';

module.exports = { DEFAULT_TIMEOUT_SECONDS, HOW_TO_DECLARE, declared, normalizeFiles, scriptFor, hookTarget, hookFile, fast };
