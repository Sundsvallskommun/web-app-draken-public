# Administration

## Utveckling

### Automatik & Filosofi

Administrationsgränssnitten är byggt med viss automatik.
Apitjänster genereras automatiskt med `yarn generate:contracts`.

I [./src/config/resources.ts](./src/config/resources.ts) definierar du sedan dina resurser.

Filen ska exportera ett objekt enligt med resurser.
Varje resurs ska ha sitt namn som nyckel, och följa [./src/interfaces/resources.ts](./src/interfaces/resources.ts), t.ex.:

```
const apiService = new Api({ baseURL: process.env.NEXT_PUBLIC_API_URL, withCredentials: true });

const users: Resource<User> = {
  name: 'users',
  getOne: apiService.userControllerGetOne,
  getMany: apiService.userControllerGetMany,
  create: apiService.userControllerCreate,
  update: apiService.userControllerUpdate,
  remove: apiService.userControllerRemove,
  defaultValues: {
    name: '',
    canEdit: false
  },
  requiredFields: ['name', 'canEdit'],
};

export default { users };

```

**Observera att nyckeln och `name` är samma.**

För att automatiken ska fungera bör apits struktur följa [./src/interfaces/resources-services.ts](./src/interfaces/resources.ts):

```
GetOne<TResponse> = (id: ID, params?: RequestParams) => TResponse;
GetMany<TResponse> = (params?: RequestParams) => TResponse;
Create<TData, TResponse> = (data: TData, params?: RequestParams) => TResponse;
Update<TData, TResponse> = (id: ID, data: TData, params?: RequestParams) => TResponse;
Remove<T = any> = (id: ID, params?: RequestParams) => T;
```

Återkommande fält bör också hålla sig till en standard.
T.ex. `id`, `createdAt`, `updatedAt`.

Dessa kan definieras i [./src/config/defaults.ts](./src/config/defaults.ts)

### Kom igång - steg för steg

1. Installera dependencies

```
yarn install
```

2. Skapa en .env-fil

```
cp .env-example .env
```

3. Starta backend

Se [Dokumentation](../README.md)

4. Generera datakontrakt och api-tjänster

```
yarn generate:contracts
```

5. Uppdatera [./src/config/resources.ts](./src/config/resources.ts)

### Språkstöd

För språkstöd används [next-i18next](https://github.com/i18next/next-i18next).

Placera dina språkfiler i `frontend/public/locales/<locale>/<namespace>.json`.

För att det ska fungera med **Next.js** och **SSR** måste du skicka med språkdatat till ServerSideProps.
Det gör du genom att lägga till följande till dina page-komponenter (behövs ej i subkomponenter).

```
export const getServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'layout', 'crud', ...Object.keys(resources), '<your-name-space>'])),
  },
});
```

#### Resurser

För att få läsbara namn på resurser och dess nycklar så skapar man en språkfil med samma namn som resursen: `frontend/public/locales/<locale>/<resource>.json`.

Filen struktureras sedan enligt nedan:

```
{
  "name_zero": "personer",
  "name_one": "person",
  "name_many": "personer",
  "name_other": "personer",
  "properties": {
    "id": "Id",
    "name": "Namn",
    "username": "Användarnamn",
  }
}

```

Med pluralisering kan du använda namnet så här: `t("<resource>:name", { count: data.length })`

Om en property är ett objekt gör du så här:

```
{
 ...,
  "properties": {
    ...,
    "permissions": {
        "DEFAULT": "Rättigheter",
        "canEdit": "Får redigera",
        ...
    },
  }
}

```

Om en property är en array gör du så här:

```
{
 ...,
  "properties": {
    ...,
    "roles": {
        "DEFAULT": "Roll",
        "DEFAULT_many": "Roller",
        ...
    },
  }
}

```

### Manuell hantering

Om du inte vill ha automatisk hantering av din resurs så skapar du en mapp med resursens namn under `./src/pages`.
Listning av resursen sker i `index.tsx`, och redigering av resurs sker i `[id].tsx`.
Skapande av ny resurs hanteras antingen i samma som redigering, eller i `new.tsx`.

```
./src/pages/<resource>
./src/pages/<resource>/index.tsx
./src/pages/<resource>/[id].tsx
./src/pages/<resource>/new.tsx
```

För hämtning av data kan hooken `useResource(<resource>)` användas.
För hantering av felmeddelanden etc kan funktioner i hooken `useCrudHelper(<resource>)` användas.
