import { expect, test } from '../fixtures/base.fixture';
import { errandId, errandNumber, installIafApiMock } from './fixtures/investigation-flow.mock';

test('ett misslyckat meddelande loggar status och begärande-ID utan mottagare eller innehåll', async ({
  page,
  dismissCookieConsent,
}) => {
  const email = 'privacy-recipient@example.test';
  const phone = '+46709998877';
  const personalNumber = '19900101-1234';
  const message = `Sekretessprov: ${personalNumber}, ${phone}, anteckning PRIVACY-NOTE-SENTINEL`;
  const requestId = 'b609e0b8-2644-47da-8c90-a6f9ce13ad69';
  const consoleEntries: Array<Promise<unknown[]>> = [];
  const forwardedLogEvents: string[] = [];
  let receivedDevelopmentFrame = false;
  page.on('websocket', (socket) => {
    socket.on('framereceived', () => {
      if (new URL(socket.url()).pathname.endsWith('/_next/webpack-hmr')) receivedDevelopmentFrame = true;
    });
    socket.on('framesent', ({ payload }) => {
      const text = String(payload);
      if (/"event"\s*:\s*"(?:browser-logs|client-file-logs)"/u.test(text)) forwardedLogEvents.push(text);
    });
  });
  page.on('console', (entry) => {
    consoleEntries.push(
      Promise.all([
        Promise.resolve(entry.text()),
        ...entry.args().map((argument) => argument.jsonValue().catch(() => 'unserializable-console-argument')),
      ])
    );
  });

  await installIafApiMock(page, {
    assignedUserId: 'iaf.test',
    errandStatus: 'ONGOING',
    featureFlags: [{ name: 'useEmailContactChannel', enabled: true }],
  });
  await page.route('**/templates?*', (route) => route.fulfill({ json: { data: [], message: 'success' } }));
  await page.route(`**/supportmessage/*/${errandId}`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 503,
      headers: { 'X-Request-Id': requestId, 'Access-Control-Expose-Headers': 'X-Request-Id' },
      json: { message: `${email} ${message}`, stack: 'PRIVACY-STACK-SENTINEL', token: 'PRIVACY-TOKEN-SENTINEL' },
    });
  });
  await page.goto(`arende/${errandNumber}`);
  await dismissCookieConsent();
  await page.getByRole('tab', { name: /Meddelanden/ }).click();
  await page.locator('[data-cy="new-message-button"]').click();
  await page.locator('[data-cy="useEmail-radiobutton-true"]').check();
  await page.locator('[data-cy="new-email-input"]').first().fill(email);
  await page.locator('[data-cy="add-new-email-button"]').first().click();
  await page.locator('[data-cy="decision-richtext-wrapper"]').first().click();
  await page.keyboard.type(message);

  await page.clock.install();
  const [request] = await Promise.all([
    page.waitForRequest((request) => request.method() === 'POST' && request.url().includes('/supportmessage/')),
    page.locator('[data-cy="send-message-button"]').first().click(),
  ]);
  expect(request.postData()).toContain(email);
  expect(request.postData()).toContain(personalNumber);
  await expect(page.getByText('Något gick fel när meddelandet skulle skickas', { exact: true })).toBeVisible();
  await expect(page.locator('[data-cy="send-message-button"]').first()).toBeEnabled();
  if (process.env.PLAYWRIGHT_REQUIRE_DEV_HMR === 'true') {
    // The required CI check must exercise development mode: a production server
    // would otherwise pass the absence-of-forwarding assertion without testing it.
    await expect.poll(() => receivedDevelopmentFrame).toBe(true);
  }

  // Next's development log forwarding flushes after 100ms. Ordinary HMR stays enabled,
  // but neither its terminal channel nor MCP's independent file channel may receive logs.
  await page.clock.runFor(250);
  const entries = await Promise.all(consoleEntries);
  const values = entries.flat();
  expect(values).toContainEqual({
    operation: 'supportmanagement.support-message.sendMessage',
    errorKind: 'http',
    status: 503,
    requestId,
  });
  const logged = JSON.stringify(entries);
  for (const sensitive of [
    email,
    phone,
    personalNumber,
    'PRIVACY-NOTE-SENTINEL',
    'PRIVACY-STACK-SENTINEL',
    'PRIVACY-TOKEN-SENTINEL',
  ]) {
    expect(logged).not.toContain(sensitive);
  }
  expect(forwardedLogEvents).toEqual([]);
});
