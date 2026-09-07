# Utredningens gemensamma kontrakt

Drakens `application.ts` kopplar in en bestämd implementation med
`configureInvestigation(implementation)`, eller uttryckligen `null`. IAF och VOF använder
`src/avvikelse/`; AOT använder sin egen platshållare. `useInvestigation` styr endast på/av.

| Fil | Ansvar |
| --- | --- |
| `investigation-module.ts` | Typat kontrakt, synlighet och fel när flaggan är på men implementation saknas. |
| `configured-investigation.ts` | Håller den implementation applikationen har kopplat in. Ingen lista eller flaggstyrd variantresolver. |
| `classification-placement.ts` | Kontrakt för var kategorisering redigeras och vilket labelträd som används. |
| `investigation-classification-ownership.ts` | Delad kod frågar den inkopplade implementationen om klassificeringens placering. |

Implementationens `renderTab` och `resolveClassificationPlacement` är obligatoriska.
`renderNotice` och `renderCategorizationControl` är valfria. Egen label-vokabulär kräver en
kontroll som kan redigera den. SM:s flikram hanterar navigering och osparade ändringar.

Den generella JSON-renderaren och transporten är fortsatt återanvändbara. Avvikelse äger
konkreta dokument, JSON-scheman, klassificeringsregler och användarflöden. Gemensam SM-kod
importerar aldrig Avvikelse; detta kontrolleras av importregler och byggtester.

Runtimeprofil, hämtning och store ligger i `../application/`. Profilen stödjer även registrering
och filter för drakar som saknar utredning. Det finns ingen parallell utredningsprofil.

Backend avgör om dokument får ändras: flaggans tillstånd, profil, behörighet, schema och
versionskonflikt kontrolleras på serversidan. Att gömma en flik är i sig inget skrivskydd.

Befintliga miljöer behöver [migrera de gamla variantflaggorna](../../../../docs/operations/investigation-flags.md)
innan denna kod tas i drift. Ändringen uppdaterar varken Adminpanel eller GitHub-inställningar.
