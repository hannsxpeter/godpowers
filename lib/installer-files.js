/**
 * File helpers shared by the installer and installer tests.
 */

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function replaceExisting(dest) {
  try {
    const stat = fs.lstatSync(dest);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      fs.rmSync(dest, { recursive: true, force: true });
    } else {
      fs.unlinkSync(dest);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

function copyRecursive(src, dest, root) {
  // `root` bounds where a reproduced symlink is allowed to point. It defaults
  // to the top-level source on the first call and is threaded through recursion.
  if (root === undefined) root = path.resolve(src);
  const rootResolved = path.resolve(root);
  const stat = fs.lstatSync(src);

  if (stat.isSymbolicLink()) {
    const linkTarget = fs.readlinkSync(src);
    const resolvedTarget = path.resolve(path.dirname(src), linkTarget);
    // Only reproduce symlinks that stay within the source tree. A symlink
    // pointing outside it (absolute path or `../` escape) would otherwise be
    // planted into the user's runtime config pointing anywhere on disk, so we
    // skip it rather than copy it verbatim.
    const inRoot = resolvedTarget === rootResolved ||
      resolvedTarget.startsWith(rootResolved + path.sep);
    if (!inRoot) return;
    ensureDir(path.dirname(dest));
    replaceExisting(dest);
    fs.symlinkSync(linkTarget, dest);
    return;
  }

  if (stat.isDirectory()) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      copyRecursive(path.join(src, entry.name), path.join(dest, entry.name), root);
    }
    return;
  }

  if (stat.isFile()) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, stat.mode);
  }
}

function copyRuntimeBundle(srcDir, destDir) {
  ensureDir(destDir);
  for (const dir of ['bin', 'lib', 'routing', 'workflows', 'schema', 'templates', 'references']) {
    const src = path.join(srcDir, dir);
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(destDir, dir));
    }
  }
  const packageJson = path.join(srcDir, 'package.json');
  if (fs.existsSync(packageJson)) {
    fs.copyFileSync(packageJson, path.join(destDir, 'package.json'));
  }
}

module.exports = { ensureDir, copyRecursive, copyRuntimeBundle };
