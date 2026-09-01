import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { mockResolvedRelations } from '../case-data/fixtures/mockRelations';
import { expect, test } from '../fixtures/base.fixture';
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
//TODO: Update mockdata
//TODO: Update mockdata
import { mockRelations } from '../lop/fixtures/mockRelations';
import { mockAdressResponse, mockPersonIdResponse } from './fixtures/mockAdressResponse';
import { mockComments } from './fixtures/mockComments';
import { mockForwardSupportErrandToMEX, mockForwardSupportMessage } from './fixtures/mockForwardSupportMessage';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockSetAdminResponse, mockSetSelfAssignAdminResponse } from './fixtures/mockSetAdminResponse';
import { mockSidebarButtons } from './fixtures/mockSidebarButtons';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import {
  mockDifferentUserSupportErrand,
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrand,
  mockSupportMessages,
} from './fixtures/mockSupportErrands';
import { mockSupportHistory } from './fixtures/mockSupportHistory';
import { mockNotificationsForErrandLog } from './fixtures/mockSupportNotifications';
import { mockSubscriptions } from './fixtures/mockSupportSubscriptions';
import { MODAL_DIALOG } from '../utils/modal';

test.describe('errand page', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supportsubscriptions/2281', mockSubscriptions, { method: 'GET' });
    // The errand log loads notifications to mark notified events.
    await mockRoute('**/supportnotifications/2281', [], { method: 'GET' });
    await mockRoute('**/supportnamespaceconfigs/**', [], { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments/*', mockSupportAttachments[0], { method: 'GET' });
    await mockRoute(`**/supportmessage/2281/errands/${mockSupportErrand.id}/communication`, mockSupportMessages, {
      method: 'GET',
    });
    await mockRoute(`**/supportnotes/2281/${mockSupportErrand.id}`, mockComments, { method: 'GET' });
    await mockRoute(`**/supportnotes/2281/${mockSupportErrand.id}`, mockComments, { method: 'POST' });
    await mockRoute(`**/supporthistory/2281/${mockSupportErrand.id}`, mockSupportHistory, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/personid', mockPersonIdResponse, { method: 'POST' });
    await mockRoute('**/address', mockAdressResponse, { method: 'POST' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}`, mockEmptySupportErrand, { method: 'PATCH' });
    await mockRoute(`**/supporterrands/2281/${mockEmptySupportErrand.id}/forward`, mockEmptySupportErrand, {
      method: 'POST',
    });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/resolvedrelations/**/**', mockResolvedRelations, { method: 'GET' });
    await mockRoute('**/communication/conversations/count-read-by*', [], { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
      method: 'GET',
    });
    await mockRoute('**/party/*/statuses', mockStakeholderStatus, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, {
      method: 'GET',
    });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}/admin`, mockSetAdminResponse, { method: 'PATCH' });
    await mockRoute(`**/supportmessage/2281/${mockSupportErrand.id}`, mockForwardSupportMessage, { method: 'POST' });
    await mockRoute('**/party-services*', { data: [] }, { method: 'GET' });
  });

  test('shows the correct base errand and sidebar main buttons', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
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

    await page.goto('arende/KC-00000001');
    await dismissCookieConsent();

    // The self-assign button only renders once the (different-user) errand has loaded, so wait
    // for it before clicking; set up the PATCH listener before the click to avoid a race.
    const selfAssignButton = page.locator('[data-cy="self-assign-errand-button"]');
    await expect(selfAssignButton).toBeVisible();
    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/admin') && resp.request().method() === 'PATCH'),
      selfAssignButton.click(),
    ]);
    const responseBody = await response.json();
    expect(responseBody.assignedUserId).toBe('kctest');
    expect(response.status()).toBe(200);
  });

  test('Can manage admin changes', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await expect(page.locator('[data-cy="admin-input"]')).toBeVisible();
    await page.locator('[data-cy="admin-input"]').selectOption({ index: 1 });
    await expect(page.locator('[data-cy="admin-input"]')).toHaveValue(
      `${mockSupportAdminsResponse.data[1].displayName}`
    );
    // Set up the response listener before the click — waitForResponse only catches responses that
    // arrive after it starts listening, so clicking first races the (mocked, near-instant) PATCH.
    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/admin') && resp.request().method() === 'PATCH'),
      page.locator('[data-cy="save-button"]').click(),
    ]);
    const request = response.request();
    const requestBody = request.postDataJSON();
    expect(requestBody).toEqual({
      assignedUserId: mockSupportAdminsResponse.data[1].name,
      status: 'ASSIGNED',
    });
    expect(response.status()).toBe(200);
  });

  test('Can manage status and priority changes', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Status
    await expect(page.locator('[data-cy="status-input"]')).toBeVisible();
    await page.locator('[data-cy="status-input"]').selectOption('NEW');
    await expect(page.locator('[data-cy="status-input"]')).toHaveValue('NEW');

    // Priority
    await expect(page.locator('[data-cy="priority-input"]')).toBeVisible();
    await page.locator('[data-cy="priority-input"]').selectOption('LOW');
    await expect(page.locator('[data-cy="priority-input"]')).toHaveValue('LOW');

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) =>
          req.url().includes(`supporterrands/2281/${mockEmptySupportErrand.id}`) &&
          req.method() === 'PATCH' &&
          (req.postData() ?? '').includes('priority')
      ),
      page.locator('[data-cy="save-button"]').click(),
    ]);
    const requestBody = request.postDataJSON();
    expect(requestBody.priority).toBe('LOW');
    expect(requestBody.status).toBe('NEW');
  });

  test('Can forward department errand', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();

    await expect(page.locator(MODAL_DIALOG)).toBeVisible();

    await expect(page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(1)).toHaveValue('EMAIL');
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(1).check();
    await expect(page.locator(`${MODAL_DIALOG} [data-cy="email-tag-0"]`)).not.toBeVisible();

    await expect(page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0)).toHaveValue('DEPARTMENT');
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0).check();
    await page.locator(`${MODAL_DIALOG} [data-cy="resolution-input"]`).selectOption({ index: 0 });

    // Department forwards do not pre-fill a greeting (only email forwards do), so just assert
    // the editor is present.
    await expect(page.locator('[data-cy="escalation-richtext-wrapper"]')).toBeVisible();

    await page.locator(`${MODAL_DIALOG} button.sk-btn-primary`).filter({ hasText: 'Överlämna ärendet' }).click();

    await expect(page.locator('.sk-dialog')).toContainText('Vill du överlämna ärendet?');
    await expect(page.locator('.sk-dialog .sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('forward') && resp.request().method() === 'POST'),
      page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click(),
    ]);
  });

  test('Can forward email errand', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();

    await expect(page.locator(MODAL_DIALOG)).toBeVisible();

    await expect(page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0)).toHaveValue('DEPARTMENT');
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0).check();
    await page.locator(`${MODAL_DIALOG} [data-cy="resolution-input"]`).selectOption({ index: 0 });
    await expect(page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(1)).toHaveValue('EMAIL');
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(1).check();
    await page.locator(`${MODAL_DIALOG} [data-cy="new-email-input"]`).fill('test@test.se');
    await page.locator(`${MODAL_DIALOG} [data-cy="add-new-email-button"]`).click();

    await expect(page.locator('[data-cy="escalation-richtext-wrapper"]')).toContainText('Hej,');

    await page.locator(`${MODAL_DIALOG} button.sk-btn-primary`).filter({ hasText: 'Överlämna ärendet' }).click();

    await expect(page.locator('.sk-dialog')).toContainText('Vill du överlämna ärendet?');
    await expect(page.locator('.sk-dialog .sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supportmessage') && resp.request().method() === 'POST'),
      page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click(),
    ]);
  });

  test('Can manage forwarding, suspending and solving errand', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, { method: 'GET' });

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    //Can forward the errand
    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();

    await expect(page.locator(MODAL_DIALOG)).toBeVisible();

    await expect(page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0)).toHaveValue('DEPARTMENT');
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0).check();
    await page.locator(`${MODAL_DIALOG} [data-cy="resolution-input"]`).selectOption({ index: 0 });
    await expect(page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(1)).toHaveValue('EMAIL');
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(1).check();
    await page.locator(`${MODAL_DIALOG} [data-cy="new-email-input"]`).fill('test@test.se');
    await page.locator(`${MODAL_DIALOG} [data-cy="add-new-email-button"]`).click();

    await expect(page.locator('[data-cy="escalation-richtext-wrapper"]')).toContainText('Hej,');

    await page.locator(`${MODAL_DIALOG} button.sk-btn-primary`).filter({ hasText: 'Överlämna ärende' }).click();

    await expect(page.locator('.sk-dialog')).toContainText('Vill du överlämna ärendet?');
    await expect(page.locator('.sk-dialog .sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supportmessage') && resp.request().method() === 'POST'),
      page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click(),
    ]);

    //Can suspend the errand
    await page.locator('[data-cy="suspend-button"]').filter({ hasText: 'Parkera ärende' }).click();
    const suspendModal = page.locator(MODAL_DIALOG).filter({ hasText: 'Parkera ärendet' });
    await expect(suspendModal).toBeVisible();
    await suspendModal.locator('.sk-btn-primary').filter({ hasText: 'Parkera ärende' }).click();

    const solveLables = [
      { label: 'Hänvisat att återkomma', id: 'REFERRED_TO_RETURN' },
      { label: 'Hänvisat till intern service', id: 'INTERNAL_SERVICE' },
      { label: 'Hänvisat till självservice', id: 'SELF_SERVICE' },
      { label: 'Kopplat samtal', id: 'CONNECTED' },
      { label: 'Löst av Kontakt Sundsvall', id: 'SOLVED' },
      { label: 'Registrerat i annat system', id: 'REGISTERED_EXTERNAL_SYSTEM' },
      { label: 'SecureAppbox', id: 'SECURE_APPBOX' },
    ];

    //can change supportErrand to solved
    await page.locator('[data-cy="solved-button"]').filter({ hasText: 'Avsluta ärende' }).click();
    const solveModal = page.locator(MODAL_DIALOG).filter({ hasText: 'Välj en lösning' });
    await expect(solveModal).toBeVisible();
    await expect(page.locator('[data-cy="solve-radiolist"] label')).toHaveCount(solveLables.length);
    await expect(page.locator('[data-cy="solve-radiolist"] label input').nth(1)).toHaveValue(solveLables[1].id);
    await page.locator('[data-cy="solve-radiolist"] label input').nth(1).check();
    await solveModal
      .locator('button.sk-btn-primary')
      .filter({ hasText: /^Avsluta$/ })
      .click();
  });

  test('Shows current resolution when errand already has one', async ({ page, mockRoute, dismissCookieConsent }) => {
    const mockSupportErrandWithResolution = {
      ...mockSupportErrand,
      resolution: 'INFORMED',
    };

    await mockRoute(
      `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`,
      mockSupportErrandWithResolution,
      { method: 'GET' }
    );

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="solved-button"]').filter({ hasText: 'Avsluta ärende' }).click();
    await expect(page.locator(MODAL_DIALOG)).toBeVisible();
    await expect(page.locator(MODAL_DIALOG)).toContainText('Nuvarande lösningskod');
    await expect(page.locator(MODAL_DIALOG)).toContainText('Ändra lösningskod');
    await expect(
      page.locator(`${MODAL_DIALOG} button.sk-btn-primary`).filter({ hasText: /^Avsluta$/ })
    ).toBeVisible();
  });

  test('Can change resolution code when errand already has one', async ({ page, mockRoute, dismissCookieConsent }) => {
    const mockSupportErrandWithResolution = {
      ...mockSupportErrand,
      resolution: 'INFORMED',
    };

    await mockRoute(
      `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`,
      mockSupportErrandWithResolution,
      { method: 'GET' }
    );

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="solved-button"]').filter({ hasText: 'Avsluta ärende' }).click();
    await expect(page.locator(MODAL_DIALOG)).toBeVisible();

    // Click "Ändra lösningskod" to switch to resolution selection view
    await page.locator(MODAL_DIALOG).getByText('Ändra lösningskod').click();
    await expect(page.locator(MODAL_DIALOG)).toContainText('Välj ny lösningskod');
    await expect(page.locator('[data-cy="solve-radiolist"]')).toBeVisible();
  });

  test('Resets to current resolution view when modal is closed and reopened', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const mockSupportErrandWithResolution = {
      ...mockSupportErrand,
      resolution: 'INFORMED',
    };

    await mockRoute(
      `**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`,
      mockSupportErrandWithResolution,
      { method: 'GET' }
    );

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Open modal and switch to "Välj ny lösningskod"
    await page.locator('[data-cy="solved-button"]').filter({ hasText: 'Avsluta ärende' }).click();
    await page.locator(MODAL_DIALOG).getByText('Ändra lösningskod').click();
    await expect(page.locator(MODAL_DIALOG)).toContainText('Välj ny lösningskod');

    // Close modal
    await page.locator(`${MODAL_DIALOG} .sk-modal-dialog-close`).click();
    await expect(page.locator(MODAL_DIALOG)).not.toBeVisible();

    // Reopen modal - should show "Nuvarande lösningskod" again
    await page.locator('[data-cy="solved-button"]').filter({ hasText: 'Avsluta ärende' }).click();
    await expect(page.locator(MODAL_DIALOG)).toBeVisible();
    await expect(page.locator(MODAL_DIALOG)).toContainText('Nuvarande lösningskod');
  });

  test('Can manage Kommentarer', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, { method: 'GET' });
    const comment = 'En kommentar med text';
    const updatedComment = 'En uppdaterad kommentar med text';

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await mockRoute('**/supportnotes/2281/*', comment, { method: 'POST' });
    await mockRoute('**/supportnotes/2281/*/notes/*', comment, { method: 'PATCH' });
    await mockRoute('**/supportnotes/2281/*/notes/*', mockComments.notes[0].id, { method: 'DELETE' });

    await page.locator(`[aria-label="${mockSidebarButtons[1].label}"]`).click();
    await expect(page.locator('[data-cy="noteslist"]').locator('> div')).toHaveCount(mockComments._meta.totalRecords);

    //New comment
    await page.locator('[aria-label="Ny kommentar"]').fill(comment);

    const [newCommentResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supportnotes') && resp.request().method() === 'POST'),
      page.locator('[data-cy="save-newcomment"]').filter({ hasText: 'Spara' }).click(),
    ]);
    expect(newCommentResponse.status()).toBe(200);

    //Update comment
    await page.locator(`[data-cy="options-${mockComments.notes[0].id}"]`).click();
    await page.locator('[data-cy="edit-note-button"]:visible').filter({ hasText: 'Ändra' }).click();
    await page.locator('[data-cy="edit-notes-input"]').clear();
    await page.locator('[data-cy="edit-notes-input"]').fill(updatedComment);

    const [updateCommentResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supportnotes') && resp.request().method() === 'PATCH'),
      page.locator('[data-cy="save-updatedcomment"]').filter({ hasText: 'Spara' }).click(),
    ]);
    expect(updateCommentResponse.status()).toBe(200);

    //Delete comment
    await page.locator(`[data-cy="options-${mockComments.notes[0].id}"]`).click();
    await page.locator('[data-cy="delete-note-button"]:visible').filter({ hasText: 'Ta bort' }).click();
    await expect(page.locator('.sk-dialog')).toContainText('Vill du ta bort kommentaren?');
    await expect(page.locator('.sk-dialog .sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('supportnotes') && resp.request().method() === 'DELETE'),
      page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click(),
    ]);
  });

  test('Can manage Ärendelogg', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator(`[aria-label="${mockSidebarButtons[2].label}"]`).click();
    // Events sharing a requestGroupId are one entry in the log, so there are fewer entries than
    // events: three grouped operations plus two events that stand alone.
    await expect(page.locator('[data-cy="history-log"] div.sk-avatar')).toHaveCount(5);
    await page.locator('[data-cy="history-log"] div button').first().click();
    await expect(page.locator('[data-cy="history-event-details"]')).toContainText(
      'Noteringen togs bort av handläggaren.'
    );
    await page.locator('[data-cy="history-table-details-close-button"]').filter({ hasText: 'Stäng' }).click();
  });

  test('opens the errand log from a notification and highlights the originating event', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    await mockRoute('**/supportnotifications/2281', mockNotificationsForErrandLog, { method: 'GET' });

    const notification = mockNotificationsForErrandLog[0];
    await page.goto(`arende/KC-00000001?tab=history&notification=${notification.id}`);
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // The deep link lands directly on the log, without the user having to find the tab.
    await expect(page.locator('[data-cy="history-log"]')).toBeVisible();

    // The event the notification came from is both marked as notified and highlighted.
    const highlighted = page.locator('[data-cy="history-event-req-group-0"]');
    await expect(highlighted).toHaveClass(/bg-vattjom-surface-accent/);
    await expect(highlighted.locator('[data-cy="history-event-notified"]')).toBeVisible();
  });

  test('manages Exports', async ({ page, dismissCookieConsent }) => {
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator(`[aria-label="${mockSidebarButtons[3].label}"]`).click();
    await expect(page.locator('[data-cy="basicInformation"]')).toBeVisible();
    await expect(page.locator('[data-cy="errandInformation"]')).toBeVisible();
    await expect(page.locator('[data-cy="attachments"]')).toBeVisible();
    await page.locator('[data-cy="export-button"]').click();
    await expect(page.locator('.sk-dialog')).toContainText(
      'Detta ärende är inte avslutat. Vill du ändå exportera ärendet?'
    );
  });

  test('Can manage Vidarebefodra', async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, { method: 'GET' });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}/forward`, mockForwardSupportErrandToMEX, {
      method: 'POST',
    });

    await page.goto('arende/KC-00000001');
    await dismissCookieConsent();

    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();
    await expect(page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0)).toHaveValue('DEPARTMENT');
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0).check();
    await page.locator('[data-cy="resolution-input"]').selectOption('Mark och exploatering (MEX)');
    // Department forwards do not pre-fill a greeting (only email forwards do), so type a message
    // into the editor before forwarding.
    await expect(page.locator('[data-cy="escalation-richtext-wrapper"]')).toBeVisible();
    await page.locator('[data-cy="escalation-richtext-wrapper"] .ql-editor').click();
    await page.locator('[data-cy="escalation-richtext-wrapper"] .ql-editor').type('TEST', { delay: 50 });

    await page.locator(`${MODAL_DIALOG} button.sk-btn-primary`).filter({ hasText: 'Överlämna ärende' }).click();

    await expect(page.locator('.sk-dialog')).toContainText('Vill du överlämna ärendet?');
    await expect(page.locator('.sk-dialog .sk-btn-secondary').filter({ hasText: 'Nej' })).toBeVisible();
    const [forwardResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('forward') && resp.request().method() === 'POST'),
      page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click(),
    ]);
    const forwardRequest = forwardResponse.request();
    const forwardBody = forwardRequest.postDataJSON();
    expect(forwardBody.department).toBe('SBK_MEX');
    expect(forwardBody.recipient).toBe('DEPARTMENT');
  });
});
