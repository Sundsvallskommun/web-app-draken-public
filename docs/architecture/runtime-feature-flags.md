# Funktionsflaggor vid omstruktureringen

Granskad 2026-09-07 mot användarens Adminpanel-lista: 55 rader, 32 olika namn och sex
applikationer. Jämförelsepunkt före strukturarbetet är `a9847cd4`; den är ett kodunderlag,
inte ett verifierat besked om vilken version som körs i produktion. Listan innehåller inte
rad-ID:n, miljöinställningar eller värdefältet för `reopenSupportErrandLimit`.

## Vad bevaras?

Alla **31 kvarvarande booleska flaggor** behåller namn och `NEXT_PUBLIC_*`-koppling från
jämförelseversionen. Endast `useAvvikelseInvestigation` och `useAotInvestigation` tas bort ur
funktionskontraktet. Av listans namn är 27 sådana kvarvarande funktionsflaggor. Deras
befintliga läspunkter finns kvar; utredningens implementation väljs nu av applikationskoden.
Övriga flaggors användningsrader är oförändrade, även där ägande filer har flyttats.

Därtill finns värdeinställningen `reopenSupportErrandLimit`. Fyra ytterligare flaggnamn finns i
konfigurationskontraktet men inte i listan: `useThreeLevelCategorization`, `useEmployeeSearchOnly`,
`useMultipleContactChannels` och `useClosedAsDefaultResolution`. De behålls också.
`useMultipleContactChannels` saknar dock konsument i både jämförelseversionen och dagens kod;
ett konfigurationsfält är inte i sig ett bevis på att en funktion använder det.

`appConfig` äger frontendens befintliga funktionskontrakt. Backendens `FeatureFlagService`
avgränsar Adminpanel-svaret till aktuell applikation och namespace. Det införs ingen andra
produktionskatalog av funktionsflaggor i `dragons.json`.

## Avstämning av hela listan

| Namn | Applikationer i listan | Faktisk användning på branchen och övergång |
| --- | --- | --- |
| `isCaseData` | MEX, PT | Domänen bestäms av bygget. Gamla Adminpanel-rader ignoreras. CaseData-funktionerna finns kvar. |
| `isSupportManagement` | IAF, KC, ROB, VOF | Domänen bestäms av bygget. Gamla Adminpanel-rader ignoreras. SM-funktionerna finns kvar. |
| `reopenSupportErrandLimit` | KC | Behålls som antal dagar för återöppningsknappen. Aktiv rad använder värdefältet; annars används befintlig standard på 30 dagar. |
| `useAppeal` | PT | Behålls; överklagande i CaseData. |
| `useAvvikelseInvestigation` | IAF, VOF | Avvecklas vid samordnat införande. Båda huvudflaggorna är aktiva i listan och förblir aktiva efter migrering. |
| `useBilling` | MEX | Behålls; fakturering i CaseData och SM. Attestering i SM kräver även rätt vy och behörighet. |
| `useBusinessCase` | KC | Behålls; företagsärende i SM. |
| `useClosingMessageCheckbox` | KC | Behålls; kryssruta för avslutsmeddelande. |
| `useContracts` | MEX | Behålls; avtal/fakturarelaterat stöd för tillämpliga CaseData-ärendetyper. |
| `useDepartmentEscalation` | KC, MEX | Befintlig kod styr avdelningsalternativ i SM. MEX-raden har ingen motsvarande CaseData-konsument. |
| `useDetailsTab` | KC, ROB, VOF | Behålls; fliken Ärendeuppgifter i SM. KC:s inaktiva värde bevaras. |
| `useEmailContactChannel` | KC | Behålls; e-post i SM:s meddelandeformulär. |
| `useEmployeeSearch` | ROB | Behålls; personalsökning i SM:s kontaktflöde. |
| `useErrandExport` | MEX, PT | Saknar stöd både före och efter omstruktureringen. Befintlig export finns kvar, men denna rad styr den inte. Kräver ett separat beslut om flaggstyrning eller avveckling av den oanvända raden. |
| `useEscalation` | KC, MEX | Befintlig kod styr överlämningsknappen i SM. MEX-raden har ingen motsvarande CaseData-konsument. |
| `useExplanationOfTheCause` | KC | Behålls; orsaksförklaring i SM:s grundinformation. |
| `useExtraInformationStakeholders` | MEX | Behålls; extra intressentuppgifter i CaseData. |
| `useFacilities` | KC, MEX | Behålls; fastighet/anläggning i båda domänerna och tillhörande CaseData-sparning. Beskrivningen i Adminpanel nämner bara CaseData. |
| `useHandover` | KC | Behålls; SM:s handover-resurs. Samverkar med överlämnings- och avdelningsvalen. |
| `useInvestigation` | IAF, VOF | Behålls som enda utredningsflagga. Drakens kod väljer implementation. |
| `useMyPages` | KC, MEX, PT | Behålls; Mina sidor i kontakter och meddelanden. |
| `useOrganizationStakeholders` | KC, MEX | Behålls; organisationskontakter och relevant filtrering. Miljövariabeln har befintligt namn `NEXT_PUBLIC_USE_ORGANIZATION_STAKEHOLDER`, i singular. |
| `useReasonForContact` | KC | Behålls; kontaktorsak i SM. |
| `useRecruitment` | ROB | Behålls; rekryteringsfliken i SM. |
| `useRelations` | KC, MEX, PT, ROB | Behålls; ärenderelationer i båda domänerna. |
| `useRequireContactChannel` | MEX | Behålls; krav på kontaktväg i CaseData-formulär. |
| `useRolesForStakeholders` | KC, ROB | Behålls; roller i SM:s kontaktformulär. |
| `useServices` | KC | Behålls; Beslut och dokument samt kontaktens tjänster. Fliken kräver också en huvudintressent. |
| `useSmsContactChannel` | KC, ROB | Behålls; SMS i SM:s meddelandeformulär. |
| `useStakeholderRelations` | KC, ROB | Behålls; hämtning och visning av intressentbaserade ärendekopplingar. |
| `useTwoLevelCategorization` | KC, ROB | Behålls; tvånivåkategorisering i SM:s formulär och filter. |
| `useUiPhases` | MEX, PT | Behålls; process-/fasgränssnitt. Den delade koden har också SM-användning. |

## Avgränsning av utredning

`useInvestigation` avser **SupportManagements valbara utredningsfunktion**. IAF/VOF använder
Avvikelse, AOT sin implementation. CaseDatas befintliga flöden är separata; exempelvis visas
PT:s Utredningsflik i de tillåtna ärendefaserna utan att läsa denna flagga. Att MEX/PT saknar en
SM-implementation innebär inte att CaseData-funktioner har tagits bort. Lägg inte till SM:s flagga
för att försöka styra CaseDatas utredning.

## Flaggkälla och uppdatering

Befintliga regler för frontend bevaras:

- Miljöinställningarna är startvärden.
- Ett **icke-tomt** Adminpanel-svar ersätter hela uppsättningen. Saknade booleska flaggor
  blir `false`; svaret är inte en lista av enstaka överstyrningar ovanpå miljön.
- Ett tomt svar ändrar ingenting. Vid första hämtningen innebär det miljövärden; efter ett
  tidigare runtime-svar innebär det att dess aktuella värden ligger kvar.
- Vid vanligt hämtningsfel behåller frontend aktuella värden. Gamla variantflaggor ger däremot
  ett uttryckligt migreringsfel, även om de är avstängda.
- Frontend har ingen liveprenumeration på Adminpanel. Ladda om för att säkert hämta nya värden.
  Backend kan använda en färsk cache i upp till 30 sekunder.

Detta är en förvaltningspunkt: en ny Adminpanel-rad får inte införas under antagandet att alla
utelämnade funktioner fortsätter använda miljön. Dokumentera hela den avsedda uppsättningen
per applikation/namespace och testa den innan införande.

Funktionsflaggor styr tillgänglig funktion och användargränssnitt. De flesta flaggor i listan är
inte backendspärrar. Behörigheter för ärendedata måste kontrolleras av server/API. Utredningens
skyddade skrivningar använder därutöver backendens färska `useInvestigation`-besked; en dold
export- eller faktureringsknapp är i sig ingen behörighetskontroll.

## Vad återstår före införande?

1. **Samordna gamla och nya utredningsflaggor.** Använd [migreringsrutinen](../operations/investigation-flags.md).
   Två aktiva `useAvvikelseInvestigation`-rader tas bort i den inskickade listan; huvudflaggorna
   och alla övriga rader bevaras. Miljöinställningarna måste granskas separat eftersom de saknas i underlaget.
2. **Besluta om oanvända rader och rätta beskrivningar.** `useErrandExport` saknar effekt,
   överlämningsflaggorna för MEX används bara i SM, och beskrivningen för `useFacilities` är ofullständig.
   Koppla inte in nytt beteende eller radera rader som en dold bieffekt av omstruktureringen.
3. **Komplettera underlaget för övriga drakar och värdeinställningar.** Listan omfattar sex av
   fjorton drakar och saknar exempelvis KC:s faktiska återöppningsvärde samt all miljökonfiguration.
4. **Verifiera målmiljön.** Kör de avsedda på/av-kombinationerna, behörigheter och faktiska API-flöden.
   Godkända lokala tester ersätter inte kontroll av verksamhetens fullständiga konfiguration.

Återöppningsgränsen är idag en frontendkontroll och värdet läses som text/`parseInt`.
Det finns ingen strikt numerisk validering i `appConfig`. Om gränsen ska vara en bindande
verksamhetsregel behövs validering och en serverkontroll hos den ansvariga ägaren.
Det är ett äldre förbättringsbehov, inte ett borttaget skydd i denna omstrukturering.

## Testskydd och granskningens gräns

`frontend/src/config/appconfig-compatibility.test.ts` testar samtliga 31 kvarvarande flaggors
miljökoppling och på/av-beteende, den inskickade konfigurationen för alla sex applikationer samt
återöppningsvärdets befintliga standardbeteende. Testunderlaget är en daterad kopia av listans
namn/scope/status, utan påhittade värden eller produktions-ID:n.

`scripts/migrate-investigation-flags.test.mjs` migrerar hela den inskickade listan och kräver
att endast de två gamla variant-raderna försvinner. Befintliga tester kontrollerar också att
andra applikationer/namespaces hålls åtskilda och att en avstängd utredning förblir avstängd.

Kodinventeringen och kontraktstesterna visar att flaggarnas stöd bevaras. De är inte ett bevis
för att varje kombination av flaggor, behörigheter, ärendestatusar och externa API:er har
provats i webbläsare. Dessa kombinationer ska väljas utifrån verksamhetens faktiska flöden.
