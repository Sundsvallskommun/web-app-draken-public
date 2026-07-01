import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { expect, test } from '../fixtures/base.fixture';
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';
import { mockComments } from './fixtures/mockComments';
import { mockHandoverPreview, mockHandoverResult, mockNamespaceConfigs } from './fixtures/mockHandover';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockSupportAttachments, mockSupportErrand, mockSupportMessages } from './fixtures/mockSupportErrands';
import { mockSupportHistory } from './fixtures/mockSupportHistory';

test.describe('errand handover to another namespace', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute(`**/supportmessage/2281/errands/${mockSupportErrand.id}/communication`, mockSupportMessages, {
      method: 'GET',
    });
    await mockRoute(`**/supportnotes/2281/${mockSupportErrand.id}`, mockComments, { method: 'GET' });
    await mockRoute(`**/supporthistory/2281/${mockSupportErrand.id}`, mockSupportHistory, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });
    await mockRoute('**/party/*/statuses', mockStakeholderStatus, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, { method: 'GET' });
    // Refetch of the (now closed) source errand after a successful handover, mirroring MEX.
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, { method: 'GET' });

    // Handover-specific endpoints
    await mockRoute('**/supportnamespaceconfigs/2281', mockNamespaceConfigs, { method: 'GET' });
    await mockRoute('**/supportnamespacemetadata/2281/*', {}, { method: 'GET' });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}/handover/preview`, mockHandoverPreview, {
      method: 'POST',
    });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}/handover`, mockHandoverResult, {
      method: 'POST',
      status: 201,
    });
  });

  test('hands over the errand to another namespace and opens the new errand', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Step 1 – open modal, choose "Draken" and pick the target namespace (where MEX is also listed).
    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();
    await expect(page.locator('article.sk-modal-dialog')).toBeVisible();
    await page.locator('.sk-modal-dialog [type="radio"]').nth(0).check();

    // Selecting the namespace triggers the preview automatically (no "Nästa" click).
    const previewResponse = page.waitForResponse((resp) => resp.url().includes('/handover/preview'));
    await page.locator('.sk-modal-dialog [data-cy="resolution-input"]').selectOption('ROB');
    await previewResponse;

    // Step 2 – review renders, auto-suggestions are preselected.
    await expect(page.locator('[data-cy="handover-review"]')).toBeVisible();
    await expect(page.locator('[data-cy="handover-category-select"]')).toHaveValue('ADMINISTRATION');
    await expect(page.locator('[data-cy="handover-contactreason-select"]')).toHaveValue('Allmän fråga');
    await expect(page.locator('[data-cy="handover-warning"]')).toBeVisible();

    // Step 2 -> execute. Same label + confirmation dialog as the MEX forward.
    await page.locator('[data-cy="handover-submit-button"]').filter({ hasText: 'Överlämna ärendet' }).click();
    await expect(page.locator('.sk-dialog')).toContainText('Vill du överlämna ärendet?');

    // Assert the idempotency key is sent so retries don't create duplicates.
    const handoverRequest = page.waitForRequest((req) => req.url().endsWith('/handover') && req.method() === 'POST');
    await page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click();
    const request = await handoverRequest;
    expect(request.headers()['idempotency-key']).toBeTruthy();

    // Like the MEX forward: the modal closes after a successful handover (no in-modal success view).
    await expect(page.locator('article.sk-modal-dialog')).toBeHidden();
  });
});
