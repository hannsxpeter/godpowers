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
  'outcome'
]);

function parseArgs(argv, cwd = process.cwd()) {
  const args = argv.slice(2);
  const opts = {
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
    apply: false,
    dryRun: false,
    runtimes: [],
    global: false,
    local: false,
    all: false,
    help: false,
    uninstall: false,
    profile: 'core',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (COMMANDS.has(arg)) {
      opts.command = arg;
      continue;
    }
    if (opts.command === 'state' && !opts.stateAction && !arg.startsWith('-')) {
      opts.stateAction = arg;
      continue;
    }
    if (opts.command === 'verify' && opts.verifyCommand === null && !arg.startsWith('-')) {
      opts.verifyCommand = arg;
      continue;
    }
    if (opts.command === 'route' && opts.routePrompt === null && !arg.startsWith('-')) {
      opts.routePrompt = arg;
      continue;
    }
    if (opts.command === 'memory' && !arg.startsWith('-')) {
      if (opts.memoryAction === null) { opts.memoryAction = arg; continue; }
      if (opts.memoryKey === null) { opts.memoryKey = arg; continue; }
      if (opts.memoryValue === null) { opts.memoryValue = arg; continue; }
    }
    if (opts.command === 'lesson' && !arg.startsWith('-')) {
      if (opts.lessonAction === null) { opts.lessonAction = arg; continue; }
      if (opts.lessonText === null) { opts.lessonText = arg; continue; }
    }
    if (opts.command === 'outcome' && !arg.startsWith('-')) {
      if (opts.outcomeAction === null) { opts.outcomeAction = arg; continue; }
      if (opts.outcomeSlug === null) { opts.outcomeSlug = arg; continue; }
    }

    switch (arg) {
      case '--json':
        opts.json = true;
        break;
      case '--brief':
        opts.brief = true;
        break;
      case '--full':
        opts.full = true;
        break;
      case '--apply':
        opts.apply = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--runtime':
        if (args[i + 1]) {
          opts.runtimes.push(args[i + 1]);
          i++;
        }
        break;
      case '--tier':
        if (args[i + 1]) {
          opts.tier = args[i + 1];
          i++;
        }
        break;
      case '--step':
        if (args[i + 1]) {
          opts.step = args[i + 1];
          i++;
        }
        break;
      case '--status':
        if (args[i + 1]) {
          opts.status = args[i + 1];
          i++;
        }
        break;
      case '--substep':
        if (args[i + 1]) {
          opts.substep = args[i + 1];
          i++;
        }
        break;
      case '--claim':
        if (args[i + 1]) {
          opts.claim = args[i + 1];
          i++;
        }
        break;
      case '--timeout':
        if (args[i + 1]) {
          opts.timeout = args[i + 1];
          i++;
        }
        break;
      case '--evidence':
        if (args[i + 1]) {
          opts.evidence = args[i + 1];
          i++;
        }
        break;
      case '--attest':
        opts.attest = true;
        break;
      case '--peek':
        opts.peek = true;
        break;
      case '--since':
        if (args[i + 1]) {
          opts.since = args[i + 1];
          i++;
        }
        break;
      case '--action':
        if (args[i + 1]) {
          opts.reflectAction = args[i + 1];
          i++;
        }
        break;
      case '--outcome':
        if (args[i + 1]) {
          opts.outcome = args[i + 1];
          i++;
        }
        break;
      case '--observation':
        if (args[i + 1]) {
          opts.observation = args[i + 1];
          i++;
        }
        break;
      case '--root-cause':
        if (args[i + 1]) {
          opts.rootCause = args[i + 1];
          i++;
        }
        break;
      case '--next':
        if (args[i + 1]) {
          opts.nextAction = args[i + 1];
          i++;
        }
        break;
      case '--lesson':
        if (args[i + 1]) {
          opts.lesson = args[i + 1];
          i++;
        }
        break;
      case '--category':
        if (args[i + 1]) {
          opts.category = args[i + 1];
          i++;
        }
        break;
      case '--tags':
        if (args[i + 1]) {
          opts.tags = args[i + 1];
          i++;
        }
        break;
      case '--scope':
        if (args[i + 1]) {
          opts.scope = args[i + 1];
          i++;
        }
        break;
      case '--goal':
        if (args[i + 1]) {
          opts.outcomeGoal = args[i + 1];
          i++;
        }
        break;
      case '--verify':
        if (args[i + 1]) {
          opts.outcomeVerify = args[i + 1];
          i++;
        }
        break;
      case '--budget':
        if (args[i + 1]) {
          opts.budget = args[i + 1];
          i++;
        }
        break;
      case '--reason':
        if (args[i + 1]) {
          opts.reason = args[i + 1];
          i++;
        }
        break;
      case '--project':
        if (args[i + 1]) {
          opts.project = path.resolve(args[i + 1]);
          i++;
        }
        break;
      case '-g':
      case '--global':
        opts.global = true;
        break;
      case '-l':
      case '--local':
        opts.local = true;
        break;
      case '--all':
        opts.all = true;
        break;
      case '--minimal':
        opts.profile = 'core';
        break;
      case '--profile':
        if (args[i + 1]) {
          opts.profile = args[i + 1];
          i++;
        }
        break;
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '-u':
      case '--uninstall':
        opts.uninstall = true;
        break;
      default:
        if (arg.startsWith('--project=')) {
          opts.project = path.resolve(arg.slice('--project='.length));
        } else if (arg.startsWith('--name=')) {
          opts.extensionName = arg.slice('--name='.length);
        } else if (arg.startsWith('--output=')) {
          opts.extensionOutput = path.resolve(arg.slice('--output='.length));
        } else if (arg.startsWith('--skill=')) {
          opts.extensionSkill = arg.slice('--skill='.length);
        } else if (arg.startsWith('--agent=')) {
          opts.extensionAgent = arg.slice('--agent='.length);
        } else if (arg.startsWith('--workflow=')) {
          opts.extensionWorkflow = arg.slice('--workflow='.length);
        } else if (arg.startsWith('--runtime=')) {
          opts.runtimes.push(arg.slice('--runtime='.length));
        } else if (arg.startsWith('--tier=')) {
          opts.tier = arg.slice('--tier='.length);
        } else if (arg.startsWith('--step=')) {
          opts.step = arg.slice('--step='.length);
        } else if (arg.startsWith('--status=')) {
          opts.status = arg.slice('--status='.length);
        } else if (arg.startsWith('--substep=')) {
          opts.substep = arg.slice('--substep='.length);
        } else if (arg.startsWith('--claim=')) {
          opts.claim = arg.slice('--claim='.length);
        } else if (arg.startsWith('--timeout=')) {
          opts.timeout = arg.slice('--timeout='.length);
        } else if (arg.startsWith('--evidence=')) {
          opts.evidence = arg.slice('--evidence='.length);
        } else if (arg.startsWith('--since=')) {
          opts.since = arg.slice('--since='.length);
        } else if (arg.startsWith('--action=')) {
          opts.reflectAction = arg.slice('--action='.length);
        } else if (arg.startsWith('--outcome=')) {
          opts.outcome = arg.slice('--outcome='.length);
        } else if (arg.startsWith('--observation=')) {
          opts.observation = arg.slice('--observation='.length);
        } else if (arg.startsWith('--root-cause=')) {
          opts.rootCause = arg.slice('--root-cause='.length);
        } else if (arg.startsWith('--next=')) {
          opts.nextAction = arg.slice('--next='.length);
        } else if (arg.startsWith('--lesson=')) {
          opts.lesson = arg.slice('--lesson='.length);
        } else if (arg.startsWith('--category=')) {
          opts.category = arg.slice('--category='.length);
        } else if (arg.startsWith('--tags=')) {
          opts.tags = arg.slice('--tags='.length);
        } else if (arg.startsWith('--scope=')) {
          opts.scope = arg.slice('--scope='.length);
        } else if (arg.startsWith('--goal=')) {
          opts.outcomeGoal = arg.slice('--goal='.length);
        } else if (arg.startsWith('--verify=')) {
          opts.outcomeVerify = arg.slice('--verify='.length);
        } else if (arg.startsWith('--budget=')) {
          opts.budget = arg.slice('--budget='.length);
        } else if (arg.startsWith('--reason=')) {
          opts.reason = arg.slice('--reason='.length);
        } else if (arg.startsWith('--profile=')) {
          opts.profile = arg.slice('--profile='.length);
        } else if (arg.startsWith('--') && RUNTIMES[arg.slice(2)]) {
          opts.runtimes.push(arg.slice(2));
        }
        break;
    }
  }

  return opts;
}

module.exports = {
  COMMANDS,
  parseArgs
};
