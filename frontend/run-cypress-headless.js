#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { getEnvArg } = require('./checkEnv');
const { envFile } = getEnvArg();

execFileSync(
  'npx',
  ['dotenv', '-e', envFile, '--', 'cross-env', 'ELECTRON_EXTRA_LAUNCH_ARGS=--disable-gpu-sandbox', 'cypress', 'run'],
  { stdio: 'inherit', shell: true }
);
