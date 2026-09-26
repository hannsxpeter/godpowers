/**
 * `godpowers init`: create `.godpowers/` in a project.
 */

const fs = require('fs');
const path = require('path');

const { projectFiles, layout } = require('./paths');
const templates = require('./templates');
const context = require('./context');
const { isRepo, isIgnored } = require('./git');

const NPM_DEFAULT_TEST = 'echo "Error: no test specified" && exit 1';

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (_) {
    return null;
  }
}

/** Best guess at the project's check command, or null. */
function detectVerify(root) {
  const has = name => fs.existsSync(path.join(root, name));
  const pkgText = readText(path.join(root, 'package.json'));
  if (pkgText) {
    try {
      const pkg = JSON.parse(pkgText);
      const test = pkg.scripts && pkg.scripts.test;
      if (test && test.trim() !== NPM_DEFAULT_TEST) {
        if (has('pnpm-lock.yaml')) return 'pnpm test';
        if (has('yarn.lock')) return 'yarn test';
        if (has('bun.lock') || has('bun.lockb')) return 'bun run test';
        return 'npm test';
      }
    } catch (_) {
      // Fall through to other ecosystems.
    }
  }
  const makefile = readText(path.join(root, 'Makefile'));
  if (makefile && /^test:/m.test(makefile)) return 'make test';
  if (has('Cargo.toml')) return 'cargo test';
  if (has('go.mod')) return 'go test ./...';
  if (has('pyproject.toml') || has('pytest.ini') || has('setup.py') || has('tox.ini')) return 'pytest';
  if (has('gradlew')) return './gradlew test';
  if (has('pom.xml')) return 'mvn test';
  if (has('mix.exs')) return 'mix test';
  if (has('deno.json') || has('deno.jsonc')) return 'deno test';
  return null;
}

function writeIfMissing(file, content) {
  try {
    fs.writeFileSync(file, content, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

const UNION_LINE = '.godpowers/evidence.jsonl merge=union';

/**
 * True when git ignores `.godpowers/`: the project keeps its state local, so
 * shared files (AGENTS.md, .gitattributes) should not mention it.
 */
function isLocalOnly(root) {
  return isIgnored(root, '.godpowers/STATE.md');
}

/**
 * Let git merge the append-only ledger by keeping both sides' lines, so two
 * branches that each recorded checks merge without conflicts.
 */
function ensureUnionMerge(root) {
  if (!isRepo(root) || isLocalOnly(root)) return false;
  const file = path.join(root, '.gitattributes');
  const current = readText(file) || '';
  if (current.split('\n').some(line => line.trim() === UNION_LINE)) return false;
  fs.writeFileSync(file, `${current}${current && !current.endsWith('\n') ? '\n' : ''}${UNION_LINE}\n`);
  return true;
}

/**
 * Create STATE.md, DECISIONS.md, and an empty evidence ledger, plus the short
 * AGENTS.md note. Returns { status, files, verify, agents }.
 * status: 'created' | 'exists' | 'legacy'
 */
function init(root, { project, goal, verify, agentsMd = true } = {}) {
  const kind = layout(root);
  if (kind === 'v7') return { status: 'exists', files: [] };
  if (kind === 'v6') return { status: 'legacy', files: [] };
  const files = projectFiles(root);
  const name = project || path.basename(path.resolve(root));
  const check = verify || detectVerify(root) || '';
  fs.mkdirSync(files.dir, { recursive: true });
  fs.writeFileSync(files.state, templates.stateTemplate({ project: name, goal, verify: check }));
  // Never overwrite history that exists without a STATE.md.
  writeIfMissing(files.decisions, templates.decisionsTemplate());
  writeIfMissing(files.evidence, '');
  ensureUnionMerge(root);
  const agents = !agentsMd ? 'skipped' : isLocalOnly(root) ? 'skipped (.godpowers/ is not tracked)' : context.writeAgentsNote(root);
  return { status: 'created', files: [files.state, files.decisions, files.evidence], verify: check, agents };
}

module.exports = { detectVerify, isLocalOnly, ensureUnionMerge, init };
