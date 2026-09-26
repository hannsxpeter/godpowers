const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const cli = require('../lib/cli');
const templates = require('../lib/templates');

function tempDir(prefix = 'gp-test-') {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** A git repo with one commit containing src/app.js. */
function gitRepo(prefix) {
  const root = tempDir(prefix);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'config', 'commit.gpgsign', 'false');
  write(root, 'src/app.js', 'module.exports = 1;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  return root;
}

function stateText(overrides = {}) {
  return templates.stateTemplate({ project: 'demo', goal: 'Ship a demo.', verify: 'node -e "process.exit(0)"', stage: 'build', ...overrides });
}

/** A git repo that is a Godpowers 7 project (state committed). */
function v7Repo(stateOverrides) {
  const root = gitRepo();
  write(root, '.godpowers/STATE.md', stateText(stateOverrides));
  write(root, '.godpowers/DECISIONS.md', templates.decisionsTemplate());
  write(root, '.godpowers/evidence.jsonl', '');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'godpowers');
  return root;
}

/** Run the CLI in-process. Returns { code, out, err }. */
async function run(argv, { cwd, stdin = '', isTTY = false, env = {} } = {}) {
  const chunks = { out: '', err: '' };
  const previous = process.cwd();
  const saved = {};
  for (const [key, value] of Object.entries(env)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  if (cwd) process.chdir(cwd);
  try {
    const code = await cli.main(argv, {
      out: { write: text => { chunks.out += text; } },
      err: { write: text => { chunks.err += text; } },
      isTTY,
      readStdin: () => stdin
    });
    return { code, out: chunks.out, err: chunks.err };
  } finally {
    process.chdir(previous);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

module.exports = { tempDir, write, read, git, gitRepo, stateText, v7Repo, run };
