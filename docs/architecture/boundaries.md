# Frontend import boundaries

One Next.js frontend serves 14 dragons (kc, ka, mex, pt, rob, lop, ik, msva, se, bou, lok, iaf,
vof, aot). Variation between dragons used to be expressed as `isKC()`-style branches and direct
reads of `process.env.NEXT_PUBLIC_APPLICATION` scattered through shared code. The layering below
replaces that with one module per dragon and an explicit direction of dependencies. The layering is
enforced by CI; this document is the reference for what the checks mean and what to do when one
fails.

## Layers

Imports point downward only.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  shell            src/shell/**   src/app/** (Next.js routes)                  │
│                   Composition root. The only layer that knows which dragon is │
│                   running (reads NEXT_PUBLIC_APPLICATION), wires dragon       │
│                   modules into domain contracts, validates config at startup. │
├──────────────────────────────────────────────────────────────────────────────┤
│  dragons          src/dragons/<id>/**   (kc, ka, mex, pt, rob, lop, ...)      │
│                   One module per dragon: implementations of contracts the     │
│                   domains own. src/dragons/dragon-module.ts is the shared     │
│                   module type, not a dragon.                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│  domains          src/supportmanagement/**        src/casedata/**             │
│                   Business logic and UI per domain. Own the contracts that    │
│                   dragons implement. Do not import each other.               │
├──────────────────────────────────────────────────────────────────────────────┤
│  core             src/common/**  src/config/**  src/stores/**  src/utils/**   │
│                   src/interfaces/**                                           │
│                   Shared, dragon-agnostic, domain-agnostic code.              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Within a layer: dragons do not import other dragons, and the two investigation implementations
(`src/supportmanagement/investigation/aot` and `.../avvikelse`) do not import each other (see the
Investigation section of `CLAUDE.md`).

## Rules

| #   | From                                                              | To                                                                                                              | Verdict                | Enforced by        | Baseline |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------ | -------- |
| 1   | `src/dragons/<x>/**`                                              | `src/dragons/<y>/**` (y ≠ x)                                                                                    | forbidden              | dependency-cruiser | none     |
| 1a  | `src/dragons/<x>/**`                                              | `src/dragons/dragon-module.ts` (any file directly under `src/dragons/`), domains, core                          | allowed                | —                  | —        |
| 2   | anything except `src/shell/**`, `src/app/**`                      | `src/shell/**`                                                                                                  | forbidden              | dependency-cruiser | none     |
| 3   | `src/common`, `src/supportmanagement`, `src/casedata`, `src/config`, `src/stores`, `src/utils`, `src/interfaces` | `src/dragons/**`                                                                              | forbidden              | dependency-cruiser | none     |
| 4   | `src/common/**`                                                   | `src/casedata/**`, `src/supportmanagement/**`                                                                   | forbidden              | dependency-cruiser | yes      |
| 5   | `src/supportmanagement/**`                                        | `src/casedata/**` (and the reverse)                                                                             | forbidden              | dependency-cruiser | yes      |
| 6   | anything except `src/shell/**`, `src/app/**`, the file itself     | `src/common/services/application-service.ts` (`isKC()` and friends)                                            | forbidden              | dependency-cruiser | yes      |
| 7   | `src/supportmanagement/investigation/aot/**`                      | `src/supportmanagement/investigation/avvikelse/**` (and the reverse)                                            | forbidden              | dependency-cruiser | none     |
| 8   | any `src/**` file                                                 | an import that does not resolve (typically a missing tsconfig path alias)                                       | forbidden              | dependency-cruiser | none     |
| 9   | anything except `src/shell/**`, `src/app/**`, `application-service.ts` | reading `process.env.NEXT_PUBLIC_APPLICATION` (exact name; `NEXT_PUBLIC_APPLICATION_NAME` is unrelated)    | forbidden              | ESLint             | yes      |

Rule names as they appear in tool output (all `severity: error`):

| #   | dependency-cruiser rule (`frontend/.dependency-cruiser.cjs`)                                    |
| --- | ----------------------------------------------------------------------------------------------- |
| 1   | `no-cross-dragon-imports`                                                                       |
| 2   | `shell-is-only-imported-by-shell-and-app`                                                       |
| 3   | `domains-and-core-do-not-import-dragons`                                                        |
| 4   | `core-does-not-import-domains`                                                                  |
| 5   | `domains-do-not-import-each-other`                                                              |
| 6   | `application-service-is-shell-only`                                                             |
| 7   | `investigation-variants-do-not-import-each-other`                                               |
| 8   | `no-unresolvable-imports`                                                                       |
| 9   | ESLint `no-restricted-syntax` in `frontend/eslint.config.mjs` (block with `files: ['src/**']`)  |

"Baseline: yes" means the rule had violations when it was introduced. Those are recorded and
tolerated; new ones fail. "Baseline: none" rules had zero violations and have no tolerance.

## Which tool enforces what, and why

- **dependency-cruiser** (`frontend/.dependency-cruiser.cjs`) checks the import graph. It resolves
  the tsconfig path aliases (`@common/*`, `@supportmanagement/*`, `@casedata/*`, `@config/*`,
  `@stores/*`, `@shell/*`, `@dragons/*`) from `tsconfig.json` and counts type-only imports
  (`tsPreCompilationDeps: true`): a type dependency across a boundary is still a dependency on that
  layer, and it is the first thing that becomes a runtime import later. Rules are written against
  file paths (`^src/shell/`), not aliases, so they hold for relative imports too. Generated API
  clients (`src/**/data-contracts/**`), build output, `e2e/` and `node_modules` are excluded.
- **ESLint** (`frontend/eslint.config.mjs`) checks the one boundary that is not an import: reading
  `process.env.NEXT_PUBLIC_APPLICATION`. Only the shell may read the app identity; everything else
  gets it from `@shell/app-identity` or, better, does not need it because the variation is expressed
  as a domain-owned contract that the shell fulfils. The rule is `off` for `src/shell/**`,
  `src/app/**` and `src/common/services/application-service.ts` (the legacy reader the shell
  replaces). The `e2e/**` tree has its own, unrelated `no-restricted-syntax` configuration.

## The baseline ratchet

Two files record the violations that existed when the rules were introduced:

| File                                                   | Tool               | Format                                          |
| ------------------------------------------------------ | ------------------ | ----------------------------------------------- |
| `frontend/.dependency-cruiser-known-violations.json`   | dependency-cruiser | array of violations (`from`, `to`, `rule.name`) |
| `frontend/eslint-suppressions.json`                    | ESLint             | `{ [file]: { [rule]: { count } } }`             |

Both are committed. `yarn lint:deps` runs with `--ignore-known`, which downgrades the recorded
violations; ESLint picks up `eslint-suppressions.json` from the frontend directory automatically
(same for `yarn lint`, `yarn lint:strict` and the lint-staged pre-commit hook, which all run ESLint
with `frontend/` as cwd).

The baselines may only shrink:

- A new violation is not in the baseline and fails. For ESLint, a baselined file with _more_ reads
  than its recorded count fails on every read in that file, not only the new one.
- Removing a violation makes the corresponding entry stale. ESLint fails with
  `There are suppressions left that do not occur anymore. Consider re-running the command with --prune-suppressions.`
  dependency-cruiser ignores a stale entry silently (only the "N known violations ignored" count
  in its summary drops), so regenerate its baseline as part of the same change to keep the file
  truthful. Regenerate after removing violations:
  - `yarn lint:prune-suppressions` (ESLint: drops the stale entries, touches nothing else)
  - `yarn lint:deps:baseline` (dependency-cruiser: rewrites the file from the current violations)
- Never regenerate to add. `scripts/boundaries-baseline-guard.mjs` compares both files with the
  PR's base branch in CI and fails if any entry is new or its count went up, so a red boundary
  check cannot be fixed by refreshing the baseline. Regenerating locally after removing violations
  is what the guard expects; regenerating after adding one turns the boundary step green and the
  guard step red.
- Do not hand-edit either file, and never use `--suppress-all`: only `no-restricted-syntax` is
  baselined, and only for the reads that existed before the rule.

## When a rule fires

The fix is always to move the concept to the layer that owns it. Never add a suppression, an
`eslint-disable`, a rule exception in `.dependency-cruiser.cjs`, or a baseline entry.

| Failure                                                          | Do this                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A dragon imports another dragon (1)                              | Move the shared thing down into the domain that owns the concept; both dragons import it from there.                                                                                                |
| Domain or core code imports the shell (2) or a dragon (3)        | The dependency points the wrong way. Declare a contract (type/interface) in the domain, let the shell provide the dragon's implementation, and consume it through the contract.                       |
| Core imports a domain (4)                                        | Either the thing is generic and belongs in `src/common`, or the file you are in is domain code and belongs in the domain package.                                                                    |
| One domain imports the other (5)                                 | Shared concepts belong in `src/common`; anything that has to cross at runtime goes through an explicit API/contract, not a direct import.                                                             |
| Domain or core code imports `application-service.ts` (6) or reads `NEXT_PUBLIC_APPLICATION` (9) | Branching on "which dragon is running" is what the dragon modules replace. Express the variation as a capability, policy or contract owned by the domain, and let the shell pick the implementation. Only the shell reads the identity (`@shell/app-identity`). |
| aot and avvikelse import each other (7)                          | Put shared code at the contract/registry level of `src/supportmanagement/investigation`.                                                                                                             |
| Unresolvable import (8)                                          | A missing path alias in `tsconfig.json` or a moved file. An unresolved import is invisible to every other rule, so fix the alias or the path; do not baseline it.                                    |

Every dependency-cruiser rule carries a `comment` with the same guidance, printed next to the
violation.

## Local commands

Run from `frontend/`:

```bash
yarn lint:deps                 # import boundaries, baseline applied (what CI runs)
yarn lint:deps --no-ignore-known   # same, showing the baselined violations too
yarn lint:deps:baseline        # rewrite .dependency-cruiser-known-violations.json (only after removing violations)
yarn lint:strict               # ESLint with --max-warnings=0, suppressions applied (what CI runs)
yarn lint:prune-suppressions   # drop stale entries from eslint-suppressions.json (only after removing reads)
node ../scripts/boundaries-baseline-guard.mjs develop   # what the CI guard does, against a local ref
```

From the repository root, `yarn lint` runs the frontend ESLint, `lint:deps` and the backend lint in
sequence.

## How CI enforces this

`.github/workflows/lint.yml`, job `lint-frontend`, on every pull request and on pushes to
`develop`/`main`:

1. `yarn lint:strict` — ESLint including rule 9, with `eslint-suppressions.json` applied.
2. `yarn lint:deps` — dependency-cruiser rules 1–8, with the known-violations baseline applied.
3. `node ../scripts/boundaries-baseline-guard.mjs` — compares both baseline files with the PR's base
   branch (`GITHUB_BASE_REF`, fetched one commit deep in an earlier step) and fails if either gained
   an entry. On pushes there is no base ref and the step reports that and passes; a baseline that
   does not exist on the base branch yet is also skipped.

The pre-commit hook (`.husky/pre-commit` → `lint-staged`) runs ESLint on staged frontend files with
`frontend/` as cwd, so the suppressions apply there too: a new read fails the commit, and a removed
read fails it with the prune message above until `yarn lint:prune-suppressions` has been run and
the updated `eslint-suppressions.json` is staged.
