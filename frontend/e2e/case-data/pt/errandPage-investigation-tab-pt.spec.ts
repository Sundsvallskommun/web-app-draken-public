import { Role } from '@casedata/interfaces/role';
import { test, expect } from '../../fixtures/base.fixture';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockPhrases } from '../fixtures/mockPhrases';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockPermits } from '../fixtures/mockPermits';
import { mockPTErrand_base } from '../fixtures/mockPtErrand';
import { mockRelations } from '../fixtures/mockRelations';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';

test.describe('Investigation tab', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' });
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
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
        body: JSON.stringify(mockAttachments),
      });
    });
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errand/errandNumber/*', mockPTErrand_base);
    await mockRoute('**/templates/phrases*', mockPhrases, { method: 'POST' });
    await mockRoute('**/errands/*/history', mockHistory);
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset);
    await mockRoute('**/errands/*/decisions/*', mockPTErrand_base, { method: 'PUT' });
    await mockRoute('**/contracts/2024-01026', mockPTErrand_base);
    await mockRoute('**/assets?**', {});
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

    await page.goto(`arende/${mockPTErrand_base.data.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const utredningTab = page.locator('.sk-tabs-list button').nth(5);
    await expect(utredningTab).toHaveText('Utredning');
    await utredningTab.click({ force: true });
  });

  test('displays the correct data', async ({ page }) => {
    const recommendedDescription = mockPTErrand_base.data.decisions.find(
      (d) => d.decisionType === 'RECOMMENDED'
    )?.description;
    await expect(page.locator('[data-cy="recommended-decision"]')).toHaveText(recommendedDescription!);
    await expect(page.locator('[data-cy="investigation-law-select"]')).toHaveValue('');
    await page.locator('[data-cy="investigation-law-select"]').selectOption('20§ förvaltningslagen');
    await page.locator('[data-cy="investigation-law-select"]').selectOption('13 kap. 8 § trafikförordningen');
    await expect(page.locator('[data-cy="outcome-select"]')).toHaveValue('APPROVAL');
    await expect(page.locator('[data-cy="utredning-richtext-wrapper"]')).toContainText('Utredningstext');
  });

  test('can edit investigation fields', async ({ page, mockRoute }) => {
    await mockRoute('**/errands/**/extraparameters', {}, { method: 'PATCH' });
    await mockRoute('**/render/pdf', mockPTErrand_base, { method: 'POST' });

    await page.locator('[data-cy="investigation-law-select"]').selectOption('13 kap. 8 § trafikförordningen');
    await page.locator('[data-cy="outcome-select"]').selectOption('REJECTION');
    await page.getByText('Ja').click();
    await page.locator('[data-cy="utredning-richtext-wrapper"]').clear();
    await page.locator('[data-cy="utredning-richtext-wrapper"]').fill('Mock text');
    await page.locator('[data-cy="save-utredning-button"]').click();
    await page.getByText('Ja').click();

    const decidedBy = mockPTErrand_base.data.stakeholders.find((s) => s.roles.includes(Role.ADMINISTRATOR))!;

    const { id, created, updated, personId, personalNumber, ...sanitizedStakeholder } = decidedBy;

    const updateDecisionRequest = await page.waitForRequest(
      (req) => req.url().includes('/errands/') && req.url().includes('/decisions/') && req.method() === 'PUT'
    );
    const body = updateDecisionRequest.postDataJSON();
    expect(body.id).toBe(29);
    expect(body.description).toContain('Mock text');
    expect(body.decisionType).toBe('PROPOSED');
    expect(body.decisionOutcome).toBe('REJECTION');
    expect(body.decidedBy).toEqual(sanitizedStakeholder);
    expect(body.law).toEqual([
      {
        heading: '13 kap. 8 § trafikförordningen',
        sfs: 'Trafikförordningen (1998:1276)',
        chapter: '13',
        article: '8',
      },
    ]);
  });

  test('disables save button if investigation text is empty', async ({ page }) => {
    await page.locator('[data-cy="utredning-richtext-wrapper"]').clear();
    await expect(page.locator('[data-cy="save-utredning-button"]')).toBeDisabled();
  });
});
