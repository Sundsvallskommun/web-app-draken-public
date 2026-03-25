import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockCategories, mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrands,
  mockSupportErrandsEmpty,
  mockSupportMessages,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
//TODO:Update mockdata
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';

test.describe('register page', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/newerrand/2281', mockEmptySupportErrand, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });
    await mockRoute(
      `**/supporterrands/errandnumber/${mockEmptySupportErrand.errandNumber}`,
      mockEmptySupportErrand,
      { method: 'GET' }
    );
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute('**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
    await mockRoute('**/supporterrands/2281?page=1*', mockSupportErrandsEmpty, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
      method: 'GET',
    });
    await page.goto('registrera');
    await dismissCookieConsent();
    await page.waitForResponse((resp) => resp.url().includes('newerrand') && resp.status() === 200);
  });

  test('displays the support errand part of the register form', async ({ page }) => {
    await expect(page.locator('[data-cy="category-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="type-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="contactReason-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="channel-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="errand-description-richtext-wrapper"]')).toBeVisible();
    await expect(
      page.locator('[data-cy="errand-description-richtext-wrapper"]').locator('..').locator("div.ql-editor.ql-blank")
    ).toBeVisible();
    await page.locator('[data-cy="show-contactReasonDescription-input"]').check({ force: true });
    await expect(page.locator('[data-cy="contactReasonDescription-input"]')).toBeVisible();
  });

  test('displays the admin part of the register form', async ({ page }) => {
    await expect(page.locator('[data-cy="admin-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="status-input"]')).toBeVisible();
  });

  test('sends the correct data for new errand', async ({ page, mockRoute }) => {
    const patchFacility = {
      id: 123,
    };
    await mockRoute(
      '**/supporterrands/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      patchFacility,
      { method: 'PATCH' }
    );
    const cat = mockCategories[0];
    const typ = cat.types[0];
    await page.locator('[data-cy="category-input"]').selectOption(cat.displayName);
    await page.locator('[data-cy="type-input"]').selectOption(typ.displayName);
    await page.locator('[data-cy="errand-description-richtext-wrapper"]').type('Mock description');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) && req.method() === 'PATCH'
      ),
      page.locator('[data-cy="save-button"]').click(),
    ]);
    const body = request.postDataJSON();
    expect(body).toEqual({
      assignedUserId: mockEmptySupportErrand.assignedUserId,
      businessRelated: false,
      classification: {
        category: cat.name,
        type: typ.name,
      },
      description: '<p>Mock description</p>',
      externalTags: mockEmptySupportErrand.externalTags,
      labels: [],
      parameters: [],
      channel: 'PHONE',
      priority: 'MEDIUM',
      resolution: 'INFORMED',
      stakeholders: [],
      status: 'ONGOING',
      suspension: {},
    });
  });

  test('sends the correct data for new errand. after changes', async ({ page, mockRoute }) => {
    const patchFacility = {
      id: 123,
    };
    await mockRoute(
      '**/supporterrands/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490',
      patchFacility,
      { method: 'PATCH' }
    );
    const cat = mockCategories[2];
    const typ = cat.types[2];
    await page.locator('[data-cy="category-input"]').selectOption(cat.displayName);
    await page.locator('[data-cy="type-input"]').selectOption(typ.displayName);
    await page.locator('[data-cy="errand-description-richtext-wrapper"]').type('Mock description');
    await page.locator('[data-cy="contactReason-input"]').selectOption('E-tjänst saknas');
    await page.locator('[data-cy="show-contactReasonDescription-input"]').check({ force: true });
    await page.locator('[data-cy="contactReasonDescription-input"]').fill('Mock contact reason description');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) && req.method() === 'PATCH'
      ),
      page.locator('[data-cy="save-button"]').click(),
    ]);
    const body = request.postDataJSON();
    expect(body).toEqual({
      assignedUserId: mockEmptySupportErrand.assignedUserId,
      businessRelated: false,
      classification: {
        category: cat.name,
        type: typ.name,
      },
      externalTags: mockEmptySupportErrand.externalTags,
      contactReason: 'E-tjänst saknas',
      contactReasonDescription: 'Mock contact reason description',
      labels: [],
      parameters: [],
      channel: 'PHONE',
      priority: 'MEDIUM',
      resolution: 'INFORMED',
      stakeholders: [],
      description: '<p>Mock description</p>',
      status: 'ONGOING',
      suspension: {},
    });
  });
});
