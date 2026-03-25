import { test, expect } from '../../fixtures/base.fixture';
import { appConfig } from '../../../src/config/appconfig';
import { mockAddress } from '../fixtures/mockAddress';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockHistory } from '../fixtures/mockHistory';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockAsset } from '../fixtures/mockAsset';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { mockConversationMessages, mockConversations } from '../fixtures/mockConversations';
import { mockJsonSchema } from '../fixtures/mockJsonSchema';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockRelations } from '../fixtures/mockRelations';
import { mockSidebarButtons } from '../fixtures/mockSidebarButtons';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';

test.describe('Errand page', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/schemas/*/latest', { data: { id: 'mock-schema-id', value: {} }, message: 'success' }, { method: 'GET' });
    await mockRoute('**/messages/*', mockMessages, { method: 'GET' });
    await mockRoute('**/messages', mockMessages, { method: 'POST' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });

    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMexErrand_base) });
      } else {
        await route.fallback();
      }
    });

    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAttachments) });
    });

    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' });
    await mockRoute('**/address', mockAddress, { method: 'POST' });
    await mockRoute('**/**/stakeholders/**', mockMexErrand_base.data.stakeholders, { method: 'GET' });
    await mockRoute('**/**/stakeholders/**', mockMexErrand_base.data.stakeholders, { method: 'DELETE' });
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' });
    await mockRoute('**/assets?**', mockAsset, { method: 'GET' });
    await mockRoute('**/errands/*/facilities', mockMexErrand_base, { method: 'POST' });
    await mockRoute('**/stakeholders/**', mockMexErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' });
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });
    await mockRoute('**/errands/101', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/schemas/FTErrandAssets/latest', mockJsonSchema, { method: 'GET' });
    await mockRoute('**/schemas/*/ui-schema', { data: { id: 'mock-ui-schema-id', value: {} }, message: 'success' }, { method: 'GET' });
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' });
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' });

    await page.goto('arende/MEX-2024-000280');
    await page.waitForResponse((resp) => resp.url().includes('errand/errandNumber') && resp.status() === 200);
    await dismissCookieConsent();
  });

  test('shows the correct sidebar main buttons', async ({ page }) => {
    await expect(page.locator('[data-cy="manage-sidebar"]')).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[0].label}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[1].label}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[2].label}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[3].label}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[4].label}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[5].label}"]`)).toBeVisible();
  });

  test('manages Administrators', async ({ page, mockRoute }) => {
    await mockRoute('**/errands/*/stakeholders', mockMexErrand_base.data.stakeholders, { method: 'PATCH' });
    await mockRoute('**/errands/*', mockMexErrand_base, { method: 'PATCH' });

    await expect(page.locator(`[aria-label="${mockSidebarButtons[0].label}"]`)).toBeVisible();
    await page.locator('[data-cy="admin-input"]').selectOption('Testhandläggare Katarina');
    await page.locator('[data-cy="save-and-continue-button"]').filter({ hasText: 'Spara ärende' }).click();

    const request = await page.waitForRequest(
      (req) => req.url().includes('stakeholders') && req.method() === 'PATCH'
    );
    const body = request.postDataJSON();
    expect(body.adAccount).toBe('TESTADMIN1');
  });

  test('manages Status', async ({ page, mockRoute }) => {
    await mockRoute('**/errands/*', mockMexErrand_base, { method: 'PATCH' });

    await expect(page.locator(`[aria-label="${mockSidebarButtons[0].label}"]`)).toBeVisible();

    await expect(page.locator('[data-cy="status-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="status-input"]')).not.toBeDisabled();
    await page.locator('[data-cy="status-input"]').selectOption({ index: 1 });
    await page.locator('[data-cy="save-and-continue-button"]').filter({ hasText: 'Spara ärende' }).click();
    await expect(page.locator('[data-cy="status-input"]')).toContainText('Väntar på komplettering');

    const request = await page.waitForRequest(
      (req) => req.url().includes('errands') && req.method() === 'PATCH' && !req.url().includes('extraparameters')
    );
    const body = request.postDataJSON();
    expect(body.status.statusType).toBe('Väntar på komplettering');
  });

  test('manages Notes', async ({ page }) => {
    await page.route('**/errands/*/notes', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMexErrand_base.data.stakeholders),
        });
      } else {
        await route.fallback();
      }
    });

    await page.locator(`[aria-label="${mockSidebarButtons[1].label}"]`).click();
    await expect(page.locator('[data-cy="notes-wrapper"]')).toBeVisible();

    const publicNotes = mockMexErrand_base.data.notes.filter((note: any) => note.noteType === 'PUBLIC');
    for (let index = 0; index < publicNotes.length; index++) {
      const note = page.locator(`[data-cy="note-${index}"]`);
      await expect(note).toBeVisible();
      await expect(note.locator('.sk-avatar')).toBeVisible();
      await expect(note.locator('[data-cy="note-text"]')).toContainText('Mock note');
    }

    await page.locator('[data-cy="PUBLIC-note-input"]').type('Mock note', { delay: 100 });
    await page.locator('[data-cy="save-PUBLIC-note-button"]').click();

    const request = await page.waitForRequest(
      (req) => req.url().includes('notes') && req.method() === 'PATCH'
    );
    const body = request.postDataJSON();
    expect(body.text).toBe('Mock note');
    expect(body.noteType).toBe('PUBLIC');
  });

  test('manages Comments', async ({ page }) => {
    await page.route('**/errands/*/notes', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMexErrand_base.data.stakeholders),
        });
      } else {
        await route.fallback();
      }
    });

    await page.locator(`[aria-label="${mockSidebarButtons[2].label}"]`).click();
    await expect(page.locator('[data-cy="notes-wrapper"]')).toBeVisible();

    const internalNotes = mockMexErrand_base.data.notes.filter((note: any) => note.noteType === 'INTERNAL');
    for (let index = 0; index < internalNotes.length; index++) {
      const note = page.locator(`[data-cy="note-${index}"]`);
      await expect(note).toBeVisible();
      await expect(note.locator('.sk-avatar')).toBeVisible();
      await expect(note.locator('[data-cy="note-text"]')).toContainText('Mock comment');
    }

    await page.locator('[data-cy="INTERNAL-note-input"]').type('Mock comment', { delay: 100 });
    await page.locator('[data-cy="save-INTERNAL-note-button"]').click();

    const request = await page.waitForRequest(
      (req) => req.url().includes('notes') && req.method() === 'PATCH'
    );
    const body = request.postDataJSON();
    expect(body.text).toBe('Mock comment');
    expect(body.noteType).toBe('INTERNAL');
  });

  test('manages Guides', async ({ page }) => {
    await page.locator(`[aria-label="${mockSidebarButtons[3].label}"]`).click();
    await expect(page.locator('[data-cy="guide-wrapper"]')).toContainText('Ingen guide vald');
    await page.locator('[data-cy="select-guide"]').selectOption({ index: 2 });
    await expect(page.locator('[data-cy="guide-wrapper"]')).toContainText('Bygglov');
  });

  test('manages Investigation', async ({ page, mockRoute }) => {
    await mockRoute('**/render/pdf', mockMexErrand_base, { method: 'POST' });
    await mockRoute('**/errands/*/decisions', mockMexErrand_base, { method: 'PATCH' });

    await page.locator(`[aria-label="${mockSidebarButtons[4].label}"]`).click();
    const richtextWrapper = page.locator('[data-cy="utredning-richtext-wrapper"]').last();
    await expect(richtextWrapper).toBeVisible();
    await richtextWrapper.locator('.ql-editor').type('Mock investigation text', { delay: 100 });

    await page.locator('[data-cy="save-investigation-description-button"]').click();

    const renderRequest = await page.waitForRequest(
      (req) => req.url().includes('render/pdf') && req.method() === 'POST'
    );
    const renderBody = renderRequest.postDataJSON();
    expect(renderBody.parameters.description).toContain('Mock investigation text');

    const decisionRequest = await page.waitForRequest(
      (req) => req.url().includes('decisions') && req.method() === 'PATCH'
    );
    const decisionBody = decisionRequest.postDataJSON();
    expect(decisionBody.description).toContain('Mock investigation text');
  });

  test('manages History', async ({ page, mockRoute }) => {
    await mockRoute('**/user/**', mockAdmins, { method: 'GET' });
    await mockRoute('**/decisions/*', mockMexErrand_base, { method: 'GET' });

    await page.locator(`[aria-label="${mockSidebarButtons[5].label}"]`).click();

    const events = [
      'Ny utredning/beslut',
      'Ny utredning/beslut',
      'Status ändrades',
      'Fas Beslut påbörjades',
      'Status ändrades',
      'Statusbeskrivning ändrades',
      'Status ändrades',
      'Statusbeskrivning ändrades',
      'Fas Utredning påbörjades',
      'Ny utredning/beslut',
      'Ärendet skapades',
      'Ärendetyp ändrades',
      'Prioritet ändrades',
      'Beskrivning ändrades',
      'Diarienummer ändrades',
      'Fas Aktualisering påbörjades',
      'Ny handläggare/intressent',
      'Extraparametrar ändrades',
      'Status ändrades',
      'Statusbeskrivning ändrades',
    ];

    await expect(page.locator('[data-cy="history-wrapper"]')).toBeVisible();

    for (let index = 0; index < events.length; index++) {
      const eventLabel = page.locator(`[data-cy="history-event-label-${index}"]`);
      await expect(eventLabel).toBeVisible();
      await expect(eventLabel).toHaveText(events[index]);
      await eventLabel.click({ force: true });
      await expect(page.locator('[data-cy="history-details-title"]')).not.toBeEmpty();
      await expect(page.locator('[data-cy="history-details-type"]')).not.toBeEmpty();
      await page.locator('[data-cy="history-table-details-close-button"]').click({ force: true });
    }

    await page.locator('[data-cy="history-event-label-2"]').click();
    await expect(page.locator('[data-cy="history-details-type"]')).toHaveText('Status');
    await expect(page.locator('[data-cy="history-details-content"]')).toContainText('Tidigare värde:');
    await expect(page.locator('[data-cy="history-details-content"]')).toContainText('Under utredning');
    await expect(page.locator('[data-cy="history-details-content"]')).toContainText('Nytt värde:');
    await expect(page.locator('[data-cy="history-details-content"]')).toContainText('Under beslut');
    await page.locator('[data-cy="history-table-details-close-button"]').click({ force: true });
  });

  test('manages Exports', async ({ page }) => {
    if (appConfig.features.useErrandExport) {
      await page.locator(`[aria-label="${mockSidebarButtons[6].label}"]`).click();
      await expect(page.locator('[data-cy="basicInformation"]')).toBeVisible();
      await page.locator('[data-cy="export-button"]').click();
      await expect(page.locator('p').filter({ hasText: 'Detta ärende är inte avslutat' })).toBeVisible();
    } else {
      await expect(page.locator(`[aria-label="${mockSidebarButtons[6].label}"]`)).toBeVisible();
    }
  });
});
