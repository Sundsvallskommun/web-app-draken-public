import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { assertSafeRuntimeEnvironment, readRelease, runtimeEnvironment } from './dragon-deployment.cjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dragons = JSON.parse(readFileSync(join(root, 'dragons.json'), 'utf8'));
const children = new Set();

function buildRevision() {
  const revision = process.env.DEPLOY_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{40}$/u.test(revision)) throw new Error('DEPLOY_COMMIT must be a full commit SHA');
  return revision;
}

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
    // Keep this relative: tsc-alias/get-tsconfig misreads absolute outDir paths.
    compilerOptions: { outDir: `./dist-${id}` },
    include: [`src/dragons/${id.toLowerCase()}/server.ts`, 'src/types/**/*.d.ts'],
  }));
  try {
    await run(process.execPath, [requireBackend.resolve('typescript/bin/tsc'), '-p', config], cwd);
    await run(process.execPath, [requireBackend.resolve('tsc-alias/dist/bin/index.js'), '-p', config], cwd);
    writeFileSync(join(output, 'dragon-build.json'), JSON.stringify({ id, revision: buildRevision() }) + '\n');
    await run(process.execPath, [join(root, 'scripts/check-backend-artifact.mjs'), id], root);
  } finally {
    rmSync(config, { force: true });
  }
}

function environment(id, target, production) {
  assertSafeRuntimeEnvironment(process.env);
  const cwd = join(root, target);
  if (production && (target === 'backend' || process.env.DRAKEN_DEPLOYMENT_FILE)) {
    if (!process.env.DRAKEN_DEPLOYMENT_FILE) throw new Error('Production backend start requires DRAKEN_DEPLOYMENT_FILE; development env files are never loaded.');
    const release = readRelease(process.env.DRAKEN_DEPLOYMENT_FILE);
    const buildFile = target === 'backend' ? `dist-${id}/dragon-build.json` : `.next-${id}/dragon-build.json`;
    const build = JSON.parse(readFileSync(join(cwd, buildFile), 'utf8'));
    if (build.id !== id) throw new Error('Selected dragon does not match the built artifact');
    return runtimeEnvironment(target, build, release, process.env, process.env.DRAKEN_SECRET_DIRECTORY || '/run/draken-secrets');
  }
  const files = target === 'frontend' ? [`.env.${id.toLowerCase()}`] : [`.env.${id.toLowerCase()}.development.local`];
  const env = {};
  for (const file of files) {
    const path = join(cwd, file);
    if (existsSync(path)) Object.assign(env, parseEnv(readFileSync(path, 'utf8')));
  }
  Object.assign(env, process.env);
  assertSafeRuntimeEnvironment(env);
  env.APPLICATION = id;
  env.NEXT_PUBLIC_APPLICATION = id;
  env.DRAKEN_BUILD_DRAGON = id;
  env.NODE_ENV = production ? 'production' : 'development';
  env.PATH = `${join(cwd, 'node_modules', '.bin')}:${env.PATH ?? ''}`;
  return env;
}

async function validateNextEnvironment(cwd, env) {
  // Use Next's own precedence and interpolation without mutating the CLI's environment.
  // This also sees .env.local and .env.production.local before the application starts.
  await run(process.execPath, ['-e', `
    try {
      let failed = false;
      const logging = { info() {}, error() { failed = true; } };
      const { combinedEnv } = require('@next/env').loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development', logging);
      if (failed) throw new Error('Next environment files could not be loaded');
      require('../scripts/dragon-deployment.cjs').assertSafeRuntimeEnvironment(combinedEnv);
    } catch {
      console.error('Next environment rejected; check env files for verbose diagnostics or retired investigation flags.');
      process.exitCode = 1;
    }
  `], cwd, env);
}

async function execute(mode, id, target) {
  const cwd = join(root, target);
  const requireTarget = createRequire(join(cwd, 'package.json'));
  assertSafeRuntimeEnvironment(process.env);
  if (mode === 'build') await run(process.execPath, [join(root, 'scripts/check-runtime-logging.mjs'), `--${target}`], root);
  if (mode === 'build' && target === 'backend') return buildBackend(id);
  const env = environment(id, target, mode === 'start');
  if (mode === 'build') {
    env.NODE_ENV = 'production';
    env.DEPLOY_COMMIT = buildRevision();
  }
  if (target === 'frontend') {
    await validateNextEnvironment(cwd, env);
    if (mode === 'build') {
      await run(process.execPath, [join(root, 'scripts/generate-deploy-info.js')], root, env);
    }
    const nextMode = mode === 'start' ? 'start' : mode;
    await run(process.execPath, [requireTarget.resolve('next/dist/bin/next'), nextMode], cwd, env);
    if (mode === 'build') {
      const output = env.DOCKER_BUILD === 'true' ? '.next' : `.next-${id}`;
      writeFileSync(join(cwd, output, 'dragon-build.json'), JSON.stringify({ id, revision: env.DEPLOY_COMMIT }) + '\n');
    }
    return;
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
      process.stdout.write(`${id.padEnd(5)} ${definition.domain}\n`);
    }
  } else {
    const id = requested?.toUpperCase();
    if (!['dev', 'build', 'start'].includes(mode) || !id || !Object.hasOwn(dragons, id) || (target && !['frontend', 'backend'].includes(target))) {
      throw new Error('Usage: yarn dragon list | yarn dragon <dev|build|start> <dragon> [frontend|backend]');
    }
    if (mode === 'start' && !target) {
      throw new Error('Use generated Compose to start a production pair; select frontend or backend to start one service locally.');
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
