import { Page, expect } from '@playwright/test';

export const goToMessageTab = async (page: Page, errandNumber = 'KC-00000001') => {
  await page.goto(`arende/${errandNumber}`);
  await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
  await page.locator('.sk-cookie-consent-btn-wrapper').getByText('Godkänn alla').click();
  await page.getByRole('button', { name: 'Meddelanden' }).click();
};

export const sendSmsMessage = async (page: Page) => {
  await page.locator('[data-cy="new-message-button"]').click();

  await expect(page.locator('[data-cy="message-channel-radio-button-group"]')).toBeVisible();
  await expect(page.locator('[data-cy="useEmail-radiobutton-true"]')).toBeVisible();
  await page.locator('[data-cy="useSms-radiobutton-true"]').check({ force: true });

  await page.locator('[data-cy="decision-richtext-wrapper"]').first().clear();
  await page.locator('[data-cy="decision-richtext-wrapper"]').first().type('Mock message', { delay: 100 });

  await page.locator('[data-cy="newPhoneNumber"]').first().clear();
  await page.locator('[data-cy="newPhoneNumber"]').first().type('+46701740635', { delay: 100 });
  await page.locator('[data-cy="newPhoneNumber-button"]').first().click({ force: true });

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('supportmessage') && req.method() === 'POST'),
    page.locator('[data-cy="send-message-button"]').first().click(),
  ]);

  const postData = request.postData() ?? '';
  expect(postData).toContain('sms');
  expect(postData).toContain('Mock message');
  expect(postData).toContain('+46701740635');
};

export const sendEmailWithAttachment = async (page: Page) => {
  await page.locator('[data-cy="new-message-button"]').click();

  await page.locator('[data-cy="decision-richtext-wrapper"]').first().clear();
  await page.locator('[data-cy="decision-richtext-wrapper"]').first().type('Mock message', { delay: 100 });

  await expect(page.locator('[data-cy="message-channel-radio-button-group"]')).toBeVisible();
  await page.locator('[data-cy="useEmail-radiobutton-true"]').check({ force: true });
  await expect(page.locator('[data-cy="useSms-radiobutton-true"]')).toBeVisible();
  await page.locator('[data-cy="new-email-input"]').first().clear();
  await page.locator('[data-cy="new-email-input"]').first().type('test@example.com', { delay: 100 });
  await page.locator('[data-cy="add-new-email-button"]').first().click({ force: true });

  await page.locator('[data-cy="add-attachment-button"]').filter({ hasText: 'Bifoga fil' }).click();
  await page.getByRole('button', { name: 'Bläddra' }).click();
  await page.locator('input[type=file]').setInputFiles('e2e/kontaktcenter/files/empty-attachment.txt');
  await expect(page.locator('.sk-form-error-message')).toContainText(
    'Bilagan du försöker lägga till är tom. Försök igen.'
  );
  await page.getByRole('button', { name: 'Bläddra' }).click();
  await page.locator('input[type=file]').setInputFiles('e2e/kontaktcenter/files/attachment.txt');
  await page.locator('[data-cy="upload-button"]').filter({ hasText: 'Ladda upp' }).click();

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes('supportmessage') && req.method() === 'POST'),
    page.locator('[data-cy="send-message-button"]').first().click(),
  ]);

  const postData = request.postData() ?? '';
  expect(postData).toContain('email');
  expect(postData).toContain('Mock message');
  expect(postData).toContain('attachment.txt');
};
