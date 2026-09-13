# Arkitekturbeslut: gemensamt repo, en applikation per drake

Status: valt arkitekturmönster. Ersätter underlaget från 2026-09-04 och mellansteget med
byggfamiljer. Det historiska underlaget finns i Git-historiken. Denna text beskriver den
aktuella lösningen; [utvecklingsguiden](dragon-development.md) beskriver arbetsflödet.

## Problem och beslut

Fler drakar ska kunna tillkomma utan att kopiera ärendehantering, autentisering, UI eller
driftsverktyg. Samtidigt måste en verksamhetsändring kunna granskas hos sin ägare och inte
bli ett nytt identitetsvillkor i gemensam kod.

Vi behåller ett repo och de två befintliga paketen `frontend` och `backend`. Varje drake
har egna kompositionspunkter och bygg-/releasemål. Delade moduler har en implementation
och en ägare. Ett eget repo eller npm-paket per drake behövs inte för separat leverans.

| Lager | Kanonisk ägare och ansvar |
| --- | --- |
| Bas | Gemensam teknik: HTTP, autentiseringsmekanik, diagnostik, sessioner och generell presentation. |
| Integration | Avgränsad transport mot ett externt API, med dess datakontrakt. Importerar ingen intern domän. |
| Domän | `supportmanagement` respektive `casedata`; ärendeoperationer, tillstånd och domänkontrakt. |
| Verksamhet | Avvikelses sammanhängande flöde, dokument och regler; återanvänds av IAF och VOF. |
| Drake | `src/dragons/<id>/`; egna regler och ett explicit val av domänens policy och verksamhetsmodul. |
| Sammansättning | `shell` och frontendens routes; kopplar vald applikation till dess beroenden. |

Importer går från konsumenten till dess underliggande ägare. Domäner importerar inte
varandra, basen importerar inte domäner, och drakar importerar aldrig andra drakar.
Sammansättningen får känna till lagren men får inte användas som mellanled från domänkod.
Backendens domäntjänster, domänkonfiguration och domän-DTO:er ligger i sina domänmappar;
controllers har motsvarande domänindelning under `controllers/`.

## Hur variation uttrycks

Kontrakten ägs av den domän som behöver beteendet. En drake levererar en komplett
`SupportErrandPolicy`, antingen egen eller genom ett explicit val av en namngiven policy.
Kontakt Sundsvall är ett sådant val, aldrig skalets tysta standard. CaseData väljer `null`.
Status- och avslutskoder kommer från verksamhetens metadata; gemensamma enums beskriver
befintliga koder och begränsar inte vad en ny drake kan välja. Historiska avslutskoder
behåller sina etiketter även när de inte längre kan väljas vid avslut.

Ett större användarflöde uttrycks som verksamhetskod mot exempelvis `InvestigationModule`
och SM:s dokumentkontrakt. Liknande skärmbilder är inte skäl att blanda skilda regler.
Vi inför inga generella pluginregister eller profilobjekt med godtyckliga callbacks.

Identitet väljer applikation vid bygge. Capabilities kan aktivera funktioner inom den
applikationen men byter inte implementation. Behörighet kontrolleras på servern och i API:t.

## Leverans och kontroll

Varje drake byggs från sina egna entrypoints. Frontend och backend levereras som ett
versionsbundet par med ett gemensamt manifest. En image kan bara startas som den drake den
byggdes för. Gemensam kod ändras atomiskt i repot och provas mot sina konsumenter.

Frontendens dependency-cruiser kontrollerar även gemensam config, interfaces, utils och
stores. Tre äldre domänstores klassas efter sin faktiska ägare. Befintliga överträdelser
ligger i en baseline som bara får krympa. Backendens källgraf kontrolleras i lint och med
samma regler vid artefaktkontroll, inklusive typer och vidareexporter. Integrationskod
får inte vidareexportera interna domäntjänster.

Workflow-filer är inte i sig en merge-spärr. [Införandet av kvalitetskraven](../operations/quality-gates.md)
verifierar först jobb på målbranchen och sedan de effektiva reglerna i GitHub. Kraven ska
aktiveras på `develop` efter att workflowsen landat och lyckats där.

## Varför inte egna repos?

Egna repos med gemensamma paket kan också undvika kodkopiering. De tillför dock publicering,
versionsval, uppgraderings-PR:er och kompatibilitet mellan paketversioner. En ändring i ett
kontrakt och dess konsumenter behöver då samordnas mellan flera repon. Med samma tekniska
plattform och överlappande förvaltning ökar det arbetet utan att lösa otydligt ägarskap.

Ompröva repogränsen när det finns ett konkret behov av separata läsrättigheter, självständiga
team med långvarigt olika releasecykler eller en drake som lämnar den gemensamma plattformen.
Bryt då ut efter stabila kontrakt och publicera den gemensamma koden som ägda paket. Kopiera
inte koden och bygg inte en ny delningsmekanism enbart för ett tänkbart framtida behov.

Workspaces kan införas senare om paketberoenden och verktyg tjänar på det. De är ingen
förutsättning för detta ägarskap och löser inte i sig verksamhetskopplingar.

## Vad återstår innan grunden kan kallas fullt bevisad?

AOT:s utredningsimplementation är fortfarande en platshållare. Ett andra verkligt
verksamhetsflöde behöver provas mot domänkontrakten, med avtalade regler för visning,
sparande, behörighet och samtidiga ändringar. Syntetiska tester av nya koder bevisar
kontraktets utbyggbarhet; de bevisar inte AOT:s verksamhetsbehov.

Den äldre frontendbaselinen och kvarvarande identitetsvillkor ska avvecklas hos sina
ägare. Delade ändringar kräver fortsatt tester av berörda drakar. Ett gemensamt repo tar
inte bort deras beroenden; det gör beroendena synliga och möjliga att ändra tillsammans.
