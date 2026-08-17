# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Draken is a Swedish municipal administration application for Sundsvalls Kommun. It's a multi-tenant system supporting 13 different "drakar" (dragons/modules): **kc**, **ka**, **mex**, **pt**, **rob**, **lop**, **ik**, **msva**, **se**, **bou**, **lok**, **iaf**, **vof**. Each drake serves different municipal departments with distinct feature configurations.

**Two main business domains:**

- **CaseData** (Ärendehantering) - Case/errand management for MEX, PT
- **SupportManagement** (Supporthantering) - Contact center/support tickets for KC, LOP, ROB, etc.

IAF and VOF are the newest SupportManagement drakar. They share the investigation
(utredning) feature and are treated as one variant in code via `isIAFOrVOF()`.

## Development Commands

All commands require specifying a drake: `{drake}` = kc | ka | mex | pt | rob | lop | ik | msva | se | bou | lok | iaf | vof

### Backend (run from `backend/`)

```bash
yarn dev:{drake}              # Start dev server with hot reload
yarn build:{drake}            # Build for production
yarn start:{drake}            # Start production server
yarn lint                     # Run ESLint
yarn type-check               # TypeScript check only (app; excludes src/tests)
yarn type-check:test          # TypeScript check for tests (src/tests/tsconfig.json)
yarn test                     # Vitest unit tests (run mode)
yarn test:watch               # Vitest watch mode
yarn test:coverage            # Vitest with v8 coverage
yarn generate:datacontracts:{drake}  # Generate API types from Swagger
```

### Frontend (run from `frontend/`)

```bash
yarn dev:{drake}              # Start Next.js dev server
yarn build:{drake}            # Build for production
yarn start:{drake}            # Start production server
yarn lint                     # Run ESLint
yarn type-check               # TypeScript check only
yarn cypress:{drake}          # Run Cypress tests (interactive)
yarn cypress:headless:{drake} # Run Cypress tests (CI)
```

### Environment Setup

```bash
# Frontend: copy .env.{drake}-example to .env.{drake}
# Backend: copy .env.{drake}.example.local to .env.{drake}.development.local
```

## Tech Stack

**Backend:** Node 20, Express 4, TypeScript, routing-controllers (decorator-based), SAML auth (passport-saml), Winston logging, Axios

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, @sk-web-gui (Sundsvall design system), react-hook-form + yup, i18next (Swedish only), @rjsf for dynamic JSON Schema forms

## Architecture

### Backend Structure (`backend/src/`)

```
controllers/           # HTTP handlers with @Controller() decorators
  ├── casedata/       # Case management endpoints
  └── supportmanagement/  # Support ticket endpoints
services/             # Business logic (ApiService, errand.service, etc.)
data-contracts/       # Auto-generated API types from Swagger specs
middlewares/          # auth, permissions, validation, error handling
interfaces/           # TypeScript type definitions
dtos/                 # Data Transfer Objects for validation
config/               # Environment configuration
```

**Key patterns:**

- Routing Controllers with `@Controller()`, `@Get()`, `@Post()`, `@UseBefore()` decorators
- `ApiService` wraps Axios with OAuth token injection via interceptors
- `ApiTokenService` manages OAuth token lifecycle (auto-refresh)
- Custom `HttpException` class for error handling

### Frontend Structure (`frontend/src/`)

```
app/[locale]/         # Next.js App Router pages (sv locale only)
  ├── oversikt/       # Dashboard/overview
  ├── registrera/     # Registration
  └── arende/[errandNumber]/  # Errand detail view
casedata/             # Case management module
  ├── components/     # Errand forms, tabs, filtering
  ├── services/       # casedata-errand-service, etc.
  └── interfaces/     # TypeScript types
supportmanagement/    # Support ticket module
  ├── components/     # Support errand forms, tabs
  └── services/       # support-errand-service, etc.
common/               # Shared utilities
  ├── components/     # Reusable UI (layout, sidebar, notifications)
  ├── services/       # api-service, auth-service, etc.
  └── contexts/       # AppContext (global state)
config/appconfig.tsx  # Feature flags configuration
```

**Key patterns:**

- `AppContext` provides global state (user, errand, messages, etc.)
- Services use Axios-based `apiService` for API calls
- Forms use react-hook-form with yup validation
- Feature flags via `NEXT_PUBLIC_*` environment variables

### Path Aliases

**Backend:** `@config`, `@controllers/*`, `@services/*`, `@interfaces/*`, `@middlewares/*`, `@utils/*`

**Frontend:** `@casedata/*`, `@supportmanagement/*`, `@common/*`, `@config/*`, `@contexts/*`, `@styles/*`

## External APIs

The backend acts as a BFF (Backend For Frontend), consuming multiple Sundsvall municipal APIs via WSO2 API Gateway:

- CaseData, SupportManagement - Main business APIs
- ActiveDirectory, Employee - User/staff management
- Citizen, LegalEntity - Person/organization data
- Messaging, Templating - Communications
- Contract, BillingPreprocessor - Contracts and billing

API types are generated from Swagger specs into `data-contracts/` directories.

## Testing

### Backend (Vitest)

Backend unit tests use **Vitest** (`backend/vitest.config.ts`), run from `backend/`.

- **Location**: `backend/src/tests/`; file naming `<module>.service.test.ts` / `<module>.controller.test.ts` (one file per module under test). Shared helpers live in `backend/src/tests/helpers/`: `http.ts` (express request/response doubles for calling controller methods directly) and `mock-data.ts` (shared fixtures).
- **Globals**: `globals: true`, so `describe`/`it`/`expect`/`vi` are available without importing. They are typed ambiently via `/// <reference types="vitest/globals" />` in `src/types/vitest.d.ts` — the tsconfig's explicit `typeRoots` prevents resolving `vitest/globals` through the `types` array, so a reference from an included source file is used instead.
- **Transform**: tests are transformed with **SWC** via `unplugin-swc`, because routing-controllers/class-validator need `emitDecoratorMetadata`, which Vite 8's native Oxc/esbuild transform does not emit. The transform sets `swcrc: false` so it ignores the project's `.swcrc` (that file targets the `build:swc` production output — es2017/CJS — and would rewrite aliases).
- **Path aliases**: resolved by an explicit `alias` table in `vitest.config.ts` (mirroring `tsconfig.json`). Unlike some sibling apps, this project's `tsconfig.json` has **no `baseUrl`**, so `vite-tsconfig-paths` can't synthesize the aliases — hence the manual table. Keep it in sync when tsconfig paths change.
- **Env bootstrap**: `backend/src/tests/setup.ts` (wired via `setupFiles`) imports `reflect-metadata` and seeds env vars **before any module loads**. This is required because `logger.ts` mkdirs `LOG_DIR` at import time, and `ad-role.service.ts` dereferences `DEVELOPER_GROUP`/`ADMIN_GROUP`/`SUPERADMIN_GROUP` (and `APPLICATION`) at import time — importing those modules throws if the vars are unset. Add other env defaults here when tests need them; keep it to env bootstrapping only (no fixtures, no mocks).
- **Type-checking**: `src/tests` is **excluded from the root `tsconfig.json`** so the per-drake `tsc` production builds never emit test files. Tests get their own `backend/src/tests/tsconfig.json` (extends the root, `noEmit`, re-includes `src/tests` + the Vitest globals shim). This nested config is what makes the editor type test files correctly — VS Code auto-discovers the closest `tsconfig.json`, and the root one excludes tests, so without it `describe`/`it`/`expect` and `@/…` aliases show as unresolved. `yarn type-check:test` runs `tsc -p src/tests/tsconfig.json`.
- **CI**: `.github/workflows/vitest-backend.yml` runs `yarn type-check:test` and `yarn test` on pull requests and pushes to `develop`/`main`.
- **Scope**: the `services/` and `controllers/` layers — pure/transform functions directly, and IO-bound controller methods via the mocking pattern below.

**Mocking collaborators**: how you stub `ApiService` depends on where it is constructed.

- **Controllers** hold it as an _instance field_ (`private apiService = new ApiService()`), which is a plain runtime property — so a test can instantiate the controller and overwrite `controller.apiService` (and `controller.organizationService`) with `vi.fn()` stubs. Build a fresh instance per test so no state leaks between them. This is what `support-errand.controller.test.ts` does, and it needs no production-code changes.
- **Services** call `new ApiService()` _inside function bodies_, so the field-overwrite trick does not apply there. Those need `vi.mock('@/services/api.service')`, or a refactor to accept `api` as a parameter. The same holds for any collaborator constructed inside a function — e.g. `message.service`'s `createConversation`, which `support-errand.controller.test.ts` stubs with `vi.mock` plus a factory.

**Test data**: never hardcode person numbers, organization numbers, phone numbers, party ids or similar identifiers in tests — import them from `src/tests/helpers/mock-data.ts`, which records each value's provenance (Skatteverket / PTS test ranges). That keeps one place to confirm no production-like identifier enters the repo.

### Frontend

There are e2e tests in both Cypress and Playwright. The Cypress tests are the older original tests. The app will migrate to use Playwright shortly, and in the meantime tests are duplicated across them to evaluate equality.

#### Cypress E2E

Cypress E2E tests are organized by drake in `frontend/cypress/e2e/`:

- `kontaktcenter/` - KC tests
- `case-data/mex/` - MEX tests
- `case-data/pt/` - PT tests
- `lop/` - LOP tests

Run with: `yarn cypress:headless:{drake}`

Run for individual spec files with eg: `npx dotenv -e .env.kc -- cypress run --spec "cypress/e2e/kontaktcenter/errandPage-sidebar-kc.cy.ts"` (use app key of choice: kc, mex, pt etc)

#### Playwright

Playwright E2E tests are organized by drake in `frontend/e2e/`:

- `kontaktcenter/` - KC tests
- `case-data/mex/` - MEX tests
- `case-data/pt/` - PT tests
- `lop/` - LOP tests

Run with: `yarn test:e2e:{drake}`

Run for individual spec files with eg: `npx dotenv -e .env.kc -- playwright test --project=kc e2e/kontaktcenter/errandPage-base-info-tab-kc.spec.ts` (use app key of choice: kc, mex, pt etc)

## Key Files

| File                                           | Purpose                                    |
| ---------------------------------------------- | ------------------------------------------ |
| `backend/src/server.ts`                        | Entry point, registers all controllers     |
| `backend/src/app.ts`                           | Express setup, middleware chain, SAML auth |
| `backend/src/services/api.service.ts`          | HTTP client with OAuth interceptors        |
| `frontend/src/common/contexts/app.context.tsx` | Global state (AppContext)                  |
| `frontend/src/config/appconfig.tsx`            | Feature flags configuration                |
| `frontend/next.config.js`                      | Next.js configuration                      |

## Notes

- All text content is in Swedish
- No database layer - all data via external APIs
- Multi-tenant via environment configuration (one codebase, many deployments)
- SAML SSO authentication with Active Directory group-based authorization
