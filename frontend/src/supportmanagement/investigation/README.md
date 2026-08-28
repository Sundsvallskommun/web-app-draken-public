# Utredning — variantsömmen

Den här katalogen innehåller _sömmen_ mellan Drakens delade kod och en utredningsimplementation.
Själva implementationen ligger i en underkatalog; i dag finns exakt en, `avvikelse/`.

Poängen med uppdelningen: **delad kod frågar aldrig vilken app som kör**. Den frågar vilken
funktionalitet som är påslagen. En ny drake som vill ha en befintlig utredning är en env-ändring;
en ny utredning är en ny modul som registreras i registret.

## Vad som ligger här

| Fil                                          | Ansvar                                                                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `investigation-variant.ts`                   | Kontraktet en variant uppfyller, plus de rena urvalsreglerna (`resolveInvestigationVariant`, `isInvestigationTabVisible`). Importerar avsiktligt inga komponenter, så reglerna kan enhetstestas utan React. |
| `investigation-variant-registry.ts`          | Den konkreta listan av varianter. Enda stället som känner till `avvikelse/`.                                                                                                                                |
| `classification-placement.ts`                | Det delade ordförrådet för var kategorisering redigeras (`owner`) och ur vilket labelträd (`labelTree`). Nämner ingen variant.                                                                              |
| `investigation-classification-ownership.ts`  | Runtimeadaptern delad kod anropar för att få aktuell placement.                                                                                                                                             |
| `investigation-profile{,-service,-store}.ts` | Runtimeprofilen. Trots namnet är den **inte** utredningsspecifik — `registration` och `labelFilter` används av layout, registrering och filtrering i appar helt utan utredning.                             |

## Hur en variant kopplas in

En variant deklarerar den kapabilitetsflagga som slår på den (`enabledBy`) och fyller de slots
delad kod erbjuder:

- `renderTab` — innehållet i Utredningsfliken.
- `renderNotice` — valfri notis ovanför flikraden, så ett trasigt tillstånd syns från vilken flik som helst.
- `renderCategorizationControl` — valfri kategoriseringskontroll som ersätter de vanliga två-/trenivåkontrollerna.
  Krävs exakt när `resolveClassificationPlacement` returnerar en placement med `labelTree`: en variant som tar med
  sig eget ordförråd måste också ta med kontrollen som redigerar det.
- `resolveClassificationPlacement` — var kategoriseringen redigeras, och i vilket ordförråd.

Två flaggor styr fliken: kapabilitetsflaggan väljer _vilken_ implementation, och `useInvestigation`
är huvudströmbrytaren som släcker fliken för alla varianter samtidigt.

## Regler som håller sömmen tät

- **Delad kod importerar aldrig ur en variantkatalog.** Enda undantaget är registret.
- **En variant löser sin egen placement** i stället för att fråga registeradaptern. Att fråga vilken variant som är
  aktiv, inifrån den variant som skulle vara svaret, sluter en modulcykel och tappar den konkreta policytypen på
  vägen ut.
- **Cykler syns inte för `tsc`, ESLint eller enhetstesterna** — bara för bundlern. Det är därför fliken laddas med
  `next/dynamic`. Kontrollera importgrafen när modulerna flyttas.
- **Kapabilitetsflaggor är renderingsbeslut, aldrig skrivskydd.** Backend äger behörighet.
