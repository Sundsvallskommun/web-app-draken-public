import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockResolvedRelations } from '../case-data/fixtures/mockRelations';
import { mockConversationMessages, mockConversationReadByCounts } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportErrandCommunication,
  mockSupportNotes,
} from './fixtures/mockSupportErrands';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';

/**
 * Katla is answered on the errand's own internal conversation - the one no errand relation points
 * at - so unlike the Draken thread it must not require a linked errand.
 */
const eserviceErrand = { ...mockSupportErrand, channel: 'ESERVICE' };
const errandId = mockSupportErrand.id;
const relationlessConversationId = 'ededeed1-ed21-4b30-9e0c-1252c878153a';
const createdConversationId = 'facefac1-ed21-4b30-9e0c-1252c878153b';

const conversationsWithout = {
  data: {
    data: [
      {
        id: 'cdcdcdcd-ed21-4b30-9e0c-1252c878153e',
        topic: 'Meddelande från Mina sidor',
        type: 'EXTERNAL',
        relationIds: [],
      },
      {
        id: 'abababab-ed21-4b30-9e0c-1252c878153f',
        topic: 'Ärende: #KC-00000001',
        type: 'INTERNAL',
        relationIds: ['bd835475-cbc2-4b92-979d-8bc18bd75385'],
      },
    ],
    message: 'success',
  },
  message: 'success',
};

const conversationsWith = {
  data: {
    data: [
      ...conversationsWithout.data.data,
      { id: relationlessConversationId, topic: 'KC-00000001', type: 'INTERNAL', relationIds: [] },
    ],
    message: 'success',
  },
  message: 'success',
};

test.describe('Katla conversation', () => {
  const openNewMessage = async (page: import('@playwright/test').Page) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await page.locator('.sk-cookie-consent-btn-wrapper').getByText('Godkänn alla').click();
    await page.getByRole('tab', { name: /Meddelanden/ }).click();
    await page.locator('[data-cy="new-message-button"]').click();
  };

  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute(`**/supporterrands/2281/${errandId}`, eserviceErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, eserviceErrand, {
      method: 'GET',
    });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportmessage/2281/errands/*/communication', mockSupportErrandCommunication, {
      method: 'GET',
    });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/resolvedrelations/**/**', mockResolvedRelations, { method: 'GET' });
    await mockRoute('**/party/*/statuses', mockStakeholderStatus, { method: 'GET' });
    await mockRoute('**/communication/conversations/count-read-by*', mockConversationReadByCounts, { method: 'GET' });
    await mockRoute('**/communication/conversations/*/messages/mark-as-read', {}, { method: 'POST' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
      method: 'GET',
    });
    await mockRoute('**/party-services*', { data: [] }, { method: 'GET' });
    await mockRoute('**/templates?*', { data: [], message: 'success' }, { method: 'GET' });
    // The message itself is answered for both tests; only the conversation lookup differs.
    await mockRoute(
      '**/namespace/errand/*/communication/conversations/*/messages',
      { data: {}, message: 'success' },
      {
        method: 'POST',
      }
    );
  });

  test('creates a conversation without a relation when the errand has no Katla thread', async ({ page, mockRoute }) => {
    await mockRoute('**/namespace/errands/**/communication/conversations', conversationsWithout, { method: 'GET' });
    await mockRoute(
      '**/namespace/errand/*/communication/conversations',
      { data: { id: createdConversationId }, message: 'success' },
      { method: 'POST' }
    );

    await openNewMessage(page);

    await expect(page.locator('[data-cy="useKatla-radiobutton-true"]')).toBeVisible();
    await page.locator('[data-cy="useKatla-radiobutton-true"]').check({ force: true });
    // The linked-errand picker belongs to the Draken thread and must not block Katla.
    await expect(page.getByText('Koppla ett ärende för att kunna skicka meddelande')).toBeHidden();

    await page.locator('[data-cy="decision-richtext-wrapper"]').first().click();
    await page.keyboard.type('Svar till Katla');

    const [createRequest, messageRequest] = await Promise.all([
      page.waitForRequest(
        (req) => req.method() === 'POST' && /\/communication\/conversations$/.test(new URL(req.url()).pathname)
      ),
      page.waitForRequest(
        (req) =>
          req.method() === 'POST' && /\/communication\/conversations\/.+\/messages$/.test(new URL(req.url()).pathname)
      ),
      page.locator('[data-cy="send-message-button"]').first().click(),
    ]);

    const created = JSON.parse(createRequest.postData() ?? '{}');
    expect(created.type).toBe('INTERNAL');
    expect(created.relationIds).toBeUndefined();
    expect(created.topic).toBe(mockSupportErrand.errandNumber);
    expect(new URL(messageRequest.url()).pathname).toContain(createdConversationId);
  });

  test('reuses the existing relationless conversation', async ({ page, mockRoute }) => {
    await mockRoute('**/namespace/errands/**/communication/conversations', conversationsWith, { method: 'GET' });
    let conversationsCreated = 0;
    await page.route('**/namespace/errand/*/communication/conversations', async (route) => {
      conversationsCreated += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: createdConversationId }, message: 'success' }),
      });
    });

    await openNewMessage(page);

    await page.locator('[data-cy="useKatla-radiobutton-true"]').check({ force: true });
    await page.locator('[data-cy="decision-richtext-wrapper"]').first().click();
    await page.keyboard.type('Andra svaret till Katla');

    const [messageRequest] = await Promise.all([
      page.waitForRequest(
        (req) =>
          req.method() === 'POST' && /\/communication\/conversations\/.+\/messages$/.test(new URL(req.url()).pathname)
      ),
      page.locator('[data-cy="send-message-button"]').first().click(),
    ]);

    expect(new URL(messageRequest.url()).pathname).toContain(relationlessConversationId);
    expect(conversationsCreated).toBe(0);
  });
});
