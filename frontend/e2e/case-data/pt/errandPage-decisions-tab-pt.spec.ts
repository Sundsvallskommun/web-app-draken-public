import { test, expect } from '../../fixtures/base.fixture';
import { mockAttachmentsPT } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockPhrases } from '../fixtures/mockPhrases';
import dayjs from 'dayjs';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';
import { mockPdfRender } from '../fixtures/mockDecisions';

test.describe('Decisions tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/schemas/*/ui-schema', {
      data: { id: 'mock-ui-schema-id', value: {} },
      message: 'success',
    });
    await mockRoute('**/messages/*', mockMessages);
    await mockRoute('**/phrases', mockPhrases, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins);
    await mockRoute('**/me', mockMe);
    await mockRoute('**/featureflags', []);
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/parking-permits/', mockPermits);
    await mockRoute('**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits);
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPTErrand_base),
      });
    });
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAttachmentsPT),
      });
    });
    await mockRoute('**/errands/*/decisions', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errand/errandNumber/*', mockPTErrand_base);
    await mockRoute('**/templates/phrases*', mockPhrases, { method: 'POST' });
    await mockRoute('**/errands/*/history', mockHistory);
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
    await mockRoute('**/assets?**', {});
    await mockRoute('**/contracts/2024-01026', mockPTErrand_base);
    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMessages),
      });
    });

    await mockRoute('**/sourcerelations/**/**', mockRelations);
    await mockRoute('**/targetrelations/**/**', mockRelations);
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations);
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages);
    await mockRoute('**/errands/**/extraparameters', {}, { method: 'PATCH' });
    await mockRoute('**/render/pdf', mockPdfRender, { method: 'POST' });
  });

  const visitErrand = async (page: import('@playwright/test').Page, dismissCookieConsent: () => Promise<void>) => {
    await page.goto(`arende/${mockPTErrand_base.data.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const beslutTab = page.locator('.sk-tabs-list button').nth(6);
    await expect(beslutTab).toHaveText('Beslut');
    await beslutTab.click({ force: true });
  };

  test('displays the correct fields', async ({ page, dismissCookieConsent }) => {
    await visitErrand(page, dismissCookieConsent);
    await expect(page.locator('[data-cy="decision-outcome-select"]')).toBeVisible();
    await expect(page.locator('[data-cy="law-select"]')).toBeVisible();
    await expect(page.locator('[data-cy="law-select"]')).toContainText(
      '13 kap. 8§ Parkeringstillstånd för rörelsehindrade'
    );
    await expect(page.locator('[data-cy="validFrom-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="validTo-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="decision-richtext-wrapper"]')).toBeVisible();
  });

  test('creates new decision if errand has none, then updates existing', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const errandWithoutDecisions = { ...mockPTErrand_base, data: { ...mockPTErrand_base.data, decisions: [] } };
    await mockRoute('**/errand/errandNumber/*', errandWithoutDecisions);
    await visitErrand(page, dismissCookieConsent);
    const beslutTab = page.locator('.sk-tabs-list button').nth(6);
    await expect(beslutTab).toHaveText('Beslut');
    await beslutTab.click({ force: true });

    await page.locator('[data-cy="decision-outcome-select"]').selectOption('Avslag');
    await page.locator('[data-cy="law-select"]').click();
    await page.locator('[data-cy="law-select"]').getByText('13 kap. 8 § trafikförordningen').click();
    await expect(page.locator('[data-cy="validFrom-input"]')).toBeDisabled();
    await expect(page.locator('[data-cy="validTo-input"]')).toBeDisabled();
    await page.locator('[data-cy="decision-richtext-wrapper"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Mock text');
    await page.locator('[data-cy="save-decision-button"]').click();

    // Set up mock for getting errand with decisions after create
    await mockRoute(`**/errand/${mockPTErrand_base.data.id}`, mockPTErrand_base);

    await page.getByText('Ja').click();

    const createDecisionRequest = await page.waitForRequest(
      (req) => req.url().includes('/errands/') && req.url().includes('/decisions') && req.method() === 'PATCH'
    );
    const createBody = createDecisionRequest.postDataJSON();
    expect(createBody.id).toBeUndefined();
    expect(createBody.description).toContain('Mock text');
    expect(createBody.decisionType).toBe('FINAL');
    expect(createBody.decisionOutcome).toBe('REJECTION');
    expect(createBody.decidedBy).toEqual({
      type: 'PERSON',
      firstName: 'My',
      lastName: 'Testsson',
      adAccount: 'kctest',
      roles: ['ADMINISTRATOR'],
      addresses: [],
      contactInformation: [],
      extraParameters: {},
    });
    expect(createBody.law).toEqual([
      {
        heading: '13 kap. 8 § trafikförordningen',
        sfs: 'Trafikförordningen (1998:1276)',
        chapter: '13',
        article: '8',
      },
    ]);

    await page.waitForResponse(
      (resp) => resp.url().includes(`/errand/${mockPTErrand_base.data.id}`) && resp.status() === 200
    );
    await page.locator('[data-cy="decision-richtext-wrapper"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Mock text');
    await page.locator('[data-cy="save-decision-button"]').click();

    const finalDecisionId = mockPTErrand_base.data.decisions.find((d) => d.decisionType === 'FINAL')?.id;
    await mockRoute(`**/decisions/${finalDecisionId}`, mockPTErrand_base, { method: 'PUT' });

    await page.getByText('Ja').click();

    const updateDecisionRequest = await page.waitForRequest(
      (req) => req.url().includes(`/decisions/${finalDecisionId}`) && req.method() === 'PUT'
    );
    const updateBody = updateDecisionRequest.postDataJSON();
    expect(updateBody.id).toBe(1);
  });

  test('can edit decision fields for rejection', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/errand/errandNumber/*', mockPTErrand_base);
    await visitErrand(page, dismissCookieConsent);
    await mockRoute('**/render/pdf', mockPdfRender, { method: 'POST' });

    const finalDecisionId = mockPTErrand_base.data.decisions.find((d) => d.decisionType === 'FINAL')?.id;
    await mockRoute(`**/decisions/${finalDecisionId}`, mockPTErrand_base, { method: 'PUT' });

    await page.locator('[data-cy="decision-outcome-select"]').selectOption('Avslag');
    await expect(page.locator('[data-cy="validFrom-input"]')).toBeDisabled();
    await expect(page.locator('[data-cy="validTo-input"]')).toBeDisabled();
    await page.locator('[data-cy="decision-richtext-wrapper"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Mock text');
    await page.locator('[data-cy="save-decision-button"]').click();
    await page.getByText('Ja').click();

    const updateDecisionRequest = await page.waitForRequest(
      (req) => req.url().includes(`/decisions/${finalDecisionId}`) && req.method() === 'PUT'
    );
    const body = updateDecisionRequest.postDataJSON();
    expect(body.id).toBe(1);
    expect(body.description).toContain('Mock text');
    expect(body.decisionType).toBe('FINAL');
    expect(body.decisionOutcome).toBe('REJECTION');
    expect(body.decidedBy).toEqual({
      type: 'PERSON',
      firstName: 'My',
      lastName: 'Testsson',
      adAccount: 'kctest',
      roles: ['ADMINISTRATOR'],
      addresses: [],
      contactInformation: [],
      extraParameters: {},
    });
    expect(body.law).toEqual([
      {
        heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
        sfs: 'Trafikförordningen (1998:1276)',
        chapter: '13',
        article: '8',
      },
    ]);
  });

  test('can edit decision fields for approval', async ({ page, mockRoute, dismissCookieConsent }) => {
    await visitErrand(page, dismissCookieConsent);
    await mockRoute('**/render/pdf', mockPTErrand_base, { method: 'POST' });

    const finalDecisionId = mockPTErrand_base.data.decisions.find((d) => d.decisionType === 'FINAL')?.id;
    await mockRoute(`**/decisions/${finalDecisionId}`, mockPTErrand_base, { method: 'PUT' });

    await page.locator('[data-cy="decision-outcome-select"]').selectOption('Bifall');
    await expect(page.locator('[data-cy="law-select"]')).toBeVisible();
    await page.locator('[data-cy="validFrom-input"]').clear();
    await page.locator('[data-cy="validFrom-input"]').fill('2024-07-11');
    await page.locator('[data-cy="validTo-input"]').clear();
    await page.locator('[data-cy="validTo-input"]').fill('2024-08-11');
    await page.locator('[data-cy="decision-richtext-wrapper"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Mock text');
    await page.locator('[data-cy="save-decision-button"]').click();
    await page.getByText('Ja').click();

    const updateDecisionRequest = await page.waitForRequest(
      (req) => req.url().includes(`/decisions/${finalDecisionId}`) && req.method() === 'PUT'
    );
    const body = updateDecisionRequest.postDataJSON();
    expect(body.id).toBe(1);
    expect(body.description).toContain('Mock text');
    expect(body.decisionType).toBe('FINAL');
    expect(body.decisionOutcome).toBe('APPROVAL');
    expect(body.decidedBy).toEqual({
      type: 'PERSON',
      firstName: 'My',
      lastName: 'Testsson',
      adAccount: 'kctest',
      roles: ['ADMINISTRATOR'],
      addresses: [],
      contactInformation: [],
      extraParameters: {},
    });
    expect(body.validFrom).toBe(dayjs('2024-07-11').startOf('day').toISOString());
    expect(body.validTo).toBe(dayjs('2024-08-11').endOf('day').toISOString());
    expect(body.law).toEqual([
      {
        heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
        sfs: 'Trafikförordningen (1998:1276)',
        chapter: '13',
        article: '8',
      },
    ]);
  });

  test('shows validation error when no decision is selected', async ({ page, dismissCookieConsent }) => {
    await visitErrand(page, dismissCookieConsent);

    let updateDecisionRequestCount = 0;
    await page.route('**/decisions/**', async (route) => {
      if (route.request().method() === 'PUT') {
        updateDecisionRequestCount++;
      }
      await route.fallback();
    });

    await page.locator('[data-cy="decision-outcome-select"]').selectOption('Välj utfall');
    await expect(page.locator('[data-cy="validFrom-input"]')).toBeDisabled();
    await expect(page.locator('[data-cy="validTo-input"]')).toBeDisabled();
    await page.locator('[data-cy="decision-richtext-wrapper"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Mock text');
    await page.locator('[data-cy="save-decision-button"]').click();

    await expect(page.getByText('Beslut måste anges')).toBeVisible();
    expect(updateDecisionRequestCount).toBe(0);
  });

  test('shows validation error when dates are incomplete for approval', async ({ page, dismissCookieConsent }) => {
    await visitErrand(page, dismissCookieConsent);

    let updateDecisionRequestCount = 0;
    await page.route('**/decisions/**', async (route) => {
      if (route.request().method() === 'PUT') {
        updateDecisionRequestCount++;
      }
      await route.fallback();
    });

    await page.locator('[data-cy="decision-outcome-select"]').selectOption('Bifall');
    await expect(page.locator('[data-cy="law-select"]')).toBeVisible();
    await page.locator('[data-cy="decision-richtext-wrapper"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Mock text');

    await page.locator('[data-cy="validFrom-input"]').clear();
    await page.locator('[data-cy="validTo-input"]').clear();
    await page.locator('[data-cy="validTo-input"]').fill('2024-08-11');
    await page.locator('[data-cy="save-decision-button"]').click();

    await expect(page.getByText('Giltig från måste anges')).toBeVisible();
    expect(updateDecisionRequestCount).toBe(0);
  });
});
