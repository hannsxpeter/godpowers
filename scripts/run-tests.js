#!/usr/bin/env node

// Run every test/*.test.js file with the built-in node:test runner.
// Listing files explicitly keeps the behavior the same on Node 18, 20, and 22.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = path.join(__dirname, '..', 'test');
const files = fs.readdirSync(dir).filter(file => file.endsWith('.test.js')).sort().map(file => path.join(dir, file));
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
