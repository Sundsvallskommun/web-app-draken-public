# Shell

The shell is the Next.js application itself (`src/app/**`) plus this directory, which composes
the running dragon. It is the only code, besides `src/app/**` and the legacy
`common/services/application-service.ts`, that may read `NEXT_PUBLIC_APPLICATION`.

## What it owns

| File                          | Responsibility                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `app-identity.ts`             | The single read of `NEXT_PUBLIC_APPLICATION`, and `isDragonId`.                                  |
| `dragon-registry.ts`          | The fourteen dragon modules, statically imported and keyed by id.                                |
| `compose-dragon.ts`           | Pure, tested composition: validate the configuration, resolve the module, configure the domains. |
| `bootstrap.ts`                | Side-effect module that runs the composition once per module graph.                              |
| `dragon-bootstrap.client.tsx` | Client component whose only job is to import `bootstrap.ts` into the client graph.               |
| `layout/`                     | App composition components: the root client layout and the page chrome. See below.               |

Domains (`supportmanagement`, `casedata`) and core (`common`, `config`) never import the shell or a
dragon. They expose contracts (`SupportErrandPolicy`) and a `configure...`/`get...` pair; the shell
calls `configure` at startup and the domain reads `get` at use time. A domain getter that finds
nothing configured throws, so a module graph the shell missed fails on first use instead of quietly
behaving like the wrong dragon.

## Layout

`layout/` holds the two components that compose the application rather than share UI:
`app-layout.tsx`, the root client layout that loads the runtime flags and the investigation
profile, and `layout.component.tsx`, the page chrome that renders both domains' status labels and
phase handler. They live in the shell because they know both domains, read the identity
(`APP_IDENTITY`) and rerun `validateDragonConfiguration` once the Adminpanel flags have been
applied - the startup validation in `bootstrap.ts` only sees the environment flags. A failed
validation is rethrown from render, so `src/app/global-error.tsx` shows it. Generic layout pieces
(`sidebar-layout`, `page-header`, the user menu) stay in `common/components/layout`.

## Three vocabularies, kept apart

- **Identity** is one explicit value: which dragon this is. It selects a module from the registry.
  An unknown or empty value is a startup error, never a fallback to some default dragon.
- **Variant** is exactly one of a set of mutually exclusive implementations, today the
  investigation tab (`useAvvikelseInvestigation` vs `useAotInvestigation`). Enabling two is a
  configuration conflict and `validateDragonConfiguration` refuses to start. The variant registry's
  first-wins rule remains as the last line of defence for flags that arrive at runtime.
- **Capability** is an independent flag in `appConfig.features` that combines freely with the
  others (`useBilling`, `useClosingMessageCheckbox`, ...). Capabilities are rendering decisions.

Authorization is never derived here. What a user may do comes from the backend and the AD groups
it reports; identity and flags only decide what is rendered.

## Why bootstrap runs in three places

Next.js App Router evaluates server components, the SSR pass of client components and the browser
as three separate module graphs. A module-level singleton set in one graph is invisible in the
others. `src/app/layout.tsx` therefore does both: `import '@shell/bootstrap'` at the top covers the
server-component graph, and rendering `<DragonBootstrap />` first inside `<body>` covers the SSR
and browser graphs. `bootstrap.ts` runs once per graph by ES-module semantics; it must not be
guarded with a process-wide flag, or the second server graph would stay unconfigured.
