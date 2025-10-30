#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { getEnvArgDual } = require('./checkEnv');
const { devFile, prodFile } = getEnvArgDual();

const args = ['NODE_ENV=production', 'dotenv', '-e', devFile, '-e', prodFile, 'node', 'dist/server.js'];

execFileSync('cross-env', args, { stdio: 'inherit', shell: true });
