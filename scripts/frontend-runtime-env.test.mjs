import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

import { replaceFrontendEnvironment } from './replace-frontend-env.cjs';

test('runtime replacement preserves strings and handles prefixed and empty base paths', () => {
  for (const basePath of ['/iaf', '']) {
    const directory = mkdtempSync(join(tmpdir(), 'dragon-frontend-'));
    try {
      mkdirSync(join(directory, '.next'));
      mkdirSync(join(directory, '.next', 'node_modules'));
      const dependency = join(directory, 'dependency.js');
      writeFileSync(dependency, 'NEXT_PUBLIC_APPLICATION_NAME_PLACEHOLDER');
      symlinkSync(dependency, join(directory, '.next', 'node_modules', 'dependency.js'));
      const name = 'Avvikelse "test" & \\ test\nny rad';
      const config = { applicationName: 'NEXT_PUBLIC_APPLICATION_NAME_PLACEHOLDER', basePath: '/NEXT_PUBLIC_BASEPATH_PLACEHOLDER' };
      writeFileSync(join(directory, 'server.js'), `globalThis.config = ${JSON.stringify(config)}`);
      writeFileSync(join(directory, '.next', 'config.json'), JSON.stringify(config));
      writeFileSync(join(directory, '.next', 'styles.css'), 'url(/NEXT_PUBLIC_BASEPATH_PLACEHOLDER/font.woff)');
      writeFileSync(join(directory, '.next', 'routes.json'), JSON.stringify({ regex: '^\\/NEXT_PUBLIC_BASEPATH_PLACEHOLDER(?:/login)$' }));
      replaceFrontendEnvironment(directory, { NEXT_PUBLIC_APPLICATION_NAME: name, NEXT_PUBLIC_BASEPATH: basePath });
      assert.equal(readFileSync(dependency, 'utf8'), 'NEXT_PUBLIC_APPLICATION_NAME_PLACEHOLDER');
      const expected = { applicationName: name, basePath };
      assert.deepEqual(JSON.parse(readFileSync(join(directory, '.next', 'config.json'), 'utf8')), expected);
      const context = {};
      runInNewContext(readFileSync(join(directory, 'server.js'), 'utf8'), context);
      assert.equal(context.config.applicationName, name);
      assert.equal(context.config.basePath, basePath);
      assert.equal(readFileSync(join(directory, '.next', 'styles.css'), 'utf8'), `url(${basePath}/font.woff)`);
      const route = JSON.parse(readFileSync(join(directory, '.next', 'routes.json'), 'utf8'));
      assert.ok(new RegExp(route.regex).test(`${basePath}/login`));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test('runtime replacement preserves long non-matching escape sequences', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dragon-frontend-'));
  try {
    mkdirSync(join(directory, '.next'));
    const escapes = '\\'.repeat(100_000);
    const source = `${escapes}unrelated /NEXT_PUBLIC_BASEPATH_PLACEHOLDER/login ${escapes}/NEXT_PUBLIC_BASEPATH_PLACEHOLDER`;
    writeFileSync(join(directory, 'server.js'), source);
    replaceFrontendEnvironment(directory, { NEXT_PUBLIC_BASEPATH: '' });
    assert.equal(readFileSync(join(directory, 'server.js'), 'utf8'), `${escapes}unrelated /login `);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('runtime replacement rejects symlinks without modifying their targets', () => {
  for (const linkedPath of ['server.js', '.next', '.next/config.json', '.next/nested']) {
    const directory = mkdtempSync(join(tmpdir(), 'dragon-frontend-'));
    try {
      const frontend = join(directory, 'frontend');
      const outside = join(directory, 'outside');
      mkdirSync(frontend);
      mkdirSync(outside);
      const original = 'NEXT_PUBLIC_APPLICATION_NAME_PLACEHOLDER';
      const outsideFile = join(outside, 'config.json');
      writeFileSync(outsideFile, original);
      if (linkedPath !== '.next') mkdirSync(join(frontend, '.next'));
      if (linkedPath !== 'server.js') writeFileSync(join(frontend, 'server.js'), original);
      const isDirectory = linkedPath === '.next' || linkedPath === '.next/nested';
      symlinkSync(isDirectory ? outside : outsideFile, join(frontend, linkedPath));
      assert.throws(() => replaceFrontendEnvironment(frontend, { NEXT_PUBLIC_APPLICATION_NAME: 'Changed' }), /regular|symbolic/);
      assert.equal(readFileSync(outsideFile, 'utf8'), original);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test('runtime CLI configures only its own frontend and rejects directory arguments', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dragon-frontend-cli-'));
  try {
    mkdirSync(join(directory, 'scripts'));
    mkdirSync(join(directory, 'frontend', '.next'), { recursive: true });
    const cli = join(directory, 'scripts', 'replace-frontend-env.cjs');
    cpSync(fileURLToPath(new URL('./replace-frontend-env.cjs', import.meta.url)), cli);
    const server = join(directory, 'frontend', 'server.js');
    const original = 'NEXT_PUBLIC_APPLICATION_NAME_PLACEHOLDER';
    writeFileSync(server, original);
    for (const argument of [directory, '../../outside']) {
      const result = spawnSync(process.execPath, [cli, argument], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /does not accept a directory argument/);
      assert.equal(readFileSync(server, 'utf8'), original);
    }
    const result = spawnSync(process.execPath, [cli], {
      env: { NEXT_PUBLIC_APPLICATION_NAME: 'Avvikelse' },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(server, 'utf8'), 'Avvikelse');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
