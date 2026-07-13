#!/usr/bin/env node
/**
 * Behavioral tests for lib/agent-validator.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const validator = require('../lib/agent-validator');
const { test, report } = require('./test-harness');


function mkAgent(content) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-agent-test-'));
  const file = path.join(tmp, 'god-test-agent.md');
  fs.writeFileSync(file, content);
  return file;
}

function mkAgentsDir(agents) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-agent-dir-'));
  fs.mkdirSync(path.join(tmp, 'specialists'), { recursive: true });
  for (const [name, content] of Object.entries(agents)) {
    fs.writeFileSync(path.join(tmp, 'specialists', name + '.md'), content);
  }
  return tmp;
}

function readProjectFile(relPath) {
  return fs.readFileSync(path.join('.', relPath), 'utf8');
}

console.log('\n  Agent validator behavioral tests\n');

// ============================================================================
// parseAgentFile
// ============================================================================

test('parseAgentFile extracts frontmatter and sections', () => {
  const file = mkAgent(`---
name: god-test
description: A test agent
tools: Read, Write
---

# God Test

Some intro.

## Inputs

- Project root

## Have-Nots

- You fail if X
`);
  const agent = validator.parseAgentFile(file);
  if (agent.frontmatter.name !== 'god-test') throw new Error('name not parsed');
  if (agent.frontmatter.description !== 'A test agent') throw new Error('desc not parsed');
  if (!agent.sections['Inputs']) throw new Error('Inputs section missed');
  if (!agent.sections['Have-Nots']) throw new Error('Have-Nots section missed');
});

test('parseAgentFile handles multiline frontmatter values', () => {
  const file = mkAgent(`---
name: god-test
description: |
  Line 1.
  Line 2.
  Line 3.
tools: Read
---

# Body
`);
  const agent = validator.parseAgentFile(file);
  if (!agent.frontmatter.description.includes('Line 1')) throw new Error('multiline lost');
  if (!agent.frontmatter.description.includes('Line 3')) throw new Error('last line lost');
});

test('parseAgentFile handles agent without frontmatter', () => {
  const file = mkAgent(`# Just a heading\n\nNo frontmatter here.`);
  const agent = validator.parseAgentFile(file);
  if (Object.keys(agent.frontmatter).length !== 0) throw new Error('expected empty frontmatter');
  if (!agent.sections['Just a heading']) throw new Error('section parse failed');
});

// ============================================================================
// validateAgent
// ============================================================================

test('validateAgent flags missing name as error', () => {
  const file = mkAgent(`---
description: missing name
---`);
  const agent = validator.parseAgentFile(file);
  const findings = validator.validateAgent(agent);
  if (!findings.find(f => f.severity === 'error' && f.kind === 'missing-required-frontmatter')) {
    throw new Error('not flagged');
  }
});

test('validateAgent flags missing description as error', () => {
  const file = mkAgent(`---
name: god-x
---`);
  const agent = validator.parseAgentFile(file);
  const findings = validator.validateAgent(agent);
  if (!findings.find(f => f.severity === 'error')) throw new Error('not flagged');
});

test('validateAgent flags missing tools as warning', () => {
  const file = mkAgent(`---
name: god-x
description: x
---`);
  const agent = validator.parseAgentFile(file);
  const findings = validator.validateAgent(agent);
  if (!findings.find(f => f.severity === 'warning' && f.kind === 'missing-recommended-frontmatter')) {
    throw new Error('not flagged');
  }
});

test('validateAgent flags missing contract frontmatter as warning when enabled', () => {
  const file = mkAgent(`---
name: god-x
description: x
tools: Read
---

# God X

## Inputs

what i read

## Outputs

what i write

## Have-Nots

what fails

## Handoff

what next
`);
  const agent = validator.parseAgentFile(file);
  const findings = validator.validateAgent(agent, { contractSeverity: 'warning' });
  const contractWarnings = findings.filter(f => (
    f.severity === 'warning' && f.kind === 'missing-contract-frontmatter'
  ));
  if (contractWarnings.length !== 4) {
    throw new Error(`expected 4 contract warnings, got ${contractWarnings.length}`);
  }
});

test('validateAgent accepts complete structured contract frontmatter', () => {
  const file = mkAgent(`---
name: god-x
description: x
tools: Read
inputs: ["task request"]
outputs: ["contract artifact"]
gates: ["contract validation"]
handoff: ["return to caller"]
---

# God X

## Inputs

what i read

## Outputs

what i write

## Have-Nots

what fails

## Handoff

what next
`);
  const agent = validator.parseAgentFile(file);
  const findings = validator.validateAgent(agent, { contractSeverity: 'warning' });
  const contractFindings = findings.filter(f => f.kind && f.kind.includes('contract-frontmatter'));
  if (contractFindings.length !== 0) {
    throw new Error(`expected 0 contract findings, got ${contractFindings.length}`);
  }
});

test('validateAgent issues info for missing recommended sections', () => {
  const file = mkAgent(`---
name: god-x
description: x
tools: Read
---

# God X

Just a body.
`);
  const agent = validator.parseAgentFile(file);
  const findings = validator.validateAgent(agent);
  const infos = findings.filter(f => f.severity === 'info');
  if (infos.length === 0) throw new Error('expected info findings for missing sections');
});

test('validateAgent passes clean when all sections present', () => {
  const file = mkAgent(`---
name: god-x
description: x
tools: Read
---

# God X

## Inputs

what i read

## Outputs

what i write

## Have-Nots

what fails

## Handoff

what next
`);
  const agent = validator.parseAgentFile(file);
  const findings = validator.validateAgent(agent);
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  if (errors.length > 0) throw new Error(`expected 0 errors, got ${errors.length}`);
  if (warnings.length > 0) throw new Error(`expected 0 warnings, got ${warnings.length}`);
});

// ============================================================================
// findHandoffTargets
// ============================================================================

test('findHandoffTargets extracts agent names from spawn references', () => {
  const file = mkAgent(`---
name: god-test
description: x
---

After verification, spawn god-pm in a fresh context.

If failure, spawn \`god-doctor\` to diagnose.
`);
  const agent = validator.parseAgentFile(file);
  const targets = validator.findHandoffTargets(agent);
  if (!targets.includes('god-pm')) throw new Error('god-pm missed');
  if (!targets.includes('god-doctor')) throw new Error('god-doctor missed');
});

test('findHandoffTargets returns empty for agent with no spawns', () => {
  const file = mkAgent(`---
name: god-test
description: x
---

I do my work alone.
`);
  const agent = validator.parseAgentFile(file);
  const targets = validator.findHandoffTargets(agent);
  if (targets.length !== 0) throw new Error('expected 0');
});

// ============================================================================
// findOutputPaths
// ============================================================================

test('findOutputPaths extracts .godpowers/ artifact paths', () => {
  const file = mkAgent(`---
name: god-test
description: x
---

I write .godpowers/test/STATE.mdx and append to .godpowers/state.json.
`);
  const agent = validator.parseAgentFile(file);
  const paths = validator.findOutputPaths(agent);
  if (!paths.includes('.godpowers/test/STATE.mdx')) throw new Error('path missed');
});

test('findOutputPaths prefers structured outputs frontmatter when present', () => {
  const file = mkAgent(`---
name: god-test
description: x
outputs: [".godpowers/test/STATE.mdx"]
---

I read .godpowers/prd/PRD.mdx and write nothing else.
`);
  const agent = validator.parseAgentFile(file);
  const paths = validator.findOutputPaths(agent);
  if (!paths.includes('.godpowers/test/STATE.mdx')) throw new Error('structured path missed');
  if (paths.includes('.godpowers/prd/PRD.mdx')) throw new Error('input path should not be claimed');
});

test('findOutputPaths picks up project-root MD files', () => {
  const file = mkAgent(`---
name: god-test
description: x
---

I write DESIGN.md at the project root.
`);
  const agent = validator.parseAgentFile(file);
  const paths = validator.findOutputPaths(agent);
  if (!paths.includes('DESIGN.md')) throw new Error('DESIGN.md missed');
});

// ============================================================================
// crossValidate
// ============================================================================

test('crossValidate flags unresolved hand-off target', () => {
  const tmp = mkAgentsDir({
    'god-a': `---
name: god-a
description: spawns nonexistent
---
After done, spawn god-nonexistent.
`,
    'god-real': `---
name: god-real
description: r
---`
  });
  const result = validator.auditAll(tmp);
  if (!result.summary.crossFindings.find(f => f.kind === 'unresolved-handoff')) {
    throw new Error('not flagged');
  }
});

test('crossValidate does not flag valid hand-off target', () => {
  const tmp = mkAgentsDir({
    'god-a': `---
name: god-a
description: spawns real
---
After done, spawn god-real.
`,
    'god-real': `---
name: god-real
description: r
---`
  });
  const result = validator.auditAll(tmp);
  const unresolved = result.summary.crossFindings.filter(f => f.kind === 'unresolved-handoff');
  if (unresolved.length !== 0) throw new Error('false positive');
});

test('auditAll ignores non-specialist files in specialists directory', () => {
  const tmp = mkAgentsDir({
    'context': '# Context\n\nProject context, not a specialist agent.\n',
    'repo': '# Repo\n\nRepository context, not a specialist agent.\n',
    'god-real': `---
name: god-real
description: r
---`
  });
  const result = validator.auditAll(tmp);
  if (result.summary.agentCount !== 1) {
    throw new Error(`expected 1 specialist agent, got ${result.summary.agentCount}`);
  }
  if (result.summary.errors !== 0) {
    throw new Error(`expected 0 errors, got ${result.summary.errors}`);
  }
});

test('non-god-mode orchestrator entrypoints use display-safe handoffs', () => {
  const checks = [
    ['skills/god-init.md', 'INIT-ORCHESTRATOR-HANDOFF.md'],
    ['skills/god-suite-init.md', 'COORDINATOR-HANDOFF.md'],
    ['skills/god-suite-release.md', 'COORDINATOR-HANDOFF.md'],
    ['skills/god-suite-patch.md', 'COORDINATOR-HANDOFF.md'],
    ['specialists/god-coordinator.md', 'COORDINATOR-ORCHESTRATOR-HANDOFF.md'],
  ];
  for (const [relPath, marker] of checks) {
    const text = readProjectFile(relPath);
    if (!text.includes(marker)) {
      throw new Error(`${relPath} missing ${marker}`);
    }
    if (!text.includes('display-safe')) {
      throw new Error(`${relPath} missing display-safe spawn wording`);
    }
  }
});

test('hygiene route does not spawn orchestrator directly', () => {
  const text = readProjectFile('routing/god-hygiene.yaml');
  if (text.includes('god-orchestrator')) {
    throw new Error('god-hygiene route should not list god-orchestrator');
  }
});

// ============================================================================
// auditAll on real godpowers/specialists
// ============================================================================

test('auditAll on real godpowers/specialists passes (no errors)', () => {
  const result = validator.auditAll('.');
  if (result.summary.errors > 0) {
    throw new Error(`expected 0 errors, got ${result.summary.errors}`);
  }
});

test('auditAll on real godpowers/specialists covers 30+ agents', () => {
  const result = validator.auditAll('.');
  if (result.summary.agentCount < 30) {
    throw new Error(`expected 30+ agents, got ${result.summary.agentCount}`);
  }
});

test('auditAll on real godpowers/specialists has structured contracts for every shipped agent', () => {
  const result = validator.auditAll('.');
  if (result.summary.agentCount !== 40) {
    throw new Error(`expected 40 agents, got ${result.summary.agentCount}`);
  }
  if (result.summary.structuredContractCount !== 40) {
    throw new Error(`expected 40 structured contracts, got ${result.summary.structuredContractCount}`);
  }
  const contractFindings = result.allFindings.filter(f => f.kind && f.kind.includes('contract-frontmatter'));
  if (contractFindings.length !== 0) {
    throw new Error(`expected 0 contract findings, got ${contractFindings.length}`);
  }
});

report();
