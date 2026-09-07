import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dragons = JSON.parse(readFileSync(join(root, 'dragons.json'), 'utf8'));

test('every catalog dragon owns both entrypoints and environment examples; orphan applications are rejected', () => {
  const expectedDirectories = Object.keys(dragons).map((id) => id.toLowerCase()).sort();
  for (const side of ['frontend', 'backend']) {
    const directory = join(root, side, 'src/dragons');
    const actualDirectories = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(actualDirectories, expectedDirectories, `${side}: application directories must match dragons.json`);

    for (const [id, definition] of Object.entries(dragons)) {
      assert.match(id, /^[A-Z][A-Z0-9]*$/, 'Dragon identities must be safe, uppercase build targets');
      assert.ok(['casedata', 'supportmanagement'].includes(definition.domain), `${id}: unknown domain`);
      assert.deepEqual(Object.keys(definition), ['domain'], 'The catalog owns identity/domain; implementations belong to application code');

      const entrypoints = side === 'frontend' ? ['index.ts', 'application.ts'] : ['application.ts', 'server.ts'];
      for (const entrypoint of entrypoints) {
        assert.ok(existsSync(join(directory, id.toLowerCase(), entrypoint)), `${id}: missing ${side} ${entrypoint}`);
      }
      const example = side === 'frontend' ? `.env.${id.toLowerCase()}-example` : `.env.${id.toLowerCase()}.example.local`;
      const identity = side === 'frontend' ? 'NEXT_PUBLIC_APPLICATION' : 'APPLICATION';
      const contents = readFileSync(join(root, side, example), 'utf8');
      assert.ok(new RegExp(`^${identity}=["']?${id}["']?\\s*(?:#.*)?$`, 'm').test(contents), `${side}/${example}: wrong identity`);
    }
  }
});
