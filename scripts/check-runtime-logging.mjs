import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contracts = {
  frontend: {
    owner: 'src/common/services/client-diagnostics.ts',
    sinks: ['src/common/services/client-diagnostics.ts'],
    operations: ['logClientFailure', 'logClientWarning'],
    infrastructure: {},
  },
  backend: {
    owner: 'src/services/request-diagnostics.ts',
    sinks: ['src/services/request-diagnostics.ts', 'src/utils/logger.ts'],
    operations: ['logApplicationFailure', 'logApplicationEvent', 'logApplicationWarning'],
    infrastructure: {
      logHttpRequest: ['src/middlewares/request-diagnostics.middleware.ts', 'src/middlewares/error.middleware.ts'],
      logUpstreamRequest: ['src/services/api.service.ts'],
      createRequestDiagnostics: ['src/middlewares/request-diagnostics.middleware.ts', 'src/middlewares/error.middleware.ts', 'src/services/api.service.ts', 'src/services/api-token.service.ts'],
      currentRequestDiagnostics: ['src/middlewares/error.middleware.ts', 'src/services/api.service.ts', 'src/services/api-token.service.ts'],
      withRequestDiagnostics: ['src/middlewares/request-diagnostics.middleware.ts', 'src/services/api.service.ts'],
    },
  },
};
const loggingModule = /^(?:node:)?(?:console|process|module)$|(?:^|\/)(?:logger|logging)(?:[./-]|$)|^(?:winston|pino|bunyan|log4js|loglevel|debug|morgan|consola|signale|roarr)(?:$|[/-])|^@(?:sentry\/|opentelemetry\/api-logs)/u;
const globals = new Set(['globalThis', 'global', 'window', 'self', 'process']);
const sinkProperties = new Set(['console', 'stdout', 'stderr', 'logger']);

// Keep exceptions aligned with the actual test runners, never with a loose "test" substring.
function excluded(target, path) {
  return /\.d\.[cm]?ts$/u.test(path) || path === 'src/swagger-typescript-api.ts' ||
    (target === 'backend' ? path.startsWith('src/tests/') : /\.(?:test\.ts|cy\.tsx)$/u.test(path));
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Runtime source symlinks must be reviewed before logging can be checked');
    return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/u.test(path) ? [path] : [];
  });
}

/** The same whole-source check is used by lint, CLI builds and container builds. */
export function checkRuntimeLogging(target, root = repository) {
  const contract = contracts[target];
  if (!contract) throw new Error('Expected frontend or backend');
  // Resolve the compiler from this side only: each Docker builder installs just one package.
  const ts = createRequire(join(repository, target, 'package.json'))('typescript');
  const directory = join(root, target);
  const configPath = join(directory, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(`Cannot read ${target}/tsconfig.json`);
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, directory);
  const owner = join(directory, contract.owner);
  if (!existsSync(owner)) throw new Error(`Missing audited diagnostic owner: ${target}/${contract.owner}`);
  const findings = [];
  let checked = 0;
  for (const path of sourceFiles(join(directory, 'src')).sort()) {
    const localPath = relative(directory, path).replaceAll('\\', '/');
    if (excluded(target, localPath) || contract.sinks.includes(localPath)) continue;
    checked++;
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const imports = new Map();
    const namespaces = new Set();
    const emitted = new Set();
    function report(node, code, message) {
      const offset = node.getStart(source);
      const key = `${offset}:${code}`;
      if (emitted.has(key)) return;
      emitted.add(key);
      const position = source.getLineAndCharacterOfPosition(offset);
      findings.push({ file: `${target}/${localPath}`, line: position.line + 1, column: position.character + 1, code, message });
    }
    function unwrap(node) {
      while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
      return node;
    }
    function literal(node) {
      node = unwrap(node);
      if (!node) return undefined;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const left = literal(node.left);
        const right = literal(node.right);
        return left === undefined || right === undefined ? undefined : left + right;
      }
      return undefined;
    }
    function member(node) {
      if (ts.isPropertyAccessExpression(node)) return { object: unwrap(node.expression), name: node.name.text };
      if (ts.isElementAccessExpression(node)) return { object: unwrap(node.expression), name: literal(node.argumentExpression) };
      return undefined;
    }
    function isGlobal(node) {
      node = unwrap(node);
      if (ts.isIdentifier(node)) return globals.has(node.text);
      const access = member(node);
      return Boolean(access && globals.has(access.name) && isGlobal(access.object));
    }
    function expressionParent(node) {
      let value = node;
      while (value.parent && unwrap(value.parent) !== value.parent && value.parent.expression === value) value = value.parent;
      return { value, parent: value.parent };
    }
    function isType(node) {
      for (let parent = node.parent; parent && parent !== source; parent = parent.parent) {
        if (ts.isTypeNode(parent) || ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent)) return true;
        if (ts.isExpressionStatement(parent) || ts.isVariableDeclaration(parent) || ts.isCallExpression(parent)) return false;
      }
      return false;
    }
    function isReference(node) {
      const parent = node.parent;
      if (isType(node) || ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent) || ts.isImportEqualsDeclaration(parent)) return false;
      if ((ts.isPropertyAccessExpression(parent) && parent.name === node) ||
          ((ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isBindingElement(parent)) && parent.name === node && !ts.isComputedPropertyName(parent.name))) return false;
      if ((ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isFunctionDeclaration(parent)) && parent.name === node) return false;
      return true;
    }
    function resolveModule(specifier) {
      return ts.resolveModuleName(specifier, path, options, ts.sys).resolvedModule?.resolvedFileName;
    }
    function moduleKind(specifier) {
      const resolved = resolveModule(specifier);
      if (resolved && resolve(resolved) === owner) return 'diagnostics';
      if (loggingModule.test(specifier) || (resolved && contract.sinks.includes(relative(directory, resolved).replaceAll('\\', '/')))) return 'sink';
      return undefined;
    }
    function checkExecutableImport(node, specifier) {
      const resolved = resolveModule(specifier);
      if (!resolved || resolved.includes('/node_modules/') || resolved.endsWith('.json')) return;
      const dependency = relative(directory, resolved).replaceAll('\\', '/');
      // This existing runtime release validator is tested by the root startup contracts.
      // TypeScript resolves its .cjs import through the matching declaration file.
      if (['../scripts/dragon-deployment.cjs', '../scripts/dragon-deployment.d.cts'].includes(dependency)) return;
      if (!dependency.startsWith('src/') || excluded(target, dependency)) {
        report(node, 'unchecked-runtime-import', 'Runtime imports cannot enter excluded tests, codegen tools or local code outside the checked source tree.');
      }
    }
    function registerImport(node) {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.importClause?.isTypeOnly) return;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.length && bindings.elements.every(binding => binding.isTypeOnly)) return;
      checkExecutableImport(node, node.moduleSpecifier.text);
      const kind = moduleKind(node.moduleSpecifier.text);
      if (kind === 'sink') report(node, 'raw-logging-import', 'Import the audited diagnostic functions instead of a logging transport or global module.');
      const clause = node.importClause;
      if (!clause) return;
      if (kind === 'diagnostics') {
        if (clause.name) report(clause, 'diagnostic-import', 'Diagnostic functions must use a named or namespace import.');
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) namespaces.add(clause.namedBindings.name.text);
      }
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const binding of clause.namedBindings.elements) {
          if (binding.isTypeOnly) continue;
          const exported = binding.propertyName?.text ?? binding.name.text;
          if (exported === 'logger' || exported === 'console') report(binding, 'raw-logging-import', 'A raw logging object cannot be imported into runtime code.');
          if (kind === 'diagnostics') imports.set(binding.name.text, exported);
        }
      }
    }
    // Import aliases are known before looking at usages. Computed variable names fail closed:
    // resolving a spelling without binding/type analysis could mistake a shadowed variable.
    function collect(node) {
      registerImport(node);
      ts.forEachChild(node, collect);
    }
    collect(source);
    function diagnosticUse(node, exported) {
      if (isType(node)) return;
      const operation = contract.operations.includes(exported);
      const consumers = Object.hasOwn(contract.infrastructure, exported) ? contract.infrastructure[exported] : undefined;
      if (consumers && !consumers.includes(localPath)) {
        report(node, 'diagnostic-infrastructure', 'HTTP diagnostic context and transport events belong to their audited middleware and API consumers.');
        return;
      }
      if (!operation && !consumers) {
        report(node, 'diagnostic-contract', 'New runtime diagnostic exports require an explicit logging contract.');
        return;
      }
      const { value, parent } = expressionParent(node);
      if (!ts.isCallExpression(parent) || parent.expression !== value) {
        report(node, 'diagnostic-reference', 'Call diagnostics directly; aliases, callbacks, re-exports and bound functions bypass the operation contract.');
        return;
      }
      const first = unwrap(parent.arguments[0]);
      if (operation && (!first || (!ts.isStringLiteral(first) && !ts.isNoSubstitutionTemplateLiteral(first)))) {
        report(parent, 'dynamic-operation', 'The diagnostic operation must be a static string literal owned by the call site.');
      }
    }
    function visit(node) {
      if (ts.isIdentifier(node) && isReference(node)) {
        if (node.text === 'require' && (!ts.isCallExpression(node.parent) || node.parent.expression !== node)) report(node, 'runtime-require', 'Do not alias the module loader; use auditable static imports.');
        if (node.text === 'console' || node.text === 'logger') report(node, 'raw-logging', 'Runtime logging belongs to the audited diagnostic owner.');
        if (imports.has(node.text)) diagnosticUse(node, imports.get(node.text));
        if (namespaces.has(node.text)) {
          const { value, parent } = expressionParent(node);
          const access = member(parent);
          if (!access || access.object !== unwrap(value)) report(node, 'diagnostic-reference', 'Use diagnostic namespace members directly; do not alias or pass the namespace.');
          else if (!access.name) report(parent, 'diagnostic-reference', 'Computed diagnostic names must resolve to a known static member.');
          else diagnosticUse(parent, access.name);
        }
        if (globals.has(node.text)) {
          const { value, parent } = expressionParent(node);
          const access = member(parent);
          if (!(access && access.object === unwrap(value)) && !ts.isTypeOfExpression(parent)) {
            report(node, 'global-alias', 'Do not alias or pass a global object; access its named non-logging property directly.');
          }
        }
      }
      const access = member(node);
      if (access && !isType(node)) {
        if (access.name === 'require') report(node, 'runtime-require', 'Do not access an indirect module loader; use auditable static imports.');
        if (sinkProperties.has(access.name)) report(node, 'raw-logging', 'Console, logger and process output streams belong to the audited diagnostic owner.');
        if (isGlobal(access.object) && !access.name) report(node, 'global-computed-access', 'Dynamic access to global objects can bypass the logging contract.');
        if (isGlobal(node)) {
          const { value, parent } = expressionParent(node);
          const next = member(parent);
          if (!(next && next.object === unwrap(value)) && !ts.isTypeOfExpression(parent) &&
              !(ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind))) report(node, 'global-alias', 'Do not alias or pass a global object.');
        }
      }
      if (ts.isExportDeclaration(node)) {
        const typeOnly = node.isTypeOnly || (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length && node.exportClause.elements.every(binding => binding.isTypeOnly));
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && !typeOnly) checkExecutableImport(node, node.moduleSpecifier.text);
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && !typeOnly && moduleKind(node.moduleSpecifier.text)) {
          report(node, 'logging-re-export', 'Import diagnostics from their canonical owner; runtime logging re-exports are not allowed.');
        }
      }
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        report(node, 'runtime-require', 'Use static ESM imports so runtime logging imports can be audited.');
      }
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const specifier = literal(node.arguments[0]);
        if (specifier) checkExecutableImport(node, specifier);
        // JSON translations are data, not an executable logging route.
        const argument = node.arguments[0];
        const jsonTranslation = node.expression.kind === ts.SyntaxKind.ImportKeyword && argument && ts.isTemplateExpression(argument) &&
          argument.head.text.startsWith('../../public/locales/') && argument.templateSpans.at(-1).literal.text.endsWith('.json');
        if ((!specifier && !jsonTranslation) || (specifier && moduleKind(specifier))) {
          report(node, 'runtime-logging-import', 'Logging imports must use static ESM declarations from the diagnostic owner.');
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { checked, findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args[0] && !['--frontend', '--backend'].includes(args[0]))) throw new Error('Usage: node scripts/check-runtime-logging.mjs [--frontend|--backend]');
    for (const target of args.length ? [args[0].slice(2)] : Object.keys(contracts)) {
      const result = checkRuntimeLogging(target);
      for (const issue of result.findings) console.error(`${issue.file}:${issue.line}:${issue.column} [${issue.code}] ${issue.message}`);
      if (result.findings.length) process.exitCode = 1;
      else process.stdout.write(`Runtime logging: ${target} ${result.checked} source files passed.\n`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Runtime logging check failed');
    process.exitCode = 1;
  }
}
