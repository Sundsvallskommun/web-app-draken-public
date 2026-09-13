import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkBackendBoundaries } from './backend-boundaries.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'draken-source-boundaries-'));
  const backend = join(directory, 'backend');
  mkdirSync(backend);
  const catalogDirectory = join(directory, 'frontend/src/dragons');
  mkdirSync(catalogDirectory, { recursive: true });
  writeFileSync(join(catalogDirectory, 'dragons.json'), JSON.stringify({ KC: { domain: 'supportmanagement' }, AOT: { domain: 'supportmanagement' }, MEX: { domain: 'casedata' } }));
  symlinkSync(join(root, 'backend/node_modules'), join(backend, 'node_modules'), 'dir');
  writeFileSync(join(backend, 'package.json'), '{}');
  writeFileSync(join(backend, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    paths: { '@/*': ['./src/*'] }, module: 'commonjs', target: 'es2022',
  }, include: ['src/**/*.ts'] }));
  const write = (path, source) => {
    const file = join(backend, 'src', path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
  };
  try { run({ write, check: () => checkBackendBoundaries(backend) }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

test('domain services and types cannot cross directly or through shared configuration', () => fixture(({ write, check }) => {
  write('casedata/services/errand.ts', 'export interface Errand { id: number }; export const save = () => {};');
  write('supportmanagement/services/errand.ts', "import { save } from '@/casedata/services/errand'; save();");
  assert.match(check().join('\n'), /supportmanagement must not import casedata/);
  for (const statement of [
    "import type { Errand } from '../casedata/services/errand';",
    "export { save } from '@/casedata/services/errand';",
    "const load = () => import('@/casedata/services/errand');",
    "const load = () => require('../casedata/services/errand');",
    "type Errand = import('@/casedata/services/errand').Errand;",
    "import errand = require('@/casedata/services/errand');",
  ]) {
    write('config/bridge.ts', statement);
    write('supportmanagement/services/errand.ts', "import '@/config/bridge';");
    assert.match(check().join('\n'), /config\/bridge.ts -> casedata\/services\/errand.ts: shared must not import casedata/, statement);
  }
}));

test('domain code may use its own services and an upstream adapter without importing another domain', () => fixture(({ write, check }) => {
  write('services/api.ts', 'export const post = () => {};');
  write('data-contracts/case-data/types.ts', 'export interface Conversation { id: string }');
  write('integrations/casedata-conversations.ts', "import { post } from '@/services/api'; import type { Conversation } from '@/data-contracts/case-data/types'; export { post };");
  write('supportmanagement/services/errand.ts', "export { post } from '@/integrations/casedata-conversations';");
  write('controllers/supportmanagement/errand.ts', "import '@/supportmanagement/services/errand';");
  write('casedata/services/errand.ts', "import '@/integrations/casedata-conversations';");
  write('dragons/kc/application.ts', "import '@/supportmanagement/services/errand';");
  assert.deepEqual(check(), []);
  write('dragons/kc/application.ts', "import '@/casedata/services/errand';");
  assert.match(check().join('\n'), /dragons\/kc must not import casedata/);
  write('dragons/kc/application.ts', "import '@/supportmanagement/services/errand';");
  write('integrations/casedata-conversations.ts', "export * from '@/casedata/services/errand';");
  assert.match(check().join('\n'), /shared must not import casedata/);
}));

test('business modules, dragons and the composition root cannot become back doors', () => fixture(({ write, check }) => {
  write('dragons/kc/index.ts', 'export const name = "KC";');
  write('dragons/aot/index.ts', "import '../kc/index';");
  write('shell/configure.ts', 'export {};');
  write('services/bridge.ts', "import '@/shell/configure';");
  write('avvikelse/profile.ts', 'export {};');
  write('supportmanagement/services/errand.ts', "import '@/avvikelse/profile';");
  const errors = check();
  assert.equal(errors.length, 3);
  assert.match(errors.join('\n'), /dragons\/aot must not import dragons\/kc/);
  assert.match(errors.join('\n'), /shared must not import composition/);
  assert.match(errors.join('\n'), /supportmanagement must not import avvikelse/);
}));

test('missing local imports and unresolvable dynamic loading fail closed', () => fixture(({ write, check }) => {
  write('services/errand.ts', "import '@/missing'; const load = (name: string) => import(name);");
  assert.equal(check().length, 2);
  assert.match(check().join('\n'), /unresolved import @\/missing/);
  assert.match(check().join('\n'), /non-literal module loading/);
}));
