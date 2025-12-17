#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { getEnvArg } = require('./checkEnv');
const { envFile } = getEnvArg();

execFileSync('node', ['../scripts/generate-deploy-info.js'], { stdio: 'inherit' });
execFileSync('npx', ['dotenv', '-e', envFile, '--', 'next', 'dev'], { stdio: 'inherit', shell: true });
