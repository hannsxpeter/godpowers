#!/usr/bin/env node
/**
 * Run a lightweight adoption canary against an external repository.
 *
 * This harness captures the CLI-verifiable parts of the canary: clone a repo,
 * render quick proof, render dashboard status, and render next-route output.
 * Host slash commands such as /god-preflight still require an AI coding host.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'install.js');
const adoptionMetrics = require('../lib/adoption-metrics');

function parseArgs(argv) {
  const opts = {
    repo: null,
    output: null,
    keep: false
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--keep') {
      opts.keep = true;
    } else if (arg.startsWith('--output=')) {
      opts.output = path.resolve(arg.slice('--output='.length));
    } else if (arg === '--output' && argv[i + 1]) {
      opts.output = path.resolve(argv[++i]);
    } else if (!opts.repo) {
      opts.repo = arg;
    }
  }
  return opts;
}

function run(command, args, opts = {}) {
  return cp.execFileSync(command, args, {
    cwd: opts.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: opts.timeout || 120000
  });
}

function slug(input) {
  return String(input)
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function usage() {
  console.log('Usage: node scripts/run-adoption-canary.js <git-url> [--output=report.md] [--keep]');
}

function buildReport(opts, cloneDir, outputs) {
  const metrics = adoptionMetrics.canaryMetrics(outputs);
  return [
    '# Adoption Canary Report',
    '',
    `- [DECISION] Repository: ${opts.repo}`,
    `- [DECISION] Clone path: ${cloneDir}`,
    '- [DECISION] This report captures CLI-verifiable trust signals only.',
    '- [OPEN QUESTION] Host slash commands such as `/god-preflight`, `/god-audit`, and `/god-reconstruct` still need an AI coding host. Owner: maintainer. Due: before public confidence claim.',
    '',
    '## Outcome Metrics',
    '',
    adoptionMetrics.renderCanary(metrics),
    '',
    '## Quick Proof',
    '',
    '```text',
    outputs.quickProof.trim(),
    '```',
    '',
    '## Status',
    '',
    '```text',
    outputs.status.trim(),
    '```',
    '',
    '## Next',
    '',
    '```text',
    outputs.next.trim(),
    '```',
    ''
  ].join('\n');
}

function main() {
  const opts = parseArgs(process.argv);
  if (!opts.repo) {
    usage();
    process.exit(1);
  }

  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-canary-'));
  const cloneDir = path.join(workRoot, slug(opts.repo) || 'repo');
  run('git', ['clone', '--depth=1', opts.repo, cloneDir], { timeout: 180000 });

  const outputs = {
    quickProof: run(process.execPath, [BIN, 'quick-proof', '--project', cloneDir, '--brief']),
    status: run(process.execPath, [BIN, 'status', '--project', cloneDir, '--brief']),
    next: run(process.execPath, [BIN, 'next', '--project', cloneDir, '--brief'])
  };

  const report = buildReport(opts, cloneDir, outputs);
  if (opts.output) {
    fs.mkdirSync(path.dirname(opts.output), { recursive: true });
    fs.writeFileSync(opts.output, report);
    console.log(`  + adoption canary report written to ${opts.output}`);
  } else {
    console.log(report);
  }

  if (!opts.keep) {
    fs.rmSync(workRoot, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`  x adoption canary failed: ${error.message}`);
  process.exit(1);
}
