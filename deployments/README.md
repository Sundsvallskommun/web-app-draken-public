# Granskade drakleveranser

En releasefil väljer ett frontend/backend-par med samma fullständiga Git-commit och två
image-digests. Filen äger också deploymentens miljöinställningar, portar, befintliga datavolym
och referenser till hemligheter. `scripts/dragon-deployment.cjs` validerar samma kontrakt i
leveransverktyget, båda containrarna och backendens serverstart. `dragons.json` äger identitet,
domän. Applikationskoden väljer utredningsimplementation.

Releasevalidering och backendstart återanvänder samma obligatoriska fält och domänkrav genom
`backendEnvironmentIssues` i `scripts/dragon-deployment.cjs`. Verktyget kontrollerar
hemlighetsreferensernas närvaro; deras verkliga värden läses först vid start. Felmeddelanden
anger fältnamn utan att återge värden. Valfria frontendvärden har en gemensam definition i
`frontend-environment-defaults.json`, som även frontendkoden använder. Saknad konfiguration
får därmed ett avsiktligt standardvärde eller ett startfel, aldrig kvarvarande platshållartext.

`example-iaf-test.json` är en granskningsmall med avsiktliga exempeladresser och digests.
Ersätt dem med verifierade värden och granska ändringen innan den används. Mallen bekräftar
inte kommunens faktiska driftkonfiguration. Verkliga releasefiler ska versionsstyras i
driftteamets repo; lägg aldrig hemlighetsvärden i dem.

```sh
node scripts/dragon-release.mjs validate deployments/iaf-test.json
# Hämta de två angivna images genom er vanliga registry-inloggning.
node scripts/dragon-release.mjs verify-images deployments/iaf-test.json
node scripts/dragon-release.mjs compose deployments/iaf-test.json /secure/draken-secrets > /tmp/iaf-test.compose.json
docker compose -f /tmp/iaf-test.compose.json up -d
```

`compose` skriver enbart JSON på stdout; använd `node` direkt vid omdirigering så Yarn inte
lägger sin kommandoutskrift i filen. Ange den genererade filen direkt med `-f` så dess
projektnamn (`draken-<drake>-<miljö>`) används. Compose `include` ärver inte projektnamnet.
Överstyr inte namnet med ett gemensamt `-p` eller `COMPOSE_PROJECT_NAME` för flera drakar.
De äldre manuella Compose-filerna är borttagna; manifestet äger nu tjänster, portar och volym.

## Hemligheter och konfiguration

Referensen `iaf/test/client-secret` betyder filen
`/secure/draken-secrets/iaf/test/client-secret` hos den som startar Compose. Bara referenserna
som vald tjänst behöver monteras, var och en skrivskyddad. Filerna måste vara läsbara av imagenens
runtime-UID 1001. Hemlighetsvärden hamnar aldrig i den genererade Compose-filen.

I Kubernetes/Tekton monteras motsvarande filer under `/run/draken-secrets/iaf/test/`;
releasefilen monteras på `/app/deployment.json` och `DRAKEN_DEPLOYMENT_FILE=/app/deployment.json`
anges. Hemlighetsreferenser måste tillhöra rätt drake och test/production-miljö. Redis-lösenord
och OAuth-/SAML-/sessionshemligheter stöds som referenser och förbjuds i vanlig environment.
Använd versionsbeständiga referenser när en rotation ska kunna återställas med releasefilen.

Omgivande miljövariabler får inte motsäga releasefilen. Applikationsinställningar som inte
deklarerats avvisas också. Domänflaggor, drakidentitet, containerport, NODE_ENV och deployment-id
härleds; de ska inte kopieras manuellt. Produktionsbackend laddar aldrig utvecklingsfiler.
För felsökning av en enskild produktionsbackend anger man samma `DRAKEN_DEPLOYMENT_FILE` och
vid behov `DRAKEN_SECRET_DIRECTORY` innan `yarn dragon start IAF backend` (ledig port 3000).
Starta paret genom Compose; då får tjänsterna separata containrar och rätt hostportar.

Frontend och backend lyssnar på 3000 inne i sina containrar. Releasefilens två `port`-fält
väljer skilda hostportar och publiceras på 127.0.0.1 för en avsedd reverse proxy. Flera drakar
kan köras på samma host med olika portar. Kubernetes använder sina vanliga Service-/Ingressresurser.

## Loggning vid manuell drift

Sätt backendens `LOG_RETENTION_DAYS` i releasefilens `backend.environment` till verksamhetens
beslutade positiva heltal. Värdet granskas tillsammans med releasen och får inte överstyras
vid start. Det väljer tidsbaserad rotation av backendens egna filer; det bestämmer inte
lagringstid i proxy, containerplattform eller central loggsamlare. Utan ett angivet värde
behålls tidigare rotation med 30 filer per transport. Antal filer är inte antal dagar, och
gamla loggar utanför rotatorns aktuella register måste hanteras separat.

Nya loggkataloger/filer får begränsade filbehörigheter. Inventera befintliga kataloger, arkiv,
volymer och läsbehörigheter innan övergången; de ändras inte retroaktivt av applikationen.
Generella biblioteksflaggor `DEBUG`, `NODE_DEBUG` och `NODE_DEBUG_NATIVE` avvisas. Felsök med
request-id, status och fasta operationsnamn enligt [driftrutinen](../docs/operations/logging.md).

## Återställning och befintliga volymer

`dataVolume` måste vara namnet på den befintliga, avsedda backendvolymen. Den monteras som
extern volym på `/app/backend/data`; Compose avvisar en saknad volym i stället för att skapa en
tom ersättare. Bekräfta volymnamnet vid första övergången. En helt ny drake behöver en uttrycklig
volymprovisionering. Återställ genom att välja den tidigare granskade releasefilen, verifiera
dess två digests och starta dess Compose/deployment igen. Bevara även de tidigare secret-versionerna.

## Extern leveranspipeline

1. Checka ut den granskade committen och bygg båda Dockerfiles från samma checkout i reporoten.
   Skicka vald drake och checkoutens fullständiga SHA som Docker build-argument enligt exemplet nedan;
   det räcker inte att exportera dem som miljövariabler i skalet.
2. Publicera båda images och hämta deras registry-digests. Uppdatera releasefilens imagepar och
   revision tillsammans; ändrad konfiguration eller secret-referens får en ny configurationVersion.
3. Granska releasefilen och kör `validate`, `verify-images` och containerstartprovet. Verifieringen
   kontrollerar att varje digest faktiskt avser rätt drake, tjänst och byggcommit genom image-metadata.
4. Montera releasefilen och de valda secret-referenserna, och leverera de två angivna digests.
   Kör målmiljöns autentiserade integrationstest mot SAML och avsedda API-prenumerationer.

Exempel för IAF (ersätt SHA och imagenamn med er valda release):

```sh
docker build -f frontend/Dockerfile --build-arg DRAKEN_BUILD_DRAGON=IAF --build-arg DEPLOY_COMMIT=FULL_COMMIT_SHA -t draken-frontend:iaf .
docker build -f backend/Dockerfile --build-arg DRAKEN_BUILD_DRAGON=IAF --build-arg DEPLOY_COMMIT=FULL_COMMIT_SHA -t draken-backend:iaf .
```

Vid första övergången från en backend utan releasekontroll: inför och verifiera kontrollen på
samtliga backendinstanser innan den nya frontendversionen får trafik. Gamla flikar kommer då
att nekas tills frontend är uppdaterad och sidan laddas om. En samtidig rullning som fortfarande
kan skicka ny frontend till en gammal backend ger ingen sådan garanti. Planera därför första
övergången som ett samordnat trafikbyte eller ett kort underhållsfönster. Senare leveranser har
kontrollen på båda sidor; ett oförenligt par stoppar anropet i stället för att utföra skrivningen.

Lokalt och i CI kan paketeringen provas utan verkliga konton:

```sh
node scripts/dragon-container-smoke.mjs IAF draken-frontend:iaf draken-backend:iaf FULL_COMMIT_SHA
```

Provet använder syntetiska hemligheter, egen tillfällig volym och isolerade containrar. Det
kontrollerar båda tjänsternas start, frontendassets, rot/prefix och avvisade deploymentvärden,
och städar sina egna resurser. Det ersätter inte autentiserad integration i målmiljön.

## Utredningsflagga

Ange `NEXT_PUBLIC_USE_INVESTIGATION` en gång i `frontend.environment`. Backend får samma värde
från manifestet. Med Adminpanel styr `useInvestigation` den aktiva funktionen; skyddade
skrivningar använder backendens färska flaggbesked. Variantval ingår inte i manifestet.

Befintliga installationer måste först få ett granskat [migreringsförslag](../docs/operations/investigation-flags.md).
Gamla variantflaggor avvisas även när deras värde är `false`.
