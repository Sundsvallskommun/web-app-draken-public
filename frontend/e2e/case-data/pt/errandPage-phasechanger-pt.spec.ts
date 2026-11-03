import { Role } from '@casedata/interfaces/role';

import { expect, test } from '../../fixtures/base.fixture';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockHistory } from '../fixtures/mockHistory';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';

// A registered errand from Kontakt Sundsvall, waiting for the handler to start handling it.
const registeredErrand = (stakeholders = mockPTErrand_base.data.stakeholders) => ({
  ...mockPTErrand_base,
  data: {
    ...mockPTErrand_base.data,
    caseType: 'PARATRANSIT_FROM_KS',
    phase: 'Aktualisering',
    status: { statusType: 'Ärende inkommit', description: 'Ärende inkommit', created: '2023-12-14T13:50:45.765+01:00' },
    decisions: [],
    stakeholders,
    extraParameters: [
      { key: 'process.displayPhase', values: ['Registrerad'] },
      { key: 'process.phaseStatus', values: ['WAITING'] },
      { key: 'process.phaseAction', values: ['UNKNOWN'] },
    ],
  },
});

// The same errand once the process has picked up the COMPLETE and moved the handling on to Granskning.
const errandInReview = () => {
  const errand = registeredErrand();
  return {
    ...errand,
    data: {
      ...errand.data,
      status: {
        statusType: 'Under granskning',
        description: 'Under granskning',
        created: '2023-12-14T13:52:45.765+01:00',
      },
      extraParameters: [
        { key: 'process.displayPhase', values: ['Granskning'] },
        { key: 'process.phaseStatus', values: ['ONGOING'] },
        { key: 'process.phaseAction', values: ['UNKNOWN'] },
      ],
    },
  };
};

test.describe('Phase changer', () => {
  const visitErrand = async (
    page: import('@playwright/test').Page,
    mockRoute: (pattern: string, response: unknown, options?: { method?: string }) => Promise<void>,
    dismissCookieConsent: () => Promise<void>,
    errand: ReturnType<typeof registeredErrand>
  ) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/messages/*', mockMessages);
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins);
    await mockRoute('**/me', mockMe);
    await mockRoute('**/featureflags', []);
    await mockRoute('**/assets?**', {});
    await mockRoute('**/errands/*/history', mockHistory);
    await mockRoute('**/sourcerelations/**/**', mockRelations);
    await mockRoute('**/targetrelations/**/**', mockRelations);
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations);
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages);
    await page.route(/\/errand\/\d+\/attachments$/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) })
    );
    await page.route(/\/errand\/\d+\/messages$/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMessages) })
    );
    await page.route(/\/errand\/\d+$/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(errand) })
    );
    await mockRoute('**/errand/errandNumber/*', errand);
    await mockRoute('**/errands/*', { data: { errandId: errand.data.id }, message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errands/*/extraparameters', [], { method: 'PATCH' });
    await mockRoute('**/errands/*/stakeholders/*', {}, { method: 'PATCH' });
    await mockRoute('**/errands/*/stakeholders', {}, { method: 'PATCH' });
    await mockRoute('**/errands/*/stakeholders/*', {}, { method: 'DELETE' });

    await page.goto(`arende/${errand.data.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
  };

  test('shows an error toast and sends no phase change while the errand has no ärendeägare', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const processPatches: unknown[] = [];
    await page.route('**/errands/*/extraparameters/process', async (route) => {
      processPatches.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });
    const stakeholdersWithoutOwner = mockPTErrand_base.data.stakeholders.filter(
      (stakeholder) => !stakeholder.roles.includes(Role.APPLICANT)
    );
    await visitErrand(page, mockRoute, dismissCookieConsent, registeredErrand(stakeholdersWithoutOwner));

    const startButton = page.getByRole('button', { name: 'Starta handläggning' });
    await expect(startButton).toBeEnabled();
    await expect(page.getByText('Ärendet saknar ärendeägare.')).not.toBeVisible();
    await startButton.click();

    await expect(page.getByText('Ärendet saknar ärendeägare.')).toBeVisible();
    expect(processPatches).toHaveLength(0);
  });

  test('starts the handling and sends COMPLETE when the errand has an ärendeägare', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const processPatches: unknown[] = [];
    await page.route('**/errands/*/extraparameters/process', async (route) => {
      processPatches.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });
    await visitErrand(page, mockRoute, dismissCookieConsent, registeredErrand());

    const startButton = page.getByRole('button', { name: 'Starta handläggning' });
    await startButton.click();

    await expect.poll(() => processPatches.length).toBeGreaterThan(0);
    await expect(page.getByText('Ärendet saknar ärendeägare.')).not.toBeVisible();
    expect(processPatches[0]).toEqual([{ key: 'process.phaseAction', values: ['COMPLETE'] }]);
  });

  test('shows Fasbyte pågår while a fast process starts the handling', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const errandWaitingForProcess = {
      ...registeredErrand(),
      data: {
        ...registeredErrand().data,
        extraParameters: [
          { key: 'process.displayPhase', values: ['Registrerad'] },
          { key: 'process.phaseStatus', values: ['WAITING'] },
          { key: 'process.phaseAction', values: ['COMPLETE'] },
        ],
      },
    };
    let errandOnServer: object = registeredErrand();
    await page.route('**/errands/*/extraparameters/process', async (route) => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
      // The process moves the errand on after half a second, well within the one second between polls.
      errandOnServer = errandWaitingForProcess;
      setTimeout(() => (errandOnServer = errandInReview()), 500);
    });
    await visitErrand(page, mockRoute, dismissCookieConsent, registeredErrand());
    await page.route(/\/errand\/\d+$/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(errandOnServer) })
    );

    await page.getByRole('button', { name: 'Starta handläggning' }).click();

    await expect(page.getByRole('button', { name: /Fasbyte pågår/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inled utredning' })).toBeVisible();
  });

  test('shows Fasbyte pågår while the process discards the first COMPLETE', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const processPatches: unknown[] = [];
    let errandOnServer: object = registeredErrand();
    await page.route('**/errands/*/extraparameters/process', async (route) => {
      processPatches.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
      // The process overwrites the first COMPLETE with UNKNOWN and only moves on once it is resent.
      if (processPatches.length > 1) {
        errandOnServer = errandInReview();
      }
    });
    await visitErrand(page, mockRoute, dismissCookieConsent, registeredErrand());
    await page.route(/\/errand\/\d+$/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(errandOnServer) })
    );

    await page.getByRole('button', { name: 'Starta handläggning' }).click();

    await expect(page.getByRole('button', { name: /Fasbyte pågår/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inled utredning' })).toBeVisible({ timeout: 10000 });
    expect(processPatches).toHaveLength(2);
  });

  test('sends COMPLETE again, at most twice, while the process keeps discarding it', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const processPatches: unknown[] = [];
    await page.route('**/errands/*/extraparameters/process', async (route) => {
      processPatches.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });
    // The mocked errand stays in Registrerad with phaseAction UNKNOWN, as when the process overwrites COMPLETE.
    await visitErrand(page, mockRoute, dismissCookieConsent, registeredErrand());

    await page.getByRole('button', { name: 'Starta handläggning' }).click();

    await expect.poll(() => processPatches.length, { timeout: 10000 }).toBe(3);
    await page.waitForTimeout(2500);
    expect(processPatches).toHaveLength(3);
    processPatches.forEach((patch) => expect(patch).toEqual([{ key: 'process.phaseAction', values: ['COMPLETE'] }]));
  });

  test('does not send COMPLETE again once the process has moved the errand on', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const processPatches: unknown[] = [];
    await page.route('**/errands/*/extraparameters/process', async (route) => {
      processPatches.push(route.request().postDataJSON());
      // The process handles the COMPLETE, so every later fetch of the errand returns it in Granskning.
      await page.route(/\/errand\/\d+$/, (errandRoute) =>
        errandRoute.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(errandInReview()) })
      );
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });
    await visitErrand(page, mockRoute, dismissCookieConsent, registeredErrand());

    await page.getByRole('button', { name: 'Starta handläggning' }).click();

    await expect(page.getByRole('button', { name: 'Inled utredning' })).toBeVisible({ timeout: 10000 });
    expect(processPatches).toHaveLength(1);
  });
});
