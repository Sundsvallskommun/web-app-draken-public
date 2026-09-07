import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('the CLI lists available dragons and rejects invalid build targets before running tools', () => {
  const cli = join(root, 'scripts/dragon.mjs');
  const list = spawnSync(process.execPath, [cli, 'list'], { encoding: 'utf8' });
  assert.equal(list.status, 0);
  assert.match(list.stdout, /IAF\s+supportmanagement/);
  for (const args of [['build', 'unknown'], ['build', 'IAF', 'unknown'], ['build-family', 'unknown']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
  }
});

test('artifact checks reject unknown IDs and traversal before reading artifacts', () => {
  const cli = join(root, 'scripts/check-backend-artifact.mjs');
  for (const id of ['unknown', '../../../outside', 'IAF/../../outside', 'toString', '']) {
    const result = spawnSync(process.execPath, [cli, id], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Specify a valid dragon/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
  }
});

test('artifact validation catches broken imports and foreign controllers before a container can start', () => {
  const directory = mkdtempSync(join(tmpdir(), 'draken-artifact-'));
  try {
    for (const path of ['scripts', 'backend/dist-KC/dragons/kc', 'backend/dist-KC/shell', 'backend/dist-KC/controllers/supportmanagement']) {
      mkdirSync(join(directory, path), { recursive: true });
    }
    for (const file of ['scripts/check-backend-artifact.mjs', 'dragons.json', 'backend/tsconfig.json']) cpSync(join(root, file), join(directory, file));
    symlinkSync(join(root, 'backend/node_modules'), join(directory, 'backend/node_modules'), 'dir');
    cpSync(join(root, 'backend/package.json'), join(directory, 'backend/package.json'));
    mkdirSync(join(directory, 'backend/src/dragons/kc'), { recursive: true });
    mkdirSync(join(directory, 'backend/src/shell'), { recursive: true });
    writeFileSync(join(directory, 'backend/src/dragons/kc/server.ts'), "import '../../shell/start-server';");
    writeFileSync(join(directory, 'backend/src/shell/start-server.ts'), 'export {};');
    const output = join(directory, 'backend/dist-KC');
    writeFileSync(join(output, 'dragon-build.json'), JSON.stringify({ id: 'KC', revision: 'a'.repeat(40) }));
    writeFileSync(join(output, 'shell/start-server.js'), 'module.exports = {};');
    const server = join(output, 'dragons/kc/server.js');
    const check = () => spawnSync(process.execPath, [join(directory, 'scripts/check-backend-artifact.mjs'), 'KC'], { encoding: 'utf8' });
    writeFileSync(server, 'require("../../shell/start-server");');
    assert.equal(check().status, 0);
    writeFileSync(server, 'require("@/shell/start-server");');
    const alias = check();
    assert.notEqual(alias.status, 0);
    assert.match(alias.stderr, /unresolved TypeScript alias/);
    writeFileSync(server, 'require("../../shell/missing");');
    const missing = check();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /missing runtime module/);

    // A service can accidentally import a controller outside the domain folder.
    // Its ownership still comes from the canonical CaseData composition.
    mkdirSync(join(directory, 'backend/src/controllers'), { recursive: true });
    writeFileSync(join(directory, 'backend/src/controllers/message.controller.ts'), 'export class MessageController {}');
    writeFileSync(join(directory, 'backend/src/shell/casedata-controllers.ts'),
      "import { MessageController } from '../controllers/message.controller'; export const CASEDATA_CONTROLLERS = [MessageController];");
    writeFileSync(join(directory, 'backend/src/shell/start-server.ts'), "import '../controllers/message.controller';");
    writeFileSync(server, 'require("../../shell/start-server");');
    writeFileSync(join(output, 'shell/start-server.js'), 'require("../controllers/message.controller");');
    writeFileSync(join(output, 'controllers/message.controller.js'), 'exports.MessageController = class {};');
    const foreignController = check();
    assert.notEqual(foreignController.status, 0);
    assert.match(foreignController.stderr, /casedata controller must not ship in a supportmanagement application/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Next env files cannot activate verbose logging after the CLI checks inherited variables', () => {
  const directory = mkdtempSync(join(tmpdir(), 'draken-next-environment-'));
  const marker = join(directory, 'frontend/next-started');
  try {
    for (const path of ['scripts', 'frontend/src/dragons/kc', 'frontend/node_modules/@next', 'frontend/node_modules/next/dist/bin']) {
      mkdirSync(join(directory, path), { recursive: true });
    }
    for (const file of ['scripts/dragon.mjs', 'scripts/dragon-deployment.cjs', 'dragons.json', 'frontend-environment-defaults.json']) cpSync(join(root, file), join(directory, file));
    symlinkSync(join(root, 'frontend/node_modules/@next/env'), join(directory, 'frontend/node_modules/@next/env'), 'dir');
    writeFileSync(join(directory, 'frontend/package.json'), '{}');
    writeFileSync(join(directory, 'frontend/src/dragons/kc/application.ts'), 'export {};');
    writeFileSync(join(directory, 'frontend/node_modules/next/dist/bin/next.js'), 'require("node:fs").writeFileSync("next-started", "started");');
    const env = { ...process.env };
    for (const key of ['DEBUG', 'NODE_DEBUG', 'NODE_DEBUG_NATIVE', 'DRAKEN_DEPLOYMENT_FILE']) delete env[key];
    const start = () => spawnSync(process.execPath, [join(directory, 'scripts/dragon.mjs'), 'start', 'KC', 'frontend'], { encoding: 'utf8', env });
    for (const file of ['.env.kc', '.env.local', '.env.production.local', '.env']) {
      const path = join(directory, 'frontend', file);
      writeFileSync(path, 'PRIVATE_VALUE=private-credential-canary\nDEBUG=${PRIVATE_VALUE}\n');
      const result = start();
      assert.notEqual(result.status, 0, file);
      assert.match(result.stderr, /DEBUG|Next environment rejected/u);
      assert.doesNotMatch(result.stdout + result.stderr, /private-credential-canary/u);
      assert.equal(existsSync(marker), false);
      rmSync(path);
    }
    for (const name of ['NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION', 'NEXT_PUBLIC_USE_AOT_INVESTIGATION']) {
      const path = join(directory, 'frontend/.env.local');
      writeFileSync(path, `${name}=false\n`);
      const result = start();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Next environment rejected/u);
      assert.equal(existsSync(marker), false);
      rmSync(path);
    }
    writeFileSync(join(directory, 'frontend/.env.local'), 'DEBUG=\nNODE_DEBUG=\nNODE_DEBUG_NATIVE=\n');
    const clean = start();
    assert.equal(clean.status, 0, clean.stderr);
    assert.equal(existsSync(marker), true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
