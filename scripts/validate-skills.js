#!/usr/bin/env node

/**
 * Validate all skill files have required structure:
 * - YAML frontmatter with name and description
 * - At least one trigger phrase in description
 * - A markdown body with instructions
 */

const fs = require('fs');
const path = require('path');
const frontmatter = require('../lib/frontmatter');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const REQUIRED_FIELDS = ['name', 'description'];

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  + ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`  x ${msg}`);
  failed++;
}

console.log('\n  Skill Validation\n');

const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));

for (const file of files) {
  const filePath = path.join(SKILLS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check frontmatter exists
  const parsed = frontmatter.split(content, { strict: true, source: file, require: true });
  const fm = parsed.frontmatter;
  if (!fm) {
    fail(`${file}: missing frontmatter`);
    continue;
  }
  for (const diagnostic of parsed.diagnostics) {
    fail(`${file}: frontmatter ${diagnostic.message}`);
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (fm[field]) {
      pass(`${file}: has ${field}`);
    } else {
      fail(`${file}: missing ${field}`);
    }
  }

  // Check description has trigger phrases
  if (fm.description && fm.description.includes('Triggers on')) {
    pass(`${file}: has trigger phrases`);
  } else {
    fail(`${file}: missing trigger phrases in description`);
  }

  // Check body content exists after frontmatter
  const body = content.replace(/^---[\s\S]*?---/, '').trim();
  if (body.length > 100) {
    pass(`${file}: has substantive body (${body.length} chars)`);
  } else {
    fail(`${file}: body too short (${body.length} chars)`);
  }
}

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
