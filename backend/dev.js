#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { getEnvArgDual } = require('./checkEnv');
const { devFile } = getEnvArgDual();

const args = ['-e', devFile, 'cross-env', 'NODE_ENV=development', 'nodemon'];

execFileSync('dotenv', args, { stdio: 'inherit', shell: true });
