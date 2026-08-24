# Sundsvalls Kommun Draken

## APIer som används

Dessa APIer används i projektet, applikationsanvändaren i WSO2 måste prenumerera på dessa.

För MEX (Mark och exploatering):

| API                  | Version |
| -------------------- | ------: |
| ActiveDirectory      |     2.0 |
| Citizen              |     3.0 |
| CaseData             |   12.10 |
| Messaging            |    7.10 |
| Templating           |     2.1 |
| Contract             |     7.0 |
| Employee             |     2.0 |
| Party                |     2.0 |
| SimulatorServer      |     2.0 |
| LegalEntity          |     2.0 |
| Relations            |     1.1 |
| CaseStatus           |     4.1 |
| Estateinfo           |     2.2 |
| BillingPreprocessor  |     4.5 |
| BillingDataCollector |     2.1 |

För KS (Kontakt Sundsvall):

| API               | Version |
| ----------------- | ------: |
| CaseData          |   12.10 |
| SupportManagement |    14.9 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.1 |
| Estateinfo        |     2.2 |
| Party             |     2.0 |
| SimulatorServer   |     2.0 |
| LegalEntity       |     2.0 |
| Relations         |     1.1 |
| CaseStatus        |     4.1 |
| Employee          |     2.0 |

För PT (Parkeringstillstånd):

| API             | Version |
| --------------- | ------: |
| ActiveDirectory |     2.0 |
| Citizen         |     3.0 |
| CaseData        |   12.10 |
| Messaging       |    7.10 |
| Templating      |     2.1 |
| Contract        |     7.0 |
| Employee        |     2.0 |
| SimulatorServer |     2.0 |
| LegalEntity     |     2.0 |
| Relations       |     1.1 |
| CaseStatus      |     4.1 |
| PartyAssets     |     3.2 |
| JsonSchema      |     1.0 |

För LOP (Lön och pension):

| API                 | Version |
| ------------------- | ------: |
| SupportManagement   |    14.9 |
| Citizen             |     3.0 |
| ActiveDirectory     |     2.0 |
| Templating          |     2.1 |
| LegalEntity         |     2.0 |
| Employee            |     2.0 |
| BillingPreprocessor |     4.5 |
| SimulatorServer     |     2.0 |

För ROB (Rekrytering och bemanning):

| API               | Version |
| ----------------- | ------: |
| ActiveDirectory   |     2.0 |
| Citizen           |     3.0 |
| Employee          |     2.0 |
| LegalEntity       |     2.0 |
| SimulatorServer   |     2.0 |
| SupportManagement |    14.9 |
| Templating        |     2.1 |

För KA (Kontakt Ånge):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    14.9 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.1 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| SimulatorServer   |     2.0 |

För IK (Intern kundtjänst):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    14.9 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.1 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| SimulatorServer   |     2.0 |

För MSVA (MittSverige Vatten & avfall):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    14.9 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.1 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| SimulatorServer   |     2.0 |

För SE (Servicecenter Ekonomi):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    14.9 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.1 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| SimulatorServer   |     2.0 |

För BOU (Barn- och utbildningsförvaltningen):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    14.9 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.1 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| Relations         |     1.1 |
| SimulatorServer   |     2.0 |

För LOK (Lokalplanering):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    14.9 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.1 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| Relations         |     1.1 |
| SimulatorServer   |     2.0 |

## Utveckling

### Krav

- Node >= 20 LTS
- Yarn

### Steg för steg

1. Klona ner repot.

```
git clone git@github.com:Sundsvallskommun/web-app-draken.git
```

2. Installera dependencies för både `backend` och `frontend`

```
cd frontend
yarn install

cd backend
yarn install
```

3. Skapa .env-filer

**Tillgängliga drakar:** `kc`, `ka`, `mex`, `pt`, `rob`, `lop`, `ik`, `msva`, `se`, `bou`, `lok`

### Skapa alla env-filer på en gång

Frontend (kör från `frontend/`):

```bash
cp .env.kc-example .env.kc && \
cp .env.ka-example .env.ka && \
cp .env.mex-example .env.mex && \
cp .env.pt-example .env.pt && \
cp .env.rob-example .env.rob && \
cp .env.lop-example .env.lop && \
cp .env.ik-example .env.ik && \
cp .env.msva-example .env.msva && \
cp .env.se-example .env.se && \
cp .env.bou-example .env.bou && \
cp .env.lok-example .env.lok
```

Backend (kör från `backend/`):

```bash
cp .env.kc.example.local .env.kc.development.local && \
cp .env.ka.example.local .env.ka.development.local && \
cp .env.mex.example.local .env.mex.development.local && \
cp .env.pt.example.local .env.pt.development.local && \
cp .env.rob.example.local .env.rob.development.local && \
cp .env.lop.example.local .env.lop.development.local && \
cp .env.ik.example.local .env.ik.development.local && \
cp .env.msva.example.local .env.msva.development.local && \
cp .env.se.example.local .env.se.development.local && \
cp .env.bou.example.local .env.bou.development.local && \
cp .env.lok.example.local .env.lok.development.local
```

### Skapa för enskild drake

Frontend:

```bash
cd frontend
cp .env.{drake}-example .env.{drake}
# Exempel: cp .env.se-example .env.se
```

Backend:

```bash
cd backend
cp .env.{drake}.example.local .env.{drake}.development.local
# Exempel: cp .env.se.example.local .env.se.development.local
```

Support Management använder den stabila API-prenumerationen `supportmanagement/14.9` som standard. En drake som
behöver sprintkontraktet (för närvarande IAF/VOF-utredning) ska välja det uttryckligen i backendmiljön:

```env
SUPPORTMANAGEMENT_API_TARGET=sprint
```

Tillåtna värden är `stable` och `sprint`. Ett okänt värde stoppar backend vid uppstart, så att en felstavad
deploymentinställning inte tyst byter API-kontrakt för alla implementationer.

Drakens ärende-, handläggar-, status- och fastighetskommandon kräver en exakt stark `If-Match` och skickar samma
version vidare till Support Management. Det atomiska upstreamstödet är verifierat mot sprintkontraktet 14.14. Innan
en implementation som ligger kvar på `stable` använder dessa skrivvägar ska dess faktiska 14.9-prenumeration därför
kontrakts- eller integrationstestas för `If-Match`, 409 och 412; något 14.9-kontrakt finns inte incheckat i detta repo.
Draken gör fortfarande en versions- och statuskontroll före anropet, men en sådan förkontroll kan inte ensam ersätta
atomisk versionskontroll i upstream.

Statuskommandot validerar klientens källstatus och version mot ett färskt ärende samt målstatusen mot live metadata.
Support Management 14.14 exponerar däremot ingen source→target-graf eller exekveringsroute för statusövergångar, så
Draken kan inte auktorisera själva kanten utan att införa appspecifika regler. Den domänregeln behöver ägas av
Support Management innan starkare generell transitionvalidering kan införas.

Utredningsdokument aktiveras per app genom backendens runtimeprofil. Appar med dokument måste dessutom konfigurera
åtkomst per dokument; saknad eller ofullständig konfiguration stänger utredningsflödet i stället för att falla tillbaka
till den breda ärendebehörigheten:

```env
SUPPORT_INVESTIGATION_DOCUMENT_ACCESS={"utredning-enhetschef":{"readGroups":["ad-read-group","ad-write-group"],"writeGroups":["ad-write-group"]},"utredning-sol-lss":{"readGroups":["ad-read-group","ad-write-group"],"writeGroups":["ad-write-group"]},"utredning-hsl":{"readGroups":["ad-read-group","ad-write-group"],"writeGroups":["ad-write-group"]}}
SUPPORT_INVESTIGATION_HANDOVER_TARGETS=[{"municipalityId":"2281","namespace":"target-namespace","documentKeys":["utredning-enhetschef","utredning-sol-lss","utredning-hsl"]}]
```

Konfigurationen ska innehålla exakt profilens dokumentnycklar. Gruppnamn jämförs skiftlägesokänsligt,
`writeGroups` måste vara en delmängd av `readGroups` och jokertecknet `*` måste väljas uttryckligen. IAF/VOF med
aktiverad utredning behöver både denna konfiguration och `SUPPORTMANAGEMENT_API_TARGET=sprint`. Transportkravet
deklareras i utredningsprofilen och kontrolleras i runtimepolicyn; en felaktig stable-deployment annonserar därför
utredningen och dess registrering som otillgängliga i stället för att försöka använda ett inkompatibelt API.

`SUPPORT_INVESTIGATION_HANDOVER_TARGETS` är en explicit allowlist över de kommun- och namespace-par som är
förberedda att ta emot skyddade utredningsdokument samt exakt vilka `documentKeys` målet stöder. När källprofilen
utökas måste målcapabilityn därför uppdateras uttryckligen innan överföring tillåts. Saknad eller ogiltig konfiguration tillåter aldrig sådan
överföring. Förhandsgranskning kräver läsåtkomst till alla skyddade dokument på källärendet; genomförandet kräver
dessutom `canEditSupportManagement`. Vanliga JSON Parameters och överlämningar där `jsonParameters` inte väljs
påverkas inte av allowlisten.

4. Konfigurera env-filer

Redigera env-filer efter behov. URLer, nycklar och cert behöver fyllas i korrekt.

- `CLIENT_KEY` och `CLIENT_SECRET` måste fyllas i för att APIerna ska fungera, du måste ha en applikation från WSO2-portalen
- `SAML_ENTRY_SSO` behöver pekas till en SAML IDP
- `SAML_IDP_PUBLIC_CERT` ska stämma överens med IDPens cert
- `SAML_PRIVATE_KEY` och `SAML_PUBLIC_KEY` behöver bara fyllas i korrekt om man kör mot en riktig IDP

### Starta utvecklingsserver

Backend (kör från `backend/`):

```bash
yarn dev:{drake}
# Exempel: yarn dev:se
```

Frontend (kör från `frontend/`):

```bash
yarn dev:{drake}
# Exempel: yarn dev:se
```

### Tester

**Backend** (Vitest, kör från `backend/`):

```bash
yarn test           # Kör enhetstesterna en gång
yarn test:watch     # Watch-läge
yarn test:coverage  # Med täckningsrapport (v8)
yarn type-check:test # Typkontroll av testerna
```

Testerna ligger i `backend/src/tests/` (`*.service.test.ts`).

**Frontend** (kör från `frontend/`):

```bash
yarn test                       # Enhetstester (Vitest)
yarn test:watch                 # Vitest i watch-läge
yarn test:coverage              # Med täckningsrapport (v8)
yarn type-check:test            # Typkontroll av testerna
yarn cypress:{drake}            # Cypress E2E, interaktivt (öppnar Cypress)
yarn cypress:headless:{drake}   # Cypress E2E, headless (för CI)
yarn test:e2e:{drake}          # Playwright E2E (drake: mex | pt | kc | lop)
```

Enhetstesterna ligger bredvid modulen de testar (`<modul>.test.ts`) och körs med Vitest,
samma testkörare som backend. Assertions skrivs med `node:assert/strict` i stället för
`expect`, och `globals` är avstängt — allt importeras explicit. Alias som `@common/*` löses
upp av Vite direkt ur `tsconfig.json`, så även moduler med beroenden går att enhetstesta;
allt som kräver rendering hör fortfarande hemma i Playwright. Testerna omfattas inte av
`yarn type-check` utan av `yarn type-check:test` (se CLAUDE.md för varför).

### Feature-flaggor

Feature-flaggor konfigureras i frontend `.env`-filerna. Se dokumentation:
https://confluence.sundsvall.se/spaces/OA/pages/1259405457/Feature+flaggor+alla+drakar

### Övriga kommandon

| Kommando                              | Beskrivning                         |
| ------------------------------------- | ----------------------------------- |
| `yarn build:{drake}`                  | Bygger för produktion               |
| `yarn start:{drake}`                  | Startar produktionsserver           |
| `yarn cypress:{drake}`                | Kör Cypress tester                  |
| `yarn generate:datacontracts:{drake}` | Genererar TypeScript-typer från API |
