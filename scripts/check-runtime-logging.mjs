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
      createRequestDiagnostics: [
        'src/middlewares/request-diagnostics.middleware.ts',
        'src/middlewares/error.middleware.ts',
        'src/services/api.service.ts',
        'src/services/api-token.service.ts',
      ],
      currentRequestDiagnostics: ['src/middlewares/error.middleware.ts', 'src/services/api.service.ts', 'src/services/api-token.service.ts'],
      withRequestDiagnostics: ['src/middlewares/request-diagnostics.middleware.ts', 'src/services/api.service.ts'],
    },
  },
};
const loggingModules = [
  /^(?:node:)?(?:console|process|module)$/u,
  /(?:^|\/)(?:logger|logging)(?:[./-]|$)/u,
  /^(?:winston|pino|bunyan|log4js|loglevel|debug|morgan|consola|signale|roarr)(?:$|[/-])/u,
  /^@(?:sentry\/|opentelemetry\/api-logs)/u,
];
const globals = new Set(['globalThis', 'global', 'window', 'self', 'process']);
const sinkProperties = new Set(['console', 'stdout', 'stderr', 'logger']);

// Keep exceptions aligned with the actual test runners, never with a loose "test" substring.
function excluded(target, path) {
  return (
    /\.d\.[cm]?ts$/u.test(path) ||
    path === 'src/swagger-typescript-api.ts' ||
    (target === 'backend' ? path.startsWith('src/tests/') : /\.(?:test\.ts|cy\.tsx)$/u.test(path))
  );
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Runtime source symlinks must be reviewed before logging can be checked');
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[cm]?[jt]sx?$/u.test(path) ? [path] : [];
  });
}

class SourceLoggingAudit {
  constructor(ts, target, directory, options, path) {
    this.ts = ts;
    this.target = target;
    this.contract = contracts[target];
    this.directory = directory;
    this.options = options;
    this.path = path;
    this.source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    this.localPath = relative(directory, path).replaceAll('\\', '/');
    this.owner = join(directory, this.contract.owner);
    this.findings = [];
    this.imports = new Map();
    this.namespaces = new Set();
    this.emitted = new Set();
  }

  check() {
    // Resolve imports before usages, including aliases declared later in the source.
    this.collect(this.source);
    this.visit(this.source);
    return this.findings;
  }

  report(node, code, message) {
    const offset = node.getStart(this.source);
    const key = `${offset}:${code}`;
    if (this.emitted.has(key)) return;
    this.emitted.add(key);
    const position = this.source.getLineAndCharacterOfPosition(offset);
    this.findings.push({ file: `${this.target}/${this.localPath}`, line: position.line + 1, column: position.character + 1, code, message });
  }

  unwrap(node) {
    while (
      node &&
      (this.ts.isParenthesizedExpression(node) ||
        this.ts.isAsExpression(node) ||
        this.ts.isNonNullExpression(node) ||
        this.ts.isTypeAssertionExpression(node) ||
        this.ts.isSatisfiesExpression(node))
    )
      node = node.expression;
    return node;
  }

  literal(node) {
    node = this.unwrap(node);
    if (!node) return undefined;
    if (this.ts.isStringLiteral(node) || this.ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (this.ts.isBinaryExpression(node) && node.operatorToken.kind === this.ts.SyntaxKind.PlusToken) {
      const left = this.literal(node.left);
      const right = this.literal(node.right);
      return left === undefined || right === undefined ? undefined : left + right;
    }
    return undefined;
  }

  member(node) {
    if (this.ts.isPropertyAccessExpression(node)) return { object: this.unwrap(node.expression), name: node.name.text };
    if (this.ts.isElementAccessExpression(node)) return { object: this.unwrap(node.expression), name: this.literal(node.argumentExpression) };
    return undefined;
  }

  isGlobal(node) {
    node = this.unwrap(node);
    if (this.ts.isIdentifier(node)) return globals.has(node.text);
    const access = this.member(node);
    return Boolean(access && globals.has(access.name) && this.isGlobal(access.object));
  }

  expressionParent(node) {
    let value = node;
    while (value.parent && this.unwrap(value.parent) !== value.parent && value.parent.expression === value) value = value.parent;
    return { value, parent: value.parent };
  }

  isType(node) {
    for (let parent = node.parent; parent && parent !== this.source; parent = parent.parent) {
      if (this.ts.isTypeNode(parent) || this.ts.isInterfaceDeclaration(parent) || this.ts.isTypeAliasDeclaration(parent)) return true;
      if (this.ts.isExpressionStatement(parent) || this.ts.isVariableDeclaration(parent) || this.ts.isCallExpression(parent)) return false;
    }
    return false;
  }

  isReference(node) {
    const parent = node.parent;
    if (
      this.isType(node) ||
      this.ts.isImportSpecifier(parent) ||
      this.ts.isImportClause(parent) ||
      this.ts.isNamespaceImport(parent) ||
      this.ts.isImportEqualsDeclaration(parent)
    )
      return false;
    if (
      (this.ts.isPropertyAccessExpression(parent) && parent.name === node) ||
      ((this.ts.isPropertyAssignment(parent) ||
        this.ts.isMethodDeclaration(parent) ||
        this.ts.isPropertyDeclaration(parent) ||
        this.ts.isBindingElement(parent)) &&
        parent.name === node &&
        !this.ts.isComputedPropertyName(parent.name))
    )
      return false;
    if ((this.ts.isVariableDeclaration(parent) || this.ts.isParameter(parent) || this.ts.isFunctionDeclaration(parent)) && parent.name === node)
      return false;
    return true;
  }

  resolveModule(specifier) {
    return this.ts.resolveModuleName(specifier, this.path, this.options, this.ts.sys).resolvedModule?.resolvedFileName;
  }

  moduleKind(specifier) {
    const resolved = this.resolveModule(specifier);
    if (resolved && resolve(resolved) === this.owner) return 'diagnostics';
    if (
      loggingModules.some(pattern => pattern.test(specifier)) ||
      (resolved && this.contract.sinks.includes(relative(this.directory, resolved).replaceAll('\\', '/')))
    )
      return 'sink';
    return undefined;
  }

  checkExecutableImport(node, specifier) {
    const resolved = this.resolveModule(specifier);
    if (!resolved || resolved.includes('/node_modules/') || resolved.endsWith('.json')) return;
    const dependency = relative(this.directory, resolved).replaceAll('\\', '/');
    // This existing runtime release validator is tested by the root startup contracts.
    // TypeScript resolves its .cjs import through the matching declaration file.
    if (['../scripts/dragon-deployment.cjs', '../scripts/dragon-deployment.d.cts'].includes(dependency)) return;
    if (!dependency.startsWith('src/') || excluded(this.target, dependency)) {
      this.report(
        node,
        'unchecked-runtime-import',
        'Runtime imports cannot enter excluded tests, codegen tools or local code outside the checked source tree.'
      );
    }
  }

  registerNamedImports(bindings, kind) {
    if (!bindings || !this.ts.isNamedImports(bindings)) return;
    for (const binding of bindings.elements) {
      if (binding.isTypeOnly) continue;
      const exported = binding.propertyName?.text ?? binding.name.text;
      if (exported === 'logger' || exported === 'console')
        this.report(binding, 'raw-logging-import', 'A raw logging object cannot be imported into runtime code.');
      if (kind === 'diagnostics') this.imports.set(binding.name.text, exported);
    }
  }

  registerDiagnosticImport(clause) {
    if (clause.name) this.report(clause, 'diagnostic-import', 'Diagnostic functions must use a named or namespace import.');
    if (clause.namedBindings && this.ts.isNamespaceImport(clause.namedBindings)) this.namespaces.add(clause.namedBindings.name.text);
  }

  registerImport(node) {
    if (!this.ts.isImportDeclaration(node) || !this.ts.isStringLiteral(node.moduleSpecifier) || node.importClause?.isTypeOnly) return;
    const bindings = node.importClause?.namedBindings;
    if (bindings && this.ts.isNamedImports(bindings) && bindings.elements.length && bindings.elements.every(binding => binding.isTypeOnly)) return;
    this.checkExecutableImport(node, node.moduleSpecifier.text);
    const kind = this.moduleKind(node.moduleSpecifier.text);
    if (kind === 'sink')
      this.report(node, 'raw-logging-import', 'Import the audited diagnostic functions instead of a logging transport or global module.');
    const clause = node.importClause;
    if (!clause) return;
    if (kind === 'diagnostics') this.registerDiagnosticImport(clause);
    this.registerNamedImports(bindings, kind);
  }

  collect(node) {
    this.registerImport(node);
    this.ts.forEachChild(node, child => this.collect(child));
  }

  diagnosticUse(node, exported) {
    if (this.isType(node)) return;
    const operation = this.contract.operations.includes(exported);
    const consumers = Object.hasOwn(this.contract.infrastructure, exported) ? this.contract.infrastructure[exported] : undefined;
    if (consumers && !consumers.includes(this.localPath)) {
      this.report(
        node,
        'diagnostic-infrastructure',
        'HTTP diagnostic context and transport events belong to their audited middleware and API consumers.'
      );
      return;
    }
    if (!operation && !consumers) {
      this.report(node, 'diagnostic-contract', 'New runtime diagnostic exports require an explicit logging contract.');
      return;
    }
    const { value, parent } = this.expressionParent(node);
    if (!this.ts.isCallExpression(parent) || parent.expression !== value) {
      this.report(
        node,
        'diagnostic-reference',
        'Call diagnostics directly; aliases, callbacks, re-exports and bound functions bypass the operation contract.'
      );
      return;
    }
    const first = this.unwrap(parent.arguments[0]);
    if (operation && (!first || (!this.ts.isStringLiteral(first) && !this.ts.isNoSubstitutionTemplateLiteral(first)))) {
      this.report(parent, 'dynamic-operation', 'The diagnostic operation must be a static string literal owned by the call site.');
    }
  }

  checkNamespaceReference(node) {
    const { value, parent } = this.expressionParent(node);
    const access = this.member(parent);
    if (!access || access.object !== this.unwrap(value))
      this.report(node, 'diagnostic-reference', 'Use diagnostic namespace members directly; do not alias or pass the namespace.');
    else if (!access.name) this.report(parent, 'diagnostic-reference', 'Computed diagnostic names must resolve to a known static member.');
    else this.diagnosticUse(parent, access.name);
  }

  checkGlobalReference(node, allowComparison = false) {
    const { value, parent } = this.expressionParent(node);
    const access = this.member(parent);
    if (access && access.object === this.unwrap(value)) return;
    if (this.ts.isTypeOfExpression(parent)) return;
    if (
      allowComparison &&
      this.ts.isBinaryExpression(parent) &&
      [
        this.ts.SyntaxKind.EqualsEqualsToken,
        this.ts.SyntaxKind.EqualsEqualsEqualsToken,
        this.ts.SyntaxKind.ExclamationEqualsToken,
        this.ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ].includes(parent.operatorToken.kind)
    )
      return;
    this.report(node, 'global-alias', 'Do not alias or pass a global object; access its named non-logging property directly.');
  }

  checkIdentifier(node) {
    if (!this.isReference(node)) return;
    if (node.text === 'require' && (!this.ts.isCallExpression(node.parent) || node.parent.expression !== node))
      this.report(node, 'runtime-require', 'Do not alias the module loader; use auditable static imports.');
    if (node.text === 'console' || node.text === 'logger')
      this.report(node, 'raw-logging', 'Runtime logging belongs to the audited diagnostic owner.');
    if (this.imports.has(node.text)) this.diagnosticUse(node, this.imports.get(node.text));
    if (this.namespaces.has(node.text)) this.checkNamespaceReference(node);
    if (globals.has(node.text)) this.checkGlobalReference(node);
  }

  checkMember(node) {
    const access = this.member(node);
    if (!access || this.isType(node)) return;
    if (access.name === 'require') this.report(node, 'runtime-require', 'Do not access an indirect module loader; use auditable static imports.');
    if (sinkProperties.has(access.name))
      this.report(node, 'raw-logging', 'Console, logger and process output streams belong to the audited diagnostic owner.');
    if (this.isGlobal(access.object) && !access.name)
      this.report(node, 'global-computed-access', 'Dynamic access to global objects can bypass the logging contract.');
    if (this.isGlobal(node)) this.checkGlobalReference(node, true);
  }

  checkExport(node) {
    const typeOnly =
      node.isTypeOnly ||
      (node.exportClause &&
        this.ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length &&
        node.exportClause.elements.every(binding => binding.isTypeOnly));
    if (!node.moduleSpecifier || !this.ts.isStringLiteral(node.moduleSpecifier) || typeOnly) return;
    this.checkExecutableImport(node, node.moduleSpecifier.text);
    if (this.moduleKind(node.moduleSpecifier.text))
      this.report(node, 'logging-re-export', 'Import diagnostics from their canonical owner; runtime logging re-exports are not allowed.');
  }

  checkDynamicImport(node) {
    const dynamicImport = node.expression.kind === this.ts.SyntaxKind.ImportKeyword;
    const requireCall = this.ts.isIdentifier(node.expression) && node.expression.text === 'require';
    if (!dynamicImport && !requireCall) return;
    const specifier = this.literal(node.arguments[0]);
    if (specifier) this.checkExecutableImport(node, specifier);
    // JSON translations are data, not an executable logging route.
    const argument = node.arguments[0];
    const jsonTranslation =
      dynamicImport &&
      argument &&
      this.ts.isTemplateExpression(argument) &&
      argument.head.text.startsWith('../../public/locales/') &&
      argument.templateSpans.at(-1).literal.text.endsWith('.json');
    if ((!specifier && !jsonTranslation) || (specifier && this.moduleKind(specifier)))
      this.report(node, 'runtime-logging-import', 'Logging imports must use static ESM declarations from the diagnostic owner.');
  }

  visit(node) {
    if (this.ts.isIdentifier(node)) this.checkIdentifier(node);
    this.checkMember(node);
    if (this.ts.isExportDeclaration(node)) this.checkExport(node);
    if (this.ts.isImportEqualsDeclaration(node) && this.ts.isExternalModuleReference(node.moduleReference))
      this.report(node, 'runtime-require', 'Use static ESM imports so runtime logging imports can be audited.');
    if (this.ts.isCallExpression(node)) this.checkDynamicImport(node);
    this.ts.forEachChild(node, child => this.visit(child));
  }
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
    findings.push(...new SourceLoggingAudit(ts, target, directory, options, path).check());
  }
  return { checked, findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args[0] && !['--frontend', '--backend'].includes(args[0])))
      throw new Error('Usage: node scripts/check-runtime-logging.mjs [--frontend|--backend]');
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
