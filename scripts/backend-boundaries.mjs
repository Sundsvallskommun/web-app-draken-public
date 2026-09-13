import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The same source-edge validation is used by lint and the emitted-artifact check. */
export function checkBackendBoundaries(backendRoot, sourceFiles) {
  const ts = createRequire(resolve(backendRoot, 'package.json'))('typescript');
  const config = ts.readConfigFile(resolve(backendRoot, 'tsconfig.json'), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, backendRoot);
  const src = resolve(backendRoot, 'src');
  const dragons = JSON.parse(readFileSync(resolve(backendRoot, '../frontend/src/dragons/dragons.json'), 'utf8'));
  const violations = [];
  const owner = (file) => {
    const path = relative(src, file).replaceAll('\\', '/');
    if (/^(casedata\/|controllers\/casedata\/)/u.test(path)) return 'casedata';
    if (/^(supportmanagement\/|controllers\/supportmanagement\/)/u.test(path)) return 'supportmanagement';
    if (path.startsWith('avvikelse/')) return 'avvikelse';
    if (/^dragons\/[^/]+\//u.test(path)) return path.split('/').slice(0, 2).join('/');
    if (path.startsWith('shell/') || path.startsWith('tests/') || path === 'server.ts') return 'composition';
    if (path.startsWith('data-contracts/')) return 'external';
    return 'shared';
  };
  const accepts = (from, to, importer) => {
    if (from === 'composition' || to === 'shared' || to === 'external' || from === to) return true;
    if (from.startsWith('dragons/')) {
      if (to === 'composition') return importer.endsWith('/application.ts') || importer.endsWith('/server.ts');
      const domain = dragons[from.slice('dragons/'.length).toUpperCase()]?.domain;
      return to === domain || (to === 'avvikelse' && domain === 'supportmanagement');
    }
    return from === 'avvikelse' && to === 'supportmanagement';
  };
  const cache = ts.createModuleResolutionCache(backendRoot, (name) => name, parsed.options);
  const files = sourceFiles ?? parsed.fileNames;
  for (const file of files) {
    if (!file.startsWith(src + '/') || file.includes('/data-contracts/') || file.includes('/tests/') || file.endsWith('.d.ts')) continue;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const check = (specifier) => {
      const imported = ts.resolveModuleName(specifier, file, parsed.options, ts.sys, cache).resolvedModule?.resolvedFileName;
      if (!imported) {
        if (specifier.startsWith('.') || specifier.startsWith('@/') || Object.keys(parsed.options.paths ?? {}).some((alias) => specifier.startsWith(alias.replace(/\*$/u, '')))) {
          violations.push(`${relative(src, file)}: unresolved import ${specifier}`);
        }
        return;
      }
      if (!imported.startsWith(src + '/')) return;
      if (!accepts(owner(file), owner(imported), file)) {
        violations.push(`${relative(src, file)} -> ${relative(src, imported)}: ${owner(file)} must not import ${owner(imported)}`);
      }
    };
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        check(node.moduleSpecifier.text);
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
        check(node.moduleReference.expression.text);
      } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        check(node.argument.literal.text);
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const argument = node.arguments[0];
        if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) check(argument.text);
        else violations.push(`${relative(src, file)}: non-literal module loading cannot be checked`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...new Set(violations)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const violations = checkBackendBoundaries(resolve(root, 'backend'));
  if (violations.length) {
    process.stderr.write(violations.join('\n') + '\n');
    process.exitCode = 1;
  } else process.stdout.write('Backend source boundaries verified\n');
}
