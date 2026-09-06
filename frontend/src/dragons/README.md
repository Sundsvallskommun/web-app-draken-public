# Drakar är applikationer

Varje mapp äger en drakes frontend-sammansättning:

- `application.ts` är bygg-entrypoint: exporterar `dragon`, `applicationUi` och `configureApplication`.
- `index.ts` och namngivna policyfiler innehåller drakens överstyrningar av domänägda kontrakt.
- Egen implementation, som AOT:s utredningsflik, ligger hos den draken.

IAF och VOF importerar samma `src/avvikelse/` och samma SM-vyer. KC importerar SM-vyerna utan
utredningsimplementation. Ingen drake importerar en annan drake.

Applikationens entrypoint får importera återanvändbar UI-sammansättning från `shell/ui/`.
Domäner och delad kod importerar aldrig drakar. Delade regler hör hemma hos sin domän eller
verksamhetsmodul; här väljs de, utan kopierade services eller `isKC()`-grenar.

Rotens `dragons.json` är inventariet för identitet, domän och tillåtna utredningar. Next väljer
en enda `application.ts` genom `@dragon` vid build. Den typade registreringen i
`shell/dragon-registry.test-fixture.ts` används endast i tester.

Backendens motsvarande ägare finns i `backend/src/dragons/<id>/`.
Se [utvecklingsguiden](../../../docs/architecture/dragon-development.md) för tillägg,
byggkommandon, kontrakt, tester och leverans.
