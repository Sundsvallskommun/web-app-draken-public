import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockConversationMessages, mockConversations } from './fixtures/mockConversations';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockRelations } from './fixtures/mockRelations';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSaveFacilities,
  mockSupportAttachments,
  mockSupportErrands,
  mockSupportErrandsEmpty,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';

test.describe('register page', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/newerrand/2281', mockEmptySupportErrand, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=1*', mockSupportErrandsEmpty, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSaveFacilities, { method: 'PATCH' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });
    await page.goto('registrera');
    await dismissCookieConsent();
  });

  test('displays the support errand part of the register form', async ({ page }) => {
    await expect(page.locator('[data-cy="labelCategory-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="labelType-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="channel-input"]')).toBeVisible();
    // await expect(page.locator('[data-cy="description-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="errand-description-richtext-wrapper"]')).toBeVisible();
  });

  test('displays the admin part of the register form', async ({ page }) => {
    await expect(page.locator('[data-cy="admin-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="status-input"]')).toBeVisible();
  });

  test('sends the correct data for new errand', async ({ page, mockRoute }) => {
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'GET' });

    const labelCat = mockMetaData?.labels?.labelStructure?.[0];
    const labelType = labelCat?.labels?.[0];
    delete labelCat.labels;
    delete labelType.labels;

    expect(labelCat).toBeDefined();
    expect(labelCat?.displayName).toBeDefined();
    expect(labelType).toBeDefined();
    expect(labelType?.displayName).toBeDefined();

    await page.locator('[data-cy="labelCategory-input"]').selectOption(labelCat!.displayName!);
    await page.locator('[data-cy="labelType-input"]').click();
    await page.locator('[data-cy="labelType-list"]').locator('*').filter({ hasText: labelType!.displayName! }).click();
    await page.locator('[data-cy="errand-description-richtext-wrapper"]').fill('Mock description');

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) && resp.request().method() === 'PATCH'
      ),
      page.locator('[data-cy="save-button"]').click(),
    ]);

    const request = response.request();
    const requestBody = request.postDataJSON();

    expect(requestBody.classification.category).toBe(labelCat!.resourcePath!);
    expect(requestBody.classification.type).toBe(labelType!.resourcePath!);
    expect(requestBody.labels.map((label: any) => label.resourcePath)).toContain(labelCat!.resourcePath!);
    expect(requestBody.labels.map((label: any) => label.resourcePath)).toContain(labelType!.resourcePath!);
    expect(requestBody.channel).toBe('PHONE');
    expect(requestBody.priority).toBe('MEDIUM');
    expect(requestBody.description).toBe('<p>Mock description</p>');
    expect(requestBody).toEqual({
      assignedUserId: mockEmptySupportErrand.assignedUserId,
      businessRelated: false,
      classification: {
        category: labelCat?.resourcePath,
        type: labelType?.resourcePath,
      },
      externalTags: mockEmptySupportErrand.externalTags,
      labels: [labelCat, labelType],
      channel: 'PHONE',
      parameters: [],
      priority: 'MEDIUM',
      resolution: 'INFORMED',
      stakeholders: [],
      description: '<p>Mock description</p>',
      status: 'NEW',
      suspension: {},
    });

    expect([200, 304]).toContain(response.status());
  });
});
