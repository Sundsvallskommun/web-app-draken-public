# Sundsvalls Kommun Draken

## APIer som används

Dessa APIer används i projektet, applikationsanvändaren i WSO2 måste prenumerera på dessa.

För MEX (Mark och exploatering):

| API                 | Version |
| ------------------- | ------: |
| ActiveDirectory     |     1.0 |
| Citizen             |     2.0 |
| CaseData            |     9.0 |
| Messaging           |     6.0 |
| Templating          |     2.0 |
| Contract            |     2.1 |
| Employee            |     1.0 |
| BusinessEngagements |     2.0 |
| Party               |     2.0 |
| SimulatorServer     |     2.0 |

För KS (Kontakt Sundsvall):

| API                 | Version |
| ------------------- | ------: |
| CaseData            |     9.0 |
| SupportManagement   |     9.0 |
| Citizen             |     2.0 |
| ActiveDirectory     |     1.1 |
| Templating          |     2.0 |
| Estateinfo          |     1.0 |
| BusinessEngagements |     2.0 |
| Party               |     2.0 |
| SimulatorServer     |     2.0 |

För PT (Parkeringstillstånd):

| API                 | Version |
| ------------------- | ------: |
| ActiveDirectory     |     1.0 |
| Citizen             |     2.0 |
| CaseData            |     9.0 |
| Messaging           |     6.0 |
| Templating          |     2.0 |
| Contract            |     2.1 |
| Employee            |     1.0 |
| BusinessEngagements |     2.0 |
| SimulatorServer     |     2.0 |

För LOP (Lön och pension):

| API                 | Version |
| ------------------- | ------: |
| SupportManagement   |     9.0 |
| Citizen             |     2.0 |
| ActiveDirectory     |     1.1 |
| Templating          |     2.0 |
| BusinessEngagements |     2.0 |
| Employee            |     1.0 |
| BillingPreprocessor |     2.0 |
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

redigera env-filer efter behov. URLer, nycklar och cert behöver fyllas i korrekt.

- `CLIENT_KEY` och `CLIENT_SECRET` måste fyllas i för att APIerna ska fungera, du måste ha en applikation från WSO2-portalen
- `SAML_ENTRY_SSO` behöver pekas till en SAML IDP
- `SAML_IDP_PUBLIC_CERT` ska stämma överens med IDPens cert
- `SAML_PRIVATE_KEY` och `SAML_PUBLIC_KEY` behöver bara fyllas i korrekt om man kör mot en riktig IDP

5. Initiera databas för backend

```
cd backend
yarn prisma:generate
yarn prisma:migrate
```
