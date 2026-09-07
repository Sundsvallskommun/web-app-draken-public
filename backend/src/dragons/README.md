# Backend per drake

`<id>/application.ts` äger drakens `DragonApplication`: identitet, controllers och för SM en
uttrycklig applikationsprofil. `<id>/server.ts` startar just denna applikation. CLI kompilerar endast dess
beroendegraf till `dist-<ID>/`; det finns ingen universell server-entrypoint.

IAF och VOF väljer samma Avvikelse-modul i `src/avvikelse/`, med respektive applikations profil.
Övriga drakar väljer återanvända controllerlistor utan att importera Avvikelse. Startup validerar
identiteten och konfigurerar profilen innan controllers instansieras.

Varje SM-profil deklarerar registrering som `enabled` med avsedda standardvärden eller
`disabled`. Klassificering, etiketter och parametrar hör till draken eller dess verksamhetsmodul;
domänens service utför registreringen. En tom default är ett uttryckligt verksamhetsval.
CaseData använder sin domäns registrering och ska inte ange en SM-profil. Domänroller och
miljökrav följer `dragons.json`, så en ny identitet behöver inga PT/MEX-kontroller i delad kod.

Testinventariet `src/tests/helpers/dragon-applications.ts` är typat mot katalogens identiteter
och kontrollerar alla verkliga applikationer. Det ingår inte i produktionsartefakten.

Se [utvecklingsguiden](../../../docs/architecture/dragon-development.md).
