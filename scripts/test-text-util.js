#!/usr/bin/env node

const { slugify } = require('../lib/text-util');
const { test, assert, report } = require('./test-harness');

test('slugify lowercases, collapses, trims, and truncates to 40 chars', () => {
  assert(slugify('Green Build!') === 'green-build', `got ${slugify('Green Build!')}`);
  assert(slugify('  --Hello, World--  ') === 'hello-world', 'edge dashes stripped');
  assert(slugify('a'.repeat(60)).length === 40, 'truncated to 40');
});

test('slugify returns the fallback for empty/symbol-only input', () => {
  assert(slugify('') === '', 'empty default fallback is empty string');
  assert(slugify('!!!', 'increment') === 'increment', 'symbols only -> fallback');
  assert(slugify(null, 'x') === 'x', 'null -> fallback');
  assert(slugify('ok', 'increment') === 'ok', 'non-empty stays');
});

report('text-util tests');
