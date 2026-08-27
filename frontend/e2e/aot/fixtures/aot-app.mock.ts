import type { Page, Request, Route } from '@playwright/test';

/**
 * A deliberately plain SupportManagement drake.
 *
 * This mock exists to answer one question for the IAF/VOF team: does the investigation seam stay
 * inert for a drake that is not avvikelse? So it models the *minimum* a SupportManagement app needs
 * to boot and open an errand, and nothing that belongs to avvikelse:
 *
 * - no investigation documents or JSON schemas, which back the Utredning tab's forms;
 * - no profile `labelFilter`, which for IAF/VOF replaces the overview's ordinary category filters
 *   with avvikelse's own groups (Lagrum, Rapporttyp, Klassificering);
 * - no classification PATCH, the atomic write that saves classification together with the errand's
 *   labels under two concurrency tokens - the errand version and the document ETag - because there
 *   the investigation owns classification. A plain drake saves it through the ordinary errand PATCH.
 *
 * The trace records the endpoints only the avvikelse implementation would call. A spec asserting
 * those stayed empty is asserting that the seam did not leak.
 *
 * Feature flags default to `[]` on purpose. `applyRuntimeFeatureFlags` returns early on an empty
 * list, leaving the flags the bundle was built with in place - so these specs exercise AOT's real
 * deployment configuration rather than a set of flags invented here. A scenario can still override
 * them to probe a configuration AOT does not ship.
 */

export const backendOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').origin;
export const municipalityId = '2281';
export const errandId = 'f0a1d4c6-9b23-4f18-9c40-2b6e0a7c51de';
export const application = (process.env.NEXT_PUBLIC_APPLICATION ?? 'AOT').trim().toUpperCase();
export const errandNumber = `${application}-2026-0001`;

interface MockLabel {
  id: string;
  classification: 'CATEGORY' | 'TYPE' | 'SUBTYPE';
  displayName: string;
  name: string;
  resourcePath: string;
  resourceName: string;
  labels?: MockLabel[];
}

const subtype: MockLabel = {
  id: 'a1d0f2e4-5c76-4a83-9f21-6d4b8e0c3a57',
  classification: 'SUBTYPE',
  displayName: 'Nyansökan',
  name: 'NEW_APPLICATION',
  resourcePath: 'PERMIT/SERVING_PERMIT/NEW_APPLICATION',
  resourceName: 'NEW_APPLICATION',
  labels: [],
};

const type: MockLabel = {
  id: 'b2e1a3f5-6d87-4b94-8a32-7e5c9f1d4b68',
  classification: 'TYPE',
  displayName: 'Serveringstillstånd',
  name: 'SERVING_PERMIT',
  resourcePath: 'PERMIT/SERVING_PERMIT',
  resourceName: 'SERVING_PERMIT',
  labels: [subtype],
};

const category: MockLabel = {
  id: 'c3f2b4a6-7e98-4ca5-9b43-8f6d0a2e5c79',
  classification: 'CATEGORY',
  displayName: 'Tillstånd',
  name: 'PERMIT',
  resourcePath: 'PERMIT',
  resourceName: 'PERMIT',
  labels: [type],
};

/** Exported so specs can assert on the same display names the tree is built from. */
export const aotLabelFixture = { category, type, subtype } as const;

const labelStructure: MockLabel[] = [category];

const withoutChildren = ({ labels: _labels, ...selected }: MockLabel): MockLabel => selected;

const errandLabels = [category, type, subtype].map(withoutChildren);

const metadata = {
  categories: [],
  types: [],
  statuses: [
    { name: 'ONGOING', displayName: 'Pågående' },
    { name: 'SOLVED', displayName: 'Avslutat' },
  ],
  labels: { labelStructure },
};

/**
 * What the BFF actually returns for AOT: `getSupportInvestigationProfile` finds no registered
 * profile and falls through to an empty one, which the policy service reports as state 'inactive'
 * with registration enabled. The Utredning tab must appear anyway - it is selected by the capability
 * flag, not by this profile - and a spec pins exactly that.
 */
export const emptyInvestigationProfile = () => ({
  application,
  documents: [] as unknown[],
  state: 'inactive',
  registration: { mode: 'enabled' },
});

export interface AotApiTrace {
  /** GET /supportmanagement/investigation-profile */
  profileGets: number;
  /** Endpoints only avvikelse uses. Any entry here means the seam leaked into a plain drake. */
  investigationDocumentRequests: string[];
  schemaRequests: string[];
  classificationPatches: number;
}

export interface AotApiScenario {
  featureFlags?: Array<{ name: string; enabled: boolean; value?: string }>;
  investigationProfile?: unknown;
  investigationProfileStatus?: number;
  canEdit?: boolean;
}

const apiResponse = (data: unknown) => ({ data, message: 'success' });

const fulfillJson = (route: Route, json: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });

const buildErrand = () => ({
  id: errandId,
  errandNumber,
  title: 'Ansökan om serveringstillstånd',
  description: '<p>Ärende för test.</p>',
  priority: 'MEDIUM',
  // Översikten öppnar på "Nya ärenden", så fixturen måste vara NEW för att synas där.
  status: 'NEW',
  resolution: 'NONE',
  channel: 'WEB_UI',
  assignedUserId: 'aot.test',
  reporterUserId: 'aot.reporter',
  created: '2026-08-01T10:00:00.000+02:00',
  modified: '2026-08-12T09:00:00.000+02:00',
  version: 3,
  classification: { category: category.resourcePath, type: type.resourcePath },
  labels: errandLabels,
  actions: [],
  parameters: [],
  stakeholders: [],
  externalTags: [],
});

const errandList = () => ({
  content: [buildErrand()],
  totalElements: 1,
  totalPages: 1,
  pageable: { pageNumber: 0, pageSize: 12 },
  numberOfElements: 1,
  number: 0,
  size: 12,
});

export async function installAotApiMock(page: Page, scenario: AotApiScenario = {}): Promise<AotApiTrace> {
  const trace: AotApiTrace = {
    profileGets: 0,
    investigationDocumentRequests: [],
    schemaRequests: [],
    classificationPatches: 0,
  };

  await page
    .context()
    .addCookies([{ name: 'connect.sid', value: 'test-session', domain: new URL(backendOrigin).hostname, path: '/' }]);

  await page.route(`${backendOrigin}/**`, async (route: Route) => {
    const request: Request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    if (method === 'GET' && path.endsWith('/featureflags')) {
      await fulfillJson(route, scenario.featureFlags ?? []);
      return;
    }

    if (method === 'GET' && path.endsWith('/supportmanagement/investigation-profile')) {
      trace.profileGets += 1;
      await fulfillJson(
        route,
        scenario.investigationProfile === undefined ? emptyInvestigationProfile() : scenario.investigationProfile,
        scenario.investigationProfileStatus ?? 200
      );
      return;
    }

    if (method === 'GET' && path.endsWith('/me')) {
      await fulfillJson(
        route,
        apiResponse({
          name: 'Aot Testare',
          firstName: 'Aot',
          lastName: 'Testare',
          email: 'aot.test@example.test',
          username: 'aot.test',
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

    if (method === 'GET' && (path.endsWith('/users/admins') || path.endsWith('/administrators'))) {
      await fulfillJson(route, apiResponse([]));
      return;
    }

    if (method === 'GET' && path.endsWith(`/supportmetadata/${municipalityId}`)) {
      await fulfillJson(route, metadata);
      return;
    }

    if (method === 'GET' && path.includes('/countsupporterrands/')) {
      // getSupportErrandsCount reads res.data.count; a bare number leaves the sidebar counters
      // undefined and the overview stuck on its spinner.
      await fulfillJson(route, { count: 1 });
      return;
    }

    if (method === 'GET' && path.endsWith(`/supportnotifications/${municipalityId}`)) {
      await fulfillJson(route, []);
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

    if (method === 'GET' && path.includes('/supporterrands/')) {
      const page1 = new URL(request.url()).searchParams.get('page') === '1';
      await fulfillJson(route, page1 ? { ...errandList(), content: [], numberOfElements: 0, number: 1 } : errandList());
      return;
    }

    // Avvikelse-only surface. Answered so a leak fails on the assertion rather than on a hung
    // request, but recorded so the assertion can be about the leak itself.
    const documentMatch = path.match(/\/json-parameters\/([^/]+)$/u);
    if (documentMatch) {
      trace.investigationDocumentRequests.push(decodeURIComponent(documentMatch[1]));
      await fulfillJson(route, { message: 'JSON parameter not found' }, 404);
      return;
    }

    if (path.includes(`/${municipalityId}/schemas/`)) {
      trace.schemaRequests.push(path);
      await fulfillJson(route, { message: 'Schema not found' }, 404);
      return;
    }

    if (method === 'PATCH' && path.endsWith(`/supporterrands/${municipalityId}/${errandId}/classification`)) {
      trace.classificationPatches += 1;
      await fulfillJson(route, { message: 'Classification is not owned by an investigation here.' }, 400);
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
      // The BFF conversation endpoint wraps its payload twice; the frontend service returns the
      // inner ApiResponse to its consumers.
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
