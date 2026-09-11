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
- `requiredPhaseName` — valfri fas arbetet utförs i. Fliken erbjuds först när ärendet nått fasen (att vara i den
  räcker, liksom att ha passerat den). `decisionTab` har ett eget `requiredPhaseName`, så beslutet kan vänta på en
  senare fas än utredningen. En variant vars arbete inte hör till någon fas namnger ingen och grindas aldrig.
- `decisionTab` — valfri andra ärendeflik, Beslut, för en utredning som avslutas med ett registrerat beslut
  (för avvikelse: lex Sarah-beslutet vid missförhållande eller IVO-beslutet vid HSL-avvikelse, aldrig båda). Till
  skillnad från Utredningsfliken, som kapabilitetsflaggan ensam tänder, avgör varianten själv per ärende och
  runtimeprofil om fliken finns (`isVisible`). Utan slot, ingen flik — och ingen förändring för andra varianter.

Två flaggor styr fliken: kapabilitetsflaggan väljer _vilken_ implementation, och `useInvestigation`
är huvudströmbrytaren som släcker fliken för alla varianter samtidigt. Ovanpå flaggorna ligger fasgrinden
(`hasReachedSupportPhase` i `services/support-phase-service.ts`, delad med Åtgärder och Uppföljning):
faserna kommer ur namespacets `supportmetadata`, och vilken fas ärendet är i läses
ur dess `phases`-historik — `activePhaseId` är skrivvägen och kommer aldrig tillbaka vid läsning. Grinden
jämför `phaseOrder`, matchar fasen på `name` eller `displayName`, och släpper igenom när det inte finns något
att jämföra: en deployment utan fasmodell, eller med andra fasnamn, behåller de flikar den alltid haft. Det som
däremot grindas är ett ärende som inte gått in i flödet — det ligger före varje fas.

## Regler som håller sömmen tät

- **Delad kod importerar aldrig ur en variantkatalog.** Enda undantaget är registret.
- **En variant löser sin egen placement** i stället för att fråga registeradaptern. Att fråga vilken variant som är
  aktiv, inifrån den variant som skulle vara svaret, sluter en modulcykel och tappar den konkreta policytypen på
  vägen ut.
- **Cykler syns inte för `tsc`, ESLint eller enhetstesterna** — bara för bundlern. Det är därför fliken laddas med
  `next/dynamic`. Kontrollera importgrafen när modulerna flyttas.
- **Kapabilitetsflaggor är renderingsbeslut, aldrig skrivskydd.** Backend äger behörighet.
