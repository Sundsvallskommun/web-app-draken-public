const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { prepareImageEnvironment } = require('./assert-dragon-image.cjs');
const { replaceFrontendEnvironment } = require('./replace-frontend-env.cjs');

const side = process.argv[2];
const environment = prepareImageEnvironment(side);
const cwd = resolve(__dirname, '..', side);
if (side === 'frontend') replaceFrontendEnvironment(cwd, environment);
const child = spawn(process.execPath, [side === 'frontend' ? 'server.js' : 'dist/server.js'], { cwd, env: environment, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => { process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
