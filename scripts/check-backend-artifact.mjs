import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dragons = JSON.parse(readFileSync(resolve(root, 'dragons.json'), 'utf8'));
// Derive paths from the catalog key, never from the caller's spelling of it.
const id = Object.keys(dragons).find((key) => key === process.argv[2]?.toUpperCase());
assert.ok(id, 'Specify a valid dragon');
const definition = dragons[id];
const output = resolve(root, `backend/dist-${id}`);
const has = (file) => existsSync(resolve(output, file));
assert.equal(JSON.parse(readFileSync(resolve(output, 'dragon-build.json'), 'utf8')).id, id);
assert.ok(has(`dragons/${id.toLowerCase()}/server.js`));
for (const other of Object.keys(dragons).filter(other => other !== id)) {
  assert.equal(has(`dragons/${other.toLowerCase()}`), false, `Must not ship another dragon: ${other}`);
}
assert.equal(has('controllers/casedata'), definition.domain === 'casedata', 'CaseData controllers only ship in CaseData apps');
assert.equal(has('controllers/supportmanagement'), definition.domain === 'supportmanagement', 'SM controllers only ship in SM apps');
assert.equal(has('controllers.js'), false, 'A universal controller registry must never ship');
assert.equal(has('tests'), false, 'Tests must not ship');
// Compare emitted modules against the selected application's actual TypeScript graph.
// Business modules are only composed by entrypoints; no catalog of special drakes is needed.
const ts = createRequire(resolve(root, 'backend/package.json'))('typescript');
const backendRoot = resolve(root, 'backend');
const config = ts.readConfigFile(resolve(backendRoot, 'tsconfig.json'), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, backendRoot);
const entrypoint = resolve(backendRoot, `src/dragons/${id.toLowerCase()}/server.ts`);
const program = ts.createProgram([entrypoint], options);
const expectedModules = new Set();
for (const source of program.getSourceFiles()) {
  if (!source.fileName.startsWith(resolve(backendRoot, 'src') + '/') || source.isDeclarationFile) continue;
  expectedModules.add(source.fileName.slice(resolve(backendRoot, 'src').length + 1).replace(/\.ts$/u, '.js'));
  for (const node of source.statements) {
    const specifier = node.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier)) continue;
    const imported = ts.resolveModuleName(specifier.text, source.fileName, options, ts.sys).resolvedModule?.resolvedFileName;
    if (!imported?.includes('/src/avvikelse/')) continue;
    assert.ok(source.fileName.includes('/src/avvikelse/') || source.fileName === resolve(backendRoot, `src/dragons/${id.toLowerCase()}/application.ts`),
      'Avvikelse must be composed by the selected application, never by shared services');
  }
}
const aliases = Object.keys(JSON.parse(readFileSync(resolve(root, 'backend/tsconfig.json'), 'utf8')).compilerOptions.paths);
for (const file of readdirSync(output, { recursive: true }).filter(file => file.endsWith('.js'))) {
  assert.ok(expectedModules.has(file), `${file}: module is outside the selected application's source graph`);
  const path = resolve(output, file);
  const requireFile = createRequire(path);
  for (const [, imported] of readFileSync(path, 'utf8').matchAll(/\brequire\(["']([^"']+)["']\)/gu)) {
    assert.equal(aliases.some(alias => alias.endsWith('*') ? imported.startsWith(alias.slice(0, -1)) : imported === alias), false,
      `${file}: unresolved TypeScript alias ${imported}`);
    if (imported.startsWith('.')) assert.doesNotThrow(() => requireFile.resolve(imported), `${file}: missing runtime module ${imported}`);
  }
}
process.stdout.write(`${id}: artifact boundaries verified\n`);
