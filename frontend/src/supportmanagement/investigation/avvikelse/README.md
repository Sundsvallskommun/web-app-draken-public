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

De endpoints som faktiskt skriver på **ärendet** — `/classification`, `/admin`, `/status`, `/phase` och
`/investigation-handover` — kräver fortsatt exakt ärendeversion, eftersom det är ärendet de villkorar.

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

## Tilldelningsflödet: från enhetschef till LEX och tillbaka

Ett misstänkt missförhållande byter inte bara klassificering — det byter **åtkomst**. Support
Managements AccessMapper matchar användarens konfigurerade labelmönster mot ärendets labels, så det
är labeln `ACCESS/LEX` som faktiskt lämnar över ärendet: enhetschefen slutar se det och LEX-rollerna
börjar. Draken implementerar därför ingen egen synlighetsregel; den skriver bara labeln.

`ACCESS`-trädet innehåller i dag exakt den labeln. Det finns ingen motsvarighet för MAS/MAR — de når
HSL-ärenden på annat sätt — så ett högt HSL-riskvärde har ingen label att skriva och inget
överlämningssteg. Riskvärdet visas som en varning för enhetschefen och inget mer.

Två namngivna steg finns, och klienten namnger steget i stället för att komponera skrivningen själv
(`backend/src/config/investigation-handover-steps.ts`):

| Steg | Utlöses av | Skriver |
| --- | --- | --- |
| `assign-lex` | `suspectedMisconduct === 'yes'` i enhetschefsutredningen | `assignedUserId` (LEX-ansvarig), `REPORT_TYPE/ABUSE` i stället för `REPORT_TYPE/DEVIATION`, `ACCESS/LEX` |
| `return-to-manager` | LEX-utredaren är klar | `assignedUserId` (enhetschef för platsen), tar bort `ACCESS/LEX` |

Inget av stegen ändrar **status**. `ASSIGNED` vore den naturliga statusen för en överlämning, men
Draken behandlar den som ett *låst* tillstånd (`isSupportErrandLocked`), och enda vägen ur den är
sidopanelens återuppta-knapp som går till `ONGOING` — en status avvikelsenamespacen inte har. Att
sätta den lämnade alltså mottagaren med ett ärende de varken kunde redigera eller låsa upp. Ärendet
behåller i stället den status det redan hade; det är handläggarbytet som signalerar överlämningen.

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
enhetschefsutredningen till SoL/LSS-utredningen och SOL och LSS blir tvingade lagrum. Ärendets
parameter `eventType` lämnas däremot orörd och står kvar som `AVVIKELSE`.

En känd konsekvens av de tvingade lagrummen: ett ärende med både HSL och SOL/LSS som blir
missförhållande får sina lagrum normaliserade till SOL/LSS nästa gång enhetschefsdokumentet **sparas**,
vilket tar bort `riskAssessmentHsl`. I praktiken når det bara en investigation-admin, eftersom
`SUPPORT_INVESTIGATION_DOCUMENT_GROUPS` ger LEX-rollerna läsrätt men inte skrivrätt på det
dokumentet — men regeln är värd att känna till innan grupperna konfigureras om.

### Ansvarig-listan är ärendespecifik

`GET /users/admins` svarar "vilka finns i de konfigurerade AD-grupperna" och är identisk för alla
ärenden — vilket är hur en enhetschef kunde stå kvar som valbar för ett ärende hen inte längre nådde.
Sidopanelen frågar därför per ärende i stället, via
`GET /supporterrands/:m/:id/assignable-handlers`:

| Ärendets tillstånd | Listan innehåller |
| --- | --- |
| Bär `ACCESS/LEX` | LEX-ansvarig och LEX-utredare. **Inte** enhetschefer eller verksamhetschefer — de kan ändå inte agera förrän ärendet lämnats tillbaka |
| Annars, med plats | Platsens chefer, upplösta med **exakt samma** regel som återlämningen använder |
| Ingen plats, eller ingen avvikelse-capability | Oförändrad lista |

Att båda vägarna delar `resolveManagersForErrand` är avsiktligt: en regel avgör vem som äger en
plats, inte två som kan säga olika.

Filtreringen styrs av capabilityn, aldrig av appnamn. En deployment utan AccessMapper-konfiguration
har ingenting att filtrera mot, och en tom Ansvarig-lista skulle göra den oförmögen att tilldela
någon alls. Klienten faller dessutom tillbaka på hela katalogen tills endpointen svarat — och om den
inte svarar — så väljaren aldrig står tom.

### Vem som kan tilldelas

`HANDLER_GROUP_ROLES` är den rikare stavningen av `ASSIGNABLE_HANDLER_GROUPS`: den namnger samma
AD-grupper och dessutom vilken roll varje grupp står för. `GET /users/admins` returnerar därför
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

**Vem når platsen.** `GET access-config/user?pattern=…` filtrerar på **exakt** lagrat mönster, så
platsens eget mönster och varje förfaders frågas efter vid namn:

```
LOCATION/33/34/500020/10920/**   ← specificitet 5
LOCATION/33/34/500020/**         ← 4
…
LOCATION/**                      ← 1
```

Att bara fråga efter det djupaste mönstret vore fel: en chef upplagd högre upp täcker platsen men
skulle aldrig dyka upp, och felet ser ut som "ingen chef är konfigurerad". En person som finns på
flera nivåer behåller sin mest specifika träff, och listan sorteras med den först.

**Vem är chef.** `GET access/ad/{adId}?type=role` ger personens roller. `UNIT_MANAGER` och
`HEAD_OF_OPERATION` är de som räknas (`investigation-manager-roles.ts`); en roll som inte står där
är ingen chef i det här sammanhanget och kan alltså aldrig ta emot ett ärende. Rollen kommer från
AccessMapper och inte från en AD-grupp, eftersom det är där personens åtkomst till platsen ändå
konfigureras — två system skulle glida isär.

**Namnet** finns inte i AccessMapper. Det hämtas ur Active Directory efteråt, och bara för de konton
som blev kvar: handläggarcachen svarar gratis där den kan, övriga slås upp med `search/{domain}`.
Uppslaget är best effort — ett konto utan namn visas med sitt AD-konto i stället för att fälla hela
återlämningen, för ett visningsnamn är presentation.

Kandidaterna returneras grupperade per roll, och klienten renderar dem med `Select.Optgroup` precis
som handläggarlistan i sidopanelen. Utredaren väljer; backend löser upp samma lista igen vid
skrivningen och avvisar alla utanför den, så väljaren kan inte bredda vem som får ta emot ärendet.
