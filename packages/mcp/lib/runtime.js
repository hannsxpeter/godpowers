const fs = require('fs');
const path = require('path');

function exists(filePath) {
  return fs.existsSync(filePath);
}

function isRuntimeRoot(root) {
  if (!root) return false;
  const pkgPath = path.join(root, 'package.json');
  if (!exists(pkgPath)) return false;
  if (!exists(path.join(root, 'lib', 'dashboard.js'))) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.name === 'godpowers';
  } catch (error) {
    return false;
  }
}

function addCandidate(candidates, value) {
  if (!value) return;
  const resolved = path.resolve(value);
  if (!candidates.includes(resolved)) candidates.push(resolved);
}

function candidateRoots(opts = {}) {
  const candidates = [];
  addCandidate(candidates, opts.runtimeRoot);
  addCandidate(candidates, process.env.GODPOWERS_RUNTIME_ROOT);
  addCandidate(candidates, path.resolve(__dirname, '..', '..', '..'));
  addCandidate(candidates, process.cwd());

  try {
    const pkgPath = require.resolve('godpowers/package.json', {
      paths: [process.cwd(), __dirname]
    });
    addCandidate(candidates, path.dirname(pkgPath));
  } catch (error) {
    // Optional peer dependency. Local checkouts resolve through the candidates above.
  }

  return candidates;
}

function resolveRuntimeRoot(opts = {}) {
  for (const root of candidateRoots(opts)) {
    if (isRuntimeRoot(root)) return root;
  }
  throw new Error('Could not find a Godpowers runtime root. Pass --runtime-root or install godpowers beside @godpowers/mcp.');
}

function requireRuntime(moduleName, opts = {}) {
  // Defense-in-depth: all callers pass hardcoded names, but reject anything that
  // is not a plain lib module basename so a future caller cannot traverse out of
  // lib/ or require an arbitrary path.
  if (!/^[a-z0-9-]+$/.test(String(moduleName))) {
    throw new Error(`invalid runtime module name: ${moduleName}`);
  }
  const root = resolveRuntimeRoot(opts);
  return require(path.join(root, 'lib', `${moduleName}.js`));
}

function resolveProject(projectRoot) {
  const requested = path.resolve(projectRoot || process.cwd());
  let resolved;
  try {
    resolved = fs.realpathSync.native(requested);
  } catch (error) {
    throw new Error(`project root does not exist: ${requested}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`project root must be a directory: ${requested}`);
  }
  return resolved;
}

function resolveProjectFile(projectRoot, filePath) {
  const root = resolveProject(projectRoot);
  if (!filePath) throw new Error('file path is required');
  const abs = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(root, filePath);
  const relative = path.relative(root, abs);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('artifact path must stay inside the project root');
  }

  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let entry;
    try {
      entry = fs.lstatSync(current);
    } catch (error) {
      throw new Error(`artifact path does not exist: ${filePath}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error('artifact path must not contain symbolic links');
    }
  }

  const pinned = fs.realpathSync.native(abs);
  const pinnedRelative = path.relative(root, pinned);
  if (pinnedRelative.startsWith('..') || path.isAbsolute(pinnedRelative)) {
    throw new Error('artifact path must stay inside the project root');
  }
  return pinned;
}

module.exports = {
  isRuntimeRoot,
  candidateRoots,
  resolveRuntimeRoot,
  requireRuntime,
  resolveProject,
  resolveProjectFile
};
