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

// Like read(), but returns null (not '') when the file is missing or unreadable,
// for callers that distinguish "absent" from "empty".
function readTextOrNull(projectRoot, relPath) {
  const file = path.join(projectRoot, relPath);
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }
}

/**
 * Artifact extension resolution (mdx-first, legacy .md fallback).
 *
 * Godpowers artifacts are canonically .mdx as of v4.0.0. Projects initialized
 * by older runtimes still hold .md twins, so every reader resolves through
 * these helpers: the canonical path wins when it exists, the legacy twin is
 * read when only it exists, and the canonical path is reported when neither
 * exists (so "missing" messages name the file a new write would create).
 * Writers always write the canonical .mdx name.
 */
function legacyTwin(relPath) {
  if (relPath.endsWith('.mdx')) return relPath.slice(0, -4) + '.md';
  if (relPath.endsWith('.md')) return relPath.slice(0, -3) + '.mdx';
  return null;
}

function resolveArtifact(projectRoot, relPath) {
  if (exists(projectRoot, relPath)) return relPath;
  const twin = legacyTwin(relPath);
  if (twin && exists(projectRoot, twin)) return twin;
  return relPath;
}

function existsArtifact(projectRoot, relPath) {
  return exists(projectRoot, resolveArtifact(projectRoot, relPath));
}

function readArtifact(projectRoot, relPath) {
  return read(projectRoot, resolveArtifact(projectRoot, relPath));
}

function readArtifactOrNull(projectRoot, relPath) {
  return readTextOrNull(projectRoot, resolveArtifact(projectRoot, relPath));
}

module.exports = {
  read,
  write,
  exists,
  readJson,
  readTextOrNull,
  legacyTwin,
  resolveArtifact,
  existsArtifact,
  readArtifact,
  readArtifactOrNull
};
