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

module.exports = {
  MAX_MAP_FILES,
  git,
  repoInfo,
  isRepo,
  objectFormat,
  hashPaths,
  hashPath,
  fingerprintOf,
  snapshot,
  headSnapshot,
  treeFingerprint,
  headTree,
  changedPaths,
  isIgnored,
  removedLines
};
