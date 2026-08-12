import type { Page, Request, Route } from '@playwright/test';

import investigationCases from '../../../src/supportmanagement/investigation/schemas/fixtures/investigation-schema-cases.json';
import managerSchemaRequest from '../../../src/supportmanagement/investigation/schemas/utredning-enhetschef.schema-request.json';
import managerUiSchemaRequest from '../../../src/supportmanagement/investigation/schemas/utredning-enhetschef.ui-schema-request.json';
import hslSchemaRequest from '../../../src/supportmanagement/investigation/schemas/utredning-hsl.schema-request.json';
import hslUiSchemaRequest from '../../../src/supportmanagement/investigation/schemas/utredning-hsl.ui-schema-request.json';
import solLssSchemaRequest from '../../../src/supportmanagement/investigation/schemas/utredning-sol-lss.schema-request.json';
import solLssUiSchemaRequest from '../../../src/supportmanagement/investigation/schemas/utredning-sol-lss.ui-schema-request.json';

export const backendOrigin = 'http://localhost:3001';
export const municipalityId = '2281';
export const errandId = 'ca97b2be-dc37-4707-b5bb-bae98936a183';
export const errandNumber = 'IAF-2026-0001';
export const katlaSchemaId = '2281_katla-iaf-report_1.0';

export const investigationKeys = ['utredning-enhetschef', 'utredning-sol-lss', 'utredning-hsl'] as const;
export type InvestigationKey = (typeof investigationKeys)[number];

type JsonObject = Record<string, unknown>;

interface SchemaRequest {
  name: InvestigationKey;
  version: string;
  value: JsonObject;
  description: string;
}

interface UiSchemaRequest {
  value: JsonObject;
  description: string;
}

interface InvestigationDocument {
  key: InvestigationKey;
  schemaId: string;
  value: JsonObject;
  version: number;
  etag: string;
}

interface PutTrace {
  key: InvestigationKey;
  headers: Record<string, string>;
  body: unknown;
}

export interface IafApiTrace {
  exactSchemaIds: string[];
  latestSchemaNames: string[];
  documentGets: InvestigationKey[];
  puts: PutTrace[];
}

export interface IafApiScenario {
  canEdit?: boolean;
  errandStatus?: string;
  documents?: Partial<Record<InvestigationKey, InvestigationDocument>>;
  featureFlags?: Array<{ name: string; enabled: boolean; value?: string }>;
  putResult?: 'success' | 'conflict';
  schemaFailureFor?: InvestigationKey;
}

const schemaRequests: Record<InvestigationKey, SchemaRequest> = {
  'utredning-enhetschef': managerSchemaRequest,
  'utredning-sol-lss': solLssSchemaRequest,
  'utredning-hsl': hslSchemaRequest,
};

const uiSchemaRequests: Record<InvestigationKey, UiSchemaRequest> = {
  'utredning-enhetschef': managerUiSchemaRequest,
  'utredning-sol-lss': solLssUiSchemaRequest,
  'utredning-hsl': hslUiSchemaRequest,
};

const validValues: Record<InvestigationKey, JsonObject> = {
  'utredning-enhetschef': investigationCases['utredning-enhetschef'].valid,
  'utredning-sol-lss': investigationCases['utredning-sol-lss'].valid,
  'utredning-hsl': investigationCases['utredning-hsl'].valid,
};

export const latestSchemaIds: Record<InvestigationKey, string> = {
  'utredning-enhetschef': '2281_utredning-enhetschef_1.0',
  'utredning-sol-lss': '2281_utredning-sol-lss_1.0',
  'utredning-hsl': '2281_utredning-hsl_1.0',
};

export const existingManagerDocument = (): InvestigationDocument => ({
  key: 'utredning-enhetschef',
  schemaId: '2281_utredning-enhetschef_0.9',
  value: structuredClone(validValues['utredning-enhetschef']),
  version: 7,
  etag: '"manager-v7"',
});

export const allExistingInvestigationDocuments = (): Record<InvestigationKey, InvestigationDocument> =>
  Object.fromEntries(
    investigationKeys.map((key, index) => [
      key,
      {
        key,
        schemaId: latestSchemaIds[key],
        value: structuredClone(validValues[key]),
        version: index + 1,
        etag: `"${key}-v${index + 1}"`,
      },
    ])
  ) as Record<InvestigationKey, InvestigationDocument>;

const metadata = {
  categories: [],
  types: [],
  statuses: [
    { name: 'ONGOING', displayName: 'Pågående' },
    { name: 'SOLVED', displayName: 'Avslutat' },
  ],
  labels: {
    labelStructure: [
      {
        id: 'category-root',
        classification: 'CATEGORY_ROOT',
        displayName: 'Kategori',
        resourceName: 'CATEGORY',
        resourcePath: 'CATEGORY',
        labels: [
          {
            id: 'vof-owner',
            classification: 'PROVISION_CATEGORY',
            displayName: 'Vård och omsorg',
            resourceName: 'VOF',
            resourcePath: 'CATEGORY/VOF',
            labels: [
              {
                id: 'medicine-category',
                classification: 'CATEGORY',
                displayName: 'Läkemedel',
                resourceName: 'MEDICINE',
                resourcePath: 'CATEGORY/VOF/MEDICINE',
                labels: [
                  {
                    id: 'medicine-administration-type',
                    classification: 'TYPE',
                    displayName: 'Felaktig administrering',
                    resourceName: 'INCORRECT_ADMINISTRATION',
                    resourcePath: 'CATEGORY/VOF/MEDICINE/INCORRECT_ADMINISTRATION',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

const selectedLabels = [
  {
    id: 'vof-owner',
    classification: 'PROVISION_CATEGORY',
    displayName: 'Vård och omsorg',
    resourceName: 'VOF',
    resourcePath: 'CATEGORY/VOF',
  },
  {
    id: 'medicine-category',
    classification: 'CATEGORY',
    displayName: 'Läkemedel',
    resourceName: 'MEDICINE',
    resourcePath: 'CATEGORY/VOF/MEDICINE',
  },
  {
    id: 'medicine-administration-type',
    classification: 'TYPE',
    displayName: 'Felaktig administrering',
    resourceName: 'INCORRECT_ADMINISTRATION',
    resourcePath: 'CATEGORY/VOF/MEDICINE/INCORRECT_ADMINISTRATION',
  },
];

const katlaParameter = {
  key: 'katla-iaf-report',
  schemaId: katlaSchemaId,
  value: { reportedEvent: 'Katla från web-app-katla-sm' },
};

const katlaSchema = {
  id: katlaSchemaId,
  name: 'katla-iaf-report',
  version: '1.0',
  value: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Inrapporterade uppgifter',
    type: 'object',
    additionalProperties: false,
    properties: {
      reportedEvent: {
        type: 'string',
        title: 'Händelse från Katla',
      },
    },
  },
  description: 'Readonly-data som rapporterats från Katla.',
};

const apiResponse = (data: unknown) => ({ data, message: 'success' });

const isInvestigationKey = (value: string): value is InvestigationKey => investigationKeys.some((key) => key === value);

const requestBody = (request: Request): unknown => {
  const body = request.postData();
  if (!body) return undefined;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
};

const fulfillJson = (route: Route, json: unknown, status = 200, headers?: Record<string, string>) =>
  route.fulfill({ status, json, headers });

export async function installIafApiMock(page: Page, scenario: IafApiScenario = {}): Promise<IafApiTrace> {
  const documents: Partial<Record<InvestigationKey, InvestigationDocument>> = structuredClone(
    scenario.documents ?? { 'utredning-enhetschef': existingManagerDocument() }
  );
  const trace: IafApiTrace = {
    exactSchemaIds: [],
    latestSchemaNames: [],
    documentGets: [],
    puts: [],
  };

  const buildErrand = () => ({
    id: errandId,
    errandNumber,
    title: 'IAF-avvikelse för test',
    description: '<p>Inrapporterad avvikelse.</p>',
    priority: 'MEDIUM',
    status: scenario.errandStatus ?? 'ONGOING',
    resolution: 'NONE',
    channel: 'WEB_UI',
    assignedUserId: 'iaf.test',
    reporterUserId: 'iaf.reporter',
    created: '2026-08-01T10:00:00.000+02:00',
    modified: '2026-08-12T09:00:00.000+02:00',
    classification: {
      category: 'CATEGORY/VOF',
      type: 'CATEGORY/VOF/MEDICINE',
    },
    labels: selectedLabels,
    actions: [],
    parameters: [],
    stakeholders: [
      {
        externalId: 'reporter-id',
        externalIdType: 'EMPLOYEE',
        role: 'REPORTER',
        firstName: 'Rita',
        lastName: 'Rapportör',
        contactChannels: [],
      },
    ],
    jsonParameters: [
      katlaParameter,
      ...investigationKeys.flatMap((key) => {
        const document = documents[key];
        return document
          ? [{ key: document.key, schemaId: document.schemaId, value: structuredClone(document.value) }]
          : [];
      }),
    ],
  });

  await page.route(`${backendOrigin}/**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    if (method === 'GET' && path.endsWith('/featureflags')) {
      await fulfillJson(route, scenario.featureFlags ?? []);
      return;
    }

    if (method === 'GET' && path.endsWith('/me')) {
      await fulfillJson(
        route,
        apiResponse({
          name: 'Iaf Testare',
          firstName: 'Iaf',
          lastName: 'Testare',
          email: 'iaf.test@example.test',
          username: 'iaf.test',
          userSettings: { readNotificationsClearedDate: '' },
          permissions: {
            canEditCasedata: false,
            canEditSupportManagement: scenario.canEdit ?? true,
            canViewAttestations: false,
            canEditAttestations: false,
          },
        })
      );
      return;
    }

    if (method === 'GET' && path.endsWith('/users/admins')) {
      await fulfillJson(route, apiResponse([]));
      return;
    }

    if (method === 'GET' && path.endsWith(`/supportmetadata/${municipalityId}`)) {
      await fulfillJson(route, metadata);
      return;
    }

    if (
      method === 'GET' &&
      (path.endsWith(`/supporterrands/errandnumber/${errandNumber}`) ||
        path.endsWith(`/supporterrands/${municipalityId}/${errandId}`))
    ) {
      await fulfillJson(route, buildErrand());
      return;
    }

    const documentMatch = path.match(/\/json-parameters\/([^/]+)$/u);
    if (documentMatch) {
      const key = decodeURIComponent(documentMatch[1]);
      if (!isInvestigationKey(key)) {
        await fulfillJson(route, { message: 'Unsupported investigation document' }, 400);
        return;
      }

      if (method === 'GET') {
        trace.documentGets.push(key);
        const document = documents[key];
        if (!document) {
          await fulfillJson(route, { message: 'JSON parameter not found' }, 404);
          return;
        }

        const { etag, ...responseDocument } = document;
        await fulfillJson(route, responseDocument, 200, {
          etag,
          'access-control-expose-headers': 'ETag',
        });
        return;
      }

      if (method === 'PUT') {
        const body = requestBody(request);
        trace.puts.push({ key, headers: request.headers(), body });

        if (scenario.putResult === 'conflict') {
          await fulfillJson(route, { message: 'Utredningen har en nyare version.' }, 412);
          return;
        }

        if (
          !body ||
          typeof body !== 'object' ||
          !('schemaId' in body) ||
          typeof body.schemaId !== 'string' ||
          !('value' in body) ||
          !body.value ||
          typeof body.value !== 'object' ||
          Array.isArray(body.value)
        ) {
          await fulfillJson(route, { message: 'Invalid JSON parameter body' }, 400);
          return;
        }

        const previousVersion = documents[key]?.version ?? 0;
        const updated: InvestigationDocument = {
          key,
          schemaId: body.schemaId,
          value: structuredClone(body.value as JsonObject),
          version: previousVersion + 1,
          etag: `"${key}-v${previousVersion + 1}"`,
        };
        documents[key] = updated;
        const { etag, ...responseDocument } = updated;
        await fulfillJson(route, responseDocument, 200, {
          etag,
          'access-control-expose-headers': 'ETag',
        });
        return;
      }
    }

    const latestSchemaMatch = path.match(new RegExp(`/${municipalityId}/schemas/([^/]+)/latest$`, 'u'));
    if (method === 'GET' && latestSchemaMatch) {
      const name = decodeURIComponent(latestSchemaMatch[1]);
      if (!isInvestigationKey(name)) {
        await fulfillJson(route, { message: 'Schema not found' }, 404);
        return;
      }

      trace.latestSchemaNames.push(name);
      if (scenario.schemaFailureFor === name) {
        await fulfillJson(route, { message: 'Schema service unavailable' }, 503);
        return;
      }

      const schemaRequest = schemaRequests[name];
      await fulfillJson(
        route,
        apiResponse({
          id: latestSchemaIds[name],
          name,
          version: schemaRequest.version,
          value: schemaRequest.value,
          description: schemaRequest.description,
        })
      );
      return;
    }

    const uiSchemaMatch = path.match(new RegExp(`/${municipalityId}/schemas/([^/]+)/ui-schema$`, 'u'));
    if (method === 'GET' && uiSchemaMatch) {
      const schemaId = decodeURIComponent(uiSchemaMatch[1]);
      if (schemaId === katlaSchemaId) {
        await fulfillJson(route, apiResponse({ id: schemaId, value: {} }));
        return;
      }

      const key = investigationKeys.find((candidate) => schemaId.includes(candidate));
      if (!key) {
        await fulfillJson(route, { message: 'UI schema not found' }, 404);
        return;
      }

      await fulfillJson(
        route,
        apiResponse({
          id: schemaId,
          value: uiSchemaRequests[key].value,
          description: uiSchemaRequests[key].description,
        })
      );
      return;
    }

    const exactSchemaMatch = path.match(new RegExp(`/${municipalityId}/schemas/([^/]+)$`, 'u'));
    if (method === 'GET' && exactSchemaMatch) {
      const schemaId = decodeURIComponent(exactSchemaMatch[1]);
      trace.exactSchemaIds.push(schemaId);
      if (schemaId === katlaSchemaId) {
        await fulfillJson(route, apiResponse(katlaSchema));
        return;
      }

      const key = investigationKeys.find((candidate) => schemaId.includes(candidate));
      if (!key) {
        await fulfillJson(route, { message: 'Schema not found' }, 404);
        return;
      }

      if (scenario.schemaFailureFor === key) {
        await fulfillJson(route, { message: 'Schema service unavailable' }, 503);
        return;
      }

      const schemaRequest = schemaRequests[key];
      await fulfillJson(
        route,
        apiResponse({
          id: schemaId,
          name: key,
          version: schemaId.split('_').at(-1) ?? schemaRequest.version,
          value: schemaRequest.value,
          description: schemaRequest.description,
        })
      );
      return;
    }

    if (method === 'GET' && path.includes('/supportattachments/')) {
      await fulfillJson(route, []);
      return;
    }

    if (method === 'GET' && path.includes('/supportmessage/')) {
      await fulfillJson(route, []);
      return;
    }

    if (method === 'GET' && path.includes('/supportnotes/')) {
      await fulfillJson(route, { notes: [] });
      return;
    }

    if (method === 'GET' && path.includes('/communication/conversations')) {
      // The BFF conversation endpoint wraps its payload twice and the existing
      // frontend service returns the inner ApiResponse to its consumers.
      await fulfillJson(route, apiResponse(apiResponse([])));
      return;
    }

    if (method === 'GET' && path.includes('/relations/referredfrom/')) {
      await fulfillJson(route, apiResponse([]));
      return;
    }

    await fulfillJson(route, {});
  });

  return trace;
}
