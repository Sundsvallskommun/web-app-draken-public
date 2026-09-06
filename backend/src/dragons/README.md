# Backend per drake

`<id>/application.ts` äger drakens `DragonApplication`: identitet, controllers och eventuell
utredningsprofil. `<id>/server.ts` startar just denna applikation. CLI kompilerar endast dess
beroendegraf till `dist-<ID>/`; det finns ingen universell server-entrypoint.

IAF och VOF väljer samma Avvikelse-modul i `src/avvikelse/`, med respektive applikations profil.
Övriga drakar väljer återanvända controllerlistor utan att importera Avvikelse. Startup validerar
identiteten och konfigurerar profilen innan controllers instansieras.

Testinventariet `src/tests/helpers/dragon-applications.ts` är typat mot katalogens identiteter
och kontrollerar alla verkliga applikationer. Det ingår inte i produktionsartefakten.

Se [utvecklingsguiden](../../../docs/architecture/dragon-development.md).
