// Implements: P-MUST-49
/**
 * Deterministic invocation policy for core Godpowers commands.
 */

const POLICY_VALUES = Object.freeze([
  'explicit-only',
  'suggestible',
  'auto-local',
  'auto-bounded',
  'approval-required'
]);

const CANONICAL_ROUTE_FILE = /^god(?:-[a-z-]+)?\.yaml$/;

const EXPLICIT_ONLY = new Set([
  '/god-mode',
  '/god-party'
]);

const AUTO_LOCAL = new Set([
  '/god-automation-status',
  '/god-context-scan',
  '/god-next',
  '/god-progress',
  '/god-status'
]);

const AUTO_BOUNDED = new Set([
  '/god-context',
  '/god-design',
  '/god-docs',
  '/god-harden',
  '/god-preflight',
  '/god-reconcile',
  '/god-scan',
  '/god-sync',
  '/god-test-runtime'
]);

const APPROVAL_REQUIRED = new Set([
  '/god-automation-setup',
  '/god-cache-clear',
  '/god-connect',
  '/god-deploy',
  '/god-export-otel',
  '/god-extension-add',
  '/god-extension-remove',
  '/god-launch',
  '/god-observe',
  '/god-pr-branch',
  '/god-redo',
  '/god-repair',
  '/god-restore',
  '/god-review-changes',
  '/god-rollback',
  '/god-ship',
  '/god-skip',
  '/god-smite',
  '/god-suite-release',
  '/god-undo',
  '/god-update-deps',
  '/god-upgrade'
]);

function expectedPolicy(command) {
  if (EXPLICIT_ONLY.has(command)) return 'explicit-only';
  if (AUTO_LOCAL.has(command)) return 'auto-local';
  if (AUTO_BOUNDED.has(command)) return 'auto-bounded';
  if (APPROVAL_REQUIRED.has(command)) return 'approval-required';
  return 'suggestible';
}

function isValidPolicy(value) {
  return typeof value === 'string' && POLICY_VALUES.includes(value);
}

function canonicalCommandForRoutePath(routePath) {
  const file = String(routePath || '').split(/[\\/]/).pop();
  if (!CANONICAL_ROUTE_FILE.test(file)) return null;
  return `/${file.slice(0, -'.yaml'.length)}`;
}

function inspectRouteRecords(records) {
  const issues = [];
  const declarations = new Map();

  for (const record of records) {
    const canonicalCommand = canonicalCommandForRoutePath(record.file);
    if (!canonicalCommand) {
      issues.push({
        kind: 'noncanonical-file',
        file: record.file
      });
    } else if (record.command !== canonicalCommand) {
      issues.push({
        kind: 'spoofed-command',
        file: record.file,
        command: record.command,
        expected: canonicalCommand
      });
    }

    if (typeof record.command === 'string' && record.command.length > 0) {
      const files = declarations.get(record.command) || [];
      files.push(record.file);
      declarations.set(record.command, files);
    }
  }

  for (const [command, files] of declarations) {
    if (files.length > 1) {
      issues.push({
        kind: 'duplicate-command',
        command,
        files
      });
    }
  }

  return issues;
}

module.exports = {
  POLICY_VALUES,
  expectedPolicy,
  isValidPolicy,
  canonicalCommandForRoutePath,
  inspectRouteRecords
};
