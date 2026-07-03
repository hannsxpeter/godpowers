/**
 * Fixture project loader for integration tests.
 *
 * Status: SCAFFOLD (v0.4). Full implementation in v0.5.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

/**
 * Load a fixture into a temp directory.
 * Returns the temp path and helper methods for asserting.
 */
function load(fixtureName) {
  const src = path.join(FIXTURES_DIR, fixtureName);
  if (!fs.existsSync(src)) {
    throw new Error(`Fixture not found: ${fixtureName}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `godpowers-test-${fixtureName}-`));
  copyRecursive(src, tmp);

  return {
    path: tmp,
    cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }),
    exists: (relPath) => fs.existsSync(path.join(tmp, relPath)),
    read: (relPath) => fs.readFileSync(path.join(tmp, relPath), 'utf8'),
    write: (relPath, content) => fs.writeFileSync(path.join(tmp, relPath), content),
    listArtifacts: () => listGodpowersArtifacts(tmp)
  };
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function listGodpowersArtifacts(projectPath) {
  const godpowersDir = path.join(projectPath, '.godpowers');
  if (!fs.existsSync(godpowersDir)) return [];

  const artifacts = [];
  function walk(dir, rel = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(rel, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
        artifacts.push(relPath);
      }
    }
  }
  walk(godpowersDir);
  return artifacts;
}

module.exports = { load };
