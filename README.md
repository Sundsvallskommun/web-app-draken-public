# Sundsvalls Kommun Draken

Draken består av applikationer för olika verksamheter. Varje drake har ett eget frontend- och
backendbygge och återanvänder SupportManagement eller CaseData. `yarn dragon list` visar det
aktuella inventariet; [dragons.json](dragons.json) äger identiteter och domän.

## Kom igång

Använd Node **22.18 eller senare** och Yarn Classic 1.22. CI kör Node 24. Kör från reporoten:

```sh
git clone git@github.com:Sundsvallskommun/web-app-draken-public.git
cd web-app-draken-public
yarn install --frozen-lockfile
yarn --cwd frontend install --frozen-lockfile
yarn --cwd backend install --frozen-lockfile
yarn dragon list
cp frontend/.env.kc-example frontend/.env.kc
cp backend/.env.kc.example.local backend/.env.kc.development.local
```

KC är ett exempel; byt `kc` mot vald drakes id i gemener. Fyll i tjänsternas lokala adresser,
API-credentials och SAML-inställningar. Använd olika `PORT` i frontendens och backendens env-fil.
Exemplen är mallar utan fungerande hemligheter. Starta därefter båda tjänsterna:

```sh
yarn dragon dev KC
```

[Utvecklingsguiden](docs/architecture/dragon-development.md) är den detaljerade källan för
kodägarskap, nya drakar, miljöprioritet, byggning, API-kontrakt och verifiering.

## Hitta rätt

| Jag ska … | Börja här |
| --- | --- |
| Ändra en drake eller lägga till en ny | [Ägare och onboarding](docs/architecture/dragon-development.md) |
| Avgöra vad som hör till basen, domänen eller appen | [Gränsen för delad och appspecifik logik](docs/architecture/dragon-development.md#gränsen-mellan-bas-domän-och-applikation) |
| Förstå en förbjuden import | [Importregler och kvarvarande skuld](docs/architecture/boundaries.md) |
| Ändra funktionsflaggor | [Flaggornas ägare och livscykel](docs/architecture/runtime-feature-flags.md) |
| Bygga, leverera eller återställa ett par | [Release-manifest, images och volymer](deployments/README.md) |
| Felsöka ett anrop | [Diagnostik och driftansvar](docs/operations/logging.md) |
| Förstå säkerhetsgränserna | [Session, releasekontroll och upstreambehörigheter](docs/architecture/dragon-security.md) |

## Verifiera och generera kontrakt

```sh
yarn verify                     # Typkontroll, strikt lint/importgränser, format och tester
yarn dragon build KC            # Vald frontend och backend
yarn knip                       # Separat inventering av oanvänd kod; innehåller kvarvarande skuld
```

Webbläsartester behöver en startad frontend för rätt drake. Se utvecklingsguiden för kommandon
och CI:s täckning. Knip ingår inte i `verify`: dess befintliga städfynd ska åtgärdas hos rätt ägare,
men får inte hindra att den ordinarie verifieringen genomförs.

API-namn och versioner finns i [backendens API-konfiguration](backend/src/config/api-config.ts).
Förnya backendens upstreamtyper med `yarn --cwd backend generate:datacontracts` (använder KC:s
lokala backendmiljö). Förnya frontendens backendtyper med
`yarn --cwd frontend generate:contracts:kc` mot en startad KC-backend med Swagger aktiverat.
Granska genererade ändringar tillsammans med ändringen av det ägande API-kontraktet.
