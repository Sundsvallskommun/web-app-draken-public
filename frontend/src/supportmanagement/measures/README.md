# Åtgärder i Draken

Support Management äger åtgärdstypernas namn, visningstexter, sortering och
`measureGroups`. Draken hämtar detta via befintlig metadata vid läsning och
sparande. Det finns ingen lokal typkatalog eller lista över tillåtna typnamn.

## Ansvar

- `backend/src/services/support-measure-registration.ts` matchar sessionens
  AD-grupper mot registreringsroller och kopplar rollerna till API:ts typgrupper.
  Samma urval används för formuläret och validering vid sparande.
- `backend/src/services/support-measure.service.ts` använder den skyddade
  measures-resursen, kontrollerar ärendestatus, datum och version samt sätter
  skaparen från den inloggade sessionen. Den äger även beslutsbehörighet,
  beslutets tillåtna övergång och skyddet av beslutat innehåll.
- `measure-decision.ts` äger beslutens etiketter och livscykel i frontend.
  Lista, filter och formulär återanvänder samma tolkning.
- `avvikelse/` äger formuläret, rollval, utkast och användarmeddelanden.
  `avvikelse-measure-decision-dialog.tsx` är en separat beslutsdialog.
- Support Management lagrar metadata och åtgärder. Typgrupper är fria strängar;
  de ger inte användaren en roll eller skrivbehörighet i API:t.

## Konfiguration

`SUPPORT_MEASURE_REGISTRATION` i backend innehåller en post per registreringsroll.
Lokalt används `backend/.env.iaf.development.local` eller
`backend/.env.vof.development.local`. Exempelmallarna har samma struktur.

| Registreringsroll (`displayName` i metadata) | `Role.name`        | Grupp i `MeasureType.measureGroups` | `decides`     |
| -------------------------------------------- | ------------------ | ----------------------------------- | ------------- |
| Enhetschef                                   | `UNIT_MANAGER`     | `UNIT_MANAGER`                      | ja            |
| MAR/MAS                                      | `MAR_MAS`          | `HSL_MAS_MAR`                       | nej (förslag) |
| Lex Sarah (i metadata ännu "LEX-utredare")   | `LEX_INVESTIGATOR` | `SOL_LSS`                           | nej (förslag) |

Rollnamn och typgrupp är olika begrepp. Tabellen motsvarar den metadata som
lästes från testmiljön den 9 september 2026. Ingen automatisk översättning från
visningsnamn eller delsträngsmatchning används.

IAF:

```dotenv
SUPPORT_MEASURE_REGISTRATION='[{"roleName":"UNIT_MANAGER","decides":true,"adGroups":["SG_Appl_Draken_Enhetschef_IAF_Test","SG_Appl_Draken_Avvikelse_Admin_Test"],"measureGroup":"UNIT_MANAGER"},{"roleName":"MAR_MAS","adGroups":["SG_Appl_Draken_MAS_MAR_IAF_Test","SG_Appl_Draken_Avvikelse_Admin_Test"],"measureGroup":"HSL_MAS_MAR"},{"roleName":"LEX_INVESTIGATOR","adGroups":["SG_Appl_Draken_LEX_Utredare_IAF_Test","SG_Appl_Draken_Avvikelse_Admin_Test"],"measureGroup":"SOL_LSS"}]'
```

VoF använder motsvarande grupper med `Vof_Test` i stället för `IAF_Test`.
Förvaltningsrollerna matchas mot den egna förvaltningens grupper.
Den gemensamma admin-gruppen gäller i båda instanserna. Produktion använder
motsvarande AD-grupper utan `_Test`. Flera AD-grupper kan anges för samma roll;
medlemskap i någon av dem räcker för rollvalet. AD-gruppmatchningen bortser från
stora/små bokstäver. Rollnamn och typgrupp matchas exakt.

`roleName`, `adGroups` och `measureGroup` krävs. `decides` är valfritt och betyder
att rollen beslutar om åtgärder: en åtgärd som registreras i en beslutande roll
får `accept: "TRUE"` direkt vid skapandet, satt av backend. Roller utan `decides`
registrerar förslag (`accept` lämnas tomt) och formuläret säger då "Lägg till
förslag till åtgärd". Listan visar beslutet som en etikett: Förslag, Godkänd,
Avslagen eller Delvis godkänd. Skapa- och redigeringsanrop kan inte sätta
`accept`; beslut sparas genom en separat, behörighetskontrollerad endpoint.
Roller utan `decides` kan bara registrera planerade åtgärder: formuläret erbjuder
inte "Genomförd åtgärd" och backend avvisar `executed` från dem, både vid
skapande och vid redigering av ett förslag som ännu inte är godkänt. Ett godkänt
eller delvis godkänt förslag får markeras som genomfört.
`adGroups` måste vara en lista med minst ett gruppnamn.
`measureGroup` måste vara en icke-tom sträng. Okända fält, dubbla roller och roller
som saknas i namespace-metadatan ger konfigurationsfel. Den tidigare
`measureTypeNames`-inställningen ska tas bort; den stöds inte parallellt.

Starta om backend efter ändring av denna konfiguration. Uppdaterat AD-medlemskap
kräver ny inloggning. Nya typer eller ändrade typgrupper i API:t kräver däremot
ingen konfigurationsändring eller omstart av Draken: ladda om åtgärdsfliken.

`SG_Appl_Draken_Avvikelse_Admin_Test` ger samtliga tre registreringsroller i både
IAF och VoF. Gruppen ingår uttryckligen i varje rolls `adGroups`; inga särskilda
adminflaggor eller undantag i koden behövs. Administratören måste välja vilken
roll åtgärden registreras för. Typurvalet följer den valda rollen, som sparas på
åtgärden tillsammans med den faktiska användaren. Vanlig skrivbehörighet och
API:ts behörighetskontroller gäller fortfarande.

Verksamhetschef, LEX-ansvarig och rapportör ger inte i sig
registreringsroller genom denna mappning. Ärende- och utredningsbehörighet
hanteras separat. Personnummer och enskilda testkonton används inte som rollregler.

## Metadata och typurval

Befintliga endpoints:

- `GET /{municipalityId}/{namespace}/metadata` ger samlad metadata och används av
  Drakens åtgärdstjänst.
- `GET /{municipalityId}/{namespace}/metadata/measuretypes` ger typer inklusive
  `measureGroups`. `?measureGroup=SOL_LSS` filtrerar på en grupp.
- `GET /{municipalityId}/{namespace}/metadata/roles` ger namespace-roller.

En typ kan ha flera grupper och erbjudas för flera roller utan att kopieras.
Draken erbjuder aktiva typer med ID vars `measureGroups` innehåller den valda
rollens konfigurerade grupp. Avsaknad av grupper, en tom lista eller en grupp utan
matchande typer ger inga val. Det innebär aldrig att alla typer tillåts.
En matchande aktiv typ utan ID ger konfigurationsfel.

Formuläret visar varje typ en gång, sorterad efter `sortOrder` och sedan
`displayName`/`name`. Tekniska gruppnycklar visas inte som rubriker i typfältet.
Avvikelsetyper, lagrum, orsaker och beslutsgrader hör till ärendets kategorisering
och utredning och är inte åtgärdstyper.

## Formulär, sparande och historik

1. Har användaren flera registreringsroller visas ett rollsteg först och
   åtgärdens övriga fält öppnas efter rollvalet. En ensam roll förväljs utan
   rollsteg; formuläret visar då rollen som en upplysning och börjar direkt med
   åtgärdstypen.
2. Formuläret på sidan skapar alltid nya åtgärder. Redigering av en befintlig
   åtgärd öppnas i en modal med samma formulär, så att ny och ändrad åtgärd inte
   kan förväxlas. Stäng-knappen och Avbryt frågar först om det finns ändringar.
   Obligatoriska fält märks med "(Obligatoriskt)" i etiketten, inte med asterisk.
3. Ansvarig för åtgärden är fritext (valfritt) och skickas trimmad i
   `responsibleUser`. API:t beskriver fältet som AD-användarnamn men validerar bara
   sträng; listan visar texten som den är och slår upp visningsnamn bara för äldre
   åtgärder vars värde matchar ett känt AD-konto.
4. Rollbyte nollställer vald typ men bevarar resten av utkastet. Rensa formuläret
   och Avbryt redigering frågar först om utkastet innehåller ändringar.
   Validerings- och sparfel visas i en felruta (`Alert`) som får fokus och länkar
   till fälten.
5. Vid POST hämtar backend metadata igen och kontrollerar grupp, roll och typ.
   Den sätter `addedByUser` från sessionens `username`, `addedByRole` till
   namespace-rollens `name` och skickar `measureTypeId` som UUID.
6. Vid PATCH används åtgärdens egen version i `If-Match`. Skapare, registreringsroll
   och beslut kan inte ändras genom DTO:n för grundfält. Innan beslut kan
   förslagets skapare ändra typ; typbytet kontrolleras mot den sparade rollens
   typgrupp, även om skaparens nuvarande registreringsroller har ändrats.
7. Åtgärder kan inte tas bort från Draken; det finns varken knapp eller
   BFF-endpoint för det. Redigera visas bara för åtgärder som den inloggade
   användaren själv har registrerat (`addedByUser` jämfört med sessionens
   användarnamn, skiftlägesokänsligt), och backend avvisar andra med 403. Listan visar varje
   åtgärd som ett kort med status, beskrivning, mål, datum samt skapare och den
   roll åtgärden registrerades i. Ovanför listan finns filter på status, beslut,
   registreringsroll, åtgärdstyp och fritext (`measure-filters.ts`); rollerna och
   typerna i filtret är de som förekommer i listan.
8. En oförändrad historisk typ behålls även om den är utgången eller inte längre
   erbjuds för rollen. Fel behåller utkastet; versionskonflikter kräver omläsning.

Saknad eller felaktig konfiguration stoppar nyregistrering, typbyten och nya
beslut. Läsning och tillåtna ändringar av befintliga åtgärder fungerar fortfarande;
beslutade förslags typ, beskrivning och mål förblir låsta.
Formuläret skiljer på saknad konfiguration, felaktig konfiguration, avsaknad av
egen roll och att vald roll inte har några aktiva typer. Tekniska feldetaljer
stannar i backendloggen. Skrivbehörighet och ärendestatus gäller alltid.

Statistik ska utgå från sparad `addedByRole`, `measureTypeId` och `addedByUser`.
Härled inte den ursprungliga rollen från typens nuvarande grupper. Ändrade grupper
skriver inte om befintliga åtgärder. Behåll använda typer och markera dem vid behov
utgångna i API:t så att historiken behåller sina referenser.

[API-PR #740](https://github.com/Sundsvallskommun/api-service-support-management/pull/740)
innehåller separat förstärkning av skaparattribution och historikskydd. Stödet
för flera typgrupper är ett befintligt metadata-kontrakt på `avvikelse-sprint`.
Draken inför ingen egen API-behörighet genom gruppfiltreringen.

`useMeasures` är den enda feature-flaggan. Lokalt används
`NEXT_PUBLIC_USE_MEASURES=true`; vid runtime används `useMeasures` i Adminpanel.
Flaggan styr flikens synlighet oberoende av utredningsfliken.

## Uppföljning

`useMeasures` visar även **Uppföljning** direkt efter **Beslut** i flikordningen.
Uppföljningen är tillgänglig direkt och kräver inte ett sparat beslutsdokument
eller behörighet till beslutsfliken. Åtgärdernas befintliga besluts- och
skrivregler avgör fortfarande vad användaren får göra.

`SupportMeasuresTab`, `AvvikelseMeasures` och åtgärdskorten återanvänds.
Uppföljning visar bara åtgärder med planerat start- eller slutdatum och beslut
`TRUE` eller `REWORK`. `measure-follow-up.ts` äger detta urval i frontend.
Ingen registrering, redigering eller bedömning erbjuds i denna vy.

Skaparen kan, med vanlig skrivrätt till ett öppet ärende, kryssa i **Utförd**.
En separat dialog kräver ett aktivt Ja/Nej-val på **Har åtgärd lett till önskad
effekt?** och text i **Vad har hänt?** (högst 4000 tecken). Avbryt sparar inget.
Svaren sparas först och genomförandet bekräftas därefter. Kortet behåller
åtgärdens original, planering och beslut och visar sedan Utförd, önskad effekt
och vad som hänt. En sparad uppföljning kan inte ändras i detta flöde. Äldre
planerade åtgärder som redan har ett genomförandedatum men saknar svar kan följas
upp; datumet bevaras.

Drakens `PATCH .../measures/:measureId/follow-up` tar endast
`desiredEffectAchieved: boolean` och `followUpDescription: string`.
`SupportMeasureService` kontrollerar skapare, ärendestatus, planering, beslut
och åtgärdens `If-Match`. Den använder **befintliga resurser i SM 16.1**:

1. Svaren, åtgärds-ID/version, genomförandetid samt registrerande användare/tid
   sparas som JSON-parametern `measure-follow-up-<measureId>` genom
   `SupportJsonParameterService`. Dokumentet skapas en gång med tjänstens
   create-only-villkor; sparade svar skrivs aldrig över.
2. Åtgärdens vanliga `PATCH .../measures/:measureId` får endast `executed`
   och åtgärdens versionsvillkor. Innehåll, planering och beslut bevaras.
3. Läsningen sammanför åtgärden med dokumentet i Drakens `SupportMeasure.followUp`.
   Fälten är inte tillägg till SM:s genererade Measure-kontrakt.

Ett Nej är ett sparat svar, inte ett saknat värde. Om dokumentet sparats men
åtgärdsskrivningen misslyckas visas status `pending` och **Slutför sparandet**.
Svaren är då låsta och återförsöket använder åtgärdens omlästa version. Förlorade
svar efter lyckade skrivningar hanteras genom omläsning och identiska återförsök.
Ett avvikande genomförandedatum ger `conflict` och kräver utredning av
administratör; dokumentet raderas inte. Två resurser innebär att sparandet inte
är en gemensam databastransaktion. Ett avbrott kan lämna svar att slutföra.

Den aktiva fliken läser om när den öppnas och när fönstret återfår fokus.
Sparfel behåller dialogens svar och läser om åtgärden. Flikarnas osparade
ändringar registreras separat i den gemensamma varningen. Ändras föräldraärendets
version flera steg behålls formulärets gamla version för att skydda mot
överskrivning av samtidiga ändringar; ärendet kan behöva laddas om före nästa
ändring i det övergripande formuläret.

**Införande:** registrera `backend/src/schemas/measure-follow-up.schema-request.json`
via JsonSchema `POST /2281/schemas` före användning. Namnet är `measure-follow-up`,
version `1.0`, ID `2281_measure-follow-up_1.0`. BFF skapar inte scheman automatiskt. Schemat registrerades och verifierades i
`api-i-test.sundsvall.se` den 11 september 2026.
API:ts vanliga läs-/skrivrättigheter för JSON-parametern gäller; nekad åtkomst
visas som fel. Inget nytt SM-endpoint, ingen migration och ingen driftsättning av
den tidigare förberedda API-worktreen `api-service-support-management-follow-up`
behövs. Vid återställning av Draken behålls schema och sparade JSON-parametrar.

`support-measure-follow-up.service.test.ts` testar båda befintliga resurserna
med riktig schemavalidering, Nej, bevarade original, avbrott före/efter skrivning,
identiska återförsök, versionskonflikter och saknat schema. Service- och HTTP-tester
skyddar det smala kontraktet och behörigheterna. Komponenttesterna täcker urval,
obligatoriska svar, avbryt, Ja/Nej, omläsning och slutförande av sparade svar.

## Beslut om förslag

Användaren behöver vanlig skrivbehörighet till ett öppet ärende och medlemskap
som ger en aktiv namespace-roll med `decides: true`. Enhetschef är konfigurerad
så. Admin omfattas genom samma AD-gruppmappning. Backend kontrollerar sessionens
grupper på nytt vid varje beslut; det räcker inte att en beslutande roll finns
i metadata. Beslut är oberoende av rollvalet i formuläret för en ny åtgärd och
begränsas inte till chefens egna åtgärdstyper eller egna förslag.

På ett obeslutat förslag visas **Bedöm förslag**. Dialogen visar originalet och
kräver ett uttryckligt beslut:

| Val            | API-värde i `accept` | Kommentar    | Följd                                            |
| -------------- | -------------------- | ------------ | ------------------------------------------------ |
| Godkänn        | `TRUE`               | Valfri       | Förslaget får genomföras i sin helhet.           |
| Avslå          | `FALSE`              | Obligatorisk | Förslaget ska inte genomföras.                   |
| Godkänn delvis | `REWORK`             | Obligatorisk | Angivna delar får genomföras enligt kommentaren. |

För delvis godkännande ska kommentaren ange vad som godkänns och ska göras,
vilka delar som utgår och varför. `REWORK` är ett fattat beslut, inte en begäran
om ett omarbetat förslag. `reworkGoal` och `reworkDescription` används därför
inte i detta flöde. Kommentaren sparas i `acceptMotivation`, visas på kortet och
vid redigering och ingår i fritextsökningen.

Drakens `PATCH /supporterrands/:municipalityId/:errandId/measures/:measureId/decision`
tar endast `accept` och `acceptMotivation`. Den använder åtgärdens `If-Match`
och skickar bara dessa två fält till den befintliga skyddade measure-resursen i
Support Management. Skapare, registreringsroll, typ, beskrivning och mål bevaras.

Ett beslut eller en redan genomförd åtgärd kan inte bedömas igen i detta flöde.
Efter beslut låses typ, beskrivning och mål även i backend. Skaparen kan fortsatt
redigera ansvarig och planering och rapportera genomförande efter `TRUE` eller
`REWORK`. Beslutsbehörighet ger ingen rätt att skriva om någon annans förslag.
Ett ändrat innehåll behöver ett nytt förslag. Någon funktion för omprövning eller
beslutshistorik införs inte här.

Vid valideringsfel eller versionskonflikt behålls beslut och kommentar i dialogen.
Felrutan får fokus och länkar till berörda fält. Vid konflikt behöver användaren
stänga dialogen och läsa om åtgärden innan ett nytt försök. En bekräftad skrivning
stänger dialogen före omläsning, så ett läsfel inte återanvänder det sparade utkastet.

**Begränsning i API-kontraktet:** åtgärden saknar separata fält för beslutsfattare
och beslutstid (`decidedBy`/`decidedAt`). Draken hittar inte på dessa och ändrar
inte `addedByUser` eller `addedByRole` när chefen beslutar. De fälten avser alltid
registreringen. Beslutsutfall kan summeras från `accept`, men statistik över
vem som beslutade och när kräver stöd i API:t. API:t behöver också äga samma
validering om andra konsumenter ska kunna skriva åtgärder med likvärdiga garantier.

Ändringen använder befintligt `accept`, `acceptMotivation` och versionsstöd;
ingen ny feature-flagga eller API-tabell krävs för detta beslutsflöde. Vid
återställning av Draken bevaras sparade beslut i API:t. Kontrollera att den
återställda versionen tolkar `REWORK` som delvis godkänd och skyddar beslutat
innehåll; en äldre klient med annan tolkning är inte en säker återställning.

## Fasbyte till beslut

Vid byte till fasen med namnet `DECISION` (`isDecisionPhase` i
`support-phase-service.ts`) läser fasväxlaren ärendets åtgärder på nytt i
klickögonblicket. Saknas åtgärder frågar Draken först om användaren verkligen
vill gå till beslutsfasen utan åtgärder; Nej lämnar fasen orörd. Kan åtgärderna
inte läsas ändras fasen inte heller, och ett fel visas. Kontrollen görs bara när
`useMeasures` är på; utan åtgärdsfliken finns inget att fråga om. Fasnamnet
matchas exakt mot metadatans `name`, aldrig mot visningsnamnet, så ett namespace
utan en sådan fas berörs inte.

## Verifiering och införande

Testkällor täcker explicit gruppmatchning, delade typer, dynamiska metadataändringar,
tomma urval, sparande, historik, datum, versioner och rollbyte. Beslutstesterna
omfattar rollbehörighet, obligatorisk kommentar, bevarat original, delvis
godkännande, genomförande, konflikter och HTTP-svar efter sparande. De körs inte på
användarens begäran. App, bygge och typkontroll har inte heller körts.
Manuell kontroll återstår för formulär, tangentbord, skärmläsare och zoom.

API-läsningen den 9 september 2026 visade åtta aktiva typer i båda namespace
`2281/HEALTHCAREDEVIATIONIAF` och `2281/HEALTHCAREDEVIATIONVOF`, fördelade på fyra
för Enhetschef och sju vardera för de två utredarrollerna. Detta är en observation,
inte ett fast krav eller en lokal typkatalog.

Inför kodändringen tillsammans med den nya backendkonfigurationen. Gamla
`measureGroup: string`-svar stöds inte. Vid återställning måste klientkontrakt,
backendkonfiguration och API-version hållas samordnade; återställ inte bara
klientens gamla typfält mot API:ts nya svar.

## Handlingsplan

Knappen **Skapa handlingsplan** på fliken Åtgärder samlar ärendets samtliga sparade åtgärder i en
PDF och lägger den som bilaga på ärendet. Planen byggs av BFF:en
(`POST /supporterrands/:municipalityId/:errandId/measures/action-plan`,
`support-measure-action-plan.controller.ts`) ur det Support Management håller i anropsögonblicket:
åtgärderna, typ- och rollnamn ur namespace-metadatan och visningsnamn ur handläggarkatalogen.
Listan i webbläsaren skickas aldrig med. Renderingen går via Templating `render/direct/pdf` med
mallen i `backend/src/services/measure-action-plan.template.ts`, genom samma
render-och-bifoga-steg som utredningsrapporten (`support-pdf-attachment.service.ts`).

- Ordning, status (Planerad, Genomförd, Ej tidsatt) och beslutsetiketter (Förslag, Godkänd,
  Avslagen, Delvis godkänd) är desamma som i fliken; `measure-action-plan.service.ts` speglar
  `measure-decision.ts` och listans tidsangivelser. Datum visas i svensk lokal tid.
- Alla åtgärder tas med oavsett beslut och genomförande. Beslut och beslutskommentar redovisas
  per åtgärd; avslagna förslag är alltså med, märkta som avslagna.
- Filnamnet är `Handlingsplan_<ärendenummer>_<n>.pdf`. Löpnumret läses ur bilagorna som redan
  finns på ärendet (högsta befintliga nummer plus ett); ingen separat räknare lagras.
- Knappen visas bara med skrivbehörighet på ett öppet ärende och är inaktiv utan åtgärder.
  Backend följer samma statusregel som övriga åtgärdsskrivningar och svarar 409 utan åtgärder.
- Uppföljningsfliken visar samma lista men erbjuder ingen handlingsplan.
- Visningsnamn slås upp i samma handläggarkatalog som fliken (`/users/admins`). Kan katalogen
  inte läsas visas kontonamnet; planen skapas ändå.

Efter en skapad plan läses ärendets bilagor om så att fliken Bilagor visar den direkt.
`measure-action-plan-button.test.tsx` täcker knappens tillstånd och felmeddelanden;
`support-measures.spec.ts` täcker flödet i webbläsaren och `support-measure-action-plan.controller.test.ts`
BFF:ens läsning, rendering, bifogning och avvisningar.
