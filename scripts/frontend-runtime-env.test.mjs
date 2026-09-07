import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

import { replaceFrontendEnvironment } from './replace-frontend-env.cjs';
import { runtimeEnvironment } from './dragon-deployment.cjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const requireFrontend = createRequire(join(repository, 'frontend/package.json'));

test('an image built with placeholders retains appConfig defaults after minification and runtime configuration', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dragon-appconfig-runtime-'));
  try {
    mkdirSync(join(directory, '.next'));
    const release = JSON.parse(readFileSync(join(repository, 'deployments/example-iaf-test.json'), 'utf8'));
    const environment = runtimeEnvironment('frontend', { id: release.dragon, revision: release.revision }, release, {}, directory);
    const buildEnvironment = parseEnv(readFileSync(join(repository, 'frontend/.env-cicd'), 'utf8'));
    // Compile the real appConfig with the same public constants Next substitutes.
    // Minification deliberately removes its fallback behind a truthy placeholder.
    const appConfigPath = join(repository, 'frontend/src/config/appconfig.tsx');
    const source = readFileSync(appConfigPath, 'utf8').replace(/process\.env\.([A-Z][A-Z0-9_]*)/gu,
      (_, name) => JSON.stringify(name === 'DRAKEN_BUILD_DOMAIN' ? 'supportmanagement' : buildEnvironment[name]));
    const ts = requireFrontend('typescript');
    const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const compiled = requireFrontend('next/dist/compiled/terser').minify_sync(emitted, { mangle: false }).code;
    assert.match(compiled, /reopenSupportErrandLimit:"NEXT_PUBLIC_REOPEN_SUPPORT_ERRAND_LIMIT_PLACEHOLDER"/u);
    writeFileSync(join(directory, 'server.js'), compiled);
    // Include every build-time placeholder, including optional fields not used by appConfig.
    writeFileSync(join(directory, '.next/config.json'), JSON.stringify(buildEnvironment));
    replaceFrontendEnvironment(directory, environment);
    const configured = readFileSync(join(directory, 'server.js'), 'utf8');
    assert.doesNotMatch(configured + readFileSync(join(directory, '.next/config.json'), 'utf8'), /_PLACEHOLDER/u);
    const exports = {};
    const requireSource = createRequire(appConfigPath);
    runInNewContext(configured, {
      exports,
      require: name => name === '@common/services/client-diagnostics' ? { logClientWarning() {} } : requireSource(name),
    });
    const { appConfig, applyRuntimeFeatureFlags } = exports;
    assert.equal(appConfig.reopenSupportErrandLimit, '30');
    assert.equal(appConfig.features.useBilling, false);
    const dayjs = requireFrontend('dayjs');
    assert.equal(dayjs().isAfter(dayjs().subtract(365, 'day').add(parseInt(appConfig.reopenSupportErrandLimit), 'day')), true);
    applyRuntimeFeatureFlags([{ name: 'reopenSupportErrandLimit', enabled: true, value: '45' }]);
    assert.equal(appConfig.reopenSupportErrandLimit, '45');
    applyRuntimeFeatureFlags([{ name: 'useBilling', enabled: true }]);
    assert.equal(appConfig.reopenSupportErrandLimit, '30');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('missing required and newly introduced placeholders reject startup instead of reaching the browser', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dragon-unresolved-env-'));
  try {
    mkdirSync(join(directory, '.next'));
    for (const placeholder of ['NEXT_PUBLIC_API_URL_PLACEHOLDER', '/NEXT_PUBLIC_BASEPATH_PLACEHOLDER', 'NEXT_PUBLIC_NEW_CAPABILITY_PLACEHOLDER']) {
      writeFileSync(join(directory, 'server.js'), JSON.stringify(placeholder));
      assert.throws(() => replaceFrontendEnvironment(directory, {}), new RegExp(`unresolved environment placeholder for ${placeholder.replace(/^\//u, '').slice(0, -'_PLACEHOLDER'.length)}`));
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

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
    cpSync(fileURLToPath(new URL('../frontend-environment-defaults.json', import.meta.url)), join(directory, 'frontend-environment-defaults.json'));
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

test('PT decision requirements use the runtime municipality after Next minifies a placeholder build', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'dragon-pt-decision-runtime-'));
  try {
    mkdirSync(join(directory, '.next'));
    const ts = requireFrontend('typescript');
    const servicePath = join(repository, 'frontend/src/casedata/services/casedata-errand-service.ts');
    const parsed = ts.createSourceFile(servicePath, readFileSync(servicePath, 'utf8'), ts.ScriptTarget.Latest, true);
    // Compile the real decision rule without pulling its unrelated HTTP services into this compiler test.
    // The unit suite checks labels against the real form taxonomy; only that mapper is stubbed here.
    const rule = parsed.statements.find(statement => ts.isVariableStatement(statement)
      && statement.declarationList.declarations.some(declaration => declaration.name.getText(parsed) === 'validateExtraParametersForDecision'));
    assert.ok(rule);
    const source = [
      readFileSync(join(repository, 'frontend/src/common/services/application-service.ts'), 'utf8'),
      readFileSync(join(repository, 'frontend/src/stores/config-store.ts'), 'utf8'),
      readFileSync(join(repository, 'frontend/src/casedata/interfaces/case-type.ts'), 'utf8'),
      'const extraParametersToUppgiftMapper = () => [];',
      rule.getText(parsed),
      'useConfigStore.getState().setMunicipalityId(process.env.NEXT_PUBLIC_MUNICIPALITY_ID);',
      'export const checkDecision = errand => validateExtraParametersForDecision(errand, useConfigStore.getState().municipalityId);',
    ].join('\n');
    const buildEnvironment = parseEnv(readFileSync(join(repository, 'frontend/.env-cicd'), 'utf8'));
    const replacedSource = source.replace(/process\.env\.([A-Z][A-Z0-9_]*)/gu,
      (_, name) => JSON.stringify(buildEnvironment[name]));
    const emitted = ts.transpileModule(replacedSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const swc = requireFrontend('next/dist/build/swc');
    await swc.loadBindings();
    const compiled = await swc.minify(emitted, {});
    writeFileSync(join(directory, 'server.js'), compiled.code);
    replaceFrontendEnvironment(directory, { NEXT_PUBLIC_APPLICATION: 'PT', NEXT_PUBLIC_MUNICIPALITY_ID: '2281' });
    const exports = {};
    runInNewContext(readFileSync(join(directory, 'server.js'), 'utf8'), { exports, require: requireFrontend });
    const errand = {
      caseType: exports.PTCaseType.LOST_PARKING_PERMIT,
      extraParameters: [{ key: 'application.lostPermit.policeReportNumber', values: [] }],
    };
    assert.equal(exports.checkDecision(errand).valid, false);
    errand.extraParameters[0].values = ['K123456'];
    assert.equal(exports.checkDecision(errand).valid, true);

    // The same compiled code must also respect a municipality selected after bootstrap.
    exports.useConfigStore.getState().setMunicipalityId('2260');
    errand.extraParameters.push(
      { key: 'application.applicant.capacity', values: [] },
      { key: 'application.applicant.signingAbility', values: ['false'] },
    );
    assert.equal(exports.checkDecision(errand).valid, false);
    errand.extraParameters[1].values = ['DRIVER'];
    assert.equal(exports.checkDecision(errand).valid, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
