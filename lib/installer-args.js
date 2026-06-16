const path = require('path');
const { RUNTIMES } = require('./installer-runtimes');

const COMMANDS = new Set([
  'status',
  'next',
  'state',
  'quick-proof',
  'mcp-info',
  'automation-status',
  'automation-setup',
  'dogfood',
  'extension-scaffold',
  'surface',
  'demo',
  'gate',
  'verify',
  'can-close',
  'route',
  'report',
  'reflect',
  'memory',
  'lesson',
  'outcome',
  'import-ledger'
]);

// Per-command positional slots, filled in order into the first empty slot.
const POSITIONALS = {
  state: ['stateAction'],
  verify: ['verifyCommand'],
  route: ['routePrompt'],
  memory: ['memoryAction', 'memoryKey', 'memoryValue'],
  lesson: ['lessonAction', 'lessonText'],
  outcome: ['outcomeAction', 'outcomeSlug']
};

// Boolean flags (and their aliases) -> opts field set to true.
const BOOL_FLAGS = {
  '--json': 'json',
  '--brief': 'brief',
  '--full': 'full',
  '--apply': 'apply',
  '--dry-run': 'dryRun',
  '--attest': 'attest',
  '--peek': 'peek',
  '--all': 'all',
  '-g': 'global',
  '--global': 'global',
  '-l': 'local',
  '--local': 'local',
  '-h': 'help',
  '--help': 'help',
  '-u': 'uninstall',
  '--uninstall': 'uninstall'
};

// Value flags -> opts field. Each accepts both "--flag value" and "--flag=value".
const VALUE_FLAGS = {
  '--tier': 'tier',
  '--step': 'step',
  '--status': 'status',
  '--substep': 'substep',
  '--claim': 'claim',
  '--timeout': 'timeout',
  '--evidence': 'evidence',
  '--since': 'since',
  '--action': 'reflectAction',
  '--outcome': 'outcome',
  '--observation': 'observation',
  '--root-cause': 'rootCause',
  '--next': 'nextAction',
  '--lesson': 'lesson',
  '--category': 'category',
  '--tags': 'tags',
  '--scope': 'scope',
  '--goal': 'outcomeGoal',
  '--verify': 'outcomeVerify',
  '--budget': 'budget',
  '--reason': 'reason',
  '--from': 'importFrom',
  '--profile': 'profile',
  '--project': 'project',
  '--name': 'extensionName',
  '--output': 'extensionOutput',
  '--skill': 'extensionSkill',
  '--agent': 'extensionAgent',
  '--workflow': 'extensionWorkflow'
};

// Value flags whose value is resolved to an absolute path.
const PATH_FLAGS = new Set(['--project', '--output']);

function defaultOpts(cwd) {
  return {
    command: null,
    project: cwd,
    json: false,
    brief: false,
    full: false,
    stateAction: null,
    step: null,
    status: null,
    extensionName: null,
    extensionOutput: cwd,
    extensionSkill: null,
    extensionAgent: null,
    extensionWorkflow: null,
    tier: null,
    verifyCommand: null,
    routePrompt: null,
    substep: null,
    claim: null,
    timeout: null,
    attest: false,
    evidence: null,
    since: null,
    peek: false,
    reflectAction: null,
    outcome: null,
    observation: null,
    rootCause: null,
    nextAction: null,
    lesson: null,
    memoryAction: null,
    memoryKey: null,
    memoryValue: null,
    category: null,
    lessonAction: null,
    lessonText: null,
    tags: null,
    scope: null,
    outcomeAction: null,
    outcomeSlug: null,
    outcomeGoal: null,
    outcomeVerify: null,
    budget: null,
    reason: null,
    importFrom: null,
    apply: false,
    dryRun: false,
    runtimes: [],
    global: false,
    local: false,
    all: false,
    help: false,
    uninstall: false,
    profile: 'core'
  };
}

function setValue(opts, flag, value) {
  opts[VALUE_FLAGS[flag]] = PATH_FLAGS.has(flag) ? path.resolve(value) : value;
}

// Fill the first empty positional slot for the active command. Returns true when
// the arg was consumed as a positional.
function consumePositional(opts, arg) {
  if (arg.startsWith('-')) return false;
  const slots = POSITIONALS[opts.command];
  if (!slots) return false;
  for (const slot of slots) {
    if (opts[slot] === null) {
      opts[slot] = arg;
      return true;
    }
  }
  return false;
}

// Handle one flag at args[i]. Returns the index to continue from (advanced past
// a consumed value for space-form flags).
function consumeFlag(opts, args, i) {
  const arg = args[i];

  if (arg in BOOL_FLAGS) {
    opts[BOOL_FLAGS[arg]] = true;
    return i;
  }
  if (arg === '--minimal') {
    opts.profile = 'core';
    return i;
  }
  if (arg === '--runtime') {
    if (args[i + 1]) {
      opts.runtimes.push(args[i + 1]);
      return i + 1;
    }
    return i;
  }
  if (arg.startsWith('--runtime=')) {
    opts.runtimes.push(arg.slice('--runtime='.length));
    return i;
  }
  if (arg in VALUE_FLAGS) {
    if (args[i + 1]) {
      setValue(opts, arg, args[i + 1]);
      return i + 1;
    }
    return i;
  }
  const eq = arg.indexOf('=');
  if (arg.startsWith('--') && eq > 0) {
    const name = arg.slice(0, eq);
    if (name in VALUE_FLAGS) {
      setValue(opts, name, arg.slice(eq + 1));
      return i;
    }
  }
  if (arg.startsWith('--') && RUNTIMES[arg.slice(2)]) {
    opts.runtimes.push(arg.slice(2));
  }
  return i;
}

function parseArgs(argv, cwd = process.cwd()) {
  const args = argv.slice(2);
  const opts = defaultOpts(cwd);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (COMMANDS.has(arg)) {
      opts.command = arg;
      continue;
    }
    if (consumePositional(opts, arg)) continue;
    i = consumeFlag(opts, args, i);
  }

  return opts;
}

module.exports = {
  COMMANDS,
  parseArgs
};
