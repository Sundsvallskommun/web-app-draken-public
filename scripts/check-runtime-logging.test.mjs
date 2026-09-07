import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkRuntimeLogging } from './check-runtime-logging.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sides = {
  frontend: { owner: 'common/services/client-diagnostics', operation: 'logClientFailure', warning: 'logClientWarning' },
  backend: { owner: 'services/request-diagnostics', operation: 'logApplicationFailure', warning: 'logApplicationWarning' },
};
function fixture(target, run) {
  const root = mkdtempSync(join(tmpdir(), 'draken-logging-'));
  function write(path, source) {
    const file = join(root, target, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
  }
  write('package.json', '{}');
  write('tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } }));
  write(`src/${sides[target].owner}.ts`, '// Audited fixture diagnostic owner.');
  try { run({ root, write, check: () => checkRuntimeLogging(target, root) }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

for (const [target, { owner, operation, warning }] of Object.entries(sides)) {
  const canonicalImport = `import { ${operation}, ${warning} } from '@/${owner}';`;
  test(`${target}: every new runtime source directory is protected, including misleading test names`, () => fixture(target, ({ write, check }) => {
    for (const file of ['src/new-feature/handler.ts', 'src/dragons/new/component.tsx', 'src/test-service.ts', 'src/contest/diagnostic.js', 'src/new.spec.ts', 'src/new-feature/handler.mjs', 'src/new-feature/handler.cts']) {
      write(file, 'console.error(request.body);');
    }
    if (target === 'backend') write('src/production.test.ts', 'console.error(request.body);');
    const result = check();
    assert.equal(new Set(result.findings.map(finding => finding.file)).size, target === 'backend' ? 8 : 7);
  }));

  test(`${target}: aliases, computed properties, output streams and logger imports cannot bypass the owner`, () => fixture(target, ({ write, check }) => {
    const cases = [
      'console.error(error);',
      'const output = console; output.error(error);',
      'const { error: output } = console; output(error);',
      'globalThis.console.error(error);',
      "window['console']['error'](error);",
      "const key = 'con' + 'sole'; globalThis[key].error(error);",
      'const key = request.key; globalThis[key].error(error);',
      "const key = 'safe'; function send(key: string) { globalThis[key].error(error); }",
      'const host = globalThis; host[key].error(error);',
      'const host = globalThis.window; host[key].error(error);',
      'const host = globalThis.window ?? null; host[key].error(error);',
      'Reflect.get(globalThis, key).error(error);',
      'process.stdout.write(secret);',
      "const key = 'stderr'; process[key].write(secret);",
      'const { stdout: output } = process; output.write(secret);',
      "import output from 'pino'; output().error(error);",
      "import { Console } from 'node:console'; new Console(output);",
      "import { stdout } from 'node:process'; stdout.write(secret);",
      "import { logger as output } from './custom'; output.error(error);",
      "const output = require('winston'); output.error(error);",
      "const output = await import('loglevel'); output.error(error);",
      "const output = require(request.module); output.error(error);",
      "const load = require; const output = load('winston'); output.error(error);",
      "const output = module.require('winston'); output.error(error);",
      "import { createRequire } from 'node:module'; const load = createRequire(import.meta.url); load('winston').error(error);",
      "import output = require('winston'); output.error(error);",
      "import { writeDiagnosticRecord } from '@/utils/logger'; writeDiagnosticRecord('error', secret);",
    ];
    for (const [index, source] of cases.entries()) {
      write(`src/new-feature/case-${index}.ts`, source);
    }
    const result = check();
    const rejected = new Set(result.findings.map(finding => finding.file));
    for (const index of cases.keys()) assert.ok(rejected.has(`${target}/src/new-feature/case-${index}.ts`), `unprotected sink case ${index}`);
    assert.ok(result.findings.every(finding => !finding.message.includes('request.body') && !finding.message.includes('secret')));
  }));

  test(`${target}: operations must remain static through renamed and namespace imports`, () => fixture(target, ({ write, check }) => {
    const cases = [
      `${canonicalImport} ${operation}(request.body, error);`,
      `${canonicalImport} ${operation}(\`operation.\${request.id}\`, error);`,
      `${canonicalImport} ${operation}('operation.' + request.id, error);`,
      `${canonicalImport} const label = 'static'; ${operation}(label, error);`,
      `import { ${operation} as failed } from '@/${owner}'; failed(request.body, error);`,
      `import * as diagnostics from '@/${owner}'; diagnostics.${operation}(request.body, error);`,
      `import * as diagnostics from '@/${owner}'; diagnostics['${operation}'](request.body, error);`,
      `import * as diagnostics from '@/${owner}'; diagnostics[request.method]('static', error);`,
    ];
    for (const [index, source] of cases.entries()) write(`src/new-feature/case-${index}.ts`, source);
    const result = check();
    assert.equal(new Set(result.findings.map(finding => finding.file)).size, cases.length);
  }));

  test(`${target}: diagnostics cannot escape to unchecked aliases, callbacks or re-export wrappers`, () => fixture(target, ({ write, check }) => {
    const cases = [
      `${canonicalImport} const output = ${operation}; output(request.body, error);`,
      `${canonicalImport} promise.catch(${operation});`,
      `${canonicalImport} ${operation}.call(null, request.body, error);`,
      `${canonicalImport} ${operation}.bind(null, request.body)(error);`,
      `${canonicalImport} export { ${operation} };`,
      `export { ${operation} as output } from '@/${owner}';`,
      `export * from '@/${owner}';`,
      `import * as diagnostics from '@/${owner}'; const { ${operation}: output } = diagnostics;`,
      `import * as diagnostics from '@/${owner}'; const output = diagnostics.${operation};`,
      `const diagnostics = await import('@/${owner}'); diagnostics.${operation}(request.body, error);`,
      `const { ${operation} } = require('@/${owner}'); ${operation}(request.body, error);`,
      `import { newUnauditedLogger } from '@/${owner}'; newUnauditedLogger(error);`,
    ];
    for (const [index, source] of cases.entries()) write(`src/new-feature/case-${index}.ts`, source);
    const result = check();
    assert.equal(new Set(result.findings.map(finding => finding.file)).size, cases.length);
  }));

  test(`${target}: production imports cannot launder logging through tests, CLI tools or unchecked local code`, () => fixture(target, ({ write, check }) => {
    const excludedFile = target === 'backend' ? 'tests/debug' : 'debug.test';
    write(`src/${excludedFile}.ts`, 'export const trace = (data: unknown) => console.error(data);');
    write('src/swagger-typescript-api.ts', 'export const trace = (data: unknown) => console.error(data);');
    write('e2e/debug.ts', 'export const trace = (data: unknown) => console.error(data);');
    const cases = [
      `import { trace } from './${excludedFile}'; trace(user);`,
      `export { trace } from './${excludedFile}';`,
      `const { trace } = await import('./${excludedFile}'); trace(user);`,
      `const { trace } = require('./${excludedFile}'); trace(user);`,
      "import { trace } from './swagger-typescript-api'; trace(user);",
      "import { trace } from '../e2e/debug'; trace(user);",
      "const { trace } = await import('../e2e/debug'); trace(user);",
    ];
    for (const [index, source] of cases.entries()) write(`src/case-${index}.ts`, source);
    const rejected = new Set(check().findings.filter(finding => finding.code === 'unchecked-runtime-import').map(finding => finding.file));
    for (const index of cases.keys()) assert.ok(rejected.has(`${target}/src/case-${index}.ts`), `unprotected excluded import ${index}`);
  }));

  test(`${target}: direct literal diagnostics, typed contracts, normal globals and exact test/CLI locations are allowed`, () => fixture(target, ({ write, check }) => {
    write('src/new-feature/handler.ts', `${canonicalImport}
      import { ${operation} as failure } from '@/${owner}';
      import * as diagnostics from '@/${owner}';
      import type { DiagnosticRecord } from '@/${owner}';
      export type { DiagnosticRecord } from '@/${owner}';
      ${operation}('errand.save', error);
      ${warning}(\`errand.close\`, error);
      failure('errand.send', error);
      diagnostics.${operation}('errand.create', error);
      diagnostics['${warning}']('errand.update', error);
      const enabled = process.env.FEATURE === 'true';
      const client = typeof window !== 'undefined';
      const location = globalThis.window?.location.pathname;
      const browser = globalThis.window !== undefined;
      const width = window.innerWidth;
      await import('./normal-service');
    `);
    write('src/contracts.d.ts', 'declare const logger: Console;');
    write('src/swagger-typescript-api.ts', 'console.info("Generated CLI contracts");');
    write(target === 'backend' ? 'src/tests/diagnostic.test.ts' : 'src/new-feature/diagnostic.test.ts', 'console.error(testError);');
    if (target === 'frontend') write('src/new-feature/component.cy.tsx', 'console.error(testError);');
    if (target === 'backend') {
      write('src/middlewares/request-diagnostics.middleware.ts', `import { logHttpRequest, createRequestDiagnostics, withRequestDiagnostics, RequestDiagnostics } from '@/${owner}';
        const context: RequestDiagnostics = createRequestDiagnostics(request);
        logHttpRequest(context, status, error);
        withRequestDiagnostics(context, next);
      `);
      write('src/services/api.service.ts', `import { logUpstreamRequest, createRequestDiagnostics, currentRequestDiagnostics, withRequestDiagnostics } from '@/${owner}';
        const context = currentRequestDiagnostics() ?? createRequestDiagnostics();
        withRequestDiagnostics(context, () => logUpstreamRequest(context, { method, startedAt, status, error }));
      `);
    }
    assert.deepEqual(check().findings, []);
  }));

  test(`${target}: the manual dragon build stops on a logging violation before compiling`, () => fixture(target, ({ root, write }) => {
    mkdirSync(join(root, 'scripts'));
    for (const file of ['dragon.mjs', 'dragon-deployment.cjs', 'check-runtime-logging.mjs']) cpSync(join(repository, 'scripts', file), join(root, 'scripts', file));
    cpSync(join(repository, 'dragons.json'), join(root, 'dragons.json'));
    cpSync(join(repository, 'frontend-environment-defaults.json'), join(root, 'frontend-environment-defaults.json'));
    mkdirSync(join(root, target, 'node_modules'));
    symlinkSync(join(repository, target, 'node_modules/typescript'), join(root, target, 'node_modules/typescript'), 'dir');
    write(`src/dragons/kc/${target === 'frontend' ? 'application' : 'server'}.ts`, 'console.error(request.body);');
    const env = { ...process.env, DEBUG: '', NODE_DEBUG: '', NODE_DEBUG_NATIVE: '', DRAKEN_BUILD_DRAGON: 'KC' };
    const buildCommand = JSON.parse(readFileSync(join(repository, target, 'package.json'), 'utf8')).scripts.build;
    const direct = spawnSync(process.execPath, [join(root, 'scripts/dragon.mjs'), 'build', 'KC', target], { encoding: 'utf8', env });
    const packageBuild = spawnSync(buildCommand, { shell: true, cwd: join(root, target), encoding: 'utf8', env });
    for (const result of [direct, packageBuild]) {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /\[raw-logging\]/u);
      assert.doesNotMatch(result.stderr, /Cannot find module|request.body/u);
      assert.equal(existsSync(join(root, target, target === 'frontend' ? '.next-KC' : 'dist-KC')), false);
    }
  }));
}


test('backend: feature code cannot fabricate HTTP context or pass transport functions through aliases', () => fixture('backend', ({ write, check }) => {
  const exports = ['logHttpRequest', 'logUpstreamRequest', 'createRequestDiagnostics', 'currentRequestDiagnostics', 'withRequestDiagnostics'];
  for (const name of exports) {
    write(`src/new-feature/${name}.ts`, `import { ${name} as diagnostics } from '@/services/request-diagnostics'; diagnostics(untrustedData);`);
    write(`src/new-feature/namespace-${name}.ts`, `import * as diagnostics from '@/services/request-diagnostics'; diagnostics.${name}(untrustedData);`);
  }
  const rejected = new Set(check().findings.filter(finding => finding.code === 'diagnostic-infrastructure').map(finding => finding.file));
  assert.equal(rejected.size, exports.length * 2);
}));
