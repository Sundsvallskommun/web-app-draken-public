import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('dependency-cruiser blocks shared bridges and domain stores using real TypeScript resolution', () => {
  const directory = mkdtempSync(join(tmpdir(), 'draken-frontend-boundaries-'));
  const write = (path, source) => {
    const file = join(directory, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
  };
  const cruise = () => {
    const result = spawnSync(process.execPath, [join(root, 'frontend/node_modules/dependency-cruiser/bin/dependency-cruise.mjs'),
      'src', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'], { cwd: directory, encoding: 'utf8' });
    assert.ok([0, 1].includes(result.status), result.stderr);
    return JSON.parse(result.stdout).summary.violations;
  };
  try {
    cpSync(join(root, 'frontend/.dependency-cruiser.cjs'), join(directory, '.dependency-cruiser.cjs'));
    write('tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } }));
    write('src/casedata/service.ts', 'export interface Errand { id: number }; export const save = () => {};');
    write('src/supportmanagement/service.ts', "import '@/config/bridge';");
    write('src/config/bridge.ts', 'export {};');
    write('src/stores/support-store.ts', "import '@/supportmanagement/service';");
    write('src/stores/casedata-store.ts', "import '@/casedata/service';");
    assert.deepEqual(cruise(), []);
    write('src/config/bridge.ts', "export { save } from '@/casedata/service';");
    write('src/utils/bridge.ts', "import type { Errand } from '../casedata/service';");
    write('src/interfaces/bridge.ts', "export type { Errand } from '@/casedata/service';");
    write('src/new-common/bridge.ts', "export * from '@/casedata/service';");
    write('src/stores/shared-store.ts', "import '@/stores/support-store';");
    write('src/stores/support-store.ts', "import '@/casedata/service';");
    write('src/stores/casedata-store.ts', "import '@/supportmanagement/service';");
    const violations = cruise();
    assert.equal(violations.length, 7, JSON.stringify(violations));
    for (const from of ['config/bridge.ts', 'utils/bridge.ts', 'interfaces/bridge.ts', 'stores/shared-store.ts', 'new-common/bridge.ts']) {
      assert.ok(violations.some((violation) => violation.from === `src/${from}` && violation.rule.name === 'core-does-not-import-domains'), from);
    }
    assert.ok(violations.some(({ rule }) => rule.name === 'domain-stores-do-not-import-other-domain'));
    assert.ok(violations.some(({ rule }) => rule.name === 'support-stores-do-not-import-casedata'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
