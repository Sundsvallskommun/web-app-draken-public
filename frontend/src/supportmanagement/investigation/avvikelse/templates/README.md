# Utredningsmallar för enhetschefens utredningstext

Den här katalogen är den kanoniska källan för texterna som fyller i Utredningstext när enhetschefen väljer en
Utredningsmall i `utredning-enhetschef`. Texterna läses från Templating-API:t vid körning; filerna här är vad som
publiceras dit, så att innehållet kan granskas och versioneras i repot.

| Mallval (`investigationTemplate`) | Identifierare i Templating-API:t      | Innehåll                                  |
| --------------------------------- | ------------------------------------- | ----------------------------------------- |
| `sol_lss`                         | `avvikelse.investigation.sol-lss`     | `avvikelse.investigation.sol-lss.html`     |
| `sol_lss_hsl`                     | `avvikelse.investigation.sol-lss-hsl` | `avvikelse.investigation.sol-lss-hsl.html` |
| `hsl`                             | -                                     | Ingen mall ännu; valet fyller inte i något |

`investigation-text-templates.json` håller namn, beskrivning och metadata för varje mall. Innehållet är HTML-filen
utan omgivande blanktecken, Base64-kodad i `content`.

## Hur mallen används

Identifieraren härleds ur mallvalet enligt repots konvention `{app}.{typ}.{variant}`, med bindestreck i stället för
understreck eftersom identifierare inte får innehålla understreck. Formuläret hämtar alla mallar med prefixet
`avvikelse.investigation.` en gång per dokument, första gången ett mallval görs. Ett val utan lagrad mall fyller
inte i något, så en mall för `hsl` kan läggas till i Templating-API:t utan kodändring.

När mallvalet ändras, av handläggaren eller automatiskt när lagrummen bara tillåter en mall, fylls Utredningstext i:

- direkt, om texten är tom eller fortfarande är exakt vad en tidigare mall lade dit;
- efter en fråga, om någon har skrivit i texten. Svarar handläggaren nej står texten kvar och bara mallvalet ändras.

Ett befintligt dokument fylls aldrig i när det öppnas, bara när valet ändras. Ett nytt dokument vars mall redan är
vald när det öppnas startar med mallens text: för ett missförhållande låser Draken lagrummet till SoL och LSS, så
SOL/LSS-mallen är den enda och väljs innan handläggaren hunnit göra valet som fyller texten. Texten är då en del av
dokumentets start, som förifyllningen, och räknas inte som en osparad ändring.

Texten läses rå och renderas aldrig, så den får inte innehålla Pebble-syntax. Den får bara använda den markup som
editorn behåller: `h2`, `p`, `br`, `strong` och `em`. Rubrikerna är `h2` eftersom `h1` är rapportens titel i PDF:en.
Kontraktstestet `investigation-text-templates.contract.test.ts` håller fast båda reglerna och att varje mall svarar
mot ett mallval i schemat.

## Metadata

Metadatan följer de befintliga skeletten (`sbk.ft.investigation.skeleton`): `templateType=Investigation`,
`templateRole=skeleton` och `editor=richtexteditor`, plus `schemaName` och `investigationTemplate` som pekar ut
vilket val mallen hör till.

`namespace` måste finnas, en gång per namespace (`HEALTHCAREDEVIATIONIAF` och `HEALTHCAREDEVIATIONVOF`): BFF:ens
`GET /templates` frågar Templating-API:t med `?namespace=<SUPPORTMANAGEMENT_NAMESPACE>`, och API:t filtrerar på
den metadatan. En mall utan den syns inte i IAF eller VOF.

## Publicerat

Den 5 oktober 2026 publicerades version 1.0 av båda mallarna i testmiljöns Templating-API. Innehåll, namn och
metadata lästes tillbaka och var identiska med filerna, och båda hittas med prefixet för både IAF- och
VOF-namespacet. Inget har publicerats i produktionsmiljön.

En ändrad text publiceras som en ny version av samma identifierare (`POST /2281/templates`); formuläret använder
alltid den senaste versionen. Redan ifyllda utredningstexter påverkas inte.
