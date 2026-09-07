# CLAUDE.md

Working instructions for coding assistants in this repository. Human onboarding, architecture,
build/start commands and release ownership are maintained in
[the development guide](docs/architecture/dragon-development.md). Use that guide as the detailed
source; [README](README.md) is the quickstart. The catalog in `dragons.json` lists current dragons
and their domains, so do not maintain a second inventory here.

## Ownership and changes

Each dragon is a separately built application. SupportManagement and CaseData own reusable domain
behavior. The technical base owns transport, authentication mechanics, diagnostics and lifecycle.
Business modules such as Avvikelse implement domain contracts. Each dragon chooses its policies
and implementations in `frontend/src/dragons/<id>/application.ts` and
`backend/src/dragons/<id>/application.ts`. Shell composition connects these parts.

Before changing code, identify the existing owner, similar behavior and the smallest change that
reuses or deepens that owner. Keep business decisions out of generic infrastructure. A new dragon
must not require another name check in a shared service. See the guide's
[boundary examples](docs/architecture/dragon-development.md#gränsen-mellan-bas-domän-och-applikation)
and [onboarding checklist](docs/architecture/dragon-development.md#lägg-till-en-drake).

Frontend import boundaries are defined in [boundaries.md](docs/architecture/boundaries.md).
Existing identity reads and common-to-domain imports are baselined; the baselines may only shrink.
Do not add suppressions or exceptions to make a boundary violation pass. Backend production builds
start from the selected dragon's server and check its reachable modules. Shared contracts belong
to their domain/DTO owner, never to a controller re-export or another dragon.

## Investigation contract

`frontend/src/supportmanagement/investigation/` owns `InvestigationModule` and its configured
instance. There is no runtime registry selecting among implementations. IAF and VOF choose
`frontend/src/avvikelse/`; AOT chooses `frontend/src/dragons/aot/investigation/` at build time.
`useInvestigation` can enable the chosen implementation; it cannot replace it. Retired variant
flags are rejected. Follow the [flag migration](docs/operations/investigation-flags.md).

Optional investigation slots must remain optional. AOT's implementation does not own Avvikelse's
categorization or document policy. The configured UI tab and the backend document profile are
separate capabilities: AOT has no investigation documents and reports document state `inactive`.
Registration and label filters belong to the application profile independently of document state.
See [investigation ownership](frontend/src/supportmanagement/investigation/README.md).

When changing shared SM behavior, prove both a consumer with Avvikelse and one without it still
work. The domain's `investigation-module-contract.test.ts` tests the contract independently of
Avvikelse. Browser tests must run against the selected dragon's server; a skipped test is not
acceptance evidence. Current projects and coverage live in `frontend/e2e/dragon-coverage.json`
and `frontend/playwright.config.ts`.

## Verification and runtime

Use Node 22.18 or later and Yarn Classic 1.22. CI runs Node 24. From the repository root:

```sh
yarn verify
node scripts/boundaries-baseline-guard.mjs HEAD
yarn dragon build KC
```

`verify` runs type checks, strict lint/import boundaries, formatting checks and unit/script tests.
Use the changed dragon and relevant consumers for additional builds and browser tests according
to the development guide. `yarn knip` is a separate cleanup inventory with existing findings;
its development entrypoints include `page.dev.tsx`. Do not delete working development routes
based on a production-only unused-code report.

[The release contract](deployments/README.md) owns production configuration, image pairing,
secret references and existing data volumes. API versions are defined in
`backend/src/config/api-config.ts`; generated contracts are reviewed with their owning API change.
Runtime flags do not grant access. Sessions, domain permissions and upstream authorization remain
required independently of release compatibility checks.

Use the existing diagnostic owners, static operation names and allowed fields described in
[the logging standard](docs/operations/logging.md). Do not log payloads, identifiers, headers,
raw errors or secrets. Keep test values synthetic and sourced as described below.

## Testing

### Backend (Vitest)

Backend unit tests use **Vitest** (`backend/vitest.config.ts`), run from `backend/`.

- **Location**: `backend/src/tests/`; file naming `<module>.service.test.ts` / `<module>.controller.test.ts` (one file per module under test). Shared helpers live in `backend/src/tests/helpers/`: `http.ts` (express request/response doubles for calling controller methods directly) and `mock-data.ts` (shared fixtures).
- **Globals**: `globals: true`, so `describe`/`it`/`expect`/`vi` are available without importing. They are typed ambiently via `/// <reference types="vitest/globals" />` in `src/types/vitest.d.ts` — the tsconfig's explicit `typeRoots` prevents resolving `vitest/globals` through the `types` array, so a reference from an included source file is used instead.
- **Transform**: tests are transformed with **SWC** via `unplugin-swc`, because routing-controllers/class-validator need `emitDecoratorMetadata`, which Vite 8's native Oxc/esbuild transform does not emit. The transform sets `swcrc: false` so test transformation is independent of other SWC configuration.
- **Path aliases**: resolved by an explicit `alias` table in `vitest.config.ts` (mirroring `tsconfig.json`). Unlike some sibling apps, this project's `tsconfig.json` has **no `baseUrl`**, so `vite-tsconfig-paths` can't synthesize the aliases — hence the manual table. Keep it in sync when tsconfig paths change.
- **Env bootstrap**: `backend/src/tests/setup.ts` (wired via `setupFiles`) imports `reflect-metadata` and seeds env vars **before any module loads**. This is required because `logger.ts` mkdirs `LOG_DIR` at import time, and `ad-role.service.ts` dereferences `DEVELOPER_GROUP`/`ADMIN_GROUP`/`SUPERADMIN_GROUP` (and `APPLICATION`) at import time — importing those modules throws if the vars are unset. Add other env defaults here when tests need them; keep it to env bootstrapping only (no fixtures, no mocks).
- **Type-checking**: `src/tests` is **excluded from the root `tsconfig.json`** so the per-drake `tsc` production builds never emit test files. Tests get their own `backend/src/tests/tsconfig.json` (extends the root, `noEmit`, re-includes `src/tests` + the Vitest globals shim). This nested config is what makes the editor type test files correctly — VS Code auto-discovers the closest `tsconfig.json`, and the root one excludes tests, so without it `describe`/`it`/`expect` and `@/…` aliases show as unresolved. `yarn type-check:test` runs `tsc -p src/tests/tsconfig.json`.
- **CI**: `.github/workflows/vitest-backend.yml` runs `yarn type-check:test` and `yarn test` on pull requests and pushes to `develop`/`main`.
- **Scope**: the `services/` and `controllers/` layers — pure/transform functions directly, and IO-bound controller methods via the mocking pattern below.

**Mocking collaborators**: how you stub `ApiService` depends on where it is constructed.

- **Controllers** hold it as an _instance field_ (`private apiService = new ApiService()`), which is a plain runtime property — so a test can instantiate the controller and overwrite `controller.apiService` (and `controller.organizationService`) with `vi.fn()` stubs. Build a fresh instance per test so no state leaks between them. This is what `support-errand.controller.test.ts` does, and it needs no production-code changes.
- **Services** call `new ApiService()` _inside function bodies_, so the field-overwrite trick does not apply there. Those need `vi.mock('@/services/api.service')`, or a refactor to accept `api` as a parameter. The same holds for any collaborator constructed inside a function — e.g. `message.service`'s `createConversation`, which `support-errand.controller.test.ts` stubs with `vi.mock` plus a factory.

**Test data**: never hardcode person numbers, organization numbers, phone numbers, party ids or similar identifiers in tests — import them from `src/tests/helpers/mock-data.ts`, which records each value's provenance (Skatteverket / PTS test ranges). That keeps one place to confirm no production-like identifier enters the repo.

### Frontend (unit)

Frontend unit tests use **Vitest** (`frontend/vitest.config.mts`), run from `frontend/`.
They previously ran on Node's built-in test runner from `.mjs` files; that was migrated so the
runner matches the backend and so tests are no longer restricted to alias-free modules.

- **Location**: colocated, `<module>.test.ts` next to the `<module>.ts` it covers. This
  deliberately differs from the backend layout: the backend keeps tests in `src/tests/` so the
  per-drake production `tsc` never emits them, a constraint Next.js does not have.
- **Shape**: `import { test } from 'vitest'` + `import assert from 'node:assert/strict'`, flat
  top-level `test(...)` calls. Assertions are **`node:assert`, not `expect`** — `globals` is
  off in the config, so nothing is injected and every import is explicit. No DOM, no React.
- **Path aliases**: resolved natively by Vite via `resolve.tsconfigPaths`, which reads the
  `paths` table in `tsconfig.json`. This works because that tsconfig sets `baseUrl`; the
  backend's does not, which is why `backend/vitest.config.ts` needs a hand-written alias table
  instead. Do not copy that pattern here.
- **Environment**: `node`. The suites are pure functions; nothing renders. Component tests
  would need `jsdom` plus `@testing-library/react`, which is a separate decision.
- **Scope**: pure functions — parsers, projectors, policy resolvers
  (`resolveCategorizationControl`, `parseInvestigationProfile`, `projectLabelFilterGroups`, …).
  Anything needing rendering or navigation belongs in the Playwright suites below.
- **Type-checking**: the frontend config includes `src/**/*.ts` and `src/**/*.tsx` explicitly,
  so application entrypoints and colocated unit tests are checked even when they have no importer.
  Legacy `*.cy.tsx` component specs are excluded from this app check. `tsconfig.test.json`
  additionally keeps the unit-test check usable without generated Next types.
- **CI**: `.github/workflows/frontend-unit.yml` runs `yarn type-check:test` and `yarn test` on
  pull requests and pushes to `develop`/`main`.
- **Test data**: the same rule as the backend applies — no real person numbers, organization
  numbers or phone numbers. `.husky/pre-commit` scans `.ts`/`.tsx`/`.mjs` for them.

### Frontend (e2e)

Playwright E2E tests are organized by drake in `frontend/e2e/`:

- `kontaktcenter/` - KC tests
- `case-data/mex/` - MEX tests
- `case-data/pt/` - PT tests
- `lop/` - LOP tests
- `iaf/` - shared IAF/VOF investigation tests (avvikelse)
- `aot/` - AOT smoke suite: proves the investigation seam stays inert for a drake that is not
  avvikelse, so IAF/VOF work that leaks into shared code fails here
- `schema-lab/` - development-only investigation schema lab tests

Run with: `yarn test:e2e:{drake}`

Run for individual spec files with eg: `npx dotenv -e .env.kc -- playwright test --project=kc e2e/kontaktcenter/errandPage-base-info-tab-kc.spec.ts` (use app key of choice: kc, mex, pt etc)
