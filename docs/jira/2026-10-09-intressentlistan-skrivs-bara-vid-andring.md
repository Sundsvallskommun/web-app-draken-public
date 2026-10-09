# Spara ärende ska bara skriva intressentlistan när den ändrats

**Typ:** Teknisk skuld / robusthet
**Status:** Förslag (2026-10-09)
**Bakgrund:** granskning av PR #1222 (feature/DRAKEN-5121-personlig-lamplighet)

## Bakgrund

Support Management har ingen resurs för en enskild intressent. Enda sättet att ändra en intressent är att PATCH:a
ärendet med **hela** listan, och listan ersätts rakt av. Det gäller både Grundinformations formulär
(`updateSupportErrand` i `frontend/src/supportmanagement/services/support-errand-service.ts`) och BFF:ens
PBI-endpoints (`backend/src/controllers/supportmanagement/support-pbi.controller.ts`).

Formuläret bygger listan från sina egna fält vid varje **Spara ärende**, oavsett om handläggaren rört
intressenterna eller inte (`buildStakeholdersList` i `support-stakeholder-service.ts`). Allt som någon annan
skrivit på en intressent sedan formuläret senast lästes in skrivs då bort, utan fel och utan spår.

PR #1222 råkade ut för det två gånger: först tappades PBI-parametrarna (`PBI_SOURCE`, `PBI_ROLE`, `PBI_ASSESSMENT`,
`PBI_ASSESSMENT_COMMENT`) för att byggaren bara bar med sig nyckeln `PBI`, sedan tappades en sparad bedömning vid
nästa sparning för att formuläret aldrig lästes om efter att bedömningen skrivits. Byggaren bär nu med sig **alla**
parametrar utom de sju formuläret självt äger (`FORM_OWNED_STAKEHOLDER_PARAMETERS`).

Grenen refactor/DRAKEN-5121-personlig-lamplighet (plan: `docs/plans/2026-10-09-pbi-as-stakeholder-data.md`) tar bort
den andra skrivaren helt: PBI-markering, roll och bedömning är fält på intressenten i formuläret och sparas av Spara
ärende. Med den finns ingen annan skrivare av intressentdata i Draken, så dataförlusten kan inte uppstå i dag.

Grundproblemet står ändå kvar i princip: formuläret skriver en lista det inte ändrat. Nästa skrivare av
intressentdata (en kommande flik, en BFF-endpoint, ett annat system som ändrar intressenter medan ärendet är
öppet) hamnar i samma läge igen. Det här förslaget är därför mindre angeläget än när det skrevs, men inte
överflödigt.

## Förslag

Lämna `stakeholders` utanför PATCH:en i `updateSupportErrand` när varken `contacts` eller `customer` är dirty i
formuläret. Då skriver formuläret listan bara när handläggaren faktiskt ändrat den, och fönstret där formulärets
ögonblicksbild hinner bli gammal försvinner för alla andra skrivare.

Grovt:

1. `updateSupportErrand` tar emot vilka delar av formuläret som är dirty (eller ett `includeStakeholders`-argument)
   och utelämnar `stakeholders` ur PATCH-kroppen när inget av dem är det.
2. `SidebarInfo.onSubmit` skickar in `formState.dirtyFields.contacts` / `.customer`.
3. Samma regel för andra fält som andra skrivare äger, om sådana finns (`parameters` skrivs i dag från formuläret
   rakt av, kontrollera vilka som ägs av annan kod).

## Acceptanskriterier

- Spara ärende med en ändring som inte rör intressenterna skickar ingen `stakeholders`-nyckel i PATCH:en.
- Spara ärende med en ändrad kontakt skickar hela listan som i dag.
- En parameter som skrivits på en intressent av annan kod medan ärendet är öppet överlever en sparning av
  Grundinformation som inte rört intressenterna (sätt den via API:et eller en tillfällig knapp och kör scenariot).
- Befintliga tester i `support-stakeholder-service.test.ts` är kvar oförändrade.

## Utanför

- Att be API-teamet om en intressentresurs (`PATCH /errands/{id}/stakeholders/{stakeholderId}`), som CaseData har.
  Värt att fråga, men det här går att lösa i Draken utan.
- Övriga drakar: regeln är generell och gäller alla, men bara AoT har i dag en annan skrivare av intressentdata.

## Referenser

- PR #1222, commit `3453d990` (byggaren)
- `docs/plans/2026-10-09-pbi-as-stakeholder-data.md` (PBI som formulärtillstånd)
- `frontend/src/supportmanagement/services/support-stakeholder-service.ts` - `FORM_OWNED_STAKEHOLDER_PARAMETERS`
- `frontend/src/supportmanagement/components/support-errand/sidebar/sidebar-info.component.tsx` - `onSubmit`, `saveTheTabs`
