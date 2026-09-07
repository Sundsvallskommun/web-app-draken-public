const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { prepareImageEnvironment } = require('./assert-dragon-image.cjs');
const { replaceFrontendEnvironment } = require('./replace-frontend-env.cjs');

const side = process.argv[2];
if (side !== 'frontend' && side !== 'backend') throw new Error('Select frontend or backend');
const environment = prepareImageEnvironment(side);
const cwd = side === 'frontend' ? resolve(__dirname, '../frontend') : resolve(__dirname, '../backend');
if (side === 'frontend') replaceFrontendEnvironment(cwd, environment);
const child = spawn(process.execPath, [side === 'frontend' ? 'server.js' : 'dist/server.js'], { cwd, env: environment, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => { process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
