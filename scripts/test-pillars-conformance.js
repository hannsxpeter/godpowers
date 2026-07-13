#!/usr/bin/env node
/**
 * Execute the Pillars 1.1 portable routing conformance fixtures.
 */

const fs = require('fs');
const path = require('path');

const { parseSimpleYaml } = require('../lib/intent');
const pillars = require('../lib/pillars');
const { test, report, assert } = require('./test-harness');

const fixturePath = path.resolve(__dirname, '..', 'tests', 'pillars-conformance', 'fixtures.yaml');
const fixtureRoot = path.dirname(fixturePath);
const fixture = parseSimpleYaml(fs.readFileSync(fixturePath, 'utf8'));

function normalized(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertSame(actual, expected, label) {
  const left = normalized(actual);
  const right = normalized(expected);
  assert(
    JSON.stringify(left) === JSON.stringify(right),
    `${label}: expected ${JSON.stringify(right)}, got ${JSON.stringify(left)}`
  );
}

console.log('\n  Pillars 1.1 conformance tests\n');

for (const fixtureCase of fixture.cases || []) {
  test(fixtureCase.name, () => {
    const projectRoot = path.resolve(fixtureRoot, fixtureCase.project);
    const result = pillars.computeLoadSet(projectRoot, fixtureCase.task, {
      target: fixtureCase.target
    });
    const load = result.loadSet.map((item) => `${item.scopeLabel}::${item.identity}`);
    const primaries = result.scopes.flatMap((scope) =>
      scope.primaries.map((identity) => `${scope.scopeLabel}::${identity}`)
    );
    const absent = result.absent.map((item) => `${item.scopeLabel}::${item.pillar}`);

    assertSame(load, fixtureCase.expected.load, 'load');
    assertSame(primaries, fixtureCase.expected.primaries, 'primaries');
    assertSame(absent, fixtureCase.expected.absent, 'absent');
  });
}

report();
