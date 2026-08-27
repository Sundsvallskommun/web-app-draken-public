import type { Page, Request, Route } from '@playwright/test';

import investigationCases from '../../../src/supportmanagement/investigation/avvikelse/schemas/fixtures/investigation-schema-cases.json';
import managerSchemaRequest from '../../../src/supportmanagement/investigation/avvikelse/schemas/utredning-enhetschef.schema-request.json';
import managerUiSchemaRequest from '../../../src/supportmanagement/investigation/avvikelse/schemas/utredning-enhetschef.ui-schema-request.json';
import hslSchemaRequest from '../../../src/supportmanagement/investigation/avvikelse/schemas/utredning-hsl.schema-request.json';
import hslUiSchemaRequest from '../../../src/supportmanagement/investigation/avvikelse/schemas/utredning-hsl.ui-schema-request.json';
import solLssSchemaRequest from '../../../src/supportmanagement/investigation/avvikelse/schemas/utredning-sol-lss.schema-request.json';
import solLssUiSchemaRequest from '../../../src/supportmanagement/investigation/avvikelse/schemas/utredning-sol-lss.ui-schema-request.json';

export const backendOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').origin;
export const municipalityId = '2281';
export const errandId = 'ca97b2be-dc37-4707-b5bb-bae98936a183';
export const application = (process.env.NEXT_PUBLIC_APPLICATION ?? 'IAF').trim().toUpperCase();
const applicationSlug = application.toLowerCase();
export const errandNumber = `${application}-2026-0001`;
export const katlaSchemaId = `2281_katla-${applicationSlug}-report_1.0`;

export const investigationKeys = ['utredning-enhetschef', 'utredning-sol-lss', 'utredning-hsl'] as const;
export type InvestigationKey = (typeof investigationKeys)[number];

export interface MockInvestigationProfile {
  application: string;
  state: 'active' | 'inactive' | 'unavailable';
  registration: { mode: 'enabled' | 'disabled' };
  documents: Array<{
    key: string;
    schemaName: InvestigationKey;
    tabLabel: string;
    ownerLabel: string;
    permissions: { canRead: boolean; canWrite: boolean };
  }>;
}

export const defaultInvestigationProfile = (): MockInvestigationProfile => ({
  application,
  state: 'active',
  registration: { mode: 'disabled' },
  documents: [
    {
      key: 'utredning-enhetschef',
      schemaName: 'utredning-enhetschef',
      tabLabel: 'Utredning enhetschef',
      ownerLabel: 'Enhetschef',
      permissions: { canRead: true, canWrite: true },
    },
    {
      key: 'utredning-sol-lss',
      schemaName: 'utredning-sol-lss',
      tabLabel: 'Utredning SoL/LSS',
      ownerLabel: 'LEX-utredare',
      permissions: { canRead: true, canWrite: true },
    },
    {
      key: 'utredning-hsl',
      schemaName: 'utredning-hsl',
      tabLabel: 'Utredning HSL',
      ownerLabel: 'MAS/MAR',
      permissions: { canRead: true, canWrite: true },
    },
  ],
});

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
  key: string;
  schemaId: string;
  value: JsonObject;
  version: number;
  etag: string;
}

interface PutTrace {
  key: string;
  headers: Record<string, string>;
  body: unknown;
}

interface ClassificationPatchTrace {
  headers: Record<string, string>;
  body: unknown;
}

export interface IafApiTrace {
  profileGets: number;
  exactSchemaIds: string[];
  latestSchemaNames: string[];
  documentGets: string[];
  puts: PutTrace[];
  classificationPatches: ClassificationPatchTrace[];
  errandPatches: unknown[];
  writes: Array<'document' | 'classification'>;
}

export interface IafApiScenario {
  canEdit?: boolean;
  errandStatus?: string;
  eventType?: 'AVVIKELSE' | 'MISSFORHALLANDE';
  documents?: Record<string, InvestigationDocument>;
  featureFlags?: Array<{ name: string; enabled: boolean; value?: string }>;
  putResult?: 'success' | 'conflict';
  classificationPatchResult?: 'success' | 'bad-request' | 'conflict' | 'server-error' | 'server-error-once';
  classificationDeclarationMissingFor?: InvestigationKey;
  classificationSlotMisplacedFor?: InvestigationKey;
  schemaFailureFor?: InvestigationKey;
  classification?: { category: string; type: string };
  labels?: MockLabel[];
  labelStructure?: MockLabel[];
  omitLabelResourcePaths?: boolean;
  investigationProfile?: MockInvestigationProfile;
  investigationProfileResponse?: unknown;
  investigationProfileStatus?: number;
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
  'utredning-enhetschef': '2281_utredning-enhetschef_1.1',
  'utredning-sol-lss': '2281_utredning-sol-lss_1.1',
  'utredning-hsl': '2281_utredning-hsl_1.0',
};

export const existingManagerDocument = (): InvestigationDocument => ({
  key: 'utredning-enhetschef',
  schemaId: '2281_utredning-enhetschef_0.9',
  value: structuredClone(validValues['utredning-enhetschef']),
  version: 7,
  etag: '"7"',
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
        etag: `"${index + 1}"`,
      },
    ])
  ) as Record<InvestigationKey, InvestigationDocument>;

export interface MockLabel {
  id: string;
  classification: string;
  displayName: string;
  resourceName: string;
  resourcePath?: string;
  labels?: MockLabel[];
}

export const iafLabelFixture = {
  namespace: `HEALTHCAREDEVIATION${application}`,
  provision: {
    hsl: { id: 'provision-hsl-id', resourcePath: 'PROVISION/HSL' },
    sol: { id: 'provision-sol-id', resourcePath: 'PROVISION/SOL' },
    lss: { id: 'provision-lss-id', resourcePath: 'PROVISION/LSS' },
  },
  reportType: {
    deviation: { id: 'report-type-deviation-id', resourcePath: 'REPORT_TYPE/DEVIATION' },
    misconduct: { id: 'report-type-misconduct-id', resourcePath: 'REPORT_TYPE/ABUSE' },
  },
  classification: {
    hslOwner: { id: 'category-hsl-owner-id', resourcePath: 'CATEGORY/HSL' },
    rehab: {
      id: 'category-hsl-rehab-id',
      displayName: 'Rehab',
      resourcePath: 'CATEGORY/HSL/REHAB',
    },
    missedAssessment: {
      id: 'type-hsl-rehab-assessment-id',
      displayName: 'Utebliven bedömning/behandling',
      resourcePath: 'CATEGORY/HSL/REHAB/ASSESSMENT_TREATMENT_NOT_PERFORMED',
    },
    medication: {
      id: 'category-hsl-medication-id',
      displayName: 'Läkemedelshantering',
      resourcePath: 'CATEGORY/HSL/MEDICATION',
    },
    incorrectAdministration: {
      id: 'type-hsl-medication-administration-id',
      displayName: 'Felaktig administrering',
      resourcePath: 'CATEGORY/HSL/MEDICATION/INCORRECT_ADMINISTRATION',
    },
    solLssOwner: { id: 'category-sol-lss-owner-id', resourcePath: 'CATEGORY/SOL_LSS' },
    legalCertainty: {
      id: 'category-sol-lss-legal-certainty-id',
      displayName: 'Brister i rättssäkerhet vid handläggning och genomförande',
      resourcePath: 'CATEGORY/SOL_LSS/LEGAL_CERTAINTY',
    },
    deficientHandling: {
      id: 'type-sol-lss-legal-certainty-handling-id',
      displayName: 'Brister vid handläggning',
      resourcePath: 'CATEGORY/SOL_LSS/LEGAL_CERTAINTY/DEFICIENT_HANDLING',
    },
    executionDeficiency: {
      id: 'category-sol-lss-execution-id',
      displayName: 'Brister i utförandet av insatser',
      resourcePath: 'CATEGORY/SOL_LSS/EXECUTION_DEFICIENCY',
    },
    supportNotProvided: {
      id: 'type-sol-lss-execution-support-id',
      displayName: 'Beviljad insats har inte utförts',
      resourcePath: 'CATEGORY/SOL_LSS/EXECUTION_DEFICIENCY/SUPPORT_NOT_PROVIDED',
    },
  },
} as const;

const label = (
  id: string,
  classification: string,
  displayName: string,
  resourceName: string,
  resourcePath: string,
  labels?: MockLabel[]
): MockLabel => ({ id, classification, displayName, resourceName, resourcePath, labels });

const provisionHsl = label(
  iafLabelFixture.provision.hsl.id,
  'PROVISION',
  'HSL',
  'HSL',
  iafLabelFixture.provision.hsl.resourcePath
);
const provisionSol = label(
  iafLabelFixture.provision.sol.id,
  'PROVISION',
  'SoL',
  'SOL',
  iafLabelFixture.provision.sol.resourcePath
);
const provisionLss = label(
  iafLabelFixture.provision.lss.id,
  'PROVISION',
  'LSS',
  'LSS',
  iafLabelFixture.provision.lss.resourcePath
);
const reportDeviation = label(
  iafLabelFixture.reportType.deviation.id,
  'REPORT_TYPE',
  'Avvikelse',
  'DEVIATION',
  iafLabelFixture.reportType.deviation.resourcePath
);
const reportMisconduct = label(
  iafLabelFixture.reportType.misconduct.id,
  'REPORT_TYPE',
  'Missförhållande',
  'ABUSE',
  iafLabelFixture.reportType.misconduct.resourcePath
);
const missedAssessment = label(
  iafLabelFixture.classification.missedAssessment.id,
  'TYPE',
  iafLabelFixture.classification.missedAssessment.displayName,
  'ASSESSMENT_TREATMENT_NOT_PERFORMED',
  iafLabelFixture.classification.missedAssessment.resourcePath
);
const rehab = label(
  iafLabelFixture.classification.rehab.id,
  'CATEGORY',
  iafLabelFixture.classification.rehab.displayName,
  'REHAB',
  iafLabelFixture.classification.rehab.resourcePath,
  [missedAssessment]
);
const incorrectAdministration = label(
  iafLabelFixture.classification.incorrectAdministration.id,
  'TYPE',
  iafLabelFixture.classification.incorrectAdministration.displayName,
  'INCORRECT_ADMINISTRATION',
  iafLabelFixture.classification.incorrectAdministration.resourcePath
);
const medication = label(
  iafLabelFixture.classification.medication.id,
  'CATEGORY',
  iafLabelFixture.classification.medication.displayName,
  'MEDICATION',
  iafLabelFixture.classification.medication.resourcePath,
  [incorrectAdministration]
);
const hslOwner = label(
  iafLabelFixture.classification.hslOwner.id,
  'PROVISION_CATEGORY',
  'HSL',
  'HSL',
  iafLabelFixture.classification.hslOwner.resourcePath,
  [rehab, medication]
);
const deficientHandling = label(
  iafLabelFixture.classification.deficientHandling.id,
  'TYPE',
  iafLabelFixture.classification.deficientHandling.displayName,
  'DEFICIENT_HANDLING',
  iafLabelFixture.classification.deficientHandling.resourcePath
);
const legalCertainty = label(
  iafLabelFixture.classification.legalCertainty.id,
  'CATEGORY',
  iafLabelFixture.classification.legalCertainty.displayName,
  'LEGAL_CERTAINTY',
  iafLabelFixture.classification.legalCertainty.resourcePath,
  [deficientHandling]
);
const supportNotProvided = label(
  iafLabelFixture.classification.supportNotProvided.id,
  'TYPE',
  iafLabelFixture.classification.supportNotProvided.displayName,
  'SUPPORT_NOT_PROVIDED',
  iafLabelFixture.classification.supportNotProvided.resourcePath
);
const executionDeficiency = label(
  iafLabelFixture.classification.executionDeficiency.id,
  'CATEGORY',
  iafLabelFixture.classification.executionDeficiency.displayName,
  'EXECUTION_DEFICIENCY',
  iafLabelFixture.classification.executionDeficiency.resourcePath,
  [supportNotProvided]
);
const solLssOwner = label(
  iafLabelFixture.classification.solLssOwner.id,
  'PROVISION_CATEGORY',
  'SoL/LSS',
  'SOL_LSS',
  iafLabelFixture.classification.solLssOwner.resourcePath,
  [legalCertainty, executionDeficiency]
);

const labelStructure: MockLabel[] = [
  label('provision-root-id', 'PROVISION_ROOT', 'Lagrum', 'PROVISION', 'PROVISION', [
    provisionHsl,
    provisionSol,
    provisionLss,
  ]),
  label('category-root-id', 'CATEGORY_ROOT', 'Kategori', 'CATEGORY', 'CATEGORY', [hslOwner, solLssOwner]),
  label('report-type-root-id', 'REPORT_TYPE_ROOT', 'Rapporttyp', 'REPORT_TYPE', 'REPORT_TYPE', [
    reportDeviation,
    reportMisconduct,
  ]),
];

const metadata = {
  categories: [],
  types: [],
  statuses: [
    { name: 'ONGOING', displayName: 'Pågående' },
    { name: 'SOLVED', displayName: 'Avslutat' },
  ],
  labels: { labelStructure },
};

const withoutChildren = ({ labels: _labels, ...selectedLabel }: MockLabel): MockLabel => selectedLabel;

const withoutResourcePaths = (labels: readonly MockLabel[]): MockLabel[] =>
  labels.map(({ resourcePath: _resourcePath, labels: children, ...currentLabel }) => ({
    ...currentLabel,
    ...(children ? { labels: withoutResourcePaths(children) } : {}),
  }));

const deviationLabels = [provisionHsl, reportDeviation, hslOwner, rehab, missedAssessment].map(withoutChildren);
const misconductLabels = [
  provisionSol,
  provisionLss,
  reportMisconduct,
  solLssOwner,
  legalCertainty,
  deficientHandling,
].map(withoutChildren);

const allLabelsById = new Map<string, MockLabel>();
const collectLabels = (labels: readonly MockLabel[]) => {
  labels.forEach((currentLabel) => {
    allLabelsById.set(currentLabel.id, withoutChildren(currentLabel));
    if (currentLabel.labels) collectLabels(currentLabel.labels);
  });
};
collectLabels(labelStructure);

const katlaParameter = {
  key: `katla-${applicationSlug}-report`,
  schemaId: katlaSchemaId,
  value: { reportedEvent: 'Katla från web-app-katla-sm' },
};

const katlaSchema = {
  id: katlaSchemaId,
  name: `katla-${applicationSlug}-report`,
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

const schemaVersionFromId = (schemaId: string): string => schemaId.split('_').at(-1) ?? '';

const isLegacySchemaVersion = (version: string): boolean => {
  const [major = Number.NaN, minor = Number.NaN] = version.split('.').map(Number);
  return major < 1 || (major === 1 && minor <= 0);
};

const schemaValueForId = (request: SchemaRequest, schemaId: string): JsonObject => {
  const value = structuredClone(request.value);
  const version = schemaVersionFromId(schemaId) || request.version;
  const publishedId = value.$id;
  value.$id =
    typeof publishedId === 'string'
      ? `${publishedId.slice(0, publishedId.lastIndexOf('/') + 1)}${version}`
      : `https://schemas.sundsvall.se/${municipalityId}/${request.name}/${version}`;

  if (isLegacySchemaVersion(version)) delete value['x-draken-external-fields'];
  return value;
};

const uiSchemaValueForId = (request: UiSchemaRequest, schemaId: string): JsonObject => {
  const value = structuredClone(request.value);
  if (!isLegacySchemaVersion(schemaVersionFromId(schemaId))) return value;

  const sections = value['ui:sections'];
  if (Array.isArray(sections)) {
    value['ui:sections'] = sections.map((section) => {
      if (!section || typeof section !== 'object' || Array.isArray(section)) return section;
      const fields = (section as JsonObject).fields;
      return {
        ...(section as JsonObject),
        fields: Array.isArray(fields)
          ? fields.filter((field) => typeof field !== 'string' || !field.startsWith('$external:'))
          : fields,
      };
    });
  }
  return value;
};

interface ClassificationPatchBody {
  expectedVersion: number;
  classification: { category: string; type: string };
  categoryLabels: Array<{ id: string }>;
  documentKey: string;
  documentETag: string;
}

const hasOnlyKeys = (value: JsonObject, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => key in value);

const isClassificationPatchBody = (body: unknown): body is ClassificationPatchBody => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const value = body as JsonObject;
  if (!hasOnlyKeys(value, ['expectedVersion', 'classification', 'categoryLabels', 'documentKey', 'documentETag']))
    return false;
  if (!value.classification || typeof value.classification !== 'object' || Array.isArray(value.classification)) {
    return false;
  }

  const classification = value.classification as JsonObject;
  return (
    Number.isSafeInteger(value.expectedVersion) &&
    (value.expectedVersion as number) >= 0 &&
    hasOnlyKeys(classification, ['category', 'type']) &&
    typeof classification.category === 'string' &&
    typeof classification.type === 'string' &&
    typeof value.documentKey === 'string' &&
    typeof value.documentETag === 'string' &&
    Array.isArray(value.categoryLabels) &&
    value.categoryLabels.every(
      (labelReference) =>
        Boolean(labelReference) &&
        typeof labelReference === 'object' &&
        !Array.isArray(labelReference) &&
        hasOnlyKeys(labelReference as JsonObject, ['id']) &&
        typeof (labelReference as JsonObject).id === 'string'
    )
  );
};

export async function installIafApiMock(page: Page, scenario: IafApiScenario = {}): Promise<IafApiTrace> {
  const investigationProfile = scenario.investigationProfile ?? defaultInvestigationProfile();
  const configuredDocumentKeys = new Set(investigationProfile.documents.map(({ key }) => key));
  const documents: Record<string, InvestigationDocument> = structuredClone(
    scenario.documents ?? { 'utredning-enhetschef': existingManagerDocument() }
  );
  const eventType = scenario.eventType ?? 'AVVIKELSE';
  let errandClassification: { category: string; type: string } = structuredClone(
    scenario.classification ??
      (eventType === 'MISSFORHALLANDE'
        ? {
            category: scenario.omitLabelResourcePaths
              ? 'SOL_LSS'
              : iafLabelFixture.classification.solLssOwner.resourcePath,
            type: scenario.omitLabelResourcePaths
              ? 'LEGAL_CERTAINTY'
              : iafLabelFixture.classification.legalCertainty.resourcePath,
          }
        : {
            category: scenario.omitLabelResourcePaths ? 'HSL' : iafLabelFixture.classification.hslOwner.resourcePath,
            type: scenario.omitLabelResourcePaths ? 'REHAB' : iafLabelFixture.classification.rehab.resourcePath,
          })
  );
  let errandLabels: MockLabel[] = structuredClone(
    scenario.labels ??
      (scenario.omitLabelResourcePaths
        ? withoutResourcePaths(eventType === 'MISSFORHALLANDE' ? misconductLabels : deviationLabels)
        : eventType === 'MISSFORHALLANDE'
        ? misconductLabels
        : deviationLabels)
  );
  let classificationPatchAttempts = 0;
  let errandVersion = 7;
  const trace: IafApiTrace = {
    profileGets: 0,
    exactSchemaIds: [],
    latestSchemaNames: [],
    documentGets: [],
    puts: [],
    classificationPatches: [],
    errandPatches: [],
    writes: [],
  };

  const buildErrand = () => ({
    id: errandId,
    errandNumber,
    title: `${application}-avvikelse för test`,
    description: '<p>Inrapporterad avvikelse.</p>',
    priority: 'MEDIUM',
    status: scenario.errandStatus ?? 'ONGOING',
    resolution: 'NONE',
    channel: 'WEB_UI',
    assignedUserId: `${applicationSlug}.test`,
    reporterUserId: `${applicationSlug}.reporter`,
    created: '2026-08-01T10:00:00.000+02:00',
    modified: '2026-08-12T09:00:00.000+02:00',
    version: errandVersion,
    classification: structuredClone(errandClassification),
    labels: structuredClone(errandLabels),
    actions: [],
    parameters: [{ key: 'eventType', displayName: 'Rapporttyp', values: [eventType] }],
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
      ...Object.values(documents).map((document) => ({
        key: document.key,
        schemaId: document.schemaId,
        value: structuredClone(document.value),
      })),
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

    if (method === 'GET' && path.endsWith('/supportmanagement/investigation-profile')) {
      trace.profileGets += 1;
      const configuredResponse =
        scenario.investigationProfileResponse === undefined
          ? investigationProfile
          : scenario.investigationProfileResponse;
      const featureFlagState = scenario.featureFlags?.find(({ name }) => name === 'useInvestigation')?.enabled;
      const response =
        featureFlagState === false &&
        configuredResponse &&
        typeof configuredResponse === 'object' &&
        !Array.isArray(configuredResponse)
          ? { ...configuredResponse, state: 'inactive' }
          : configuredResponse;
      await fulfillJson(route, response, scenario.investigationProfileStatus ?? 200);
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
      await fulfillJson(route, {
        ...metadata,
        labels: {
          labelStructure:
            scenario.labelStructure ??
            (scenario.omitLabelResourcePaths ? withoutResourcePaths(labelStructure) : labelStructure),
        },
      });
      return;
    }

    if (method === 'PATCH' && path.endsWith(`/supporterrands/${municipalityId}/${errandId}/classification`)) {
      const body = requestBody(request);
      classificationPatchAttempts += 1;
      trace.classificationPatches.push({ headers: request.headers(), body });
      trace.writes.push('classification');

      if (scenario.classificationPatchResult === 'bad-request') {
        await fulfillJson(route, { message: 'Klassificeringen kunde inte valideras.' }, 400);
        return;
      }
      if (scenario.classificationPatchResult === 'conflict') {
        await fulfillJson(route, { message: 'Ärendets klassificering har ändrats sedan den laddades.' }, 409);
        return;
      }
      if (
        scenario.classificationPatchResult === 'server-error' ||
        (scenario.classificationPatchResult === 'server-error-once' && classificationPatchAttempts === 1)
      ) {
        await fulfillJson(route, { message: 'Support Management kunde inte spara klassificeringen.' }, 500);
        return;
      }
      if (!isClassificationPatchBody(body)) {
        await fulfillJson(route, { message: 'Invalid classification body' }, 400);
        return;
      }
      if (body.expectedVersion !== errandVersion) {
        await fulfillJson(route, { message: 'Ärendets klassificering har ändrats sedan den laddades.' }, 409);
        return;
      }
      if (documents[body.documentKey]?.etag !== body.documentETag) {
        await fulfillJson(route, { message: 'Utredningsdokumentet har ändrats.' }, 409);
        return;
      }

      const resolvedCategoryLabels = body.categoryLabels.map(({ id }) => allLabelsById.get(id));
      if (resolvedCategoryLabels.some((resolvedLabel) => !resolvedLabel)) {
        await fulfillJson(route, { message: 'Unknown label id' }, 400);
        return;
      }

      errandClassification = structuredClone(body.classification);
      errandLabels = [
        ...errandLabels.filter(({ resourcePath }) => !resourcePath?.toUpperCase().startsWith('CATEGORY/')),
        ...resolvedCategoryLabels.map((resolvedLabel) => structuredClone(resolvedLabel!)),
      ];
      errandVersion += 1;
      await fulfillJson(route, buildErrand());
      return;
    }

    if (method === 'PATCH' && path.endsWith(`/supporterrands/${municipalityId}/${errandId}`)) {
      const body = requestBody(request);
      trace.errandPatches.push(body);
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        if ('classification' in body && body.classification && typeof body.classification === 'object') {
          errandClassification = structuredClone(body.classification as { category: string; type: string });
        }
        if ('labels' in body && Array.isArray(body.labels)) {
          const labelIds = body.labels
            .map((candidate) =>
              candidate && typeof candidate === 'object' && 'id' in candidate ? String(candidate.id) : undefined
            )
            .filter((id): id is string => Boolean(id));
          errandLabels = labelIds
            .map((id) => allLabelsById.get(id))
            .filter((candidate): candidate is MockLabel => Boolean(candidate))
            .map((candidate) => structuredClone(candidate));
        }
      }
      errandVersion += 1;
      await fulfillJson(route, buildErrand());
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
      if (!configuredDocumentKeys.has(key)) {
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
        trace.writes.push('document');

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

        const existingDocument = documents[key];
        const previousVersion = existingDocument?.version ?? -1;
        const nextVersion = previousVersion + 1;
        const updated: InvestigationDocument = {
          key,
          schemaId: body.schemaId,
          value: structuredClone(body.value as JsonObject),
          version: nextVersion,
          etag: `"${nextVersion}"`,
        };
        documents[key] = updated;
        errandVersion += 1;
        const { etag, ...responseDocument } = updated;
        await fulfillJson(route, responseDocument, existingDocument ? 200 : 201, {
          etag,
          'x-errand-version': String(errandVersion),
          'access-control-expose-headers': 'ETag, X-Errand-Version',
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
      const schemaValue = schemaValueForId(schemaRequest, latestSchemaIds[name]);
      if (scenario.classificationDeclarationMissingFor === name) {
        delete schemaValue['x-draken-external-fields'];
      }
      await fulfillJson(
        route,
        apiResponse({
          id: latestSchemaIds[name],
          name,
          version: schemaRequest.version,
          value: schemaValue,
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

      const uiSchemaValue = uiSchemaValueForId(uiSchemaRequests[key], schemaId);
      if (scenario.classificationSlotMisplacedFor === key && Array.isArray(uiSchemaValue['ui:sections'])) {
        uiSchemaValue['ui:sections'] = uiSchemaValue['ui:sections'].map((section, index) => {
          if (!section || typeof section !== 'object' || Array.isArray(section)) return section;
          const fields = (section as JsonObject).fields;
          if (!Array.isArray(fields)) return section;
          const fieldsWithoutClassification = fields.filter((field) => field !== '$external:errandClassification');
          return {
            ...(section as JsonObject),
            fields:
              index === 0
                ? ['$external:errandClassification', ...fieldsWithoutClassification]
                : fieldsWithoutClassification,
          };
        });
      }

      await fulfillJson(
        route,
        apiResponse({
          id: schemaId,
          value: uiSchemaValue,
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
      const version = schemaVersionFromId(schemaId) || schemaRequest.version;
      const schemaValue = schemaValueForId(schemaRequest, schemaId);
      if (scenario.classificationDeclarationMissingFor === key) {
        delete schemaValue['x-draken-external-fields'];
      }
      await fulfillJson(
        route,
        apiResponse({
          id: schemaId,
          name: key,
          version,
          value: schemaValue,
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
