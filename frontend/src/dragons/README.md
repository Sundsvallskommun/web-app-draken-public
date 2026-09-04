# Dragon modules

Draken is one codebase deployed fourteen times; each deployment is a _dragon_ (KC, KA, MEX, PT, ROB,
LOP, IK, MSVA, SE, BOU, LOK, IAF, VOF, AOT), chosen by `NEXT_PUBLIC_APPLICATION` when the container
starts. This directory holds one module per dragon. A module is the dragon's _configuration as
code_: the data and the implementations of contracts that the domains own, such as
supportmanagement's `SupportErrandPolicy`.

`dragon-module.ts` is the shared type: the list of ids and the `DragonModule` shape. Everything else
is one folder per dragon, lowercase, with an `index.ts` that exports `<id>Dragon`. A dragon that
uses every domain default exports just `{ id }`. A dragon that overrides a contract keeps the
override in a file named after that contract (`rob/support-errand-policy.ts`) and references it
from `index.ts`.

## What a dragon may import

| From                         | Allowed | Why                                                          |
| ---------------------------- | ------- | ------------------------------------------------------------ |
| `@supportmanagement/*`, etc. | yes     | Domains own the contracts a dragon implements.               |
| `@common/*`, `@config/*`     | yes     | Core is shared by everyone.                                  |
| another `dragons/<id>/`      | **no**  | Dragons are independent deployments and must stay separable. |
| `@shell/*`                   | **no**  | The shell composes dragons; a dragon must not know about it. |

Domains and core never import `src/dragons/` either. The shell (`src/shell/`) is the only place a
dragon module is referenced.

Because dragons cannot import each other, a vocabulary that two dragons share (IK and SE close
errands with the same resolution labels) is not copied into both folders and not imported from one
into the other. It lives in the owning domain as a named preset
(`supportmanagement/policy/resolution-label-presets.ts`) and each dragon references it. Data used
by exactly one dragon lives in that dragon's folder.

## What a dragon must not contain

- `isROB()`-style checks or any read of `NEXT_PUBLIC_APPLICATION`. A dragon _is_ the answer to
  that question; it never asks it.
- Business logic that belongs to a domain. If two dragons would need the same conditional, the
  domain owns the rule and the dragon supplies the data the rule needs.
- Feature flags. Those are capabilities (`appConfig.features`), configured per environment, and
  are a different axis from identity: see `src/shell/README.md`.

## Adding a dragon

1. Add the id to `DRAGON_IDS` in `dragon-module.ts`.
2. Create `src/dragons/<id>/index.ts` exporting `<id>Dragon: DragonModule`, with overrides in
   sibling files named after the contracts they implement.
3. Register it in `src/shell/dragon-registry.ts`. The registry is typed `Record<DragonId, ...>`,
   so a missing entry fails `yarn type-check`.
4. Add `frontend/.env.<id>-example` with `NEXT_PUBLIC_APPLICATION=<ID>` and the dragon's
   capability flags, plus the `dev:<id>`/`build:<id>` scripts the other dragons have.
5. `yarn test` - the shell's `compose-dragon.test.ts` resolves every registered id.
