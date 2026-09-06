import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { replaceFrontendEnvironment } from './replace-frontend-env.cjs';

test('runtime replacement preserves strings and handles prefixed and empty base paths', () => {
  for (const basePath of ['/iaf', '']) {
    const directory = mkdtempSync(join(tmpdir(), 'dragon-frontend-'));
    try {
      mkdirSync(join(directory, '.next'));
      const name = 'Avvikelse "test" & \\ test\nny rad';
      const config = { applicationName: 'NEXT_PUBLIC_APPLICATION_NAME_PLACEHOLDER', basePath: '/NEXT_PUBLIC_BASEPATH_PLACEHOLDER' };
      writeFileSync(join(directory, 'server.js'), `globalThis.config = ${JSON.stringify(config)}`);
      writeFileSync(join(directory, '.next', 'config.json'), JSON.stringify(config));
      writeFileSync(join(directory, '.next', 'styles.css'), 'url(/NEXT_PUBLIC_BASEPATH_PLACEHOLDER/font.woff)');
      writeFileSync(join(directory, '.next', 'routes.json'), JSON.stringify({ regex: '^\\/NEXT_PUBLIC_BASEPATH_PLACEHOLDER(?:/login)$' }));
      replaceFrontendEnvironment(directory, { NEXT_PUBLIC_APPLICATION_NAME: name, NEXT_PUBLIC_BASEPATH: basePath });
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
