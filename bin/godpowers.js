#!/usr/bin/env node

// Godpowers CLI: install into AI coding hosts and run project commands.
// All behavior lives in lib/cli.js so it can be tested without a subprocess.

const { main } = require('../lib/cli');

main().then(code => {
  process.exitCode = code;
});
