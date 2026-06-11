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
const { runCommand } = cliDispatch;

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
  log('  quick-proof          Show a runnable proof from the shipped fixture');
  log('  gate                 Run executable artifact gate for one tier');
  log('  automation-status    Show host automation provider support');
  log('  automation-setup     Show an opt-in automation setup plan');
  log('  dogfood              Run built-in messy-repo dogfood scenarios');
  log('  extension-scaffold   Create a publishable extension pack skeleton');
  log('');
  log('Command families:');
  for (const family of commandFamilies.COMMAND_FAMILIES) {
    log(`  ${family.id.padEnd(12)} ${family.purpose}`);
  }
  log('');
  log('Options:');
  log('  --project=<path>     Project root for status, next, proof, gate, or automation commands');
  log('  --tier=<name>        Tier for gate: prd, design, arch, roadmap, stack, repo, build, or harden');
  log('  --json               Emit JSON for status, next, proof, gate, or automation commands');
  log('  --brief              Render compact output for status, next, or proof');
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
  log('  --profile=<name>     Install profile: core, builder, maintainer, suite, or full');
  log('  --minimal            Alias for --profile=core');
  log('  -u, --uninstall      Uninstall Godpowers');
  log('  -h, --help           Show this help message');
  log('');
  log('Examples:');
  log('  npx godpowers status --project=.');
  log('  npx godpowers next --project=.');
  log('  npx godpowers quick-proof --project=.');
  log('  npx godpowers gate --tier=prd --project=.');
  log('  npx godpowers automation-status --project=.');
  log('  npx godpowers automation-setup --project=.');
  log('  npx godpowers dogfood');
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
  log(`  ${surface.skills} slash commands (try: /god-mode, /god-next, /god-status, /god-progress)`);
  log(`  ${surface.agents} specialist agents`);
  log('  Templates and references for artifact discipline');
  log('');
  log(`\x1b[36mNext steps:\x1b[0m`);
  log('  1. Open your AI coding tool in any project directory');
  log(`  2. Type: \x1b[36m/god-mode\x1b[0m for the full autonomous project run`);
  log(`     Or:   \x1b[36m/god-next\x1b[0m to see what to run next`);
  log(`     Or:   \x1b[36m/god-init\x1b[0m to start a new project`);
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

  if (runCommand(opts)) return;

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
  ...cliDispatch,
  applyDefaultRuntimeSelection,
  runInstall,
  runUninstall,
  RUNTIMES
};
