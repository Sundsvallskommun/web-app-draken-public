#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { getEnvArgDual } = require('./checkEnv');
const { devFile } = getEnvArgDual();

const args = ['-e', devFile, 'ts-node', './src/swagger-typescript-api.ts'];
execFileSync('dotenv', args, { stdio: 'inherit', shell: true });
