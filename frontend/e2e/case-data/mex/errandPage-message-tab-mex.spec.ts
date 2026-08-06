import { expect, test } from '../../fixtures/base.fixture';
import { mockAddress } from '../fixtures/mockAddress';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';
import { mockHistory } from '../fixtures/mockHistory';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessageRenderRequest, mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPermits } from '../fixtures/mockPermits';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockRelations } from '../fixtures/mockRelations';

const b64 = (s: string) => Buffer.from(s, 'utf-8').toString('base64');
const errandMessagesRoute = /\/errand\/\d+\/messages$/;
const mockMessageTemplates = {
  data: [
    { identifier: 'mex.email.default', name: 'E-postmall', content: b64('<p>E-postmall innehåll</p>') },
    { identifier: 'mex.email.confirmation', name: 'E-postbekräftelse', content: b64('<p>Bekräftelse</p>') },
    { identifier: 'mex.email.signature', name: 'E-postsignatur', content: b64('<p>Med vänliga hälsningar {{user}}</p>') },
    { identifier: 'mex.sms.default', name: 'SMS-mall', content: b64('SMS-mall innehåll') },
    { identifier: 'mex.sms.reminder', name: 'SMS-påminnelse', content: b64('SMS-påminnelse') },
    { identifier: 'mex.sms.signature', name: 'SMS-signatur', content: b64('/ {{user}}') },
    { identifier: 'internal.signature', name: 'Intern signatur', content: b64('/ {{user}}') },
  ],
  message: 'success',
};

const mockUnreadConversation = {
  data: {
    data: [
      {
        id: 'abababab-ed21-4b30-9e0c-1252c878153f',
        topic: 'Överlämning',
        type: 'INTERNAL',
        relationIds: ['bd835475-cbc2-4b92-979d-8bc18bd75385'],
      },
    ],
    message: 'success',
  },
  message: 'success',
};

const mockUnreadConversationMessages = {
  data: [
    {
      conversationId: 'abababab-ed21-4b30-9e0c-1252c878153f',
      messageId: 'unread-conversation-message',
      sent: '2026-06-09T15:12:00.000Z',
      message: '<p>Överlämning</p>',
      attachments: [],
      messageType: 'DRAKEN',
      subject: 'Överlämning',
      firstName: 'Kaltron',
      lastName: 'Rexhaj',
      direction: 'INBOUND',
      viewed: false,
    },
  ],
  message: 'success',
};

test.describe('Message tab', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/templates?**', mockMessageTemplates, { method: 'GET' });
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' }, { method: 'GET' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' }); // @mockMe
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/parking-permits/', mockPermits, { method: 'GET' });
    await mockRoute('**/parking-permits/?personId=aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc', mockPermits, { method: 'GET' });
    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') { await route.fallback(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMexErrand_base) });
    }); // @getErrandById
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    }); // @getErrandAttachments
    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' }); // @getHistory
    await mockRoute('**/address', mockAddress, { method: 'POST' }); // @postAddress
    await mockRoute('**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment
    await page.route(errandMessagesRoute, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMessages) });
    });

    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' }); // @getSourceRelations
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' }); // @getTargetRelations
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' }); // @getConversations
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' }); // @getConversationMessages
    await mockRoute('**/assets?**', mockAsset, { method: 'GET' });
    await mockRoute('**/errands/*/facilities', mockMexErrand_base, { method: 'POST' });
    await mockRoute('**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' }); // @getJsonSchema
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' }, { method: 'GET' }); // @getUiSchema
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' }); // @getEstateInfo
  });

  const goToMessageTab = async (page, dismissCookieConsent) => {
    await page.goto('arende/PRH-2022-000019');
    await page.waitForResponse((resp) => resp.url().includes('/errand/') && resp.status() === 200);
    await dismissCookieConsent();
    await page.getByRole('tab', { name: 'Meddelanden' }).click();
  };

  test('views messages in inbox', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/messages/*/viewed/*', mockMessages, { method: 'PUT' });

    await goToMessageTab(page, dismissCookieConsent);
    await expect(page.locator('[data-cy="message-container"] .sk-avatar')).toHaveCount(
      mockMessages.data.length + mockConversationMessages.data.length * mockConversations.data.data.length
    );

    for (const message of mockMessages.data) {
      if (message.messageType === 'EMAIL' && message.emailHeaders[0].header === 'MESSAGE_ID') {
        const node = page.locator(`[data-cy="node-${message.emailHeaders[0].values}"]`);
        await expect(node).toBeVisible();
        await node.click();
        await expect(node.locator('[data-cy="sender"]')).toBeVisible();
        await page.locator(`[data-cy="expand-message-button-${message.emailHeaders[0].values}"]`).click();

        if (message.direction === 'INBOUND') {
          await expect(node.locator('[data-cy="respond-button"]')).toBeVisible();
        }

        if (message.attachments?.length) {
          for (let index = 0; index < message.attachments.length; index++) {
            await expect(
              page.locator(`[data-cy="message-attachment-${index}"]`).getByText(message.attachments[index].name)
            ).toBeVisible();
          }
        }

        await expect(page.locator('[data-cy="message-subject"]').getByText(message.subject).first()).toBeVisible();
        await expect(page.locator('[data-cy="message-body"]').getByText(message.message).first()).toBeVisible();

        await page
          .locator('[data-cy="close-message-wrapper"]')
          .first()
          .locator('[data-cy="close-message-wrapper-icon"]')
          .click({ force: true });
      }
    }
  });

  test('counts unread conversation messages and marks them read locally', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await page.unroute(errandMessagesRoute);
    await page.route(errandMessagesRoute, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], message: 'success' }),
      });
    });
    await page.unroute('**/namespace/errands/**/communication/conversations');
    await page.unroute('**/errands/**/communication/conversations/*/messages');
    await mockRoute('**/namespace/errands/**/communication/conversations', mockUnreadConversation, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockUnreadConversationMessages, {
      method: 'GET',
    });

    await goToMessageTab(page, dismissCookieConsent);

    await expect(page.getByRole('tab', { name: 'Meddelanden (1)' })).toBeVisible();
    await expect(page.locator('[data-cy="node-unread-conversation-message"] span.bg-vattjom-surface-primary')).toBeVisible();

    await page.locator('[data-cy="expand-message-button-unread-conversation-message"]').click();

    await expect(page.getByRole('tab', { name: 'Meddelanden (0)' })).toBeVisible();
    await expect(page.locator('[data-cy="node-unread-conversation-message"] span.bg-gray-200')).toBeVisible();
  });

  test('sends sms with template', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/render', mockMessageRenderRequest, { method: 'POST' });
    await mockRoute('**/sms', mockMessages, { method: 'POST' }); // @sendSms

    await goToMessageTab(page, dismissCookieConsent);
    await page.locator('[data-cy="sidebar-new-message-button"]').first().click();

    await page.locator('[data-cy="useSms-radiobutton-true"]').check({ force: true });

    await expect(page.locator('[data-cy="send-message-button"]')).toBeDisabled();

    await page.locator('[data-cy="messageTemplate"]').first().selectOption({ index: 1 });
    await expect(page.locator('[data-cy="decision-richtext-wrapper"]:visible').first()).toBeVisible();

    await page.locator('[data-cy="newPhoneNumber"]').first().clear();
    await page.locator('[data-cy="newPhoneNumber"]').first().fill('1234abc890');
    await expect(page.locator('[data-cy="messagePhone-error"]').getByText('Ej giltigt telefonnummer')).toBeVisible();

    await page.locator('[data-cy="newPhoneNumber"]').first().clear();
    await page.locator('[data-cy="newPhoneNumber"]').first().fill('+46701740635');
    await expect(page.locator('[data-cy="messagePhone-error"]')).not.toBeVisible();

    await page.locator('[data-cy="newPhoneNumber-button"]').first().click({ force: true });

    const sendSmsRequestPromise = page.waitForRequest(
      (req) => req.url().includes('/sms') && req.method() === 'POST'
    );
    await page.locator('[data-cy="send-message-button"]').first().click({ force: true });

    const body = (await sendSmsRequestPromise).postDataJSON();
    expect(body.phonenumber).toBe('+46701740635');
  });

  test('sends email with an existing attachment from errand and a new attachment', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/render', mockMessageRenderRequest, { method: 'POST' });
    await mockRoute('**/email', mockMessages, { method: 'POST' }); // @sendEmail
    await mockRoute('**/attachments', mockAttachments, { method: 'POST' }); // @postAttachments

    await goToMessageTab(page, dismissCookieConsent);
    await page.locator('[data-cy="new-message-button"]').click();
    await expect(page.locator('[data-cy="send-message-button"]')).toBeDisabled();
    await page.locator('[data-cy="useEmail-radiobutton-true"]').first().click({ force: true });
    await expect(page.locator('[data-cy="send-message-button"]')).toBeDisabled();

    const emailEditor = page.locator('[data-cy="decision-richtext-wrapper"]:visible').first().locator('.ql-editor');
    await expect(emailEditor).toBeVisible();
    await emailEditor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Mock message');

    const ownerEmail = mockMexErrand_base.data.stakeholders
      .find((stakeholder) => stakeholder.roles.includes('APPLICANT'))
      ?.contactInformation?.find((c) => c.contactType === 'EMAIL')?.value;

    await page.locator('[data-cy="existing-email-addresses"]').first().selectOption(ownerEmail + ' (Ärendeägare)');
    await page.locator('[data-cy="new-email-input"]').first().clear();
    await page.locator('[data-cy="new-email-input"]').first().fill('test.com');
    await expect(page.locator('[data-cy="add-new-email-button"]')).toBeDisabled();
    await page.locator('[data-cy="new-email-input"]').first().clear();
    await page.locator('[data-cy="new-email-input"]').first().fill('test@example.com');
    await expect(page.locator('[data-cy="add-new-email-button"]').first()).toBeEnabled();
    await page.locator('[data-cy="add-new-email-button"]').first().click({ force: true });

    // Add existing attachment
    await page.locator('[data-cy="select-errand-attachment"]').first().selectOption({ index: 1 });
    await page.locator('[data-cy="add-attachment-button-email"]').click({ force: true });
    await page.locator('[data-cy="browse-button"]').click({ force: true });

    // Try to add empty attachment
    await page.locator('input[type=file]').last().setInputFiles('e2e/case-data/files/empty-attachment.txt');
    await expect(
      page.locator('[id="newAttachments-error"]').getByText('Bilagan du försöker lägga till är tom. Försök igen.')
    ).toBeVisible();

    // Add new attachment
    await page.locator('input[type=file]').last().setInputFiles('e2e/case-data/files/attachment.txt');
    await expect(page.locator('[data-cy="attachment-wrapper"]').getByText('attachment.txt')).toBeVisible();

    // Commit the uploaded attachment and close the modal
    await page.locator('[data-cy="upload-button"]').click({ force: true });
    await expect(page.getByText('Bifogade filer')).toBeVisible();

    const sendEmailResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/email') && resp.request().method() === 'POST'
    );
    await page.locator('[data-cy="send-message-button"]:visible').first().click();

    const sendEmailResponse = await sendEmailResponsePromise;
    expect(sendEmailResponse.status()).toBe(200);
  });

  test('answers inbound email message by email', async ({ page, mockRoute, dismissCookieConsent, env }) => {
    await mockRoute('**/messages/*/viewed/*', mockMessages, { method: 'PUT' });
    await mockRoute('**/render', mockMessageRenderRequest, { method: 'POST' });
    await mockRoute('**/email', mockMessages, { method: 'POST' }); // @sendEmail
    await mockRoute('**/webmessage', mockMessages, { method: 'POST' }); // @sendWebmessage

    await goToMessageTab(page, dismissCookieConsent);

    for (const message of mockMessages.data) {
      if (message.direction === 'INBOUND' && message.messageType === 'EMAIL') {
        const messageNode = page.locator(`[data-cy="node-${message.emailHeaders[0].values}"]`);
        await expect(messageNode).toBeVisible();
        await messageNode.click();
        await page.locator(`[data-cy="expand-message-button-${message.emailHeaders[0].values}"]`).click();
        await messageNode.locator('[data-cy="respond-button"]').click({ force: true });

        await page.locator('[data-cy="messageTemplate"]').first().selectOption({ index: 1 });
        await expect(page.locator('[data-cy="email-tag-0"]').getByText(message.email)).toBeVisible();
        await page.locator('[data-cy="send-message-button"]').first().click({ force: true });

        const sendEmailRequest = await page.waitForRequest(
          (req) => req.url().includes('/email') && req.method() === 'POST'
        );
        const requestBody = sendEmailRequest.postData() || '';
        expect(requestBody).toContain('Content-Disposition: form-data; name="contactMeans"');
        expect(requestBody).toContain('email');
        expect(requestBody).toContain(env.mockEmail);
        expect(requestBody.replace(/[\n\r\s]/g, '')).toContain('name="contactMeans"email');
      }
    }
  });
});
