#!/usr/bin/env node

/**
 * Godpowers installer and local CLI helpers.
 *
 * The executable stays intentionally thin. Runtime definitions, argument
 * parsing, and install/uninstall file operations live in lib/ so they can be
 * tested and reused without shelling through the binary.
 */

const path = require('path');

const { parseArgs } = require('../lib/installer-args');
const { RUNTIMES, runtimeKeys } = require('../lib/installer-runtimes');
const {
  installForRuntime,
  uninstallForRuntime,
  countInstalledSurface
} = require('../lib/installer-core');
const { describeProfiles } = require('../lib/install-profiles');
const commandFamilies = require('../lib/command-families');
const identity = require('../lib/package-identity');
const cliDispatch = require('../lib/cli-dispatch');

const VERSION = identity.PACKAGE_VERSION;

const BANNER = `
  GODPOWERS v${VERSION}
  Ship fast. Ship right. Ship everything.
`;

function log(msg) {
  console.log(`  ${msg}`);
}

function success(msg) {
  console.log(`  \x1b[32m+\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`  \x1b[31mx\x1b[0m ${msg}`);
}

function showHelp() {
  console.log(BANNER);
  log('Usage: npx godpowers [command] [options]\n');
  log('Commands:');
  log('  status               Show the Godpowers Dashboard for a project');
  log('  next                 Show the dashboard and recommended next command');
  log('  state advance        Update one tracked Godpowers state step');
  log('  gate                 Check a tier artifact gate');
  log('  verify               Run a command as executed verification evidence');
  log('  mcp-info             Show read-only MCP companion setup instructions');
  log('  quick-proof          Show a runnable proof from the shipped fixture');
  log('  automation-status    Show host automation provider support');
  log('  automation-setup     Show an opt-in automation setup plan');
  log('  dogfood              Run built-in messy-repo dogfood scenarios');
  log('  demo                 Show the shipped sandbox proof');
  log('  surface              Preview or apply an installed command profile');
  log('  extension-scaffold   Create a publishable extension pack skeleton');
  log('');
  log('Command families:');
  for (const family of commandFamilies.COMMAND_FAMILIES) {
    log(`  ${family.id.padEnd(12)} ${family.purpose}`);
  }
  log('');
  log('Options:');
  log('  --project=<path>     Project root for status, next, state, proof, or automation commands');
  log('  --step=<name>        Step for state advance, such as prd or tier-1.prd');
  log('  --status=<status>    Status for state advance');
  log('  --tier=<name>        Tier for gate: prd, design, arch, roadmap, stack, repo, build, or harden');
  log('  --substep=<id>       Substep for verify, such as tier-2.build');
  log('  --claim=<text>       Claim a verify command checks');
  log('  --timeout=<seconds>  Kill a verify command after this many seconds (default 300)');
  log('  --attest             Record a self-reported attested claim instead of executing');
  log('  --evidence=<text>    Self-reported evidence for verify --attest');
  log('  --json               Emit JSON for status, next, proof, or automation commands');
  log('  --brief              Render compact output for status, next, or proof');
  log('  --full               Render complete output for status, next, or demo');
  log('  --dry-run            Preview a surface profile change');
  log('  --apply              Apply a surface profile change');
  log('  --runtime=<name>     Runtime target for surface, such as codex');
  log('  --name=<scope/name>  Extension package name for extension-scaffold');
  log('  --output=<path>      Extension output root for extension-scaffold');
  log('  --skill=<name>       Extension skill name for extension-scaffold');
  log('  --agent=<name>       Extension agent name for extension-scaffold');
  log('  --workflow=<name>    Extension workflow name for extension-scaffold');
  log('  -g, --global         Install globally to the config directory');
  log('  -l, --local          Install locally to the current directory');
  log('  --claude             Install for Claude Code');
  log('  --codex              Install for Codex');
  log('  --cursor             Install for Cursor');
  log('  --windsurf           Install for Windsurf');
  log('  --opencode           Install for OpenCode');
  log('  --gemini             Install for Gemini CLI');
  log('  --copilot            Install for GitHub Copilot');
  log('  --augment            Install for Augment');
  log('  --trae               Install for Trae');
  log('  --cline              Install for Cline');
  log('  --kilo               Install for Kilo');
  log('  --antigravity        Install for Antigravity');
  log('  --qwen               Install for Qwen Code');
  log('  --codebuddy          Install for CodeBuddy');
  log('  --pi                 Install for Pi');
  log('  --all                Install for all 15 runtimes');
  log('  --profile=<name>     Install profile: core, builder, maintainer, suite, or full (default: core)');
  log('  --minimal            Alias for --profile=core');
  log('  -u, --uninstall      Uninstall Godpowers');
  log('  -h, --help           Show this help message');
  log('');
  log('Examples:');
  log('  npx godpowers status --project=.');
  log('  npx godpowers next --project=.');
  log('  npx godpowers state advance --step=prd --status=done --project=.');
  log('  npx godpowers gate --tier=prd --project=.');
  log('  npx godpowers verify "npm test" --substep tier-2.build --claim "build slice tests pass" --project=.');
  log('  npx godpowers mcp-info --project=.');
  log('  npx godpowers quick-proof --project=.');
  log('  npx godpowers automation-status --project=.');
  log('  npx godpowers automation-setup --project=.');
  log('  npx godpowers dogfood');
  log('  npx godpowers demo --project=.');
  log('  npx godpowers surface --profile=builder --codex --global --dry-run');
  log('  npx godpowers extension-scaffold --name=@godpowers/my-pack --output=.');
  log('  npx godpowers --claude --global');
  log('  npx godpowers --claude --global --profile=core');
  log('  npx godpowers --all');
  log('  npx godpowers --codex --cursor');
}

function applyDefaultRuntimeSelection(opts) {
  if (opts.runtimes.length > 0 || opts.all) return;
  if (!process.stdin.isTTY) {
    // Refuse to perform a silent global install when there is no human to
    // confirm and no explicit target was given (CI, piped, some npx contexts).
    warn('No runtime selected and stdin is not a TTY.');
    warn('Refusing a silent global install. Re-run with an explicit target,');
    warn('for example:  npx godpowers --claude --global   (or --all).');
    process.exit(1);
  }
  opts.runtimes = ['claude'];
  if (!opts.local) opts.global = true;
}

function runUninstall(opts) {
  let removed = 0;
  for (const runtime of opts.runtimes) {
    if (uninstallForRuntime(runtime, opts)) {
      removed++;
    }
  }
  log('');
  if (removed > 0) {
    log(`\x1b[32mUninstalled\x1b[0m from ${removed} runtime(s).`);
  } else {
    warn('No runtimes uninstalled.');
  }
  log('');
}

function runInstall(opts, srcDir) {
  let installed = 0;
  for (const runtime of opts.runtimes) {
    if (installForRuntime(runtime, srcDir, opts)) {
      installed++;
    }
  }

  if (installed === 0) {
    error('No runtimes installed. Run with --help for usage.');
    process.exit(1);
  }

  const surface = countInstalledSurface(srcDir, opts);
  log('');
  log(`\x1b[32mDone!\x1b[0m Installed Godpowers v${VERSION} for ${installed} runtime(s).`);
  log('');
  log(`\x1b[36mProfile:\x1b[0m ${describeProfiles(opts.profile)}`);
  log(`\x1b[36mInstalled:\x1b[0m`);
  log(`  ${surface.skills} slash commands (try: /god, /god-plan, /god-status, /god-mode)`);
  log(`  ${surface.agents} specialist agents`);
  log('  Templates and references for artifact discipline');
  log('');
  log(`\x1b[36mNext steps:\x1b[0m`);
  log('  1. Open your AI coding tool in any project directory');
  log(`  2. Type: \x1b[36m/god\x1b[0m for the front door`);
  log(`     Or:   \x1b[36m/god-plan\x1b[0m to start planning`);
  log(`     Or:   \x1b[36m/god-mode\x1b[0m for the full autonomous project run`);
  log('');
  log(`\x1b[36mDocs:\x1b[0m ${identity.HOMEPAGE_URL}`);
  log('');
}

function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  if (cliDispatch.runCommand(opts)) return;

  console.log(BANNER);
  const srcDir = path.resolve(__dirname, '..');

  applyDefaultRuntimeSelection(opts);
  if (opts.all) {
    opts.runtimes = runtimeKeys();
  }

  if (opts.uninstall) {
    runUninstall(opts);
  } else {
    runInstall(opts, srcDir);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  showHelp,
  COMMAND_RUNNERS: cliDispatch.COMMAND_RUNNERS,
  runCommand: cliDispatch.runCommand,
  runAutomationCommand: cliDispatch.runAutomationCommand,
  runDashboardCommand: cliDispatch.runDashboardCommand,
  runDogfoodCommand: cliDispatch.runDogfoodCommand,
  runDemoCommand: cliDispatch.runDemoCommand,
  runQuickProofCommand: cliDispatch.runQuickProofCommand,
  runSurfaceCommand: cliDispatch.runSurfaceCommand,
  runMcpInfoCommand: cliDispatch.runMcpInfoCommand,
  runExtensionScaffoldCommand: cliDispatch.runExtensionScaffoldCommand,
  runGateCommand: cliDispatch.runGateCommand,
  runStateCommand: cliDispatch.runStateCommand,
  runVerifyCommand: cliDispatch.runVerifyCommand,
  applyDefaultRuntimeSelection,
  runInstall,
  runUninstall,
  RUNTIMES
};
