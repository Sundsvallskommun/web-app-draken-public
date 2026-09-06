import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dragons = JSON.parse(readFileSync(join(root, 'dragons.json'), 'utf8'));
const children = new Set();

function run(command, args, cwd, env = process.env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    children.add(child);
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      children.delete(child);
      if (code === 0) resolveRun();
      else reject(new Error(`${command} exited with ${signal ?? code}`));
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) child.kill(signal);
  });
}

async function buildBackend(id) {
  const cwd = join(root, 'backend');
  const requireBackend = createRequire(join(cwd, 'package.json'));
  const output = join(cwd, `dist-${id}`);
  // Compile only the selected application's dependency graph; never reuse stale output.
  rmSync(output, { recursive: true, force: true });
  const config = join(cwd, `.dragon-build-${id}.json`);
  writeFileSync(config, JSON.stringify({
    extends: './tsconfig.json',
    compilerOptions: { outDir: output },
    include: [`src/dragons/${id.toLowerCase()}/server.ts`, 'src/types/**/*.d.ts'],
  }));
  try {
    await run(process.execPath, [requireBackend.resolve('typescript/bin/tsc'), '-p', config], cwd);
    await run(process.execPath, [requireBackend.resolve('tsc-alias/dist/bin/index.js'), '-p', config], cwd);
    writeFileSync(join(output, 'dragon-build.json'), JSON.stringify({ id }) + '\n');
  } finally {
    rmSync(config, { force: true });
  }
}

function environment(id, target, production) {
  const cwd = join(root, target);
  const requireTarget = createRequire(join(cwd, 'package.json'));
  const { parse } = requireTarget('dotenv');
  const files = target === 'frontend'
    ? [`.env.${id.toLowerCase()}`]
    : [`.env.${id.toLowerCase()}.development.local`, ...(production ? [`.env.${id.toLowerCase()}.production.local`] : [])];
  const env = {};
  for (const file of files) {
    const path = join(cwd, file);
    if (existsSync(path)) Object.assign(env, parse(readFileSync(path)));
  }
  Object.assign(env, process.env);
  env.APPLICATION = id;
  env.NEXT_PUBLIC_APPLICATION = id;
  env.DRAKEN_BUILD_DRAGON = id;
  env.NODE_ENV = production ? 'production' : 'development';
  env.PATH = `${join(cwd, 'node_modules', '.bin')}:${env.PATH ?? ''}`;
  return env;
}

async function execute(mode, id, target) {
  const cwd = join(root, target);
  const requireTarget = createRequire(join(cwd, 'package.json'));
  if (mode === 'build' && target === 'backend') return buildBackend(id);
  const env = environment(id, target, mode !== 'dev');
  if (target === 'frontend') {
    if (mode === 'build') {
      await run(process.execPath, [join(root, 'scripts/generate-deploy-info.js')], root, env);
    }
    const nextMode = mode === 'start' ? 'start' : mode;
    return run(process.execPath, [requireTarget.resolve('next/dist/bin/next'), nextMode], cwd, env);
  }
  if (mode === 'start') {
    return run(process.execPath, [`dist-${id}/dragons/${id.toLowerCase()}/server.js`], cwd, env);
  }
  return run(process.execPath, [requireTarget.resolve('nodemon/bin/nodemon.js'), '--exec', `ts-node -r tsconfig-paths/register --transpile-only src/dragons/${id.toLowerCase()}/server.ts`], cwd, env);
}

try {
  const [mode, requested, target] = process.argv.slice(2);
  if (mode === 'list') {
    if (requested === '--json') process.stdout.write(JSON.stringify(Object.keys(dragons)) + '\n');
    else for (const [id, definition] of Object.entries(dragons)) {
      process.stdout.write(`${id.padEnd(5)} ${definition.domain}${definition.investigation ? ` + ${definition.investigation}` : ''}\n`);
    }
  } else {
    const id = requested?.toUpperCase();
    if (!['dev', 'build', 'start'].includes(mode) || !id || !Object.hasOwn(dragons, id) || (target && !['frontend', 'backend'].includes(target))) {
      throw new Error('Usage: yarn dragon list | yarn dragon <dev|build|start> <dragon> [frontend|backend]');
    }
    for (const [side, entry] of [['frontend', 'application.ts'], ['backend', 'server.ts']]) {
      if (target && target !== side) continue;
      if (!existsSync(join(root, side, 'src/dragons', id.toLowerCase(), entry))) {
        throw new Error(`Dragon ${id} is missing its ${side} entrypoint`);
      }
    }
    const targets = target ? [target] : ['backend', 'frontend'];
    if (mode === 'build') {
      for (const part of targets) await execute(mode, id, part);
    } else {
      await Promise.all(targets.map(part => execute(mode, id, part)));
    }
  }
} catch (error) {
  for (const child of children) child.kill('SIGTERM');
  console.error(error instanceof Error ? error.message : 'Dragon command failed');
  process.exitCode = 1;
}
