/**
 * Import-boundary rules for the frontend.
 *
 * The rules encode the layering described in docs/architecture/boundaries.md:
 *
 *   src/app, src/shell           composition layer (reads the app identity, wires dragons in)
 *   src/dragons/<id>             one module per dragon; implements domain-owned contracts
 *   src/supportmanagement,       domain packages
 *   src/casedata
 *   src/common, src/config,      core / shared
 *   src/stores, src/utils,
 *   src/interfaces
 *
 * Imports point downward only. A rule firing means a concept lives in the wrong layer:
 * move it down into the domain that owns it, or up into the shell. Do not add exceptions
 * here and do not hand-edit the baseline (.dependency-cruiser-known-violations.json).
 *
 * Run:   yarn lint:deps              (applies the baseline via --ignore-known)
 *        yarn lint:deps:baseline     (regenerates the baseline; only after removing violations)
 *
 * Rules marked "baselined" have pre-existing violations recorded in the baseline. The
 * baseline may only shrink; CI checks that (scripts/boundaries-baseline-guard.mjs).
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-dragon-imports',
      severity: 'error',
      comment:
        'A dragon module (src/dragons/<id>) must not import another dragon module. Dragons share ' +
        'code only through the domain-owned contracts they implement (src/dragons/dragon-module.ts and ' +
        'the domains). If two dragons need the same thing, move it down into the domain package that ' +
        'owns the concept and let both dragons import it from there.',
      from: { path: '^src/dragons/([^/]+)/' },
      to: {
        path: '^src/dragons/',
        // $1 is the dragon id captured in from.path. Files directly under src/dragons/ (e.g.
        // dragon-module.ts) are shared type files, not dragons, and may be imported by every dragon.
        pathNot: '^src/dragons/$1/|^src/dragons/[^/]+\\.tsx?$',
      },
    },
    {
      name: 'shell-is-only-imported-by-shell-and-app',
      severity: 'error',
      comment:
        'src/shell is the composition root: it is the only place that knows which dragon is running ' +
        'and it wires dragon modules into the domain contracts. Only src/shell itself and the Next.js ' +
        'routes in src/app may import it. If a domain or core module needs something from the shell, ' +
        'the dependency is pointing the wrong way: define a contract (type/interface) in the domain, ' +
        'let the shell provide the implementation, and consume it via that contract.',
      from: { pathNot: '^src/(shell|app)/' },
      to: { path: '^src/shell/' },
    },
    {
      name: 'domains-and-core-do-not-import-dragons',
      severity: 'error',
      comment:
        'Domain packages (src/supportmanagement, src/casedata) and core/shared code (src/common, ' +
        'src/config, src/stores, src/utils, src/interfaces) must not import src/dragons. Dragon modules ' +
        'sit above the domains and implement contracts the domains own. If a domain needs dragon-specific ' +
        'behaviour, declare a contract in the domain and let the shell inject the dragon implementation.',
      from: { path: '^src/(common|supportmanagement|casedata|config|stores|utils|interfaces)/' },
      to: { path: '^src/dragons/' },
    },
    {
      name: 'core-does-not-import-domains',
      severity: 'error',
      comment:
        '[baselined] src/common is core/shared code and must not depend on the domain packages ' +
        'src/casedata or src/supportmanagement. Either the thing you need is generic and belongs in ' +
        'src/common, or the module you are editing is domain code and belongs in the domain package. ' +
        'Existing violations are recorded in the baseline; do not add new ones.',
      from: { path: '^src/common/' },
      to: { path: '^src/(casedata|supportmanagement)/' },
    },
    {
      name: 'domains-do-not-import-each-other',
      severity: 'error',
      comment:
        '[baselined] src/supportmanagement and src/casedata are separate domains and must not import ' +
        'each other. Shared concepts belong in src/common; anything that has to cross the domain line ' +
        'at runtime goes through an explicit API/contract, not a direct import. Existing violations are ' +
        'recorded in the baseline; do not add new ones.',
      from: { path: '^src/(supportmanagement|casedata)/' },
      to: {
        path: '^src/(supportmanagement|casedata)/',
        // $1 is the domain captured in from.path: importing within your own domain is fine.
        pathNot: '^src/$1/',
      },
    },
    {
      name: 'application-service-is-shell-only',
      severity: 'error',
      comment:
        '[baselined] src/common/services/application-service.ts (the isKC()/isROB()-style predicates) ' +
        'may only be imported by src/shell and src/app. Branching on "which dragon is running" in domain ' +
        'or core code is exactly what the dragon modules replace: express the variation as a capability, ' +
        'policy or contract owned by the domain, and let the shell pick the dragon implementation. ' +
        'Existing violations are recorded in the baseline; do not add new ones.',
      from: { pathNot: '^src/(shell|app)/|^src/common/services/application-service\\.tsx?$' },
      to: { path: '^src/common/services/application-service\\.tsx?$' },
    },
    {
      name: 'investigation-variants-do-not-import-each-other',
      severity: 'error',
      comment:
        'The two investigation implementations (src/supportmanagement/investigation/aot and .../avvikelse) ' +
        'share the variant contract and nothing else; see the "Investigation" section of CLAUDE.md. ' +
        'Put shared code in the contract/registry level of src/supportmanagement/investigation, never in ' +
        'the other implementation. There is no baseline for this rule.',
      from: { path: '^src/supportmanagement/investigation/(aot|avvikelse)/' },
      to: {
        path: '^src/supportmanagement/investigation/(aot|avvikelse)/',
        pathNot: '^src/supportmanagement/investigation/$1/',
      },
    },
    {
      name: 'no-unresolvable-imports',
      severity: 'error',
      comment:
        'An import that cannot be resolved is invisible to every rule above, so it would silently ' +
        'bypass the boundaries. Usually this means a path alias is missing from tsconfig.json ' +
        '(dependency-cruiser resolves @common/*, @shell/*, @dragons/*, ... from there) or the file ' +
        'was moved. Fix the import or the alias; do not baseline this.',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    // Only the application source is cruised. Generated API clients, build output, the e2e suite and
    // third-party code are outside the boundary model.
    exclude: {
      path: ['node_modules', '^\\.next', '/data-contracts/', '^e2e/'],
    },
    // Type-only imports count: a type dependency across a boundary is still a dependency on that
    // layer's shape, and it is the first thing that turns into a runtime import later.
    tsPreCompilationDeps: true,
    // tsconfig.json carries the path aliases (@common/*, @supportmanagement/*, @casedata/*, @config/*,
    // @stores/*, @shell/*, @dragons/*, ...). dependency-cruiser reads it as JSONC, comments included.
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
