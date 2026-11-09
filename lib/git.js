/**
 * Git helpers for evidence and gates.
 *
 * The central idea is the fingerprint: a SHA-256 over every file in the
 * project (tracked and untracked, minus .gitignore'd files and `.godpowers/`),
 * each identified by its git blob hash. It depends only on content, so a check
 * recorded before a commit still matches after it, and any edit makes it stale.
 *
 * Everything here only reads. Tracked files that git reports unchanged reuse
 * the blob hash from the index. Changed and untracked files are hashed by
 * `git hash-object` without -w, so git applies the same filters (line endings,
 * LFS) and hash algorithm it would use on commit, and writes nothing. Nested
 * repositories and submodules are fingerprinted recursively.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const OWN_DIR = '.godpowers/';
// Snapshots keep a path-to-hash map for "only documentation changed" checks.
// Past this many files the map is dropped to keep session files small.
const MAX_MAP_FILES = 50000;

function git(cwd, args, input) {
  const result = spawnSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  return {
    ok: result.status === 0 && !result.error,
    stdout: result.stdout || '',
    stderr: (result.stderr || '').trim()
  };
}

function nulList(text) {
  return text.split('\0').filter(Boolean);
}

/** Returns { top, prefix } for a path inside a work tree, else null. */
function repoInfo(root) {
  if (!fs.existsSync(root)) return null;
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!top.ok || !top.stdout.trim()) return null;
  const topReal = fs.realpathSync(top.stdout.trim());
  const prefix = path.relative(topReal, fs.realpathSync(root)).split(path.sep).join('/');
  return { top: topReal, prefix };
}

function isRepo(root) {
  return repoInfo(root) !== null;
}

function objectFormat(root) {
  const result = git(root, ['rev-parse', '--show-object-format']);
  return result.ok && result.stdout.trim() === 'sha256' ? 'sha256' : 'sha1';
}

/** Git-style blob hash computed in Node, for when git itself cannot hash a file. */
function nodeBlobHash(buffer, format) {
  return crypto.createHash(format).update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
}

function fileHashFallback(full, format) {
  try {
    const stat = fs.statSync(full);
    if (stat.size > 256 * 1024 * 1024) return `large:${stat.size}:${Math.round(stat.mtimeMs)}`;
    return nodeBlobHash(fs.readFileSync(full), format);
  } catch (_) {
    try {
      const stat = fs.statSync(full);
      return `unreadable:${stat.size}:${Math.round(stat.mtimeMs)}`;
    } catch (__) {
      return null;
    }
  }
}

/**
 * Content hashes for paths relative to `root`. Returns a map of path to hash;
 * paths that no longer exist are left out.
 */
function hashPaths(root, rels, depth = 0) {
  const hashes = {};
  const regular = [];
  const format = objectFormat(root);
  for (const rel of rels) {
    const full = path.join(root, rel);
    let stat;
    try {
      stat = fs.lstatSync(full);
    } catch (_) {
      continue;
    }
    if (stat.isSymbolicLink()) {
      const link = git(root, ['hash-object', '--stdin'], fs.readlinkSync(full));
      hashes[rel] = link.ok ? link.stdout.trim() : nodeBlobHash(Buffer.from(fs.readlinkSync(full)), format);
    } else if (stat.isDirectory()) {
      // Only a directory that is the top of its own repository (a submodule
      // or a nested clone) can be fingerprinted on its own.
      const info = depth < 3 ? repoInfo(full) : null;
      const nested = info && info.top === fs.realpathSync(full) ? snapshot(full, depth + 1) : null;
      hashes[rel] = `dir:${nested ? nested.fingerprint : 'unknown'}`;
    } else {
      regular.push(rel);
    }
  }
  if (regular.length) {
    const batch = git(root, ['hash-object', '--stdin-paths'], `${regular.join('\n')}\n`);
    const lines = batch.ok ? batch.stdout.trim().split('\n') : [];
    if (batch.ok && lines.length === regular.length) {
      regular.forEach((rel, i) => { hashes[rel] = lines[i]; });
    } else {
      for (const rel of regular) {
        const hash = fileHashFallback(path.join(root, rel), format);
        if (hash) hashes[rel] = hash;
      }
    }
  }
  return hashes;
}

/** The hash of one path, or null if it is gone. */
function hashPath(root, rel) {
  return hashPaths(root, [rel])[rel] || null;
}

function fingerprintOf(files) {
  const hash = crypto.createHash('sha256');
  for (const rel of Object.keys(files).sort()) hash.update(`${rel}\0${files[rel]}\n`);
  return hash.digest('hex');
}

const keep = rel => !rel.startsWith(OWN_DIR) && rel !== '.godpowers' && !rel.includes('\n');

function finish(files) {
  const fingerprint = fingerprintOf(files);
  return Object.keys(files).length > MAX_MAP_FILES ? { fingerprint, files: null } : { fingerprint, files };
}

/**
 * Snapshot of the project as it is on disk: { fingerprint, files } where
 * `files` maps each path (relative to the project) to its content hash, or is
 * null for very large projects. Returns null outside a git work tree.
 */
function snapshot(root, depth = 0) {
  if (!isRepo(root)) return null;
  const staged = git(root, ['ls-files', '--stage', '-z']);
  const modified = git(root, ['diff-files', '--name-only', '--relative', '-z']);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  if (!staged.ok || !modified.ok || !untracked.ok) return null;
  const files = {};
  const recheck = new Set(nulList(modified.stdout));
  for (const entry of nulList(staged.stdout)) {
    const tab = entry.indexOf('\t');
    const [mode, object, stage] = entry.slice(0, tab).split(' ');
    const rel = entry.slice(tab + 1);
    if (!keep(rel)) continue;
    // A clean submodule is identified by its commit, as at HEAD; git reports
    // a dirty one through diff-files, and it is then fingerprinted recursively.
    if (stage !== '0') recheck.add(rel);
    else files[rel] = mode === '160000' ? `commit:${object}` : object;
  }
  const rehash = [...recheck, ...nulList(untracked.stdout)].filter(keep);
  for (const rel of rehash) delete files[rel];
  Object.assign(files, hashPaths(root, rehash, depth));
  return finish(files);
}

/**
 * The fingerprint over the snapshot's files that are not documentation, or
 * null when the snapshot has no file map (very large projects).
 */
function codeFingerprint(files, isDoc) {
  if (!files) return null;
  const code = {};
  for (const rel of Object.keys(files)) if (!isDoc(rel)) code[rel] = files[rel];
  return fingerprintOf(code);
}

/**
 * { tree, code } from one snapshot, so a record's two fingerprints describe
 * the same moment. Both are null outside a git work tree.
 */
function fingerprints(root, isDoc) {
  const snap = snapshot(root);
  return snap ? { tree: snap.fingerprint, code: codeFingerprint(snap.files, isDoc) } : { tree: null, code: null };
}

/** Snapshot of the project at HEAD, or null without commits. */
function headSnapshot(root) {
  if (!isRepo(root)) return null;
  const tree = git(root, ['ls-tree', '-r', '-z', 'HEAD']);
  if (!tree.ok) return null;
  const files = {};
  for (const entry of nulList(tree.stdout)) {
    const tab = entry.indexOf('\t');
    const rel = entry.slice(tab + 1);
    const [mode, , object] = entry.slice(0, tab).split(' ');
    if (!keep(rel)) continue;
    // Submodules are compared by their own fingerprint, which HEAD cannot give.
    files[rel] = mode === '160000' ? `commit:${object}` : object;
  }
  return finish(files);
}

function treeFingerprint(root) {
  const snap = snapshot(root);
  return snap ? snap.fingerprint : null;
}

function headTree(root) {
  const snap = headSnapshot(root);
  return snap ? snap.fingerprint : null;
}

/** Paths whose content differs between two snapshots' file maps, or null if unknown. */
function changedPaths(fromFiles, toFiles) {
  if (!fromFiles || !toFiles) return null;
  const paths = new Set([...Object.keys(fromFiles), ...Object.keys(toFiles)]);
  return [...paths].filter(rel => fromFiles[rel] !== toFiles[rel]).sort();
}

/** The HEAD commit sha, or null outside git or before the first commit. */
function headCommit(root) {
  if (!isRepo(root)) return null;
  const head = git(root, ['rev-parse', '--verify', '-q', 'HEAD']);
  return head.ok && head.stdout.trim() ? head.stdout.trim() : null;
}

/**
 * Files to run a quick check on: changed since HEAD (staged or not) plus
 * untracked files, minus deleted files and `.godpowers/`, sorted. Before the
 * first commit that is every file the snapshot lists. Read-only.
 */
function workingChanges(root) {
  if (!isRepo(root)) return [];
  let rels;
  if (headCommit(root)) {
    const changed = git(root, ['diff', '--no-ext-diff', '--no-renames', '--relative', '--name-only', '--diff-filter=d', '-z', 'HEAD']);
    const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
    if (!changed.ok || !untracked.ok) return [];
    rels = [...nulList(changed.stdout), ...nulList(untracked.stdout)];
  } else {
    const snap = snapshot(root);
    rels = snap && snap.files ? Object.keys(snap.files) : [];
  }
  const isFile = rel => {
    try {
      return !fs.lstatSync(path.join(root, rel)).isDirectory();
    } catch (_) {
      return false;
    }
  };
  return [...new Set(rels)].filter(rel => keep(rel) && isFile(rel)).sort();
}

/** True when git ignores `relPath` (via .gitignore, info/exclude, or global excludes). */
function isIgnored(root, relPath) {
  return isRepo(root) && git(root, ['check-ignore', '-q', '--', relPath]).ok;
}

/**
 * Lines removed or rewritten in `relPath` relative to HEAD, counting staged
 * and unstaged edits and ignoring line-ending-only changes. Returns [] when
 * the file is new or not tracked at HEAD.
 */
function removedLines(root, relPath) {
  if (!isRepo(root)) return [];
  if (!git(root, ['cat-file', '-e', `HEAD:./${relPath}`]).ok) return [];
  const diff = git(root, ['diff', '--no-ext-diff', '--no-textconv', '--ignore-space-at-eol', '--unified=0', '--no-color', 'HEAD', '--', relPath]);
  if (!diff.ok || !diff.stdout) return [];
  return diff.stdout.split('\n')
    .filter(line => line.startsWith('-') && !line.startsWith('---'))
    .map(line => line.slice(1));
}

/**
 * The full commit sha that `ref` names. A ref that is empty or starts with
 * `-` is refused before git sees it, and the rest goes after
 * `--end-of-options`, so it can never be read as an option. Throws when the
 * ref does not name a commit.
 */
function resolveBase(root, ref) {
  const text = typeof ref === 'string' ? ref.trim() : '';
  if (!text) throw new Error('--base needs a git ref, for example --base v7.0.0');
  if (text.startsWith('-')) throw new Error(`refusing base "${text}": a git ref cannot start with "-"`);
  const result = git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${text}^{commit}`]);
  const sha = result.stdout.trim();
  if (!result.ok || !sha) throw new Error(`"${text}" does not name a commit in this repository`);
  return sha;
}

/**
 * The latest `v*` tag reachable from HEAD as { ref, sha }, or null when there
 * is none (no tags, no commits, or not a repository).
 */
function releaseBase(root) {
  if (!isRepo(root) || !headCommit(root)) return null;
  const described = git(root, ['describe', '--tags', '--abbrev=0', '--match', 'v*', 'HEAD']);
  const tag = described.stdout.trim();
  if (!described.ok || !tag) return null;
  const resolved = git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', `refs/tags/${tag}^{commit}`]);
  const sha = resolved.stdout.trim();
  return resolved.ok && sha ? { ref: tag, sha } : null;
}

/** The base to compare with, as { ref, sha }: the given ref, else the latest release tag, else null. */
function baseFor(root, ref) {
  if (ref !== undefined && ref !== null) return { ref: String(ref).trim(), sha: resolveBase(root, ref) };
  return releaseBase(root);
}

/** Untracked files that git does not ignore, relative to `root`, without `.godpowers/`. */
function untrackedFiles(root) {
  if (!isRepo(root)) return [];
  const result = git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  if (!result.ok) throw new Error(`git ls-files failed: ${result.stderr}`);
  return nulList(result.stdout).filter(keep);
}

/**
 * Paths that differ between the base commit and the working tree (staged and
 * unstaged edits, including deletions and both sides of a rename) plus
 * untracked files, without `.godpowers/`, sorted and unique. Read-only.
 */
function changedSince(root, base) {
  if (!isRepo(root)) return [];
  const changed = git(root, ['diff', '--no-ext-diff', '--no-renames', '--relative', '--name-only', '-z', '--end-of-options', base, '--']);
  if (!changed.ok) throw new Error(`git diff against ${base} failed: ${changed.stderr}`);
  return [...new Set([...nulList(changed.stdout), ...untrackedFiles(root)])].filter(keep).sort();
}

/** `--name-status -z` output as [{ status, path, from }]; `from` is set for renames. */
function parseNameStatus(text) {
  const parts = nulList(text);
  const entries = [];
  for (let i = 0; i < parts.length;) {
    const status = parts[i++][0];
    if (status === 'R' || status === 'C') {
      entries.push({ status, from: parts[i], path: parts[i + 1] });
      i += 2;
    } else {
      entries.push({ status, from: null, path: parts[i++] });
    }
  }
  return entries;
}

/** Split a patch into one text block per file, in order. */
function splitPatch(patch) {
  const sections = [];
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) sections.push([line]);
    else if (sections.length) sections[sections.length - 1].push(line);
  }
  return sections.map(lines => lines.join('\n'));
}

/**
 * The zero-context diff from the base commit to the working tree, with rename
 * detection. Returns { patch, files } where each file is { status, path, from,
 * patch }: status is A, M, D, R, or T, `from` is the old path of a rename, and
 * `patch` is that file's part of the diff (no hunks for a binary file or a
 * pure rename). Untracked files are not part of a git diff; see untrackedFiles.
 * Read-only.
 */
function diffSince(root, base) {
  if (!isRepo(root)) return { patch: '', files: [] };
  const flags = ['--no-ext-diff', '--no-textconv', '--relative', '-M'];
  const diff = git(root, ['diff', '--no-color', '-U0', ...flags, '--end-of-options', base, '--']);
  const names = git(root, ['diff', '--name-status', '-z', ...flags, '--end-of-options', base, '--']);
  if (!diff.ok || !names.ok) throw new Error(`git diff against ${base} failed: ${diff.stderr || names.stderr}`);
  const entries = parseNameStatus(names.stdout);
  const sections = splitPatch(diff.stdout);
  if (entries.length !== sections.length) throw new Error(`git diff against ${base} listed ${entries.length} files but produced ${sections.length} patches`);
  const files = entries.map((entry, index) => ({ ...entry, patch: sections[index] })).filter(entry => keep(entry.path));
  return { patch: diff.stdout, files };
}

module.exports = {
  MAX_MAP_FILES,
  git,
  repoInfo,
  isRepo,
  objectFormat,
  hashPaths,
  hashPath,
  fingerprintOf,
  codeFingerprint,
  fingerprints,
  snapshot,
  headSnapshot,
  treeFingerprint,
  headTree,
  headCommit,
  changedPaths,
  isIgnored,
  removedLines,
  workingChanges,
  resolveBase,
  releaseBase,
  baseFor,
  untrackedFiles,
  changedSince,
  diffSince
};
