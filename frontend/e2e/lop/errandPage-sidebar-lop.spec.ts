import { test, expect } from '../fixtures/base.fixture';
import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockMetaData } from './fixtures/mockMetadata';
import {
  mockDifferentUserSupportErrand,
  mockEmptySupportErrand,
  mockSaveFacilities,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
} from './fixtures/mockSupportErrands';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockSidebarButtons } from './fixtures/mockSidebarButtons';
import { mockComments } from './fixtures/mockComments';
import { mockSupportHistory } from './fixtures/mockSupportHistory';
import { mockForwardSupportMessage } from './fixtures/mockForwardSupportMessage';
import { mockSetAdminResponse, mockSetSelfAssignAdminResponse } from './fixtures/mockSetAdminResponse';
import { mockConversations, mockConversationMessages } from './fixtures/mockConversations';
import { mockRelations } from './fixtures/mockRelations';

test.describe('errand page', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute(
      `**/supportmessage/2281/errands/${mockSupportErrand.id}/communication`,
      mockSupportMessages,
      { method: 'GET' }
    );
    await mockRoute(`**/supportnotes/2281/${mockSupportErrand.id}`, mockComments, { method: 'GET' });
    await mockRoute(`**/supportnotes/2281/${mockSupportErrand.id}`, mockComments, { method: 'POST' });
    await mockRoute(`**/supporthistory/2281/${mockSupportErrand.id}`, mockSupportHistory, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });
    await mockRoute('**/saveFacilities/2281/c9a96dcb-24b1-479b-84cb-2cc0260bb490', mockSaveFacilities, { method: 'PATCH' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}/admin`, mockSetAdminResponse, { method: 'PATCH' });
    await mockRoute(`**/supportmessage/2281/${mockSupportErrand.id}`, mockForwardSupportMessage, { method: 'POST' });
  });

  test('shows the correct base errand and sidebar main buttons', async ({ page, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await expect(page.locator('[data-cy="manage-sidebar"]')).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[0].label}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[1].label}"]`)).toBeVisible();
    await expect(page.locator(`[aria-label="${mockSidebarButtons[2].label}"]`)).toBeVisible();
  });

  test('Can self assign errand', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(
      `**/supporterrands/errandnumber/${mockDifferentUserSupportErrand.errandNumber}`,
      mockDifferentUserSupportErrand,
      { method: 'GET' }
    );
    await mockRoute(
      `**/supporterrands/2281/${mockDifferentUserSupportErrand.id}/admin`,
      mockSetSelfAssignAdminResponse,
      { method: 'PATCH' }
    );
    await page.goto(`arende/${mockDifferentUserSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="self-assign-errand-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('/admin') && resp.request().method() === 'PATCH'
    );
    const responseBody = await response.json();
    expect(responseBody.assignedUserId).toBe('kctest');
    expect(response.status()).toBe(200);
  });

  test('Can manage admin changes', async ({ page, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await expect(page.locator('[data-cy="admin-input"]')).toBeVisible();
    await page.locator('[data-cy="admin-input"]').selectOption({ index: 1 });
    await expect(page.locator('[data-cy="admin-input"]')).toHaveValue(`${mockSupportAdminsResponse.data[1].displayName}`);
    await page.locator('[data-cy="save-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('/admin') && resp.request().method() === 'PATCH'
    );
    const requestBody = response.request().postDataJSON();
    expect(requestBody).toEqual({
      assignedUserId: mockSupportAdminsResponse.data[1].name,
      status: 'ASSIGNED',
    });
    expect(response.status()).toBe(200);
  });

  test('Can manage status and priority changes', async ({ page, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    // Status
    await expect(page.locator('[data-cy="status-input"]')).toBeVisible();
    await page.locator('[data-cy="status-input"]').selectOption('PENDING');
    await expect(page.locator('[data-cy="status-input"]')).toHaveValue('PENDING');

    // Priority
    await expect(page.locator('[data-cy="priority-input"]')).toBeVisible();
    await page.locator('[data-cy="priority-input"]').selectOption('LOW');
    await expect(page.locator('[data-cy="priority-input"]')).toHaveValue('LOW');
    await page.locator('[data-cy="save-button"]').click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) && resp.request().method() === 'PATCH'
    );
    const requestBody = response.request().postDataJSON();
    expect(requestBody.priority).toBe('LOW');
    expect(requestBody.status).toBe('PENDING');
    expect(response.status()).toBe(200);
  });

  test('Can manage forwarding, suspending and solving errand', async ({ page, mockRoute, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    // Can forward the errand
    await mockRoute(`**/supportmessage/2281/${mockSupportErrand.id}`, mockForwardSupportMessage, { method: 'POST' });
    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();

    await expect(page.locator('article.sk-modal-dialog')).toBeVisible();

    await page.locator('.sk-modal-dialog [data-cy="new-email-input"]').fill('test@test.se');
    await page.locator('.sk-modal-dialog [data-cy="add-new-email-button"]').click();

    await expect(page.locator('[data-cy="decision-richtext-wrapper"]')).toContainText('Hej,');

    await page.locator('.sk-modal-dialog button.sk-btn-primary').filter({ hasText: 'Överlämna ärende' }).click();

    await expect(page.locator('.sk-dialog')).toContainText('Vill du överlämna ärendet?');
    await expect(page.locator('.sk-dialog .sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
    await page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click();
    await page.waitForResponse(
      (resp) => resp.url().includes('supportmessage') && resp.request().method() === 'POST'
    );

    // Can suspend the errand
    await page.locator('[data-cy="suspend-button"]').filter({ hasText: 'Parkera ärende' }).click();
    await expect(page.locator('.sk-modal-dialog')).toContainText('Parkera ärendet');
    await page.locator('.sk-modal-dialog .sk-btn-primary').filter({ hasText: 'Parkera ärende' }).click();

    const solveLabels = [
      { label: 'Avslutat', id: 'SOLVED' },
      { label: 'Registrerat i annat system', id: 'REGISTERED_EXTERNAL_SYSTEM' },
      { label: 'Åter till chef', id: 'BACK_TO_MANAGER' },
      { label: 'Åter till HR', id: 'BACK_TO_HR' },
    ];

    // Can change supportErrand to solved
    await page.locator('[data-cy="solved-button"]').filter({ hasText: 'Avsluta ärende' }).click();
    await expect(page.locator('article.sk-modal-dialog')).toContainText('Välj en lösning');
    await expect(page.locator('[data-cy="solve-radiolist"] label')).toHaveCount(solveLabels.length);
    await expect(page.locator('[data-cy="solve-radiolist"] label input').nth(1)).toHaveValue(solveLabels[1].id);
    await page.locator('[data-cy="solve-radiolist"] label input').nth(1).check();
    await page.locator('article.sk-modal-dialog button.sk-btn-primary').filter({ hasText: 'Avsluta ärende' }).click();
  });

  test('Resets suspendedFrom and suspendedTo when reactivating errand', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, {
      ...mockSupportErrand,
      status: 'SUSPENDED',
      suspension: {
        suspendedTo: '2024-12-12',
        suspendedFrom: '2024-08-12',
      },
    }, { method: 'GET' });
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="resume-button"]').click();
    await page.getByRole('button', { name: 'Ja' }).click();

    const response = await page.waitForResponse(
      (resp) => resp.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) && resp.request().method() === 'PATCH'
    );
    expect(response.status()).toBe(200);
    const requestBody = response.request().postDataJSON();
    expect(requestBody.suspension).toBeDefined();
    expect(Object.keys(requestBody.suspension).length).toBe(0);
    expect(JSON.stringify(requestBody.suspension)).toBe('{}');
  });

  test('Can manage Kommentarer', async ({ page, mockRoute, dismissCookieConsent }) => {
    const comment = 'En kommentar med text';
    const updatedComment = 'En uppdaterad kommentar med text';
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await mockRoute('**/supportnotes/2281/*', comment, { method: 'POST' });
    await mockRoute('**/supportnotes/2281/*/notes/*', comment, { method: 'PATCH' });
    await mockRoute('**/supportnotes/2281/*/notes/*', mockComments.notes[0].id, { method: 'DELETE' });

    await page.locator(`[aria-label="${mockSidebarButtons[1].label}"]`).click();
    await expect(page.locator('[data-cy="noteslist"]').locator('> div')).toHaveCount(mockComments._meta.totalRecords);

    // New comment
    await page.locator('[aria-label="Ny kommentar"]').fill(comment);
    await page.locator('[data-cy="save-newcomment"]').filter({ hasText: 'Spara' }).click();
    const newCommentResponse = await page.waitForResponse(
      (resp) => resp.url().includes('supportnotes') && resp.request().method() === 'POST'
    );
    expect(newCommentResponse.status()).toBe(200);

    // Update comment
    await page.locator(`[data-cy="options-${mockComments.notes[0].id}"]`).click();
    await page.locator('[data-cy="edit-note-button"]').filter({ hasText: 'Ändra' }).click();
    await page.locator('[data-cy="edit-notes-input"]').clear();
    await page.locator('[data-cy="edit-notes-input"]').fill(updatedComment);
    await page.locator('[data-cy="save-updatedcomment"]').filter({ hasText: 'Spara' }).click();

    const updateResponse = await page.waitForResponse(
      (resp) => resp.url().includes('supportnotes') && resp.request().method() === 'PATCH'
    );
    expect(updateResponse.status()).toBe(200);

    // Delete comment
    await page.locator(`[data-cy="options-${mockComments.notes[0].id}"]`).click();
    await page.locator('[data-cy="delete-note-button"]').filter({ hasText: 'Ta bort' }).click();
    await expect(page.locator('.sk-dialog')).toContainText('Vill du ta bort kommentaren?');
    await expect(page.locator('.sk-dialog .sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
    await page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click();
    await page.waitForResponse(
      (resp) => resp.url().includes('supportnotes') && resp.request().method() === 'DELETE'
    );
  });

  test('Can manage Ärendelogg', async ({ page, dismissCookieConsent }) => {
    await page.goto(`arende/${mockSupportErrand.errandNumber}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands/errandnumber') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator(`[aria-label="${mockSidebarButtons[2].label}"]`).click();
    await expect(page.locator('[data-cy="history-log"] div.sk-avatar')).toHaveCount(mockSupportHistory.totalElements);
    await page.locator('[data-cy="history-log"] div button').first().click();
    await page.locator('[data-cy="history-table-details-close-button"]').filter({ hasText: 'Stäng' }).click();
  });
});
