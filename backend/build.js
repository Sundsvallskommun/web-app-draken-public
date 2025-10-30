#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { getEnvArgDual } = require('./checkEnv');
const { devFile, prodFile } = getEnvArgDual();

const args = ['-e', devFile, '-e', prodFile, '--', 'tsc'];

execFileSync('dotenv', args, { stdio: 'inherit', shell: true });
execFileSync('tsc-alias', [], { stdio: 'inherit', shell: true });
