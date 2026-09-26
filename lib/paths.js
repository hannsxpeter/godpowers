/**
 * Project location and layout helpers.
 *
 * A Godpowers project is any directory holding a `.godpowers/` folder. Version
 * 7 projects keep four files there; version 6 projects kept `state.json` plus a
 * tree of tier artifacts and must be migrated before the gates apply.
 */

const fs = require('fs');
const path = require('path');

const DIR = '.godpowers';

function projectFiles(root) {
  const dir = path.join(root, DIR);
  return {
    dir,
    state: path.join(dir, 'STATE.md'),
    plan: path.join(dir, 'PLAN.md'),
    decisions: path.join(dir, 'DECISIONS.md'),
    evidence: path.join(dir, 'evidence.jsonl'),
    archive: path.join(dir, 'archive'),
    legacyState: path.join(dir, 'state.json')
  };
}

/**
 * Walk up from `start` to the nearest directory that holds `.godpowers/`.
 * Falls back to the nearest git root, then to `start` itself.
 */
function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  let gitRoot = null;
  for (;;) {
    if (fs.existsSync(path.join(dir, DIR))) return dir;
    if (!gitRoot && fs.existsSync(path.join(dir, '.git'))) gitRoot = dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return gitRoot || path.resolve(start);
}

// Files and folders that only Godpowers 6 wrote into .godpowers/.
const V6_MARKERS = ['state.json', 'PROGRESS.mdx', 'PROGRESS.md', 'CHECKPOINT.mdx', 'CHECKPOINT.md', 'intent.yaml', 'ledger', 'runs'];

/** 'v7' when STATE.md exists, 'v6' when any 6.x marker exists, else 'none'. */
function layout(root) {
  const files = projectFiles(root);
  if (fs.existsSync(files.state)) return 'v7';
  if (V6_MARKERS.some(name => fs.existsSync(path.join(files.dir, name)))) return 'v6';
  return 'none';
}

/**
 * How to invoke this copy of the CLI in instructions shown to an agent. An
 * installed copy (marked by the installer) or a plugin copy is named by path,
 * so the agent runs the same version as the hooks and needs no network.
 * Anything else, such as an npx cache, falls back to `npx -y godpowers@7`.
 */
function cliCommand() {
  const root = path.resolve(__dirname, '..');
  const plugin = process.env.CLAUDE_PLUGIN_ROOT && path.resolve(process.env.CLAUDE_PLUGIN_ROOT) === root;
  if (plugin || fs.existsSync(path.join(root, '.godpowers-runtime'))) {
    return `node "${path.join(root, 'bin', 'godpowers.js')}"`;
  }
  return 'npx -y godpowers@7';
}

module.exports = { DIR, V6_MARKERS, projectFiles, findProjectRoot, layout, cliCommand };
