# Shell

The shell is the Next.js application itself (`src/app/**`) plus this directory, which composes
the running dragon. It is the only code, besides `src/app/**` and the legacy
`common/services/application-service.ts`, that may read `NEXT_PUBLIC_APPLICATION`.

## What it owns

| File                              | Responsibility                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `app-identity.ts`                 | The single read of `NEXT_PUBLIC_APPLICATION`, and `isDragonId`.                                  |
| `dragon-registry.test-fixture.ts` | Test-only inventory of dragon policies; production uses @dragon.                                 |
| `compose-dragon.ts`               | Pure, tested composition: validate the configuration, resolve the module, configure the domains. |
| `bootstrap.ts`                    | Side-effect module that runs the composition once per module graph.                              |
| `dragon-bootstrap.client.tsx`     | Client component whose only job is to import `bootstrap.ts` into the client graph.               |
| `layout/`                         | App composition components: the root client layout and the page chrome. See below.               |

Domains (`supportmanagement`, `casedata`) and core (`common`, `config`) never import the shell or a
dragon. They expose contracts (`SupportErrandPolicy`) and a `configure...`/`get...` pair; the shell
calls `configure` at startup and the domain reads `get` at use time. A domain getter that finds
nothing configured throws, so a module graph the shell missed fails on first use instead of quietly
behaving like the wrong dragon.

## Layout

`layout/` owns the root client layout, header and overview sidebar composition. The selected
`@dragon` entrypoint supplies domain views, filters, notifications and registration policy.
Generic presentation such as `page-header` and the user menu stays in `common`.
`validateDragonDeployment` checks the identity, built dragon and flags before rendering and
again after Adminpanel flags are applied. See the [development guide](../../../docs/architecture/dragon-development.md).

## Three vocabularies, kept apart

- **Identity** is one explicit value: which dragon this is. The build selects its application entrypoint.
  An unknown or empty value is a startup error, never a fallback to some default dragon.
- **Variant** is exactly one of a set of mutually exclusive implementations, today the
  investigation tab (`useAvvikelseInvestigation` vs `useAotInvestigation`). Enabling two is a
  configuration conflict and startup/runtime validation rejects it. Only the implementation
  supplied by the selected dragon is available.
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
