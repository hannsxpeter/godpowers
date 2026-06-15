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
  'report'
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
