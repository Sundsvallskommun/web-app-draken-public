# Utredningsscheman för IAF/VOF

Den här katalogen innehåller den lokala utvecklingsytan för tre separata JSON Parameters:

- `utredning-enhetschef`
- `utredning-sol-lss`
- `utredning-hsl`

`schemas/` äger de versionssatta WSO2-requestartefakterna. Varje JSON Schema-request kan skickas som body till
`POST /{municipalityId}/schemas` och motsvarande UI Schema-request som body till
`PUT /{municipalityId}/schemas/{id}/ui-schema` när versionen är godkänd. Labben publicerar ingenting själv.

## Lokal schema-labb

"Labben" (`schema-lab/`) är en **utvecklarsandlåda för att förhandsgranska utredningsformulär** — inte en del av
produkten. Den renderar ett schemapar (JSON Schema + UI Schema) i Drakens riktiga formulärkomponenter så att man kan
se resultatet innan schemat publiceras, och den låter dig växla roll för att prova `canRead`/`canWrite` utan att
behöva ett verkligt ärende i rätt fas.

Ordet "schema" avser här **JSON Schema och UI Schema** — inte tidsschema, och inte de yup-scheman som används för
formulärvalidering på andra håll i Draken.

Labben är avsiktligt oåtkomlig utanför lokal utveckling, och spärren sitter i två lager. Rutten heter
`page.dev.tsx`, och `pageExtensions` i `next.config.js` accepterar den ändelsen bara när `NODE_ENV` inte är
`production` — i ett produktionsbygge kompileras alltså sidan inte alls. Kompileras den ändå anropar den `notFound()`
för alla profiler utom `IAF`. Den läser och skriver inga ärenden, och publicerar inga scheman.

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
  formulärvärden för IAF/VOF-kategorisering.
- `iaf-vof-investigation-classification-policy.ts` äger den fasta IAF/VOF-regeln för var kategorisering redigeras.
  Runtimeprofilen tillhandahåller endast dokumentens stabila nycklar och aktiveringsstatus; den kan inte ändra
  själva verksamhetsregeln.
- `investigation-form-data.ts` äger normalisering, deklarerade beräkningar och riskvärde — delat av både
  produktionsflödet och labben.
- `schema-lab/` äger exempeldataadapter, mockad `canRead`/`canWrite` och separerad lokal lagring.

Enhetschefs- och SOL/LSS-schemana deklarerar det externa fältet `errandClassification`. UI-schemat placerar fältet
direkt efter `legalBases`, så att avvikelsetyp och underkategori visas i rätt formulärsektion och filtreras av valda
lagrum. Deklarationen styr placering och koppling, men de valda värdena och deras UUID:n ägs fortfarande av
SupportManagement-labels. De lagras inte i utredningsdokumentets RJSF-formulärdata eller JSON Parameter.

En vanlig avvikelse kategoriseras i enhetschefsutredningen. När ärendets `eventType` är `MISSFORHALLANDE` ägs
redigeringen i stället av SOL/LSS-utredningen; lagrummen SOL och LSS är då förvalda och skrivskyddade. Regeln ger
ett enda redigeringsställe, även om samma externa fält kan deklareras av båda schematyperna.

## Riktigt ärendeflöde

`GET supportmanagement/investigation-profile` är produktflödets runtimeprojektion av backendens kanoniska register för
dokumentnyckel, schemanamn, fliketikett och ansvarig roll. Backend väger in feature-flaggen `useInvestigation` och
applikationens tillgänglighet i profilens `state`. Profilen deklarerar även vilket Support
Management-transportmål capabilityn kräver. Om deploymenten använder ett äldre mål blir state `unavailable` innan
registrering eller dokumentanrop; kravet härleds alltså inte från appnamn i controllern. Huvudtabben `Utredning`
visar de dokument som profilen konfigurerar. Den innehåller inte användarspecifika rättigheter; varje dokumentanrop
får sitt åtkomstbeslut från Support Management. Vid saknad, ogiltig eller fel appbunden profil stängs flödet
säkert och befintliga JSON Parameters döljs inte från `Ärendeuppgifter`.

### App-profiler och nya appar

Backendregistret i `backend/src/config/support-investigation-profile.ts` är enda ägare till vilka dokument en app
har i produktionsflödet. IAF och VOF har två separata, immutabla profiler som för närvarande skapas från samma
gemensamma bas. De kan därför ändras oberoende senare utan att frontend eller den andra appens profil behöver
förgrenas.

En ny SupportManagement-app kan konfigurera valfritt antal dokument. Varje post består av:

- `key`: stabil persistensidentitet för JSON Parametern och BFF-routen. En nyckel får inte bytas efter att data har
  sparats utan en uttrycklig datamigrering.
- `schemaName`: namnet som används när senaste publicerade schema hämtas för ett nytt dokument. Det behöver inte vara
  samma sträng som `key`.
- `tabLabel` och `ownerLabel`: enbart presentation i klienten.

Läs- och skrivrättigheter ägs av Support Managements AccessMapper per namespace, resurstyp och dokumentnyckel.
Draken skickar den inloggades AD-identitet i `X-Sent-By`, vidarebefordrar GET/PUT till den skyddade endpointen och
visar ett tydligt meddelande när Support Management svarar 401/403. `canEditSupportManagement` krävs fortfarande
för skrivning i Draken men ger aldrig ensam åtkomst till ett utredningsdokument.

Skyddade dokument kan bara följa med en överlämning till mål som deploymenten uttryckligen har markerat som
kompatibla i `SUPPORT_INVESTIGATION_HANDOVER_TARGETS`. Varje post innehåller `municipalityId`, `namespace` och
målcapabilityns `documentKeys`; en ny dokumenttyp i källprofilen stänger överföringen tills målet deklarerats stödja den.
Backend provar samtliga profilnycklar genom Support Managements skyddade dokument-endpoint före både preview och
execute; execute kräver också `canEditSupportManagement`. Support Management kontrollerar åtkomst före existens,
så 404 betyder läsbar men saknad medan 401/403 blockerar överföringen. Saknad allowlist stänger endast överföringen
av befintliga skyddade dokument, inte överlämningar utan JSON Parameters eller ärenden som bara innehåller generiska
JSON Parameters.

Standardbeteendet är att klassificeringen redigeras i `Grundinformation`. IAF och VOF har tills vidare en uttrycklig,
fast specialregel i både backend och frontend: när utredningen är aktiv flyttas redigeringen till dokumentet med
schemarollen `utredning-enhetschef`, eller till `utredning-sol-lss` vid missförhållande. Profilens `schemaName` används
för att hitta rollen och profilens `key` används för persistens, så egna stabila dokumentnycklar stöds utan att
verksamhetsregeln blir dynamisk konfiguration.

Samma IAF/VOF-modul äger parameter-/labelselectorn, lagrumspekaren, tvingade lagrum, tillåtna
klassificeringsrötter och labelträdets Support Management-vokabulär. Backend och frontend implementerar samma fasta
regel och tester låser pariteten. Persistensmappningen är avsiktligt fast: owner sparas i
`classification.category`, category i `classification.type` och type som vald label. Alla andra appar behåller
Grundinformation och den generiska TYPE/SUBTYPE-mappningen, även om de råkar använda samma schemastrukturer. Om en
framtida app behöver motsvarande specialhantering görs det som ett medvetet nytt verksamhetsstöd, inte genom att
lägga policyfält i den generiska dokumentprofilen.

Om profilen eller backendens ägarskapsbeslut är otillgängligt visas IAF/VOF-kategoriseringen skrivskyddad i
`Grundinformation`. Den generiska ärende-PATCH:en utelämnar då `classification` och `labels`, så orelaterade
ärendeändringar kan sparas utan att någon av skrivvägarna tar över klassificeringen.

För att slå på en ny app läggs dess dokumentprofil till i backendkonfigurationen, dokumentnycklarna konfigureras i
Support Managements AccessMapper, de namngivna JSON- och UI-schemana publiceras och `useInvestigation` aktiveras. Frontend
har ingen separat app- eller dokumentlista att uppdatera. Flaggan, profilen, AccessMapper-konfigurationen och
schemapubliceringen är oberoende driftsförutsättningar; en lyckad profilrespons garanterar inte att ett schema är
publicerat.

Varje dokument laddas och sparas via sin profilkonfigurerade `key` och sin allowlistade BFF-route; `schemaName` används
separat för att hämta senaste schema. Ett befintligt dokument laddar sitt exakta `schemaId`; ett nytt dokument hämtar
senaste schema och fryser det ID:t vid första sparningen. Dokumentet kan inte skrivas genom den generiska
ärende-PATCH:en. Dokumentnyckeln och schema-ID:t binds mot schema-metadata i backend. Exakt stark `If-Match` krävs
för uppdatering och create-only-precondition används vid första skrivningen; lokala formulärvärden behålls vid
konflikt.

Dokumentskrivningen skickar dessutom den föräldraärendeversion som formuläret laddades med. BFF:en jämför den mot
ett färskt ärende, kontrollerar låst status och upprepar kontrollen direkt före dokument-PUT. Det stänger stale- och
statusbypass i Draken, men Support Managements JSON Parameter-operation villkoras atomiskt endast med dokumentets
egen ETag. Ett fullständigt skydd mot att föräldraärendet låses i det sista intervallet mellan kontroll och PUT kräver
därför en atomisk parent-version/status-precondition i upstreamkontraktet.

`Spara utredning` samordnar sparningen av utredningsdokumentet med en smal PATCH av ärendets klassificeringslabels.
Dokumentet sparas först och label-PATCH:en skickar endast klassificering, labelreferenser, ägande `documentKey`,
dokumentets ETag och förväntad ärendeversion. Backend verifierar därmed både rätt IAF/VOF-ägardokument och att varken
dokumentet eller ärendet har ändrats sedan formuläret laddades. Operationerna är inte atomiska. Om dokumentet har
sparats men label-PATCH:en misslyckas visas det uttryckligen som ett delvis fel; formuläret behåller klassificeringen och
nästa försök upprepar endast label-PATCH:en.

Label-PATCH:en skickar ärendeversionen som laddades tillsammans med formuläret. BFF:en läser den aktuella versionen,
avvisar en inaktuell klient med konflikt och vidarebefordrar samma version som `If-Match`. Efter en lyckad sparning
ersätts klientens version med den version som läses tillbaka från Support Management.

När flaggen är avstängd ligger kategoriseringen kvar under `Grundinformation` och utredningsparametrarna visas
skrivskyddade under `Ärendeuppgifter`. Det ger en direkt rollback utan datamigrering. När flaggtjänsten är
otillgänglig blir state i stället `unavailable`: skyddade skrivningar stoppas med 503 medan orelaterade ärendefält kan
sparas. För en implementation där utredningen äger klassificeringen stoppas även nyregistrering tills policyn kan
avgöras igen, så att inget oklassificerbart ärende skapas.

Runtimeprofilens valfria `labelFilter` beskriver generiska filtergrupper och fält. Frontend projicerar dem mot live
label-metadata och skickar hela identiteten `(groupKey, fieldKey, resourcePath)`. Backend validerar samma identitet
mot samma metadata innan filteruttrycket byggs; handskrivna eller inaktuella val avvisas i stället för att tyst bredda
sökningen. Profilens `registration`-capability avgör dessutom om registreringsvägen visas. IAF/VOF skapar ett nytt
ärende med explicit vanlig avvikelse (`REPORT_TYPE/DEVIATION` och `eventType=AVVIKELSE`), medan lagrumsstyrd
klassificering fortsatt ägs av utredningen.

All data som läses från RJSF eller localStorage normaliseras mot det aktuella schemat före rendering och lagring.
Okända fält tas bort, liksom villkorsstyrda värden som inte längre gäller (exempelvis IVO-ärendenummer när IVO är
`Nej`). Riskvärden beräknas från respektive schemas `x-calculation` och samma produktregel valideras av JSON Schema.

Åtgärder, handlingsplan, arbetsanteckningar, rapportgenerering och slutligt beslut ingår avsiktligt inte i dessa tre
utredningsdokument. De hör till senare workflow-steg. Katlas inkommande ärendedata förblir en separat skrivskyddad
JSON Parameter.

De lokala artefakterna för `utredning-enhetschef` och `utredning-sol-lss` är version 1.1 och deklarerar
`errandClassification`; `utredning-hsl` ligger kvar på version 1.0. För redan bundna manager- och SOL/LSS-dokument
med schema till och med version 1.0 injicerar runtime samma externa placering som en bakåtkompatibel fallback.
Ägarskapet bestäms dock centralt av den fasta IAF/VOF-regeln tillsammans med runtimeprofilens dokumentnycklar, inte
av en enskild schemadeklaration. Om
även ett nyare
schema saknar deklarationen behåller därför utredningen klassificeringen, placerar den i en säker standardsektion och
visar en varning i stället för att skapa dubbla eller saknade redigeringsvägar.
Artefakterna i repot är publiceringsunderlag och innebär inte i sig att någon schemaversion har publicerats.

## Verifiering

```sh
yarn test                       # hela enhetstestsviten
yarn test src/supportmanagement/investigation   # bara utredningens tester
yarn type-check
yarn type-check:test
yarn lint:strict
```

Med labbservern startad kan webbläsarbeteendet verifieras med:

```sh
yarn test:e2e:iaf-schema-lab
yarn test:e2e:iaf
```
