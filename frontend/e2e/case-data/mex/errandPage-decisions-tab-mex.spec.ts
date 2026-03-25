import { test, expect } from '../../fixtures/base.fixture';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockPhrases } from '../fixtures/mockPhrases';
import { mockHistory } from '../fixtures/mockHistory';
import { mockMessages } from '../fixtures/mockMessages';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockMe } from '../fixtures/mockMe';
import { mockPermits } from '../fixtures/mockPermits';
import { mockAsset } from '../fixtures/mockAsset';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockContractAttachment, mockLeaseAgreement, mockPurchaseAgreement } from '../fixtures/mockContract';
import { mockConversations, mockConversationMessages } from '../fixtures/mockConversations';
import { mockRelations } from '../fixtures/mockRelations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';

test.describe('Decisions tab', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' }, { method: 'GET' });
    await mockRoute('**/messages/*', mockMessages, { method: 'GET' });
    await mockRoute('**/phrases', mockPhrases, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/parking-permits/', mockPermits, { method: 'GET' });
    await mockRoute('**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits, { method: 'GET' });
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') { await route.fallback(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMexErrand_base) });
    }); // @getErrandById
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    }); // @getErrandAttachments
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/contract/**', mockPurchaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/templates/phrases*', mockPhrases, { method: 'POST' }); // @getPhrases
    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' }); // @getHistory
    await mockRoute('**/assets?partyId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc&type=PARKINGPERMIT', mockAsset, { method: 'GET' });
    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMessages) });
    });

    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment

    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' }); // @getSourceRelations
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' }); // @getTargetRelations
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' }); // @getConversations
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' }); // @getConversationMessages
    await mockRoute('**/assets**', mockAsset, { method: 'GET' }); // @getAssets
    await mockRoute('**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' }); // @getJsonSchema
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' }, { method: 'GET' }); // @getUiSchema
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' }); // @getEstateInfo

    await page.goto(`arende/${mockMexErrand_base.data.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const tab = page.locator('.sk-tabs-list button').nth(5);
    await expect(tab).toHaveText('Beslut');
    await tab.click({ force: true });
  });

  test('displays the correct fields', async ({ page }) => {
    await expect(page.locator('[data-cy="decision-outcome-select"]')).toBeVisible();
    await expect(page.locator('[data-cy="validFrom-input"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="validTo-input"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="decision-richtext-wrapper"]')).toBeVisible();
  });

  test('can edit decision fields', async ({ page, mockRoute }) => {
    await mockRoute('**/render/pdf', mockMexErrand_base, { method: 'POST' }); // @postRenderPdf
    await mockRoute(`**/decisions/${mockMexErrand_base.data.decisions[0].id}`, mockMexErrand_base, { method: 'PUT' }); // @updateDecision

    await page.locator('[data-cy="decision-outcome-select"]').selectOption({ index: 2 });
    await page.locator('[data-cy="decision-richtext-wrapper"] .ql-editor').clear();
    await page.locator('[data-cy="decision-richtext-wrapper"] .ql-editor').type('Mock text', { delay: 100 });
    await page.locator('[data-cy="save-decision-button"]').click();
    await page.getByRole('button', { name: 'Ja' }).click();

    const updateDecisionRequest = await page.waitForRequest(
      (req) => req.url().includes('/decisions/') && req.method() === 'PUT'
    );
    const body = updateDecisionRequest.postDataJSON();
    expect(body.description).toContain('Mock text');
    expect(body.decisionType).toBe('FINAL');
  });

  test('save button enabled but send decision is disabled if no decision, fromDate or toDate is selected', async ({ page }) => {
    await page.locator('[data-cy="decision-outcome-select"]').selectOption('Välj utfall');
    await page.locator('[data-cy="decision-richtext-wrapper"] .ql-editor').clear();
    await page.locator('[data-cy="decision-richtext-wrapper"] .ql-editor').type('Mock text', { delay: 100 });
    await expect(page.getByText('Beslut måste anges')).toBeVisible();
    await expect(page.locator('[data-cy="save-decision-button"]')).toBeEnabled();
    await expect(page.locator('[data-cy="save-and-send-decision-button"]')).toBeDisabled();
  });
});
