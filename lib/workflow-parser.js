/**
 * Workflow Parser
 *
 * Parse workflow YAML files into a structured DAG.
 * Used by the workflow runner and by tests.
 */

const fs = require('fs');
const path = require('path');
const { parseSimpleYaml, formatDiagnostic } = require('./intent');

function warnYamlDiagnostic(diagnostic) {
  console.warn(`[godpowers] YAML warning ${formatDiagnostic(diagnostic)}`);
}

/**
 * Parse a workflow YAML file into a structured object.
 */
function parseFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, filePath);
}

/**
 * Parse YAML content into a workflow object.
 */
function parse(yamlContent, source = 'workflow.yaml') {
  const parsed = parseSimpleYaml(yamlContent, {
    strict: true,
    source,
    onDiagnostic: warnYamlDiagnostic
  });
  validate(parsed);
  return parsed;
}

/**
 * Validate workflow structure. Throws on invalid.
 */
function validate(workflow) {
  const errors = [];
  if (workflow.apiVersion !== 'godpowers/v1') errors.push('apiVersion must be godpowers/v1');
  if (workflow.kind !== 'Workflow') errors.push('kind must be Workflow');
  if (!workflow.metadata || !workflow.metadata.name) errors.push('metadata.name required');
  if (!workflow.metadata.version) errors.push('metadata.version required');
  if (!workflow.on || !Array.isArray(workflow.on) || workflow.on.length === 0) {
    errors.push('on must be a non-empty array');
  }
  if (!workflow.jobs || typeof workflow.jobs !== 'object') {
    errors.push('jobs must be an object');
  } else {
    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      if (!job.uses) errors.push(`jobs.${jobId}.uses required`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid workflow:\n  - ${errors.join('\n  - ')}`);
  }
  return true;
}

/**
 * Build a topological order of job IDs.
 * Returns array of arrays; each inner array is a "wave" that can run in parallel.
 */
function buildWaves(workflow) {
  const jobs = workflow.jobs;
  const remaining = new Set(Object.keys(jobs));
  const completed = new Set();
  const waves = [];

  while (remaining.size > 0) {
    const wave = [];
    for (const jobId of remaining) {
      const needs = normalizeNeeds(jobs[jobId].needs);
      if (needs.every(n => completed.has(n))) {
        wave.push(jobId);
      }
    }
    if (wave.length === 0) {
      throw new Error(`Cyclic dependency or unresolved needs in workflow ${workflow.metadata.name}`);
    }
    for (const jobId of wave) {
      remaining.delete(jobId);
      completed.add(jobId);
    }
    waves.push(wave);
  }

  return waves;
}

function normalizeNeeds(needs) {
  if (!needs) return [];
  if (typeof needs === 'string') return [needs];
  return needs;
}

/**
 * Load all workflows from a directory.
 */
function loadAll(dir) {
  if (!fs.existsSync(dir)) return {};
  const result = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    const workflow = parseFile(path.join(dir, file));
    result[workflow.metadata.name] = workflow;
  }
  return result;
}

module.exports = { parse, parseFile, validate, buildWaves, loadAll, normalizeNeeds };
