# Sundsvalls Kommun Draken

## APIer som används

Dessa APIer används i projektet, applikationsanvändaren i WSO2 måste prenumerera på dessa.

För MEX (Mark och exploatering):

| API             | Version |
| --------------- | ------: |
| ActiveDirectory |     2.0 |
| Citizen         |     3.0 |
| CaseData        |    11.5 |
| Messaging       |     7.9 |
| Templating      |     2.0 |
| Contract        |     2.1 |
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
| SupportManagement |    10.7 |
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
| Messaging       |     7.9 |
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
| SupportManagement   |    10.7 |
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
| SupportManagement   |    10.7 |
| Templating          |     2.0 |

För KA (Kontakt Ånge):

| API                 | Version |
| ------------------- | ------: |
| SupportManagement   |    10.7 |
| Citizen             |     3.0 |
| ActiveDirectory     |     2.0 |
| Templating          |     2.0 |
| LegalEntity         |     2.0 |
| Employee            |     2.0 |
| BillingPreprocessor |     4.0 |
| SimulatorServer     |     2.0 |

## Utveckling

### Krav

- Node >= 20 LTS
- Yarn

### Steg för steg

1. Klona ner repot.

```
git clone git clone git@github.com:Sundsvallskommun/web-app-parking-permit.git
```

2. Installera dependencies för både `backend` och `frontend`

```
cd frontend
yarn install

cd backend
yarn install
```

3. Skapa .env-fil för `frontend`

För KS:

```
cd frontend
cp .env.kc-example .env.kc
```

För MEX:

```
cd frontend
cp .env.mex-example .env.mex
```

För PT:

```
cd frontend
cp .env.pt-example .env.pt
```

För LOP:

```
cd frontend
cp .env.lop-example .env.lop
```

För ROB:

```
cd frontend
cp .env.rob-example .env.rob
```

Redigera `.env` för behov, för utveckling bör exempelvärdet fungera.

4. Skapa .env-filer för `backend`

För KS:

```
cd backend
cp .env.kc.example.local .env.kc.development.local
cp .env.kc.example.local .env.kc.test.local
```

För MEX:

```
cd backend
cp .env.mex.example.local .env.mex.development.local
cp .env.mex.example.local .env.mex.test.local
```

För PT:

```
cd backend
cp .env.pt.example.local .env.pt.development.local
cp .env.pt.example.local .env.pt.test.local
```

För LOP:

```
cd backend
cp .env.lop.example.local .env.lop.development.local
cp .env.lop.example.local .env.lop.test.local
```

För ROB:

```
cd backend
cp .env.rob.example.local .env.rob.development.local
cp .env.rob.example.local .env.rob.test.local
```

redigera env-filer efter behov. URLer, nycklar och cert behöver fyllas i korrekt.

- `CLIENT_KEY` och `CLIENT_SECRET` måste fyllas i för att APIerna ska fungera, du måste ha en applikation från WSO2-portalen
- `SAML_ENTRY_SSO` behöver pekas till en SAML IDP
- `SAML_IDP_PUBLIC_CERT` ska stämma överens med IDPens cert
- `SAML_PRIVATE_KEY` och `SAML_PUBLIC_KEY` behöver bara fyllas i korrekt om man kör mot en riktig IDP
