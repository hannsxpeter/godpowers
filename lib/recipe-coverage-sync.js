/**
 * Recipe coverage sync.
 *
 * Keeps fuzzy user intent connected to shipped command routes for the
 * high-frequency areas that users naturally ask for in prose.
 */

const fs = require('fs');
const path = require('path');

const recipes = require('./recipes');
const { read, write } = require('./sync-fs');

const LOG_PATH = '.godpowers/surface/RECIPE-COVERAGE-SYNC.md';

const REQUIRED_COVERAGE = [
  {
    id: 'release-maintenance',
    description: 'release maintenance',
    commands: ['/god-sync', '/god-docs', '/god-version']
  },
  {
    id: 'docs-drift',
    description: 'documentation drift',
    commands: ['/god-docs']
  },
  {
    id: 'context-refresh',
    description: 'context refresh and feature awareness',
    commands: ['/god-context', '/god-sync', '/god-status']
  },
  {
    id: 'story-work',
    description: 'story creation, build, verify, and close',
    commands: ['/god-story', '/god-story-build', '/god-story-verify', '/god-story-close']
  },
  {
    id: 'automation-setup',
    description: 'automation setup and status',
    commands: ['/god-automation-setup', '/god-automation-status']
  }
];


function addCheck(checks, id, status, relPath, message, opts = {}) {
  checks.push({
    area: 'recipe-coverage',
    id,
    status,
    path: relPath,
    message,
    severity: opts.severity || (status === 'fresh' ? 'info' : 'warning'),
    spawn: opts.spawn || null
  });
}

function recipePath(projectRoot, name) {
  const rel = `routing/recipes/${name}.yaml`;
  return fs.existsSync(path.join(projectRoot, rel)) ? rel : 'routing/recipes/';
}

function detect(projectRoot) {
  recipes.clearCache();
  const checks = [];
  const all = recipes.loadAll();
  const recipeTexts = new Map();
  for (const recipe of all) {
    const name = recipe.metadata && recipe.metadata.name;
    if (!name) continue;
    recipeTexts.set(name, read(projectRoot, `routing/recipes/${name}.yaml`));
  }

  for (const required of REQUIRED_COVERAGE) {
    const matched = [...recipeTexts.entries()].filter(([, text]) =>
      required.commands.every((command) => text.includes(command))
    );
    addCheck(
      checks,
      `coverage-${required.id}`,
      matched.length > 0 ? 'fresh' : 'stale',
      matched.length > 0 ? `routing/recipes/${matched[0][0]}.yaml` : recipePath(projectRoot, required.id),
      matched.length > 0
        ? `Recipe coverage exists for ${required.description}.`
        : `No recipe covers ${required.description} with ${required.commands.join(', ')}.`,
      { spawn: matched.length > 0 ? null : 'god-reconciler' }
    );
  }

  const stale = checks.filter((check) => check.status !== 'fresh');
  return {
    status: stale.length === 0 ? 'fresh' : 'stale',
    checks,
    stale
  };
}

function appendLog(projectRoot, before, after) {
  const now = new Date().toISOString();
  const lines = [];
  if (fs.existsSync(path.join(projectRoot, LOG_PATH))) {
    lines.push(read(projectRoot, LOG_PATH).replace(/\s*$/, ''));
    lines.push('');
  } else {
    lines.push('# Recipe Coverage Sync Log');
    lines.push('');
    lines.push('- [DECISION] This file records recipe-coverage sync checks run by Godpowers.');
    lines.push('');
  }
  lines.push(`## ${now}`);
  lines.push('');
  lines.push(`- [DECISION] Recipe coverage status before apply was ${before.status}.`);
  lines.push(`- [DECISION] Recipe coverage status after apply is ${after.status}.`);
  lines.push('');
  write(projectRoot, LOG_PATH, lines.join('\n'));
}

function run(projectRoot, opts = {}) {
  const before = detect(projectRoot);
  const after = detect(projectRoot);
  if (opts.log !== false) appendLog(projectRoot, before, after);
  return {
    before,
    after,
    applied: [],
    logPath: opts.log === false ? null : LOG_PATH
  };
}

function summary(report) {
  return report.status === 'fresh' ? 'fresh' : `${report.stale.length} stale`;
}

module.exports = {
  LOG_PATH,
  REQUIRED_COVERAGE,
  detect,
  run,
  summary
};
