# Utredningsscheman för IAF/VOF

Den här katalogen innehåller den lokala utvecklingsytan för tre separata JSON Parameters:

- `utredning-enhetschef`
- `utredning-sol-lss`
- `utredning-hsl`

`schemas/` äger de versionssatta WSO2-requestartefakterna. Varje JSON Schema-request kan skickas som body till
`POST /{municipalityId}/schemas` och motsvarande UI Schema-request som body till
`PUT /{municipalityId}/schemas/{id}/ui-schema` när versionen är godkänd. Labben publicerar ingenting själv.

## Lokal schema-labb

Starta IAF-profilen med:

```sh
cp .env.iaf-example .env.iaf
yarn dev:iaf
```

Öppna `http://localhost:3000/iaf/schema-lab/utredning`. Sidan är alltid upplåst för IAF-profilen när Next kör i
development, men är inte tillgänglig i en produktionsbyggd app.

Labben använder samma `SchemaForm`, widgets, templates och SK Web GUI-komponenter som Draken. Exempeldata läses från
`schemas/fixtures/investigation-schema-cases.json`. Utkast sparas separat per schema och version i localStorage under
prefixet `draken:investigation-schema-lab:`. Inga ärenden eller scheman läses eller skrivs av labbsidan.

## Ansvarsgränser

- JSON Schema äger datatyper, obligatoriska fält, stabila koder, villkor och validering.
- UI Schema äger ordning, accordions, widgets och layout.
- `common/components/json` äger återanvändbar rendering, inte IAF-specifika fält.
- `label-classification/` äger labelväljaren och adaptern mellan Support Managements labelträd och Drakens
  formulärvärden.
- `schema-lab/` äger exempeldataadapter, mockad `canRead`/`canWrite`, riskvärdesberäkning och separerad lokal lagring.

Enhetschefs- och SOL/LSS-schemana deklarerar det externa fältet `errandClassification`. UI-schemat placerar fältet
direkt efter `legalBases`, så att avvikelsetyp och underkategori visas i rätt formulärsektion och filtreras av valda
lagrum. Deklarationen styr placering och koppling, men de valda värdena och deras UUID:n ägs fortfarande av
SupportManagement-labels. De lagras inte i utredningsdokumentets RJSF-formulärdata eller JSON Parameter.

En vanlig avvikelse kategoriseras i enhetschefsutredningen. När ärendets `eventType` är `MISSFORHALLANDE` ägs
redigeringen i stället av SOL/LSS-utredningen; lagrummen SOL och LSS är då förvalda och skrivskyddade. Regeln ger
ett enda redigeringsställe, även om samma externa fält kan deklareras av båda schematyperna.

## Riktigt ärendeflöde

Feature-flaggen `useInvestigation` visar huvudtabben `Utredning`. Varje dokument laddas och sparas via sin egen
allowlistade BFF-route och kan inte skrivas genom den generiska ärende-PATCH:en. Ett befintligt dokument laddar sitt
exakta `schemaId`; ett nytt dokument hämtar senaste schema och fryser det ID:t vid första sparningen. `ETag` och
`If-Match` används för att upptäcka samtidiga ändringar, och lokala formulärvärden behålls vid konflikt.

`Spara utredning` samordnar sparningen av utredningsdokumentet med en smal PATCH av ärendets klassificeringslabels.
Dokumentet sparas först och label-PATCH:en skickar endast klassificering och labelreferenser. Operationerna är inte
atomiska. Om dokumentet har sparats men label-PATCH:en misslyckas visas det uttryckligen som ett delvis fel; formuläret
behåller klassificeringen och nästa försök upprepar endast label-PATCH:en.

Label-PATCH:en skickar ärendeversionen som laddades tillsammans med formuläret. BFF:en läser den aktuella versionen,
avvisar en inaktuell klient med konflikt och vidarebefordrar samma version som `If-Match`. Efter en lyckad sparning
ersätts klientens version med den version som läses tillbaka från Support Management.

När flaggen är avstängd ligger kategoriseringen kvar under `Grundinformation` och utredningsparametrarna visas
skrivskyddade under `Ärendeuppgifter`. Det ger en direkt rollback utan datamigrering. Nuvarande skrivbehörighet är den
grova `canEditSupportManagement`; rollspecifika rättigheter per utredningsdel är medvetet inte införda ännu.

All data som läses från RJSF eller localStorage normaliseras mot det aktuella schemat före rendering och lagring.
Okända fält tas bort, liksom villkorsstyrda värden som inte längre gäller (exempelvis IVO-ärendenummer när IVO är
`Nej`). Riskvärden beräknas från respektive schemas `x-calculation` och samma produktregel valideras av JSON Schema.

Åtgärder, handlingsplan, arbetsanteckningar, rapportgenerering och slutligt beslut ingår avsiktligt inte i dessa tre
utredningsdokument. De hör till senare workflow-steg. Katlas inkommande ärendedata förblir en separat skrivskyddad
JSON Parameter.

De lokala artefakterna för `utredning-enhetschef` och `utredning-sol-lss` är version 1.1 och deklarerar
`errandClassification`; `utredning-hsl` ligger kvar på version 1.0. För redan bundna manager- och SOL/LSS-dokument
med schema till och med version 1.0 injicerar runtime samma externa placering som en bakåtkompatibel fallback.
Ägarskapet bestäms dock centralt av IAF:s utredningsfeature, inte av en enskild schemadeklaration. Om även ett nyare
schema saknar deklarationen behåller därför utredningen klassificeringen, placerar den i en säker standardsektion och
visar en varning i stället för att skapa dubbla eller saknade redigeringsvägar.
Artefakterna i repot är publiceringsunderlag och innebär inte i sig att någon schemaversion har publicerats.

## Verifiering

```sh
yarn test:investigation-schemas
yarn type-check
yarn lint:strict
```

Med labbservern startad kan webbläsarbeteendet verifieras med:

```sh
yarn test:e2e:iaf-schema-lab
yarn test:e2e:iaf
```
