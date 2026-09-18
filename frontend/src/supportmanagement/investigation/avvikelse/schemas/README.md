# Lokala utredningsscheman

Den här katalogen är den kanoniska lokala källan för den första schema-labben. Filerna är kompletta request bodies för JSON Schema-API:t, men labben läser dem direkt och publicerar ingenting.

| Parameter key / schema name | Lokal version | JSON Schema POST body                      | UI Schema PUT body                            |
| --------------------------- | ------------- | ------------------------------------------ | --------------------------------------------- |
| `utredning-enhetschef`      | 1.5           | `utredning-enhetschef.schema-request.json` | `utredning-enhetschef.ui-schema-request.json` |
| `utredning-sol-lss`         | 1.3           | `utredning-sol-lss.schema-request.json`    | `utredning-sol-lss.ui-schema-request.json`    |
| `utredning-hsl`             | 1.3           | `utredning-hsl.schema-request.json`        | `utredning-hsl.ui-schema-request.json`        |
| `beslut-hsl`                | 1.2           | `beslut-hsl.schema-request.json`           | `beslut-hsl.ui-schema-request.json`           |
| `beslut-sol-lss`            | 1.3           | `beslut-sol-lss.schema-request.json`       | `beslut-sol-lss.ui-schema-request.json`       |

Vid publicering skickas `*.schema-request.json` till `POST /2281/schemas`. Det skapade schema-ID:t används sedan med motsvarande `*.ui-schema-request.json` i `PUT /2281/schemas/{id}/ui-schema`.

## Publicerat i test

Version 1.0 publicerades och lästes tillbaka från JsonSchema-API:ts testmiljö den 12 augusti 2026:

- `2281_utredning-enhetschef_1.0`
- `2281_utredning-sol-lss_1.0`
- `2281_utredning-hsl_1.0`

Schema och UI Schema verifierades separat för varje ID. Inget har publicerats i produktionsmiljön.

Den 10 september 2026 publicerades och lästes tillbaka från samma testmiljö:

- `2281_utredning-hsl_1.1`
- `2281_beslut-hsl_1.0`
- `2281_beslut-sol-lss_1.0`

Den 11 september 2026 publicerades version 1.1 av båda besluten (`2281_beslut-hsl_1.1`, `2281_beslut-sol-lss_1.1`),
som ersätter 1.0: beslutsdatumet blev en serverstämplad tidpunkt och Public 360-regeln ändrades. Inga dokument
hade sparats mot 1.0. Samma dag publicerades version 1.2 (`2281_beslut-hsl_1.2`, `2281_beslut-sol-lss_1.2`) med
`updatedAt` och `revisions`; inga dokument hade sparats mot 1.1. `2281_beslut-sol-lss_1.3` publicerades samma dag med
klassificeringsfältet i full bredd; inga dokument hade sparats mot 1.2.

Den 11 september 2026 publicerades också version 1.2 av de tre utredningarna (`2281_utredning-enhetschef_1.2`,
`2281_utredning-sol-lss_1.2`, `2281_utredning-hsl_1.2`) med sektionen Utredningen klar och rapport. Version 1.1 av
enhetschefs- och SoL/LSS-utredningen fanns bara som lokala artefakter och hoppades över. Att en requestartefakt
finns här innebär inte att den har skickats till JsonSchema-API:t. Formulären läser schemana från JsonSchema-API:t
vid körning, så en ny version måste publiceras i varje miljö innan den används där.

Den 17 september 2026 publicerades version 1.3 av enhetschefsutredningen (`2281_utredning-enhetschef_1.3`) i
testmiljön. Den tillåter alla tre lagrum i `legalBases` (tidigare högst två); UI-schemat är oförändrat och lades på
det nya schema-ID:t. Schema och UI Schema lästes tillbaka och var identiska med artefakterna. Inget har publicerats
i produktionsmiljön. Dokument som redan är bundna till 1.2 behåller sin gräns på två lagrum.

Den 18 september 2026 publicerades version 1.4 av enhetschefsutredningen och 1.3 av SoL/LSS- och HSL-utredningarna
(`2281_utredning-enhetschef_1.4`, `2281_utredning-sol-lss_1.3`, `2281_utredning-hsl_1.3`) i testmiljön, med
villkoret för utkast (se nedan). Schema och UI Schema lästes tillbaka för varje ID och var identiska med
artefakterna, och `schemas/{name}/versions/latest` pekar nu på de nya versionerna. Inget har publicerats i
produktionsmiljön. Dokument som redan är bundna till ett äldre schema-ID behåller sina ovillkorade krav — BFF:en
vägrar byta `schemaId` på ett befintligt dokument.

Samma dag publicerades `2281_utredning-enhetschef_1.5`, som ersätter 1.4: även lagrummen krävs först vid
klarmarkering, så en enhetschef kan spara ett helt tomt utkast. 1.4 hann användas några timmar i testmiljön;
utredningar som skapades då sitter kvar på 1.4 och kräver därför fortfarande ett valt lagrum.

Schema v1.0 innehåller utredningsdata. Åtgärder, handlingsplaner, interna arbetsanteckningar, rapportgenerering och lokala markeringar om kompletta accordionsektioner ligger avsiktligt utanför dokumenten.

## Utredningen klar och rapport

Varje utredning slutar med sektionen Utredningen klar och rapport. Schemat deklarerar
`x-draken-completion: { "field": "completed", "reportsField": "reports" }`:

- `completed` (Ja/Nej, Nej när inget är angivet) är utredarens markering. Ett dokument som sparats med Ja är
  låst: BFF:en avvisar varje skrivning utom den som sätter Nej utan att ändra något annat, och formuläret blir
  skrivskyddat med knappen Lås upp utredningen.
- `reports` är serverägd (`x-draken-server-owned`): en post `{ generatedAt, generatedBy, fileName, attachmentId }`
  per rapport, som BFF:en lägger till när rapporten skapas. Klientens kopia av fältet ignoreras.
- `$external:investigationReport` i UI-schemat är platsen där Draken visar knapparna Skapa rapport,
  Förhandsgranska rapport och Lås upp utredningen samt listan över skapade rapporter.

Rapporten skapas av BFF:en (`POST .../json-parameters/{key}/reports`) ur det sparade dokumentet: sektioner och fält
i UI-schemats ordning, koder översatta till sina titlar, ärendets kategorisering från etiketterna. Den renderas
via Templating-API:ts `render/direct/pdf` med mallen i `backend/src/services/investigation-report.template.ts`,
läggs som bilaga på ärendet med löpnummer (`Utredning_Lex_Sarah_2.pdf`) och registreras i `reports`. Filnamnet
byggs av fliknamnet med ASCII-bokstäver, siffror och understreck (å/ä/ö blir a/a/o), så att multipart-uppladdningen
inte behöver hantera mellanslag eller Unicode i filnamnet. PDF-rubriken följer fortfarande schemats `title`.
Förhandsgranskning
renderar utan att bifoga eller registrera. Efter upplåsning kan utredningen ändras och en ny numrerad rapport
skapas; äldre rapporter ligger kvar som bilagor.

## Utkast och klarmarkering

Ett halvfärdigt utkast är giltigt enligt schemat. Kraven på vad utredningen ska innehålla ligger i ett villkor på
klarmarkeringen:

```json
{
  "if": { "properties": { "completed": { "const": "yes" } }, "required": ["completed"] },
  "then": { "allOf": [{ "...": "det som utredningen måste innehålla" }] }
}
```

Kraven ligger under `then.allOf`, inte direkt under `then`, och det är inte kosmetik: sektionsmallen läser
`then.properties` och `then.required` i rotens `allOf` som en regel för när ett fält ska **visas** — det är så
riskbedömningen dyker upp med sitt lagrum. Skrivs kraven direkt under `then` försvinner varje fält de nämner
ur formuläret tills utredaren markerar utredningen klar. Kontraktstestet "the completion gate decides what is
valid, not which fields the form shows" håller fast det.

Samma schema valideras av formuläret (RJSF), av BFF:en och av Support Management, så det är dokumentets egen
klarmarkering — inte vilket anrop som görs — som avgör vilka regler som gäller. Ingen validering är avstängd
någonstans: API:t upprätthåller kravet på ett komplett dokument även mot ett anrop som inte kommer från Draken.

Det som flyttade in i villkoret är exakt det som krävdes ovillkorat förut, varken mer eller mindre:

| Schema                 | Krav som gäller först vid klarmarkering                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utredning-enhetschef` | Minst ett lagrum, riskbedömningarnas fält (`assessedWith`, `probability`, `severity`, `calculatedRiskValue`) och att den riskbedömning som valt lagrum kräver finns |
| `utredning-sol-lss`    | `eventTypes` måste ha minst ett val om fältet finns                                                                                                                 |
| `utredning-hsl`        | `role` på varje rad i `analysisTeamParticipants`                                                                                                                    |

Vilka fält verksamheten vill tvinga fram vid klarmarkering utöver detta är ett eget beslut; det läggs i så fall i
`then`-grenen och ingen annanstans.

Ovillkorade står reglerna om dokumentets _form_, inte dess ifyllnadsgrad: att ett fält som inte gäller för valt
lagrum inte får finnas, att utredningsmallen följer lagrummen, och att ett uträknat riskvärde stämmer med sina
indata. Lagrummen krävs också först vid klarmarkering: de är formulärets första fråga, men ett utkast där
enhetschefen ännu inte tagit ställning ska gå att lägga ifrån sig.

Ärendets kategorisering följer samma regel, fast utanför schemat: den skrivs genom en egen PATCH och krävs av
`prepareInvestigationClassification` först när utredningen markeras klar. En kategorisering som handläggaren
själv har ändrat skrivs och valideras ändå — ett utkast är ingen licens att lagra en kategorisering som ingen
hade kunnat välja. Följden är att ett ärende kan ligga med en påbörjad utredning helt utan etiketter och då inte
syns i översiktens avvikelsefilter förrän någon kategoriserar det.

Eftersom `required` nu är villkorat markerar RJSF inte längre fälten som obligatoriska i ett utkast. UI-schemana
sätter därför `ui:options.showRequiredIndicator` på dem, så att "(Obligatorisk)" står kvar hela vägen. Fältuppsättningens
egen rubrik (Riskbedömning HSL) får sin markering av RJSF och saknar den i ett utkast.

Besluten (`beslut-hsl`, `beslut-sol-lss`) har ingen klarmarkering och är oförändrat strikta: ett beslut fattas eller
fattas inte.

## Besluten

Beslutet om anmälan till IVO är ett eget dokument, skilt från utredningen, och finns i två varianter som aldrig
gäller samma ärende:

- `beslut-hsl` för en vanlig avvikelse med lagrum HSL: ställningstagandet till IVO-anmälan (obligatoriskt),
  IVO-ärendenummer (alltid frivilligt) och Public 360-ärendenummer.
- `beslut-sol-lss` för ett rapporterat missförhållande, oavsett lagrum: samma IVO-del, plus LEX-ansvarigs
  klassificering av rapporten (samma fem grader som utredarens förslag i `utredning-sol-lss`) med obligatorisk
  motivering. Utredarens förslag visas skrivskyddat ovanför beslutet och kopieras inte in i det, och beslutet kan
  inte sparas förrän `utredning-sol-lss` finns i ärendet (`prerequisiteDocumentKey` i runtimeprofilen).

IVO- och Public 360-ärendenummer finns bara när ärendet ska anmälas till IVO: vid Ja visas båda och Public 360
krävs, vid Nej döljs de, rensas ur formuläret och får inte finnas i dokumentet.

Besluten bär tre serverägda egenskaper som formuläret aldrig erbjuder som inmatning, eftersom ett beslut kan
sparas om i efterhand, till exempel när IVO:s ärendenummer kommer:

- `decidedAt` (`x-draken-server-timestamp: "created"`): tidpunkten då beslutet fattades, satt vid första
  sparningen och därefter bevarad från det lagrade dokumentet.
- `updatedAt` (`x-draken-server-timestamp: "updated"`): tidpunkten för den senaste sparningen.
- `revisions` (`x-draken-server-revisions: true`): en post `{ savedAt, savedBy }` per sparning, som BFF:en lägger
  till utifrån det lagrade dokumentet och den inloggades användarnamn.

BFF:en sätter alla tre oavsett vad klienten skickar; formuläret döljer fälten och visar Beslutat och Senast ändrat i
dokumentets huvud. Från `utredning-hsl` 1.1 ligger IVO- och Public 360-fälten inte längre i utredningen; dokument
som redan är bundna till 1.0 behåller sina fält och sin regel.

I version 1.1 deklarerar enhetschefs- och SOL/LSS-schemana det externa fältet
`x-draken-external-fields.errandClassification`. Respektive UI Schema placerar
`$external:errandClassification` direkt efter `legalBases`. Deklarationen låter schemat styra var klassificeringen
visas och vilket lagrumsfält som filtrerar den, men avvikelsetyp, underkategori och deras UUID:n ägs av ärendets
SupportManagement-labels. De är inte JSON Schema-properties och sparas inte i utredningsdokumentets JSON. På platsen
visar Draken en väljare per vald lagrumsgrupp, HSL respektive SoL/LSS; se [../README.md](../README.md#ansvarsgränser).

Vanliga avvikelser redigerar klassificeringen i enhetschefsutredningen. För `eventType: MISSFORHALLANDE` flyttas
redigeringsansvaret till SOL/LSS-utredningen, med SOL och LSS förvalda och skrivskyddade. `Spara utredning` samordnar
dokumentets egen PUT med en smal label-PATCH som bär en klassificering per lagrumsgrupp. Om PUT:en lyckas men label-PATCH:en misslyckas rapporteras en delvis
genomförd sparning, och ett nytt försök skickar endast label-PATCH:en.

Redan sparade enhetschefs- och SOL/LSS-dokument som är bundna till schema till och med version 1.0 får samma externa
fältplacering via en runtime-fallback. Det ändrar inte deras bundna schema eller dokumentdata. Utredningsfeaturen är
den centrala ägaren även om ett nyare schema av misstag saknar deklarationen; då används samma säkra placering och
Draken visar en schemavarning, så att kategoriseringen varken försvinner eller får två redigeringsställen.

Riskvärden använder följande stabila sökvägar:

- `riskAssessmentHsl.probability * riskAssessmentHsl.severity = riskAssessmentHsl.calculatedRiskValue`
- `riskAssessmentSolLss.probability * riskAssessmentSolLss.severity = riskAssessmentSolLss.calculatedRiskValue`

Formel och indata finns även som `x-calculation` på respektive riskobjekt. Resultatfälten är skrivskyddade i både JSON Schema och UI Schema.
JSON Schema innehåller dessutom samtliga 16 giltiga kombinationer för skalan 1–4 och avvisar ett lagrat resultat som
inte motsvarar `probability * severity`.

`fixtures/investigation-schema-cases.json` innehåller ett fullständigt giltigt lokalt `formData`-objekt och negativa kontraktsfall för vart och ett av de tre schemana.

Kör kontraktstesterna från `frontend`:

```sh
yarn test src/supportmanagement/investigation/schemas
```

Publicerade schema- och UI-schema-versioner ska behandlas som immutabla. Ändringar av kontrakt eller presentation publiceras med ett nytt versionsnummer.
