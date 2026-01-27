# Sundsvalls Kommun Draken

## APIer som används

Dessa APIer används i projektet, applikationsanvändaren i WSO2 måste prenumerera på dessa.

För MEX (Mark och exploatering):

| API             | Version |
| --------------- | ------: |
| ActiveDirectory |     2.0 |
| Citizen         |     3.0 |
| CaseData        |    11.5 |
| Messaging       |    7.10 |
| Templating      |     2.0 |
| Contract        |     3.0 |
| Employee        |     2.0 |
| Party           |     2.0 |
| SimulatorServer |     2.0 |
| LegalEntity     |     2.0 |
| Relations       |     1.1 |
| CaseStatus      |     4.1 |

För KS (Kontakt Sundsvall):

| API               | Version |
| ----------------- | ------: |
| CaseData          |    11.5 |
| SupportManagement |    12.3 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.0 |
| Estateinfo        |     1.0 |
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
| CaseData        |    11.5 |
| Messaging       |      10 |
| Templating      |     2.0 |
| Contract        |     2.1 |
| Employee        |     2.0 |
| SimulatorServer |     2.0 |
| LegalEntity     |     2.0 |
| Relations       |     1.1 |
| CaseStatus      |     4.1 |

För LOP (Lön och pension):

| API                 | Version |
| ------------------- | ------: |
| SupportManagement   |    12.3 |
| Citizen             |     3.0 |
| ActiveDirectory     |     2.0 |
| Templating          |     2.0 |
| LegalEntity         |     2.0 |
| Employee            |     2.0 |
| BillingPreprocessor |     4.0 |
| SimulatorServer     |     2.0 |

För ROB (Rekrytering och bemanning):

| API                 | Version |
| ------------------- | ------: |
| ActiveDirectory     |     2.0 |
| BillingPreprocessor |     4.0 |
| Citizen             |     3.0 |
| Employee            |     2.0 |
| LegalEntity         |     2.0 |
| SimulatorServer     |     2.0 |
| SupportManagement   |    12.3 |
| Templating          |     2.0 |

För KA (Kontakt Ånge):

| API                 | Version |
| ------------------- | ------: |
| SupportManagement   |    12.3 |
| Citizen             |     3.0 |
| ActiveDirectory     |     2.0 |
| Templating          |     2.0 |
| LegalEntity         |     2.0 |
| Employee            |     2.0 |
| BillingPreprocessor |     4.0 |
| SimulatorServer     |     2.0 |

För IK (Intern kundtjänst):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    12.3 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.0 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| SimulatorServer   |     2.0 |

För MSVA (MittSverige Vatten & avfall):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    12.3 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.0 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
| SimulatorServer   |     2.0 |

För SE (Servicecenter Ekonomi):

| API               | Version |
| ----------------- | ------: |
| SupportManagement |    12.3 |
| Citizen           |     3.0 |
| ActiveDirectory   |     2.0 |
| Templating        |     2.0 |
| LegalEntity       |     2.0 |
| Employee          |     2.0 |
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

**Tillgängliga drakar:** `kc`, `ka`, `mex`, `pt`, `rob`, `lop`, `ik`, `msva`, `se`

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
cp .env.se-example .env.se
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
cp .env.se.example.local .env.se.development.local
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
