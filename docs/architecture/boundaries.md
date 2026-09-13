# Gemensam grund på develop

Denna grund är utbruten från `develop` vid `3f04aaaed`. Den återanvänder ägarskap och
policysammansättning från Dragon Boundaries, utan att införa sprintens utredningsflöden,
nya versionskrav på skrivningar eller ett annat bygg- och releaseförfarande.

## Ägare och beroenden

| Ägare | Innehåll | Får bero på |
| --- | --- | --- |
| Frontend common, backend gemensamma tjänster | Transport, teknisk presentation, sessioner och generella kontrakt | Gemensam kod och externa API-kontrakt |
| SupportManagement / CaseData | Ärendeoperationer, domäntyper och domänpolicies | Egen domän och gemensam kod |
| Avvikelse | Befintligt specialfält för platsval; senare verksamhetens utredningsflöden | Gemensam kod och SupportManagement |
| dragons/<id> | Applikationens uttryckliga val av policy och formulärfält | Gemensam kod, egen domän och vald verksamhetsmodul |
| shell och app/server-entrypoint | Start och sammansättning av applikationen | De delar som ska komponeras |

En domän importerar inte en annan domän. Ett genererat externt CaseData-kontrakt är däremot
inte intern CaseData-logik: SupportManagements överlämning behöver använda CaseData-API:t.
`backend/src/integrations/casedata-conversations.ts` äger den transporten och använder den
anropande användaren och det uttryckliga målnamnutrymmet. Ingen domän äger en kopia av den.

## Samma beteende med tydliga val

`dragons.json` äger kända identiteter och deras domän. `frontend/src/dragons/<id>/index.ts`
väljer en komplett `SupportErrandPolicy`, eller `null` för CaseData. Gemensam SM-kod läser
policyn och frågar inte efter appnamnet för statusgrupper, avslutsval eller statusetiketter.
Två drakar kan uttryckligen välja samma namngivna preset. Shell fyller inte i affärsregler
som en applikation glömt att välja. Befintliga Adminpanel-flaggor och miljövariabler behålls.

`common/components/json/` äger RJSF/AJV, generella widgets, schemahämtning och layout.
`SchemaForm.fields` och `SchemaFieldsProvider` tillför fält från konsumenten eller applikationens
komposition. Platsfältet från develop är förarbete till Avvikelse (commit `3fa03bd2b`), därför
bor det i `avvikelse/form-fields/`. IAF och VOF väljer det. Den gamla schemanyckeln
`FacilitySearchWidget`, organisations-id och sparade objektformen är oförändrade. Sprintens
nya platsträd och datamodell följer inte med denna strukturflytt. Andra drakar behöver inte
importera fältet för att använda den gemensamma JSON-motorn.

Historikens befintliga texter bevaras som ett eget domänägt vokabulär. Ändringar av text,
lagrade värden, obligatoriska fält eller endpointbeteende behöver en separat bedömning.

Backendens controllers ligger hos sin domän och registreras fortfarande i samma ordning
av `shell/controllers.ts`. `server.ts` är kvar som driftens entrypoint. Middlewareordning,
AD-grupper, behörigheter, API-versioner, namespacekonfiguration och Docker/startkommandon
har inte bytts av denna utbrytning. Appens datakataloger behåller samma plats efter flytten.

## Säkerhetsgränser

Mappar och frontendflaggor auktoriserar inte åtkomst. Backendens autentisering och behörigheter,
uppströms tjänsters objektbehörigheter samt deploymentens tjänstekonton och namespace styr
åtkomsten. Olika säkerhetsklassningar kräver även granskning av den faktiska driftkonfigurationen.
Denna branch bevarar den befintliga modellen; den intygar inte en ny säkerhetsklassning.

Importkontrollerna hindrar nya kopplingar mellan domäner och via gemensamma mellanled.
De kontrollerar även typimporter och återexporter. Backendkontrollen accepterar inte
okontrollerbar dynamisk modulladdning. Befintliga default-deny-tester skickar oautentiserade
anrop till de registrerade endpointsen. Inventariet över registrerade controllers jämförs
också med develop, och tester skyddar användaridentitet och namespace vid överlämning.

Nuvarande leverans bygger fortfarande den befintliga gemensamma imagen. Källkodsgränserna
innebär därför inte separata frontendbundlar eller drakspecifika backend-API-ytor. Införande
av separata byggmål och release-manifest hör till ett efterföljande driftsteg.

## Kontroller och känd skuld

- `yarn type-check`: produktionskod och enhetstestkod i båda paketen.
- `yarn lint:deps`: importgränser i frontend och backend.
- `yarn test:boundaries`: kontraktstest av själva kontrollreglerna.
- `yarn --cwd frontend test`: tester av komposition, befintliga policyvärden och JSON-fält.
- `node scripts/boundaries-baseline-guard.mjs origin/develop`: inga nya baselineposter.
- Befintliga backendtester och Playwright-workflows fortsätter i CI.

Kör lokala typ-, lint- och testkommandon under den resurssupervisor som gäller på arbetsdatorn.
Starta inte fulla byggen eller browsertester utan uttryckligt klartecken för sådan körning.
Frontendens produktionsprojekt omfattar källkod; Playwright-sviten körs av dess egen runner.

Frontendens initiala baseline innehåller 82 äldre importkopplingar (43 från gemensam kod,
10 mellan domäner och 29 till identitetstjänsten) samt identitetsläsningar i 13 filer.
Det gäller bland annat blandade
facilitetsvyer, notifieringar och identitetsvillkor i besluts- och meddelandeflöden. De är inte
nya godkända arkitekturmönster. Baselinefilerna får därefter bara minska. Ingen ny regel får
läggas i common enbart för att två skärmbilder ser lika ut. Återanvänd när begrepp och regel
är desamma; annars implementerar respektive ägare sitt domänkontrakt.

## Införande och återställning

Granska `feature/dragon-foundation-develop` mot develop. Behåll `feature/dragon-boundaries`,
`fix/dragon-boundaries-review` och Avvikelsebranchen som referenser tills grunden är införd
och Avvikelse har tagit in den. Skriv inte om deras historia och fortsätt inte utveckla en
parallell gemensam implementation där.

Efter merge tar Avvikelse in develop och förenar motsvarande flyttar och kontrakt. Ta bort
dubbla ägare i konflikten; återinför inte globala appvillkor för att få en snabb merge.
Ett parallellt projekt kan före merge baseras på denna branch och därefter på develop.

Ingen datamigrering eller ändring av externa API-kontrakt ingår. Återställ vid behov genom
att återgå till föregående release eller reverta de avgränsade commits som inför grunden.
