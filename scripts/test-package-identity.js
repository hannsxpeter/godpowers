#!/usr/bin/env node

const pkg = require('../package.json');
const identity = require('../lib/package-identity');
const { test, assert, report } = require('./test-harness');

test('package identity mirrors package metadata', () => {
  assert(identity.PACKAGE_NAME === pkg.name, 'name mismatch');
  assert(identity.PACKAGE_VERSION === pkg.version, 'version mismatch');
  assert(identity.BIN_NAME === 'godpowers', `bin: ${identity.BIN_NAME}`);
});

test('repoSlug derives owner and repo from repository url', () => {
  assert(identity.repoSlug() === 'hannsxpeter/godpowers', `repo slug: ${identity.repoSlug()}`);
});

test('npxCommand uses canonical package name', () => {
  assert(identity.npxCommand('2.2.1') === 'npx godpowers@2.2.1');
});

report('Package identity behavioral tests');
