#!/usr/bin/env node
/**
 * Run the pinned official Agent Skills validator against this repository.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const executable = process.env.SKILLS_REF_BIN || 'skills-ref';
const result = spawnSync(executable, ['validate', projectRoot], {
  cwd: projectRoot,
  encoding: 'utf8',
  stdio: 'inherit'
});

if (result.error) {
  console.error('Official Agent Skills validator is required for release checks.');
  console.error('Install requirements/skills-ref.txt in an isolated Python environment,');
  console.error('then set SKILLS_REF_BIN to that environment skills-ref executable.');
  process.exit(1);
}

process.exit(result.status || 0);
