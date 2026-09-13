# Inför och verifiera mergekrav

Kanonisk regeldefinition: [draken-quality-ruleset.json](../../.github/draken-quality-ruleset.json).
Första målbranch är `develop`. Övriga branches läggs till uttryckligen när deras workflows
kan producera samma kontroller. Regeln kompletterar befintliga krav på SonarCloud, CodeQL,
signerade commits och granskning; dessa befintliga regler ska inte ersättas.

## Före aktivering

1. För in workflows, lint- och kontraktstester på `develop` i en granskad PR.
2. Låt CI köra på den aktuella `develop`-commiten. Alla åtta namn i regeldefinitionen ska
   vara avslutade med `success`, från GitHub Actions. Ett äldre grönt jobb eller en
   överhoppad kontroll räcker inte. Matrisernas slutjobb är de stabila mergekraven.
3. Kontrollera beredskapen från en checkout som innehåller detta införandesteg:

```sh
node scripts/quality-gates.mjs check
```

Kommandot läser GitHub med inloggad `gh`. Om workflowsen saknas eller något jobb inte har
lyckats visar det vilka krav som återstår. Inga GitHub-inställningar ändras av `check`.

## Aktivering och efterkontroll

När införandet är granskat och beredskapskontrollen går igenom:

```sh
node scripts/quality-gates.mjs activate
node scripts/quality-gates.mjs verify
```

`activate` upprepar beredskapskontrollen och skapar en separat regel med det granskade
innehållet. Det kräver administrationsrättigheter. Befintliga regler ändras inte. Finns
redan en regel med samma namn stoppas kommandot; granska den befintliga regeln och använd
`verify`, så att en eventuell manuell justering inte skrivs över.

`verify` läser de effektiva branchreglerna. Det kontrollerar obligatoriska statusnamn och
GitHub App, krav på uppdaterad branch samt kodägargranskning som upphävs av nya commits.
En JSON-fil eller en lyckad workflow ensam räcker alltså inte för grön verifiering.

Kontrollera också Settings → Rules → Rulesets efter ändringen. CODEOWNERS ska peka på
ett team med rätt att granska. Administratörer kan ändra regler; repoåtkomsten behöver
förvaltas även efter införandet.

## Återställning

Om en felaktigt införd regel blockerar leveranser, pausa enbart den nytillagda regeln
med namnet `Draken quality gates` i GitHub och åtgärda orsaken. Befintliga säkerhets- och
granskningsregler ska ligga kvar. Dokumentera orsaken och verifiera reglerna igen efter
återaktivering. Varken kod eller lagrade ärenden behöver migreras.
