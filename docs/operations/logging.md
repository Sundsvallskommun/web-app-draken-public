# Loggning och manuell felsökning

Samma dataminimering gäller för alla drakar, frontend och backend, och i utveckling, test och
produktion. En ny funktion ska vara säker även om ärendet senare börjar innehålla personuppgifter.
Felsökning ska därför beskriva operationen och dess resultat, utan att kopiera ärendet.

## Ägare och tillåtna fält

| Ansvar | Kanonisk ägare |
| --- | --- |
| Klientfel och varningar | `frontend/src/common/services/client-diagnostics.ts` |
| Backendens HTTP-, upstream- och driftposter | `backend/src/services/request-diagnostics.ts` |
| Backendens transport, rotation och fatala processfel | `backend/src/utils/logger.ts` |
| Tillåtna anropsvägar och statiska operationsnamn | `scripts/check-runtime-logging.mjs` |
| Granskad runtime-konfiguration och hemligheter | `scripts/dragon-deployment.cjs` och deploymentens release-manifest |

Diagnostikägarna väljer uttryckligen fälten som får lämna processen. De serialiserar inte
det ursprungliga felet. HTTP-status ska vara ett giltigt heltal (eller den fasta upstream-markören `no-response`), felklassificeringar väljs
ur fasta värden och korrelations-id måste vara ett UUID. Backend använder serverns registrerade
routemall, aldrig en URL från användaren. Frontend får status och det validerade request-id:t
från felsvaret. Operationsnamnet är en fast sträng i koden som äger operationen.

Body, headers, cookies, tokens, namn, kontaktuppgifter, person-/ärendeidentifierare, anteckningar,
bilagor, råa URL:er och råa felmeddelanden/stackar är inte diagnostikfält. Att kalla ett värde
`metadata` eller använda loggnivån debug ändrar inte regeln. Request-id möjliggör korrelation;
det gör inte logglagringen anonym eller fri från åtkomstkrav.

## Ändra eller lägga till loggning

Återanvänd den befintliga operationsposten när samma fel redan loggas. Om en ny post behövs,
lägg den där operationen ägs och ge den ett fast namn som beskriver handlingen:

```ts
logClientFailure('support-message.send', error);
logApplicationFailure('support-message.send', error);
```

Använd rätt funktion för respektive paket. Skicka inte ett ärende eller en mottagarlista som
en extra parameter. En utvecklare kan lämna själva felet till diagnostikägaren; den läser
bara de uttryckligen tillåtna egenskaperna. Om ett nytt metadatafält behövs ska dess ägare,
syfte, typ, tillåtna värden och test för känsliga indata ingå i samma ändring.

Direkt `console`, en egen logger eller ett dynamiskt operationsnamn ska inte användas för att
kringgå gränsen. Kontrollen omfattar även nya runtime-filer, importer med andra lokala namn
och åtkomst genom namespace. Produktionsbygget kontrollerar den valda sidans kod; samma
kontroll ingår i lint och CI. Runtimeimporter av undantagna testfiler och okontrollerad lokal källkod stoppas också.

Kör rotens `yarn lint`, `yarn type-check` och `yarn test`. `yarn lint:logging` ger en
snabb kontroll av loggvägarna och `yarn test:architecture` provar även att otillåtna varianter stoppas. Ändrar man själva diagnostikägaren
behövs även test av vad som faktiskt skrivs vid ett fel, med syntetiska känsliga värden i
request, response och error. Testdata ska aldrig hämtas ur ett verkligt ärende.

## Förslag till krav före merge

Den lokala regeldefinitionen [Draken quality gates](../../.github/draken-quality-ruleset.json) är ett förslag
för granskning i denna branch/PR. Den är inte aktiverad i GitHub. Om den godkänns skulle den kräva
frontendens och backendens lint, typkontroll och enhetstester samt `All dragon builds` och
`All browser tests` från GitHub Actions för `develop`, `main` och defaultgrenen.
Grenen ska vara uppdaterad mot målgrenen. Regeln har inga undantagna aktörer; teamets övriga
befintliga regler behåller sina tidigare inställningar. Ett godkännande från kodägare krävs,
och ny kod upphäver tidigare godkännanden. Slutjobben kontrollerar hela bygg-/webbläsarmatrisen,
så även en nytillagd drake omfattas utan nya statusnamn i GitHub-inställningarna.
Lintjobben kör källkodskontrollen,
dess regressionstester och tester av diagnostikens utdata tillsammans med ordinarie lint.
En röd kontroll ska åtgärdas och köras om på den commit som ska slås samman.

JSON-filen aktiverar inte en GitHub-regel genom att ligga i repot. Ändra inte gemensamma
GitHub-inställningar före branchens godkännande och ett uttryckligt beslut om aktivering.
De nya workflowsen och statusnamnen måste först finnas i basbranchen. För tidig aktivering
skulle annars blockera andra PR:er som ännu inte kan producera dessa kontroller. En separat
integrationsbranch behöver ett uttryckligt beslut om den också ska omfattas av reglerna.
Efter en godkänd aktivering behöver drift verifiera inställningen i Settings → Rules → Rulesets.
De nya provstegen körs när denna ändring finns i CI-checkouten; obligatorisk merge-spärr kräver
dessutom den separat godkända GitHub-inställningen. En administratör kan ändra själva regeln,
så skyddet ersätter inte förvaltning av repoåtkomsten.

## Felsök ett produktionsfel manuellt

1. Anteckna tidpunkt, drake/miljö, versions-/deployment-id, operationsnamn, HTTP-status och
   `X-Request-Id` om tillgängligt. Klientens säkra felpost kan innehålla samma id.
2. Sök det id:t i rätt deployments backendlogg. Följ samma id till upstreamdiagnostiken för
   att avgöra om felet finns i Draken, transporten eller den bakomliggande tjänsten.
3. Återskapa flödet med syntetiska uppgifter i en isolerad utvecklings- eller testmiljö om
   ytterligare diagnostik behövs. Lägg till ett varaktigt, begränsat diagnostikfält och test
   när det hjälper fler än det aktuella felet.

Kopiera inte hela loggfiler, HAR-filer, request-/responsebody eller okontrollerade skärmbilder
till GitHub, chatt eller supportärenden. En äldre loggrad kan innehålla uppgifter som dagens
kod inte längre skriver. Dela endast de nödvändiga diagnostikfälten genom avsedda kanaler.

Generella biblioteksflaggor som `DEBUG`, `NODE_DEBUG` och `NODE_DEBUG_NATIVE` tillåts inte i
drakans startkonfiguration. De kan skriva HTTP-headers eller hela miljön när en process startas,
utanför applikationens diagnostikägare. Använd den säkra diagnostiken även vid manuell start.

## Utvecklingsmaskiner och byggartefakter

Nexts vidarebefordran av browserloggar till terminal är avstängd. Dess utvecklings-MCP är också
avstängd eftersom den installerade Next-versionen annars kan skriva browserloggar till fil
oberoende av terminalinställningen. HMR och felvyn kan fortfarande användas. När Next uppgraderas
ska webbläsartestet verifiera att dessa extra loggkanaler fortfarande är avstängda.

Kontrollera utvecklingskanalerna mot en utvecklingsserver, från `frontend/` i två terminaler:

```sh
# Terminal 1: exempelmiljön innehåller inga verkliga konton.
node --env-file=.env.iaf-example ../scripts/dragon.mjs dev IAF frontend
# Terminal 2: kräv en verklig HMR-anslutning, så next start inte kan ge ett falskt godkänt prov.
PLAYWRIGHT_REQUIRE_DEV_HMR=true node --env-file=.env.iaf-example ./node_modules/@playwright/test/cli.js test --project=iaf e2e/iaf/client-logging-privacy.spec.ts --workers=1
```

Chromium behöver vara installerad genom `yarn playwright install chromium`. Samma utvecklingsprov
ingår i branchens `Lint Frontend`-jobb. Att göra jobbet obligatoriskt före merge är ett separat
förslag enligt avsnittet ovan. Webbläsartestet använder syntetiska uppgifter;
CI sparar felsökningsartefakter vid testfel i sju dagar. Det är en särskild testartefaktpolicy,
inte verksamhetens lagringstid för produktionsloggar.

Loggfiler och Node-diagnostikrapporter ignoreras av Git och Dockerkontexten. Detta skyddar mot
vanlig oavsiktlig incheckning eller paketering, men ersätter inte granskning och hindrar inte
ett avsiktligt `git add -f`. Tidigare skapade utvecklingsloggar lämnas orörda; de måste hanteras
enligt verksamhetens beslut om befintliga loggar.

## Driftens ansvar för åtkomst och lagring

Applikationen kan begränsa sina egna utdata. Driftens proxy, containerplattform och centrala
loggsamlare har separata inställningar som måste granskas innan hela loggkedjan kan godkännas.

| Del | Vad som ska verifieras | Ansvar/evidens |
| --- | --- | --- |
| Proxy/Ingress | Accessloggar använder tillåtna fält; rå query, cookies, Authorization och body samlas inte in. | Driftens versionsstyrda konfiguration och prov med syntetiska uppgifter. |
| Containerloggar | Läsbehörigheter och lagring är avsiktliga; drake/miljö kan identifieras. | Plattformens loggdriver, behörigheter och lagringsinställningar. |
| Central loggsamlare | Transportskydd, begränsad läsåtkomst och beslutad gallring gäller även kopior/exporter. | Konfiguration, behörighetslista och verifiering av gallring. |
| Gamla loggar | Uppgifter från tidigare versioner hanteras enligt fastställd rutin. | Inventering och beslut från ansvarig funktion; ingen blind massradering. |
| GitHub | Kontrollerna krävs före merge även vid normalt manuellt arbete. | Aktiva branchregler/rulesets, inte enbart förekomsten av workflow-filer. |

Nya backendloggar komprimeras inte automatiskt: rotationsbibliotekets gzip-filer kunde annars
skapas med bredare filbehörigheter under skrivningen. Nya vanliga loggfiler har 0600 redan
vid skapandet. Följ upp diskutrymmet och befintliga katalogers behörigheter vid införandet.

Loggrotation räknad i antal filer är inte samma sak som en tidsbaserad lagringstid. Driftens
beslutade antal dagar ska anges uttryckligen där loggarna lagras och följas upp. Backendens
`LOG_RETENTION_DAYS` anges i release-manifestet och väljer tidsbaserad rotation. Utan ett
värde behålls tidigare 30-filersrotation. Den hanterar bara rotatorns registrerade filer;
gamla filer, externa kopior och äldre rotationsregister behöver inventeras separat. En kodändring
som minimerar nya loggrader raderar inte äldre loggar eller externa kopior.

Felsökningsloggar ersätter inte en åtkomst-/ändringslogg för känsliga ärenden. Verifiera hos den
tjänst som äger revisionsspåret att nödvändiga handlingar kan knytas till rätt aktör med
begränsad åtkomst och eget ändamål. Lägg inte tillbaka ärendeinnehåll i tekniska loggar för detta.

Vid misstänkt läcka: begränsa fortsatt spridning och åtkomst, identifiera berörda loggkanaler
och tidsperioder och följ verksamhetens incidentrutin. Bevara eller gallra befintliga loggar
enligt det beslutet; en automatisk radering kan försvåra utredningen.

Principerna följer [OWASP:s Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html):
minimera känsliga värden, skilj loggarnas ändamål åt, skydda åtkomsten och verifiera hela livscykeln.
