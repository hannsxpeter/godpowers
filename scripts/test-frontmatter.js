#!/usr/bin/env node
/**
 * Shared frontmatter parser tests.
 */

const { test, assert, report } = require('./test-harness');
const frontmatter = require('../lib/frontmatter');
const skillSurface = require('../lib/skill-surface');

console.log('\n  Frontmatter parser tests\n');

test('split extracts frontmatter and markdown body', () => {
  const parsed = frontmatter.split(`---
name: god-test
description: |
  Line one
  Line two
triggers: [alpha, beta]
---
# Body

Instructions.
`, { strict: true, source: 'example.md' });

  assert(parsed.frontmatter.name === 'god-test', `name: ${parsed.frontmatter.name}`);
  assert(parsed.frontmatter.description === 'Line one\nLine two',
    `description: ${JSON.stringify(parsed.frontmatter.description)}`);
  assert(parsed.frontmatter.triggers[1] === 'beta',
    `triggers: ${JSON.stringify(parsed.frontmatter.triggers)}`);
  assert(parsed.body.startsWith('# Body'), `body: ${parsed.body}`);
});

test('split reports unclosed frontmatter', () => {
  const parsed = frontmatter.split('---\nname: broken\n# Body\n', {
    strict: true,
    source: 'broken.md'
  });
  assert(parsed.frontmatter === null, `frontmatter: ${JSON.stringify(parsed.frontmatter)}`);
  assert(parsed.diagnostics.length === 1,
    `diagnostics: ${JSON.stringify(parsed.diagnostics)}`);
});

test('skill surface reads block description through shared parser', () => {
  const parsed = skillSurface.parseFrontmatter(`---
name: god-demo
description: |
  Triggers on: demo
  Does useful work.
---
# /god-demo
`);
  assert(parsed.name === 'god-demo', `name: ${parsed.name}`);
  assert(parsed.description.includes('Triggers on: demo'),
    `description: ${parsed.description}`);
});

report('Frontmatter parser tests');
