#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { getEnvArg } = require('./checkEnv');
const { envFile } = getEnvArg();

execFileSync('dotenv', ['-e', envFile, 'npx', 'tsx', './src/swagger-typescript-api.ts'], {
  stdio: 'inherit',
  shell: true,
});
