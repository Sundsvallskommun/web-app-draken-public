# Utredningsscheman för IAF/VOF

Den här katalogen innehåller den lokala utvecklingsytan för fem separata JSON Parameters:

- `utredning-enhetschef`
- `utredning-sol-lss`
- `utredning-hsl`
- `beslut-hsl` — beslutet om anmälan till IVO för en vanlig avvikelse med lagrum HSL (`placement: 'decision'`,
  `appliesTo: 'hsl-deviation'` i runtimeprofilen).
- `beslut-sol-lss` — beslutet enligt lex Sarah för ett rapporterat missförhållande, oavsett lagrum
  (`placement: 'decision'`, `appliesTo: 'reported-misconduct'`).

Besluten visas på den egna ärendefliken Beslut i stället för under Utredning, efter Åtgärder, eftersom beslutet
avslutar ärendet. Den fasta IAF/VOF-regeln avgör
vilket av dem ett ärende tar: missförhållande ger alltid lex Sarah-beslutet, en vanlig avvikelse ger HSL-beslutet
bara när HSL är ett av lagrummen, och ett ärende tar aldrig båda. Regeln finns i både backend och frontend
(`resolveIafVofInvestigationDocumentApplicability` respektive `resolveAvvikelseDocumentApplicability`), och BFF:en
avvisar ett beslutsdokument på ett ärende det inte gäller.

Ett dokument kan i profilen peka ut ett `prerequisiteDocumentKey`: ett annat dokument som måste vara sparat i
ärendet innan det får skrivas. `beslut-sol-lss` kräver `utredning-sol-lss`. BFF:en avvisar skrivningen med 409
annars, och formuläret visar en spärr i stället för spara-knappen. Serverägda schemaegenskaper sätts av BFF:en
oavsett vad klienten skickar: `x-draken-server-timestamp: "created"` stämplas vid första sparningen och bevaras
sedan, `"updated"` stämplas vid varje sparning, och en array märkt `x-draken-server-revisions` får en post
`{ savedAt, savedBy }` per sparning (beslutens `decidedAt`, `updatedAt` och `revisions`). Utrednings- och
beslutsformulären markerar obligatoriska fält med texten "(Obligatorisk)" i stället för en asterisk
(`requiredIndicator` på `SchemaForm`); ett fält kan dessutom alltid visas som obligatoriskt via
`ui:options.showRequiredIndicator`.

`schemas/` äger de versionssatta WSO2-requestartefakterna. Varje JSON Schema-request kan skickas som body till
`POST /{municipalityId}/schemas` och motsvarande UI Schema-request som body till
`PUT /{municipalityId}/schemas/{id}/ui-schema` när versionen är godkänd. Labben publicerar ingenting själv.

## Utredningsmallar

Utredningsmall i enhetschefens utredning fyller i Utredningstext från Templating-API:t. Texterna, identifierarna och
reglerna för när en text ersätts beskrivs i [templates/README.md](templates/README.md).

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

Kategoriseringen visas med samma väljare och gruppregel som i ärendet, en väljare per lagrumsgrupp (se
[Ansvarsgränser](#ansvarsgränser)), men alternativen kommer från den lokala mockkatalogen i `label-classification/` i
stället för Support Managements labelträd. Valen sparas med en post per grupp under
`draken:investigation-schema-lab:supportmanagement-labels`.

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
redigeringen i stället av SOL/LSS-utredningen, där LEX-utredaren väljer lagrum: SoL, LSS eller båda. HSL är inget
lex Sarah-lagrum, och schemat (2.1) erbjuder det inte. Enhetschefens utredning av ett missförhållande visar inget
lagrumsfält. Dokumentet får ändå SOL och LSS (`reportedMisconductLegalBases`), eftersom de bär utredningsmallen och
riskbedömningen SOL/LSS som enhetschefen fortfarande fyller i. Regeln ger ett enda redigeringsställe, även om
samma externa fält kan deklareras av båda schematyperna.

Kategoriseringen görs en gång per lagrumsgrupp (`classificationGroups` i `avvikelse-classification-policy.ts`): HSL
har en egen väljare, och SoL och LSS delar en. En väljare visas bara när något av gruppens lagrum är valt, erbjuder
bara de kategorier de valda lagrummen tillåter och har dem som rubrik, alltså HSL, SoL, LSS eller SoL/LSS. Tills
metadatan skiljer SoL och LSS åt har de samma kategorilista. Ett missförhållande har bara SoL och LSS att välja
bland och kategoriseras därför bara i SoL/LSS-gruppen. Tas ett lagrum bort så att en grupp inte längre nås,
försvinner också gruppens kategorisering. Varje grupps väg sparas som ärendets labels, och ärendets eget `classification`, som bara
rymmer en, tar den grupp som `errandClassificationGroupPriority` rangordnar först: SoL/LSS före HSL. Gruppregeln
(`getChosenAvvikelseClassificationGroups`) och väljarna (`AvvikelseGroupedClassificationFields`) delas av ärendet och
labben, så att labben visar samma väljare som ärendet.

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

Samma IAF/VOF-modul äger parameter-/labelselectorn, lagrumspekaren, ett missförhållandes lagrum, tillåtna
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

**Versionskontroller är scopade till den resurs som skrivs.** Dokumentets egen ETag är villkoret för
dokumentskrivningen, och ingenting annat. Föräldraärendets version är inte en precondition: versioner rullar uppåt men
inte nedåt — ändras dokumentet stiger även ärendets version, men att ärendets version har stigit säger ingenting om
dokumentet. Att kräva att de stämmer överens skulle avvisa en sparning för att någon annan ändrat ett orelaterat fält,
utan att skydda någonting. Klienten skickar ändå med den version formuläret laddades med i `X-Errand-Version` (den
valideras om den finns), och får ärendets färska version tillbaka i svaret.

Föräldraärendet läses däremot fortfarande färskt, för sin **status**: ett låst eller avslutat ärende tar inte emot
dokumentändringar. Kontrollen upprepas direkt före dokument-PUT för att hålla det oundvikliga icke-atomiska
statusglappet så smalt upstreamkontraktet tillåter. Ett fullständigt skydd mot att ärendet låses i just det
intervallet kräver en atomisk status-precondition i upstreamkontraktet.

De endpoints som faktiskt skriver på **ärendet** — `/classification`, `/admin`, `/status` och
`/investigation-handover` — kräver fortsatt exakt ärendeversion, eftersom det är ärendet de villkorar.
`/phase` villkoras i stället på den aktiva fas klienten såg: åtgärder, dokument och labels flyttar
ärendets version utan att röra fasen. BFF:en skickar upstream-skrivningen med If-Match på den version
den nyss läste.

Utrednings- och beslutsdokumenten har ingen egen sparaknapp. De sparas med Spara ärende i sidomenyn, som först sparar
ärendets egna fält och sedan varje dokument med osparade ändringar, ett i taget. Varje dokument skickas genom sitt
formulär och valideras alltså som förut. Ett dokument som inte kan sparas visar orsaken där den alltid har visats,
och sidomenyn tar handläggaren dit. Att något sparades säger sidomenyns vanliga toast, Ärendet uppdaterades. Dokumentet
lägger ingen egen notis överst, så ett långt formulär stannar där handläggaren är. Bara det som står i vägen visas
där, ett fel eller en varning. Upplåsningen och en skapad rapport, som inte går genom Spara ärende, bekräftas också med
en toast. Sparningen samordnar utredningsdokumentet med en smal PATCH av ärendets klassificeringslabels.
Dokumentet sparas först och label-PATCH:en skickar endast `classifications`, en post med klassificering och
labelreferenser per lagrumsgrupp, samt ägande `documentKey`, dokumentets ETag och förväntad ärendeversion. Backend
verifierar därmed rätt IAF/VOF-ägardokument, att varje klassificering tillåts av dokumentets lagrum, att varje grupp
lagrummen når har exakt en, och att varken dokumentet eller ärendet har ändrats sedan formuläret laddades. Alla
gruppers labels skrivs, och ärendets `classification` sätts från den grupp som rangordnas först. Operationerna är inte
atomiska. Om dokumentet har
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

### Registrering i Draken: plats och rapport

Platsen för ett ärende som registreras i Draken är enheten där enhetschefen är anställd. Platsträdet speglar
kommunens organisationsträd, en etikett per enhet med enhetens organisations-id som `resourceName`, så BFF:en
matchar anställningens `orgId` (Employee API) mot etikettens namn - id mot id, inte enhetsnamn. En enda träff visas
som fast plats, flera anställningar ger ett val med huvudanställningen förvald. Är ingen anställning en plats,
eller går anställningarna inte att läsa, erbjuds platserna AccessMapper kopplar till kontot som tidigare. BFF:en
löser platsen på nytt när ärendet skapas och tar inte klientens val på orden.

Ärendet får kanal `WEB_UI`. Katlas ärenden har `ESERVICE` och sin rapport i JSON-parametern
`avvikelse-plats-handelse`, som är det som rapporterades och aldrig skrivs i Draken. Ett ärende registrerat i
Draken saknar rapport, så enhetschefen fyller i den i Ärendeuppgifter, i Katlas eget schema och med platsen
förifylld och skrivskyddad, tills ärendet når fasen Utredning. Därefter visas den skrivskyddad som andra
rapporter. Reglerna ligger i profilens `reportDocument` och avgörs lika i frontend och BFF: kanalen måste vara
`WEB_UI` och ärendets aktiva fas ligga före `INVESTIGATION`; saknas fasflöde, eller står ärendet utanför det, är
rapporten låst. Kanalen går därför inte att ändra på ett avvikelseärende. Rapportens textfält skrivs med
`PlainTextareaWidget`, eftersom Drakens `textarea` lagrar HTML och rapporten är vanlig text.

Support Management avgör vem som får skriva rapporten utifrån det vidarebefordrade kontot, så enhetschefens roll
behöver skrivrätt till nyckeln `avvikelse-plats-handelse` i namespacet.

All data som läses från RJSF eller localStorage normaliseras mot det aktuella schemat före rendering och lagring.
Okända fält tas bort, liksom villkorsstyrda värden som inte längre gäller (exempelvis IVO-ärendenummer när IVO är
`Nej`). Riskvärden beräknas från respektive schemas `x-calculation` och samma produktregel valideras av JSON Schema.

Åtgärder, handlingsplan, arbetsanteckningar och rapportgenerering ingår avsiktligt inte i de tre
utredningsdokumenten. Besluten är egna dokument: `beslut-sol-lss` visar utredarens förslag från SOL/LSS-utredningen
skrivskyddat (läst från ärendets JSON Parameters via profilens dokumentnyckel) men kopierar det inte, och
`beslut-hsl` tar över IVO- och Public 360-fälten som till och med schema 1.0 låg i HSL-utredningen. Katlas
inkommande ärendedata förblir en separat skrivskyddad JSON Parameter.

De lokala artefakterna för utredningarna är version 1.2, utom enhetschefsutredningen som är version 1.3 och tillåter
alla tre lagrum samtidigt. Enhetschefs- och SoL/LSS-utredningen deklarerar `errandClassification`, HSL-utredningen
saknar beslutsfälten sedan 1.1, och alla tre har sektionen Utredningen klar och rapport (`x-draken-completion`, se
`schemas/README.md`). En utredning som sparats som klar är låst i både BFF
och formulär tills ägaren låser upp den; BFF:en skapar PDF-rapporten ur det sparade dokumentet, lägger den som
numrerad bilaga och registrerar den i det serverägda `reports`-fältet. För redan bundna manager- och SOL/LSS-dokument
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

### Ärendets dokumentbehörigheter

Profilen beskriver dokumenten; rättigheter hämtas separat från backendens
`supporterrands/{municipalityId}/{errandId}/investigation-access`, som projicerar
Support Management Sprint 16.0 `/access`. Nyckeln i fältposten med
`field: "jsonParameters"` och resursen `errand/json-parameter` måste båda tillåta åtkomst.
`allKeys: true` omfattar nya dokument; annars måste nyckeln vara explicit listad.
Ärendets nivå är en default, inte ett tak — den gäller de nycklar som saknar egen grant, som ett
unix-filträd där en skrivbar katalog kan ligga under en läsbar förälder. En roll med `R`/`LR` på
ärendet men `RW` på sin egen nyckel skriver alltså det dokumentet utan att få handlägga ärendet i
övrigt. Med `allKeys: true` finns ingen sådan förfining, och ärendets nivå gäller varje nyckel.
Resursen `errand/json-parameter` måste däremot alltid vara `RW` för att skrivvägen (PUT) ska vara
öppen.

Både `R` och `LR` returnerar `fields`. Skillnaden är att `LR` returnerar en _delmängd_ av dem, och
den delmängden är då det som gäller: en nyckel som finns med är läsbar med sin egen nivå, en nyckel
som saknas är dold. `LR` är alltså inte en svagare läsning av samma dokument utan ett smalare urval
av vilka dokument som finns för användaren, och en listad nyckel visar sitt innehåll precis som
under `R`.

UI:t delar en accesshämtning mellan Utredning och Beslut och visar aldrig rättigheter från ett
annat ärende eller en annan användare. Ändrad ärendeversion, etiketter, fokus, återanslutning och
nekade dokumentanrop utlöser omkontroll; varje GET/PUT kontrolleras även i backend.
Nekad åtkomst blir 403, utan att skicka användaren till inloggningen.
Vid en omkontroll av samma ärende, till exempel när en sparning har flyttat ärendets version eller fönstret får
fokus igen, visas det föregående svaret tills det nya kommer. Annars skulle dokumenten tömmas under handläggaren och
sidan hoppa till toppen. Ett annat ärende eller en annan användare visar ingenting förrän deras eget svar kommit.
Dokumentkomponenterna behåller sina utkast medan innehållet döljs vid nekad läsrätt. Även dolda utkast räknas som osparade ändringar och omfattas av omladdningsvarningen.
De sparas endast i minnet för aktuell användare och aktuellt ärende. En beslutsflik med ett
osparat utkast behålls för att kunna förklara spärren och erbjuda omkontroll.
Vanliga ärendefält, inklusive kategorisering, använder fortsatt sina befintliga regler.

## Tilldelningsflödet: från enhetschef till LEX och tillbaka

Ett misstänkt missförhållande byter inte bara klassificering — det byter **åtkomst**. Support
Managements AccessMapper matchar användarens konfigurerade labelmönster mot ärendets labels, så det
är labeln `ACCESS/LEX` som faktiskt lämnar över ärendet: enhetschefen slutar se det och LEX-rollerna
börjar. Draken implementerar därför ingen egen synlighetsregel; den skriver bara labeln.

`ACCESS`-trädet innehåller i dag exakt den labeln. Det finns ingen motsvarighet för MAS/MAR — de når
HSL-ärenden genom `RISK/HIGH_HSL` — så ett högt HSL-riskvärde ger inget överlämningssteg. Riskvärdet visas som
en varning för enhetschefen, och så snart utredningen sparas med värdet märks ärendet med `RISK/HIGH_HSL`
(se [Hög risk HSL](#hög-risk-hsl-risk_high_hsl)). MAS/MAR bokför sedan vem av dem som svarar för ärendet,
vid sidan av den tilldelade (se [MAS/MAR](#masmar-vid-sidan-av-ansvarig)).

### Hög risk HSL (`RISK/HIGH_HSL`)

Ett ärende vars enhetschefsutredning bedömer HSL-riskvärdet till 4 eller högre (samma gräns som
schemats `analysisThreshold`) märks med labeln `RISK/HIGH_HSL`, Hög risk HSL. Det är labeln som ger MAS/MAR
åtkomst, och de ska nå ärendet så snart risken är bedömd, så labeln sätts vid **varje** sparning av
utredningen som bedömer 4 eller mer, klarmarkerad eller inte. Den **ligger kvar** när den väl är satt: en
senare sparning med lägre värde, eller utan HSL-bedömning, tar inte bort den, så MAS/MAR tappar inte ett
ärende de redan har. Bär ärendet redan labeln görs ingen skrivning.

BFF:en sätter den i samma anrop som sparar dokumentet (`PUT .../json-parameters/:key`), efter
dokumentskrivningen: regeln finns i `config/iaf-vof-high-hsl-risk.ts` och skrivningen i
`InvestigationRiskLabelService`. Labeln läggs till med sin rot (`RISK`). Skrivningen villkoras på exakt den version dokumentskrivningen
lämnade; har någon annan hunnit skriva däremellan, eller saknar namespacet labeln i sin metadata, görs
ingenting. Den görs om det går: utredningen är sparad oavsett, och en label som inte kunde skrivas loggas
i stället för att bli ett misslyckat sparande.

Svaret säger hur många av ärendets versionssteg anropet självt tog (`X-Errand-Writes`, 1 eller 2), så att
klienten kan flytta fram ärendets version förbi båda (`isSoleSupportErrandVersionChange`) i stället för
att tro att någon annan har skrivit.

### Händelseanalys HSL för chefer

MAS/MAR:s utredning, Händelseanalys HSL (`utredning-hsl`), visas inte för enhetschef och verksamhetschef så
länge ärendet saknar `RISK/HIGH_HSL`. När ärendet har labeln visas fliken som deras åtkomst säger. MAS/MAR,
administratörer och övriga roller ser den som vanligt (`concealsHslInvestigation`).

Det är bara visuellt: varianten döljer dokumentet genom kontraktets `concealedDocumentKeys`, och Draken hämtar
då inte heller dokumentet. Vad cheferna får läsa avgör fortfarande AccessMapper.

### MAS/MAR vid sidan av Ansvarig

MAS/MAR har en egen väljare under Ansvarig i sidopanelen (`MasMarHandlerSelect`, genom variantens
`renderHandlerFields`). Den visas **bara för MAS/MAR** (rollen `mas-mar` i `/me`) och för administratörer
(`superadmin`), och då på **alla** ärenden de når, oavsett riskvärde; alla andra ser ingen väljare
(`choosesMasMarHandler`). Vilka ärenden MAS/MAR når avgör AccessMapper, bland annat genom `RISK/HIGH_HSL`.
Väljaren erbjuder de konton i handläggarkatalogen (`GET /users/admins`) som har rollen `mas-mar`, och en
bokförd handläggare som inte längre har rollen visas ändå i stället för att försvinna tyst.

MAS/MAR är normalt inte tilldelad ärendet, så väljaren kräver inte att användaren är dess handläggare, bara
att ärendet inte är låst och att användaren har `canEditSupportManagement`. Om MAS/MAR får skriva i ärendet
avgör AccessMapper.

Valet sparas med Spara ärende i errand-parametern `masMarHandler` (AD-kontot), skrivet på parameterns egen
version, och **inte** i `assignedUserId`: ärendet ligger kvar hos sin handläggare, och MAS/MAR är den som
svarar för HSL-delen. AccessMapper behöver ge MAS/MAR skrivrätt i ärendet, och har den begränsningar per
parameternyckel även till `masMarHandler`.

**Mina ärenden** för en MAS/MAR-handläggare visar både ärendena som är tilldelade hen och ärendena där hen står
som MAS/MAR. Profilen deklarerar parametern och rollen (`handlerParameters: [{ key: 'masMarHandler', roleKey:
'mas-mar' }]`, bara för IAF/VOF), och BFF:en lägger till villkoret
`exists(parameters.key:'masMarHandler' and parameters.values:'<konto>')` när kryssrutan avser den inloggade och
hen har rollen (`ownHandlerParameterKeys`). Listan och räknarna i sidomenyn byggs av samma kriterier. Alla andra,
och alla drakar utan `handlerParameters`, får exakt samma filter som förut. Fritextsökindexet kan inte matcha en
parameter, så en sådan fråga ställs till filterendpointen även där indexet är påslaget.

### Överlämningsstegen

Fyra namngivna steg finns, och klienten namnger steget i stället för att komponera skrivningen själv
(`backend/src/config/investigation-handover-steps.ts`):

| Steg | Utlöses av | Skriver |
| --- | --- | --- |
| `assign-lex` | `suspectedMisconduct === 'yes'` i den sparade enhetschefsutredningen. Dialogen efter sparningen kan stängas. Är utredningen klarmarkerad kan enhetschefen också välja LEX-ansvarig under Ansvarig och spara (se [Ansvarig-listan](#ansvarig-listan-är-ärendespecifik)). Så länge ärendet inte är tilldelat heter fasknappen Tilldela LEX-ansvarig i stället för övergångens namn (Redo för beslut) och öppnar samma dialog; fasen byts inte, utan LEX-ansvarig skickar ärendet till beslut | `assignedUserId` (LEX-ansvarig), `REPORT_TYPE/ABUSE` i stället för `REPORT_TYPE/DEVIATION`, `ACCESS/LEX`, status `ASSIGNED` |
| `return-to-manager` | LEX har beslutat; knappen sitter längst ned i lex Sarah-beslutet (`beslut-sol-lss`), vars skrivrätt också auktoriserar steget | `assignedUserId` (enhetschef för platsen), tar bort `ACCESS/LEX` (och `ACCESS`-roten om inget annat ligger under den), status `ASSIGNED` |
| `decline-lex` | LEX-ansvarigs initiala bedömning (`bedomning-sol-lss`) är sparad med Inte ska lex utredas; knappen sitter längst ned i bedömningen, vars skrivrätt auktoriserar steget | först motiveringen som tjänsteanteckning, sedan `assignedUserId` (chef för platsen), `REPORT_TYPE/DEVIATION` i stället för `REPORT_TYPE/ABUSE`, tar bort `ACCESS/LEX`, status `ASSIGNED` - motsatsen till `assign-lex` |
| `move-location` | Ärendet har kommit till fel enhet; enhetschefen väljer rätt plats (`locationLabelId`) i kortet Ärendets plats överst i Ärendeuppgifter | `assignedUserId` (chef för den **nya** platsen), byter ut hela platskedjan i labels mot den nya platsens; se [Fel plats](#fel-plats-flytta-ärendet-utan-att-ändra-det-inrapporterade) |

`assign-lex` och `return-to-manager` sätter **status** `ASSIGNED`: ärendet når LEX-ansvarig respektive
chefen som Tilldelat. Draken behandlar `ASSIGNED` som ett *låst* tillstånd (`isSupportErrandLocked`), så
mottagaren återupptar ärendet innan hen arbetar i det — och återuppta skriver den aktiva fasens
huvudstatus, den första i fasens `allowedStatuses`, inte en generell pågående-status som fasen inte
tillåter. Fasernas `allowedStatuses` måste därför innehålla `ASSIGNED`. `move-location` lämnar statusen
orörd; ärendet stannar hos samma roll, bara på en annan enhet.

Två saker följer av att åtkomsten är poängen med skrivningen:

- **Ett enda PATCH uppströms.** Handläggare, labels och status skrivs tillsammans. Delas de upp
  tappas läsrätten mitt i en sekvens som fortfarande har skrivningar kvar.
- **Ingen återläsning efteråt.** Anroparen har just skrivit bort sig själv från ärendet, så den
  bekräftande GET:en skulle misslyckas. Endpointen svarar `204` och klienten navigerar till
  översikten i stället för att rendera om ett ärende den inte längre ser.

Rapporttypen är enkelvärd, så `assign-lex` **byter ut** `REPORT_TYPE/DEVIATION` mot
`REPORT_TYPE/ABUSE` i stället för att lägga till. Det sker i samma skrivning som `ACCESS/LEX`: delas
de upp kan ärendet bli registrerat som ett missförhållande utan att någon i LEX når det, och
enhetschefen som kunde rättat till det är då redan utskriven ur ärendet.

Bytet har en följdverkan utanför labeln. `REPORT_TYPE/ABUSE` är en av de paths
`resolveIafVofInvestigationClassificationOwner` läser, så klassificeringsägandet flyttas från
enhetschefsutredningen till SoL/LSS-utredningen, där LEX väljer bland SOL och LSS. Ärendets
parameter `eventType` lämnas däremot orörd och står kvar som `AVVIKELSE`.

En känd konsekvens av att enhetschefens utredning får SOL och LSS förvalda: ett ärende med både HSL och SOL/LSS som blir
missförhållande får sina lagrum normaliserade till SOL/LSS nästa gång enhetschefsdokumentet **sparas**,
vilket tar bort `riskAssessmentHsl`. I praktiken når det bara den som har skrivrätt på
enhetschefsdokumentet, och den rätten ägs av Support Managements AccessMapper — men regeln är värd
att känna till innan åtkomsten konfigureras om.

### LEX-ansvarigs initiala bedömning

När LEX-ansvarig har fått ärendet och återupptagit det gör hen en första bedömning, `bedomning-sol-lss`
(schemat i `schemas/`). Den ligger i profilen med `placement: 'details'` och visas därför inte som flik utan som
ett eget hopfällbart avsnitt i Ärendeuppgifter (`LexInitialAssessment`), med samma dokumentmaskineri som
utredningsflikarna: AccessMapper avgör läs- och skrivrätt och ett låst ärende är skrivskyddat. Avsnittet visas
medan ärendet bär `ACCESS/LEX`, och efteråt så länge bedömningen är sparad.

- **IVO.** Svaret och de två ärendenumren heter samma sak som i lex Sarah-beslutet, och förifyller beslutet så
  länge det inte är sparat (`prefillInvestigationDocument`). Numren visas och tillåts bara vid Ja.
- **Ska utredas.** Ingenting flyttas; LEX-ansvarig tilldelar en utredare som vanligt.
- **Inte ska lex utredas.** Kräver en motivering. Är bedömningen sparad så visas Lämna tillbaka till enhetschef
  längst ned, som väljer en chef för platsen och tar steget `decline-lex`. BFF:en vägrar steget (422) om den
  sparade bedömningen inte säger Inte ska lex utredas, skriver motiveringen som tjänsteanteckning (en gång -
  finns anteckningen redan skrivs den inte igen) medan LEX fortfarande kan skriva i ärendet, och lämnar sedan
  tillbaka det som en avvikelse villkorat på versionen efter anteckningen. Har någon annan hunnit ändra ärendet
  under tiden svarar steget 409.

Ärendet hanteras därefter som en vanlig avvikelse, och två regler gör att det går:

- **Rapporttypen avgör.** Ett ärende är ett rapporterat missförhållande om dess `REPORT_TYPE`-etikett säger det;
  `eventType` är vad som rapporterades och flyttas aldrig, så den gäller bara ett ärende utan rapporttyp
  (`isReportedMisconduct` i BFF:en, `isAvvikelseReportedMisconductErrand` i klienten).
- **En avböjd misstanke räknas inte.** Enhetschefens `suspectedMisconduct = yes` gör inte längre ärendet till en
  lex Sarah-sak när den sparade bedömningen säger Inte ska lex utredas: beslutet fattas på enhetschefens utredning
  och enhetschefen ombeds inte tilldela LEX igen (`hasLexDeclinedInvestigation`).

AccessMapper behöver nyckeln `bedomning-sol-lss`: skrivrätt för LEX-ansvarig, och läsrätt för enhetschef och
verksamhetschef. Utan läsrätten ser chefen inte avböjandet efter återlämningen, och beslutsgrinden väntar då
fortfarande på LEX-utredningen.

### LEX-utredaren skickar inte ärendet till beslut

En LEX-utredare utreder; det är LEX-ansvarig som skickar ärendet till beslut. Försöker en LEX-utredare som inte
också är LEX-ansvarig byta till Beslut heter fasknappen Tilldela LEX-ansvarig och öppnar en dialog där ärendet
tilldelas en LEX-ansvarig och markeras Tilldelat (`LexManagerHandoverRequirement`, `handsErrandToLexManager`).
Ärendet stannar hos LEX. BFF:en håller samma regel i fasbytet (`assertMaySendToDecision`) och svarar 422; en
administratör hålls inte tillbaka, och utan konfigurerade handläggarroller finns ingen utredare att hålla tillbaka.

Ärendet går tillbaka till den LEX-ansvarige som gav utredaren det, så dialogen förväljer den. Vem det var läser
BFF:en ur ärendets historik (`GET supporthistory/:m/:id/assigned-by`): kontot i `ExecutedBy` på den senaste
skrivningen som gav ärendet till den nuvarande handläggaren, jämfört utan hänsyn till skiftläge. Listan väntar på
svaret; saknas historiken, eller är kontot ingen LEX-ansvarig, står den första i listan kvar som förut.

### LEX tar inte ärendet till uppföljning

Uppföljningen av åtgärderna görs av enheten. En handläggare som bara har LEX-roller (LEX-ansvarig och/eller
LEX-utredare) erbjuds inte Inled uppföljning alls: fasvillkoret döljer övergången (`hidesTransition`,
`leavesFollowUpToTheUnit`), och LEX återlämnar i stället ärendet med Återlämna till chef i beslutet. Den som har
en roll till utöver LEX ser knappen, eftersom hen kan agera i den.
BFF:en håller samma regel (`assertMayStartFollowUp`), både i fasbytet och när ett ärende avslutas från en tidigare
fas, eftersom avslutet då går genom Uppföljning. Där svarar den 422.

### Ett missförhållande avslutas inte i förtid

Ett missförhållande går till LEX, beslutas och följs upp innan det avslutas. Knappen Avsluta ärendet, som annars
stänger ärendet före den sista fasen, visas därför inte för ett missförhållande, oavsett roll
(`closesOnlyAtWorkflowEnd` i varianten). Avslutet från uppföljningen, med fasknappen, finns kvar. BFF:en vägrar
samma sak (`assertMayCloseReportedMisconduct`): ett avslut som först måste flytta ärendet till en annan fas besvaras
med 422. En avvikelse kan avslutas i förtid som förut.

### Ingen status att välja

Ärendets status flyttas av flödets egna handlingar: Återuppta ärende, överlämningarna och fasbytena. Sidopanelen
visar därför inget val av Ärendestatus (`statusFollowsWorkflow` i varianten); Prioritet finns kvar. En variant
utan sloten, som AOT, behåller statusvalet, och AOT-sviten håller fast det.

### Nästa steg

Den som öppnar ett ärende ska först få veta vad som ska göras. Överst i sidopanelens Handläggning, ovanför
Ansvarig och knapparna det ofta pekar på, står kortet Nästa steg: en mening och en knapp till fliken där steget
tas. Sidans egen rubrikrad lämnas orörd. Ärendet öppnar dessutom på den fliken, när det öppnas och när fasen
byts (fasvalet av flik i `support-tabs-wrapper.tsx`), så länge sidan erbjuder fliken; annars landar det som förut
på fasens egen flik.

Regeln är `resolveAvvikelseNextStep` (`avvikelse-next-step.ts`) och läser det som redan finns: fasen, statusen,
rollerna, de sparade dokumenten, klarmarkeringen, LEX-labeln och vilket beslut som gäller.

| Läge | Nästa steg | Flik |
| --- | --- | --- |
| Ingen handläggare | Ta ärendet eller välj handläggare | - |
| Tilldelat, parkerat | Återuppta ärende | - |
| Väntar på komplettering | Svaret kommer under Meddelanden | Meddelanden |
| Registrerat | Läs rapporten, starta handläggningen | Ärendeuppgifter |
| Granskning | Granska rapporten, inled utredningen | Ärendeuppgifter |
| Utredning hos LEX, utan initial bedömning (LEX-ansvarig) | Gör den initiala bedömningen | Ärendeuppgifter |
| Utredning med misstänkt missförhållande | Tilldela LEX-ansvarig | - |
| Rapporterat missförhållande kvar hos enheten | Fyll i Utredning enhetschef, LEX utreder sedan | Utredning |
| Utredning inte klar | Skriv utredningen och markera den som klar (LEX-ansvarig: eller lämna till en LEX-utredare) | Utredning |
| Utredning klar | Skicka till beslut (LEX-utredare: lämna till LEX-ansvarig) | - |
| Beslut som gäller men inte är fattat | Ärendet beslutas under Beslut | Beslut |
| Beslut fattat, eller inget beslut gäller | Gå vidare till uppföljning (LEX: återlämna till chef) | - / Beslut |
| Uppföljning | Följ upp åtgärderna och avsluta | Uppföljning |

Kortet talar bara till ärendets handläggare. Den som läser en annans ärende, eller bara får veta att det finns,
får inget kort; ett ärende utan handläggare ber vem som helst om en. Slotten heter `nextStep` i
variantkontraktet och svarar data, inte en komponent: kortet (`SupportNextStepCard`) och landningen är delade och
visar ingenting för en variant utan slot. AOT-sviten håller fast att inget kort syns där.

### Avsluta först när åtgärderna är hanterade

Ett IAF/VOF-ärende avslutas inte så länge en åtgärd väntar på något (`support-measure-closing.ts`). Det gäller ett
förslag som inte är beslutat, och en godkänd planerad åtgärd som inte är uppföljd, alltså saknar svaren från
uppföljningen (`result`). En planerad åtgärd som rapporterats som genomförd i redigeringen (bara `executed`) väntar
alltså fortfarande på sin uppföljning. BFF:en vägrar avslutet med 422 i statusbytet och i fasbytet. Åtgärdsbilden
(`GET supporterrands/:m/:id/measures`) bär samma besked i `closeRefusal`. Med det är fasknappen Avsluta ärendet i
uppföljningsfasen avstängd, och beskedet visas under knappen (`useMeasuresCloseRefusal`). Avsluta ärendet i en
tidigare fas stängs inte av i klienten, så att varje sidladdning slipper läsa åtgärderna. Där svarar BFF:en med
samma besked.

### Till beslut först när utredningen är klar

Ärendet får inte gå från Utredning till Beslut förrän den utredning det beslutas på är **sparad som klar**
(`completed = yes`, samma markering som låser dokumentet). Vilken utredning det är avgörs av en fast regel:

| Ärendet | Utredningen som ska vara klar |
| --- | --- |
| Rapporterat missförhållande (`REPORT_TYPE/ABUSE`; `eventType = MISSFORHALLANDE` bara när ärendet saknar rapporttyp) | `utredning-sol-lss` (LEX) |
| Misstänkt missförhållande (`suspectedMisconduct = yes` i enhetschefens **sparade** utredning), som LEX-ansvarig inte har avböjt | `utredning-sol-lss` (LEX) |
| Övriga | `utredning-enhetschef` |

MAS/MAR:s `utredning-hsl` håller aldrig tillbaka beslutet, hur långt den än har kommit. Regeln finns i
både frontend (`resolveDecisionInvestigation`) och BFF (`resolveIafVofDecisionInvestigationDocumentKey`).

Kravet är det andra av variantens `phaseEntryRequirements`, efter LEX-tilldelningen: ett misstänkt
missförhållande ska nå LEX innan LEX kan göra klart något. Så länge det inte är uppfyllt heter fasknappen
Utredningen är inte klar och öppnar en dialog som säger vilken utredning som saknas. Det gäller även ett
rapporterat missförhållande som ännu inte flyttats till LEX av Support Managements schemalagda
`ADD_LABEL`: enhetschefen kan inte längre skicka det till beslut, eftersom LEX-utredningen inte är klar.

BFF:en (`PATCH /supporterrands/:m/:id/phase`) avvisar samma fasbyte med **422** och ett meddelande som
namnger utredningen, så regeln gäller även anrop som inte går via knappen. Där läses klarmarkeringen ur
dokumentets bundna schema (`x-draken-completion`), inte ur ett antaget fältnamn. Med utredningen avstängd
väntas inget in; går utredningens tillstånd inte att avgöra svarar BFF:en 503 i stället för att släppa förbi.

### Verksamhetsuppföljning – Enheter

Sidomenyn i översikten har rubriken Verksamhetsuppföljning med en knapp (variantens `followUp`) som heter efter
hur mycket av verksamheten användaren följer upp (`follow-up/unit-follow-up-scope.ts`):

| Etikett | Roll (nyckel i `HEALTHCAREDEVIATION_HANDLER_ROLES`) |
| --- | --- |
| Verksamhetsområde | `lex-ansvarig`, `lex-utredare`, `mas-mar`, eller medlem i `SUPERADMIN_GROUP` (administratör) |
| Enheter | `verksamhetschef`, eller ingen av rollerna |
| Enhet | `enhetschef` |

Med flera roller gäller den vidaste. Rollerna läses av BFF:en ur användarens AD-grupper och kommer med `/me`
(`roleKeys`, `superadmin`), så knappen heter rätt innan något är läst. Sidans rubrik följer samma regel, men en
enhetschef vars ärenden ligger på flera enheter får rubriken Enheter: det är Support Managements
åtkomstkontroll som avgör vilka enheter hen når. Knappen byter inte namn efter läsningen.

Knappen byter ut ärendetabellen mot `follow-up/unit-follow-up.component.tsx`, med två flikar:

- **Ärenden**: Enhet, Typ, Orsak, Registrerat, Riskvärde HSL och SOL/LSS, IVO-anmälan, Beslutat missförhållande
  och antal åtgärder. Nyaste först; raden och pilen öppnar ärendet i ny flik.
- **Åtgärder**: varje åtgärd på ärendena, med Åtgärdstyp, Rapporttyp, Tillagd av, Status, Påbörjad, Slutförd,
  Ärende och Effekt. Raden fälls ut till beskrivning, mål och åtgärdens effekt.

BFF:en (`GET /supportfollowup/:municipalityId/units?from&to`, `SupportFollowUpService`) läser Support
Managements ärendelista för ärenden registrerade i perioden, sidvandrar som Planerade åtgärder och svarar smalt:
etiketterna, åtgärderna och utredningsvärdena ur dokumenten (`toUnitFollowUpErrand` i
`config/iaf-vof-follow-up.ts`). Listan bär redan de JSON-parametrar och åtgärder användaren får läsa, så inget
läses per ärende. Support Managements åtkomstkontroll avgör vilka ärenden som syns: enhetschefen ser sina enheter,
och ett ärende hos LEX först när det lämnats tillbaka. Når perioden fler än 2 000 ärenden markeras svaret
`truncated` och vyn säger att listan är ofullständig.

| Kolumn / filter | Källa |
| --- | --- |
| Enhet | ärendets djupaste plats-etikett |
| Typ, Avvikelsetyp, Underkategori | etiketterna `REPORT_TYPE`, `CATEGORY`, `TYPE` |
| Lagrum | `legalBases` i utredningen som kategoriserar ärendet: LEX-utredningen för ett missförhållande, annars enhetschefens. Tills den utredningen anger något: `PROVISION`-etiketterna, alltså det lagrum rapporten skickades in under |
| Orsak | `causeAreas` i enhetschefens och LEX-utredningen |
| Riskvärde HSL / SOL/LSS | `calculatedRiskValue` i enhetschefens `riskAssessmentHsl` / `riskAssessmentSolLss` |
| Polisanmälan | `requiresPoliceReport` i `utredning-sol-lss` |
| IVO-anmälan | `ivoNotification` i `beslut-sol-lss`, annars `beslut-hsl` |
| Beslutat missförhållande | `decidedMisconductDegree` i `beslut-sol-lss` |
| Åtgärdens status | Genomförd med `executed`, annars Planerad (`TRUE`/`REWORK`), Avslagen eller Förslag |
| Påbörjad / Slutförd / Effekt | `plannedStart` / `executed` / `result` (`COMPLETED` = Ja, `NOT_COMPLETED` = Nej) |

Koderna översätts i klienten med titlarna i de senast publicerade schemana
(`follow-up/unit-follow-up-vocabulary.ts`), så ett omdöpt orsaksområde heter sitt nya namn på alla ärenden.
Riskvärdesfiltren erbjuder de värden utredningens `x-calculation` kan ge: produkterna av sannolikhet och
allvarlighetsgrad (1, 2, 3, 4, 6, 8, 9, 12, 16). Tidsperioden (två datum, de senaste 12 månaderna från start)
avgör vad BFF:en läser; övriga filter, sorteringen och översättningen görs i klienten (`unit-follow-up-rows.ts`,
`unit-follow-up-filters.ts`, `unit-follow-up-sort.ts`). Vyn skriver aldrig.

Över flikarna visar fem **lägeskort** periodens ärenden på de valda enheterna, alla enheter när ingen är vald
(`unit-follow-up-key-figures.ts`). Övriga filter påverkar inte korten.

| Kort | Räknar ärenden som |
| --- | --- |
| Rapporterade avvikelser | bär `REPORT_TYPE/DEVIATION` |
| Rapporterade missförhållanden | bär en av klassificeringspolicyns `reportedMisconductSelector`-paths (`REPORT_TYPE/ABUSE`, `REPORT_TYPE/ADVERSE_INCIDENT`), alltså också ett misstänkt missförhållande LEX tagit över |
| Ärenden med lagrum HSL / SOL/LSS | har ett lagrum (enligt raden Lagrum ovan) i policyns klassificeringsgrupp `HSL` respektive `SOL_LSS` |
| Ej påbörjade ärenden (>30 dagar) | står kvar i `NEW` (`newStatuses`) mer än 30 dagar efter registreringen; kortet är orange så länge det räknar något |

Ett kort är en knapp som visar ärendena bakom talet. Det byter till Ärenden-fliken, behåller valda enheter och
släpper övriga filter, så att listan innehåller exakt det kortet räknade. Ett nytt klick släpper kortet.
Enhetsfiltret söker bland enheterna och tar flera; det visas bara när ärendena ligger på mer än en enhet,
vilket en enhetschef med en enda enhet inte har att välja mellan. Varje valt värde visas som ett chip under
filterraden och tas bort med det (`unit-follow-up-active-filters.ts`). Åtgärdernas egna filter ligger kvar på
Ärenden-fliken men begränsar inget där, så de får chips bara på Åtgärder.

### Begränsad behörighet medan LEX har ärendet

Medan ärendet bär `ACCESS/LEX` ger AccessMapper enhetschefen och verksamhetschefen bara begränsad läsning:
`/access` svarar `level: "LR"`, och ärendet kommer tillbaka som en sammanfattning med nummer, titel, status,
kanal och tider. Ärendesidan visar då *Du har begränsad behörighet till detta ärende.* överst och låser alla
fält och knappar (variantens `limitedAccessNotice`). Fasknappen och Parkera erbjuds inte alls, som för den som
inte handlägger ärendet. Går nivån inte att läsa visas ärendet som det lästes; Support Management nekar ändå
det användaren inte får göra.

I översikten står LEX som Ansvarig för varje ärende som bär `ACCESS/LEX` (variantens `overviewAssignee`,
`lexOverviewAssignee`): rollen har ärendet, vem av LEX det än är tilldelat, och det syns även för den som
bara får begränsad läsning.

### Fel plats: flytta ärendet utan att ändra det inrapporterade

Katla skriver platsen två gånger. Rapportörens val ligger i den inkommande JSON-parametern
(`orgName`/`parentOrgName`, renderat i Ärendeuppgifter av `FacilitySearchField`), och samma plats
ligger som ärendets LOCATION-labels — hela kedjan, en label per nivå. De två stämmer överens när
ärendet routats rätt och skiljer sig åt när det inte gjort det, och det är **bara labels som flyttas**.
JSON-parametern är facit på vad som skickades in och ändras aldrig; labels är det AccessMapper
matchar på och därmed det som avgör vem som når ärendet. Ett ärende som hamnat hos fel enhet rättas
alltså genom att byta plats-labels, inte genom att redigera rapporten.

Steget `move-location` gör det. Klienten namnger målplatsen med label-id (`locationLabelId`), och
backend löser ut resten ur metadataträdet (`resolveInvestigationLocationTarget`):

- målet måste finnas exakt en gång i trädet, vara ett **löv** (Katla erbjuder bara enheterna längst
  ned som platser) och ha en nivå med classification `LOCATION` på sin väg — annars finns inget för
  AccessMapper att matcha och ingen chef att lösa ut;
- den nya labellistan (`buildInvestigationLocationLabelUpdate`) tar bort varje label under
  platsstrukturens toppnod och varje LOCATION-klassad label, och lägger till hela kedjan ned till
  målet. Alla andra labels — klassificering, rapporttyp, `ACCESS/LEX` — passerar orörda, så vägen
  kan inte bli ett andra sätt att omklassificera. Toppnoden själv lämnas som den bars: den är
  strukturen, inte en plats;
- chefen väljs ur den **nya** platsens chefer, upplösta med exakt samma regel som återlämningen
  (`resolveManagersForLocation`), och förhandsvisas via
  `GET /supporterrands/:m/:id/location-managers/:labelId`. Den som flyttar skriver bort sig själv
  från ärendet, så någon i andra änden måste kunna se det.

Steget auktoriseras av skrivrätt på `utredning-enhetschef`: den chef som felaktigt fick ärendet är
den som ser det först och ska kunna skicka det vidare. Ett ärende som bär `ACCESS/LEX` flyttas inte
(409) — det är LEX-labeln, inte platsen, som ger LEX åtkomst, och chefen flytten skulle tilldela
kunde inte agera förrän ärendet lämnats tillbaka. Utredaren återlämnar först; mottagaren flyttar.

Kortet **Ärendets plats** ligger överst i Ärendeuppgifter (`ErrandLocationCard`, via variantens
`renderDetailsHeader`) och visas för den som har skrivrätt på `utredning-enhetschef`, när ärendet
varken är låst eller hos LEX. Kortet (`MoveLocationButton`) visar platsen enligt
labels — inte platsen i de inrapporterade uppgifterna — och öppnar flytten (`MoveLocationModal`): sök plats som i
Katla, välj chef, bekräfta. Efter flytten navigerar klienten till översikten av samma skäl som de
andra stegen. `resolveErrandPlace` i `assignment/errand-location.ts` är den rena upplösningen från
labels till platsstrukturnod, delad med `place-structure.ts` som Ärendeuppgifter redan använder.

### Ansvarig-listan är ärendespecifik

`GET /users/admins` svarar "vilka finns i de konfigurerade AD-grupperna" och är identisk för alla
ärenden — vilket är hur en enhetschef kunde stå kvar som valbar för ett ärende hen inte längre nådde.
Sidopanelen frågar därför per ärende i stället, via
`GET /supporterrands/:m/:id/assignable-handlers`:

| Ärendets tillstånd | Listan innehåller |
| --- | --- |
| Bär `ACCESS/LEX` | LEX-ansvarig och LEX-utredare. **Inte** enhetschefer eller verksamhetschefer — de kan ändå inte agera förrän ärendet lämnats tillbaka |
| Annars, med plats | Platsens chefer, upplösta med **exakt samma** regel som återlämningen använder |
| Med plats, och enhetschefens utredning är klarmarkerad med ett misstänkt missförhållande som LEX-ansvarig inte har avböjt (`awaitsLexHandover`) | Platsens chefer och dessutom LEX-ansvariga, var och en med `handoverStep: 'assign-lex'` |
| Ingen plats, eller ingen avvikelse-capability | Oförändrad lista |

Att båda vägarna delar `resolveManagersForErrand` är avsiktligt: en regel avgör vem som äger en
plats, inte två som kan säga olika.

`handoverStep` säger att det inte är en tilldelning att ge ärendet till den personen utan ett namngivet
överlämningssteg. Sidopanelen tar då steget (`POST .../investigation-handover/assign-lex` med personen som
`assignedUserId`) i stället för att tilldela, och lämnar ärendet för översikten. Eftersom steget tar ärendet
ur enhetschefens räckhåll kommer det **sist** i Spara ärende: först ärendets egna fält (villkorade på den
version formuläret laddades med), sedan delarnas utkast som MAS/MAR och utredningsdokumenten, och kan något
av dem inte sparas lämnas ärendet inte över. Vilken drake det är avgör ingenting - det är data i svaret,
så sidopanelen kan vara delad kod.

Filtreringen styrs av capabilityn, aldrig av appnamn. En deployment utan AccessMapper-konfiguration
har ingenting att filtrera mot, och en tom Ansvarig-lista skulle göra den oförmögen att tilldela
någon alls. Klienten faller dessutom tillbaka på hela katalogen tills endpointen svarat — och om den
inte svarar — så väljaren aldrig står tom.

### Vem som kan tilldelas

`HEALTHCAREDEVIATION_HANDLER_ROLES` är den rikare stavningen av `ASSIGNABLE_HANDLER_GROUPS`: den
namnger samma AD-grupper och dessutom vilken roll varje grupp står för, och för roller med `measures`
även vem som registrerar åtgärder. `GET /users/admins` returnerar därför
`roleKeys` per konto plus rollernas etiketter, och `Ansvarig`-listan grupperas med `Select.Optgroup`.
Det är **data**, inte en drake-if: en deployment utan roller får exakt den platta lista den alltid
har haft, vilket är varför den här ändringen kan ligga i delad kod.

### Vilken plats ärendet gäller

Två saker avgör vilken label som är platsen, och båda behövs.

**Classification, inte path-prefix.** Platsen är den label vars `classification` är `location`.
Hierarkin blandar sorter, och att matcha på att pathen börjar med platsroten skulle svepa in noder
som inte är platser.

**Djupast vinner.** Ärendet bär hela sin platssökväg, inte bara lövet: en plats fyra nivåer ned
kommer som fyra labels, en per nivå. Att räkna dem är alltså inte vägen till platsen — platsen är
den **djupaste** av dem. Varje förfader är ett bredare område, och att lösa ut chefen mot någon av
dem skulle lämna ärendet till den som ansvarar för en hel region i stället för för enheten det
gäller.

Djupet kommer från metadataträdet, inte från att räkna snedstreck i pathen, så en resource path
tolkas aldrig som en kedja av namn. Labelns identitet är dess `id`; ärendets egen `resourcePath`
används bara när id saknas, eftersom det är metadatanoden som bär classification.

Två labels på **samma** djup är däremot en verklig tvetydighet — två olika platser, inte två nivåer
av samma — och rapporteras i stället för att gissas.

### Vilka chefer platsen har

Båda halvorna kommer ur AccessMapper, och ingen räcker ensam:

**Vem når platsen.** `GET access-config/user?pattern=…` filtrerar på **exakt** lagrat mönster, och
BFF:en frågar efter platsens eget mönster, till exempel `LOCATION/33/34/500020/10920/**`. En chef är
upplagd på de platser hen ansvarar för: en verksamhetschef har ett mönster per enhet, inte ett på
nivån ovanför. En chef som bara är upplagd högre upp i trädet listas alltså inte. Samma lista används
för Ansvarig, återlämningen och flytt av plats.

**Vem är chef.** `GET access/ad/{adId}?type=role` ger personens roller. `UNIT_MANAGER` och
`HEAD_OF_OPERATIONS` är de som räknas (`investigation-manager-roles.ts`); en roll som inte står där
är ingen chef i det här sammanhanget och kan alltså aldrig ta emot ett ärende. En person som når
platsen men saknar rollen listas inte, hur många enheter hen än når: syns inte verksamhetschefen är
det rollen i AccessMapper som saknas. Rollen kommer från AccessMapper och inte från en AD-grupp,
eftersom det är där personens åtkomst till platsen ändå konfigureras — två system skulle glida isär.

**Namnet** finns inte i AccessMapper. Det hämtas ur Active Directory efteråt, och bara för de konton
som blev kvar: handläggarcachen svarar gratis där den kan, övriga slås upp med `search/{domain}`.
Uppslaget är best effort — ett konto utan namn visas med sitt AD-konto i stället för att fälla hela
återlämningen, för ett visningsnamn är presentation.

Kandidaterna returneras grupperade per roll, och klienten renderar dem med `Select.Optgroup` precis
som handläggarlistan i sidopanelen. Utredaren väljer; backend löser upp samma lista igen vid
skrivningen och avvisar alla utanför den, så väljaren kan inte bredda vem som får ta emot ärendet.

## Rapporter: publicering och återhämtning

`InvestigationReportPublicationService` i backend äger publiceringsförloppet. Controllern
kontrollerar åtkomst och bygger rapporten; tjänsten samordnar dokumentets rapportlista och
Support Managements bilagor. Ingen separat databas eller processlokal låsning används.

Klienten skickar ett UUID v4 som `operationId` och behåller det i `sessionStorage` tills
publiceringen har bekräftats. Samma identitet används efter nätverksfel och omladdning.
Förhandsgranskning kräver ingen identitet och gör inga skrivningar.

Befintliga, bundna scheman tillåter `generatedAt`, `generatedBy`, `fileName` och ett valfritt
`attachmentId`. Därför lagras publiceringsidentiteten som ett UUID-suffix i filnamnet:
`Handelseanalys_HSL_2_<operationId>.pdf`. Rapportlistan förblir serverägd.

1. PDF:en renderas. Ett renderingsfel lämnar inget väntande arbete.
2. En rapportpost utan `attachmentId` reserveras med dokumentets `If-Match`. Bara den begäran
   som får ett bekräftat svar på reservationen får ladda upp. Samtidiga försök serialiseras av
   dokumentversionen. En väntande rapport hindrar upplåsning och ändring av rapportunderlaget.
3. Bilagan laddas upp en gång. `Location` följs inte; bilagans id läses ur svaret.
4. Rapportposten kompletteras med id på dokumentets senast lästa version. Ett nytt försök
   återanvänder en bekräftad post eller hittar bilagan med exakt samma unika filnamn.

Support Managements bilage-POST saknar idempotensnyckel. Om uppladdningen eller svaret avbryts
kan BFF därför inte bevisa att det är säkert att ladda upp igen. Den behåller reservationen och
letar efter den befintliga bilagan. Saknas en entydig träff blir resultatet HTTP 409 med en
åtgärdsanvisning, aldrig en automatisk ny uppladdning. Detta gäller även efter omstart av BFF.

### Förvaltning av en väntande rapport

- Låt ett pågående försök avslutas. Försök sedan med **Slutför rapport**. Finns exakt en bilaga
  med reservationens filnamn kopplar BFF ihop den med rapportposten.
- Om ingen bilaga finns: kontrollera upstream-loggar och säkerställ att ingen uppladdning
  fortfarande kan slutföras. Återställ inte reservationen medan utfallet är oklart.
- Om det är bekräftat att ingen uppladdning accepterades får en behörig förvaltare ta bort
  just den väntande posten via Support Managements JSON-parameter-API, med dokumentets
  aktuella `If-Match`. Behåll övriga poster och dokumentfält. Därefter kan användaren försöka igen.
- Om flera bilagor matchar eller reservationen har ändrats utanför BFF krävs manuell utredning.
  Radera inte bilagor automatiskt. Dokumentera vald bilaga och eventuell korrigering.

Äldre rapportposter utan UUID-suffix tolkas inte som väntande. Återgång till en äldre BFF får
inte göras med pågående reservationer: den äldre rapportkoden känner inte till dessa och kan
ladda upp nya kopior. Slutför eller utred reservationerna före återgång. Frontend och backend
behöver driftsättas tillsammans eftersom verklig publicering nu kräver `operationId`.

### Ärendeversion och formulärutkast

Ett dokument har en egen version. Föräldraärendets version får uppdateras i ett delvis laddat
formulär bara om den egna skrivningen förklarar hela versionsökningen, och både store och
formulär fortfarande har den basversionen. Regeln ägs av `isSoleSupportErrandVersionChange`
och används av dokument, kategorisering och åtgärder. En rapport kan göra noll eller flera
skrivningar vid återhämtning; dess svar får därför inte flytta formulärets ärendeversion.

Efter andra samtidiga ändringar behöver användaren ladda om föräldraärendet före ett nytt
ärendesparande. Sparfel lämnar utkast och basversion kvar. Spara undan utkastet före omladdning.
Sidopanelens sparfunktion returnerar uttryckligen om hela flödet lyckades; **Starta handläggning**
fortsätter bara efter ett bekräftat sparande.
