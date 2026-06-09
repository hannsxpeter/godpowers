#!/usr/bin/env node
/**
 * Dedicated coverage for the dependency-free YAML subset parser.
 */

const { test, assert, report } = require('./test-harness');
const intent = require('../lib/intent');

console.log('\n  YAML parser behavioral tests\n');

test('preserves quoted colon values', () => {
  const parsed = intent.parseSimpleYaml('metadata:\n  description: "agent: planner"\n');
  assert(parsed.metadata.description === 'agent: planner',
    `description: ${parsed.metadata.description}`);
});

test('preserves hashes inside quoted strings', () => {
  const parsed = intent.parseSimpleYaml('metadata:\n  name: "demo #1" # comment\n');
  assert(parsed.metadata.name === 'demo #1',
    `name: ${parsed.metadata.name}`);
});

test('parses inline arrays with quoted commas', () => {
  const parsed = intent.parseSimpleYaml('commands: ["/god-prd", "label, with comma", 3, true]\n');
  assert(parsed.commands.length === 4, `commands: ${JSON.stringify(parsed.commands)}`);
  assert(parsed.commands[1] === 'label, with comma',
    `quoted comma: ${parsed.commands[1]}`);
  assert(parsed.commands[2] === 3, `number: ${parsed.commands[2]}`);
  assert(parsed.commands[3] === true, `boolean: ${parsed.commands[3]}`);
});

test('parses arrays of scalars under a key', () => {
  const parsed = intent.parseSimpleYaml('on:\n  - /god-init\n  - /god-prd\n');
  assert(Array.isArray(parsed.on), `on: ${JSON.stringify(parsed.on)}`);
  assert(parsed.on[0] === '/god-init', `first: ${parsed.on[0]}`);
  assert(parsed.on[1] === '/god-prd', `second: ${parsed.on[1]}`);
});

test('parses indented empty array shorthand', () => {
  const parsed = intent.parseSimpleYaml(`prerequisites:
  required:
    []
execution:
  writes:
    []
`, { strict: true });
  assert(Array.isArray(parsed.prerequisites.required),
    `required: ${JSON.stringify(parsed.prerequisites.required)}`);
  assert(parsed.prerequisites.required.length === 0,
    `required length: ${parsed.prerequisites.required.length}`);
  assert(Array.isArray(parsed.execution.writes),
    `writes: ${JSON.stringify(parsed.execution.writes)}`);
});

test('parses arrays of objects with sibling fields', () => {
  const parsed = intent.parseSimpleYaml(`jobs:
  - id: plan
    uses: god-planner
    needs: [prd, arch]
  - id: build
    uses: god-executor
`);
  assert(Array.isArray(parsed.jobs), `jobs: ${JSON.stringify(parsed.jobs)}`);
  assert(parsed.jobs[0].id === 'plan', `id: ${parsed.jobs[0].id}`);
  assert(parsed.jobs[0].uses === 'god-planner', `uses: ${parsed.jobs[0].uses}`);
  assert(parsed.jobs[0].needs[1] === 'arch', `needs: ${JSON.stringify(parsed.jobs[0].needs)}`);
  assert(parsed.jobs[1].id === 'build', `second id: ${parsed.jobs[1].id}`);
});

test('folded block scalars collapse internal whitespace', () => {
  const parsed = intent.parseSimpleYaml(`metadata:
  description: >
    Line one
    line two
`);
  assert(parsed.metadata.description === 'Line one line two',
    `description: ${JSON.stringify(parsed.metadata.description)}`);
});

test('strict mode reports skipped malformed lines', () => {
  const parsed = intent.parseSimpleYamlWithDiagnostics(`metadata:
  name: demo
  not yaml
mode: A
`, { strict: true, source: 'intent.yaml' });
  assert(parsed.data.metadata.name === 'demo', `name: ${parsed.data.metadata.name}`);
  assert(parsed.data.mode === 'A', `mode: ${parsed.data.mode}`);
  assert(parsed.diagnostics.length === 1,
    `diagnostics: ${JSON.stringify(parsed.diagnostics)}`);
  assert(parsed.diagnostics[0].line === 3, `line: ${parsed.diagnostics[0].line}`);
});

test('default mode preserves legacy skipped-line behavior', () => {
  const parsed = intent.parseSimpleYamlWithDiagnostics('ok: true\nnot yaml\n');
  assert(parsed.data.ok === true, `ok: ${parsed.data.ok}`);
  assert(parsed.diagnostics.length === 0,
    `diagnostics: ${JSON.stringify(parsed.diagnostics)}`);
});

test('rejects unsafe prototype-pollution keys', () => {
  const parsed = intent.parseSimpleYamlWithDiagnostics(`safe: value
__proto__:
  polluted: true
constructor: bad
`, { strict: true, unsafeKeySeverity: 'error' });
  assert(parsed.data.safe === 'value', `safe: ${parsed.data.safe}`);
  assert(!Object.prototype.polluted, 'Object prototype polluted');
  assert(!parsed.data.__proto__.polluted, 'parsed prototype polluted');
  assert(parsed.data.constructor !== 'bad', `constructor: ${parsed.data.constructor}`);
  assert(parsed.diagnostics.length === 2,
    `diagnostics: ${JSON.stringify(parsed.diagnostics)}`);
  assert(parsed.diagnostics.every((diagnostic) => diagnostic.severity === 'error'),
    `severities: ${JSON.stringify(parsed.diagnostics)}`);
});

report('YAML parser behavioral tests');
