/**
 * Shared filesystem helpers for the lib/*-sync.js family.
 *
 * Every sync module used to redefine its own byte-identical read/write/exists/
 * readJson against a project root (ARC-001). They now share these so a change
 * to path handling or read semantics lives in one place. Module-specific log
 * writers (appendLog) stay per-module because their headers and formats differ.
 */

const fs = require('fs');
const path = require('path');

function read(projectRoot, relPath) {
  const file = path.join(projectRoot, relPath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function write(projectRoot, relPath, content) {
  const file = path.join(projectRoot, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function exists(projectRoot, relPath) {
  return fs.existsSync(path.join(projectRoot, relPath));
}

function readJson(projectRoot, relPath) {
  try {
    return JSON.parse(read(projectRoot, relPath));
  } catch (err) {
    return null;
  }
}

module.exports = { read, write, exists, readJson };
