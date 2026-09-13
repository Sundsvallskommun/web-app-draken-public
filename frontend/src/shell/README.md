# Applikationens sammansättning

Shell läser identiteten och kopplar applikationens uttryckliga val till domänen och JSON-formulären.
Backend och uppströms tjänster äger auktorisering. Frontendens identitet eller flaggor ger aldrig
behörighet till ärendedata.

Bootstrap körs i varje separat Next.js-modulgraf: serverkomponenter, SSR av klientkomponenter
och webbläsaren. En processglobal flagga får inte användas för att hoppa över någon graf.
Rootlayouten importerar bootstrap och renderar DragonBootstrap; AppLayout använder samma
komponerade modul för formulärfält. ES-moduler gör initieringen en gång per graf.

Befintliga placeholderbyggen hoppar över komposition endast under Next.js produktionsbyggfas.
Vid runtime måste identiteten vara känd. Denna grund behåller nuvarande delade image och
runtimeval; den inför inte separata bundlar eller release-manifest.

Se [grunden och importgränserna](../../../../docs/architecture/boundaries.md).
