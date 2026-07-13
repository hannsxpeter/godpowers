#!/usr/bin/env node

const truth = require('../lib/self-project-truth');

const result = truth.check(process.cwd());
console.log(truth.render(result));
if (result.verdict !== 'pass') process.exitCode = 1;
