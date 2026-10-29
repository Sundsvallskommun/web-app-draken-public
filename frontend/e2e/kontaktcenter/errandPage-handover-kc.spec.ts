import { Page } from '@playwright/test';

import { mockAdmins } from '../case-data/fixtures/mockAdmins';
import { mockMe } from '../case-data/fixtures/mockMe';
import { BaseFixtures, expect, test } from '../fixtures/base.fixture';
import { mockConversationMessages, mockConversations } from '../lop/fixtures/mockConversations';
import { mockRelations } from '../lop/fixtures/mockRelations';
import { mockComments } from './fixtures/mockComments';
import {
  mockHandoverPreview,
  mockHandoverResult,
  mockLabelTarget,
  mockLabelTargetMetadata,
  mockLabelTargetPreview,
  mockNamespaceConfigs,
} from './fixtures/mockHandover';
import { mockMetaData } from './fixtures/mockMetadata';
import { mockStakeholderStatus } from './fixtures/mockStakeholderStatus';
import { mockSupportAdminsResponse } from './fixtures/mockSupportAdmins';
import { mockSupportAttachments, mockSupportErrand, mockSupportMessages } from './fixtures/mockSupportErrands';
import { mockSupportHistory } from './fixtures/mockSupportHistory';
import { mockSubscriptions } from './fixtures/mockSupportSubscriptions';
import { MODAL_DIALOG } from '../utils/modal';

test.describe('errand handover to another namespace', () => {
  test.beforeEach(async ({ page, mockRoute }) => {
    await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
    await mockRoute('**/administrators', mockAdmins, { method: 'GET' });
    await mockRoute('**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/supportsubscriptions/2281', mockSubscriptions, { method: 'GET' });
    await mockRoute('**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
    await mockRoute(`**/supportmessage/2281/errands/${mockSupportErrand.id}/communication`, mockSupportMessages, {
      method: 'GET',
    });
    await mockRoute(`**/supportnotes/2281/${mockSupportErrand.id}`, mockComments, { method: 'GET' });
    await mockRoute(`**/supporthistory/2281/${mockSupportErrand.id}`, mockSupportHistory, { method: 'GET' });
    await mockRoute('**/supportmetadata/2281', mockMetaData, { method: 'GET' });
    await mockRoute('**/sourcerelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/targetrelations/**/**', mockRelations, { method: 'GET' });
    await mockRoute('**/communication/conversations/count-read-by*', [], { method: 'GET' });
    await mockRoute('**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
    await mockRoute('**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
      method: 'GET',
    });
    await mockRoute('**/party/*/statuses', mockStakeholderStatus, { method: 'GET' });
    await mockRoute(`**/supporterrands/errandnumber/${mockSupportErrand.errandNumber}`, mockSupportErrand, {
      method: 'GET',
    });
    // Refetch of the (now closed) source errand after a successful handover, mirroring MEX.
    await mockRoute(
      `**/supporterrands/2281/${mockSupportErrand.id}`,
      { ...mockSupportErrand, status: 'SOLVED', resolution: 'PREPARED' },
      { method: 'GET' }
    );
    // The client closes the source errand after the handover.
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}`, mockSupportErrand, { method: 'PATCH' });

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

  test('hands over the errand to another namespace and closes the modal', async ({ page, dismissCookieConsent }) => {
    // Dismissing the post-handover close modal closes the tab; keep the page alive for the rest of the test.
    await page.addInitScript(() => {
      window.close = () => undefined;
    });
    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    // Step 1 – open modal, choose "Draken" and pick the target namespace (where MEX is also listed).
    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();
    await expect(page.locator(MODAL_DIALOG)).toBeVisible();
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0).check();

    // Selecting the namespace triggers the preview automatically (no "Nästa" click).
    const previewResponse = page.waitForResponse((resp) => resp.url().includes('/handover/preview'));
    await page.locator(`${MODAL_DIALOG} [data-cy="resolution-input"]`).selectOption('ROB');
    await previewResponse;

    // Step 2 – review renders, auto-suggestions are preselected.
    await expect(page.locator('[data-cy="handover-review"]')).toBeVisible();
    await expect(page.locator('[data-cy="handover-category-select"]')).toHaveValue('ADMINISTRATION');
    await expect(page.locator('[data-cy="handover-type-select"]')).toHaveValue('GENERAL');
    await expect(page.locator('[data-cy="handover-contactreason-select"]')).toHaveValue('Allmän fråga');
    await expect(page.locator('[data-cy="handover-warning"]')).toContainText(
      'Rollen "ADMINISTRATOR" finns inte hos den mottagande draken och kommer inte att kopieras.'
    );

    // The required fields are marked, as the label fields of a label target are.
    const review = page.locator('[data-cy="handover-review"]');
    await expect(review.getByText('Kategori*', { exact: true })).toBeVisible();
    await expect(review.getByText('Ärendetyp*', { exact: true })).toBeVisible();
    await expect(review.getByText('Kontaktorsak*', { exact: true })).toBeVisible();

    // A two-level target's own choice overrides the suggested type.
    await page.locator('[data-cy="handover-type-select"]').selectOption('OTHER');

    // Step 2 -> execute. Same label + confirmation dialog as the MEX forward.
    await page.locator('[data-cy="handover-submit-button"]').filter({ hasText: 'Överlämna ärendet' }).click();
    await expect(page.locator('.sk-dialog')).toContainText('Vill du överlämna ärendet?');

    // Assert the idempotency key is sent so retries don't create duplicates.
    const handoverRequest = page.waitForRequest((req) => req.url().endsWith('/handover') && req.method() === 'POST');
    const closeRequest = page.waitForRequest(
      (req) => req.url().endsWith(`/supporterrands/2281/${mockSupportErrand.id}`) && req.method() === 'PATCH'
    );
    await page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click();
    const request = await handoverRequest;
    expect(request.headers()['idempotency-key']).toBeTruthy();
    expect(request.postDataJSON().mapping.classification).toEqual({ category: 'ADMINISTRATION', type: 'OTHER' });

    // After the handover the client closes the source errand with Förberett; the close modal then opens to
    // confirm or change the code.
    expect((await closeRequest).postDataJSON()).toEqual({ status: 'SOLVED', resolution: 'PREPARED' });
    const closeModal = page.locator(MODAL_DIALOG).filter({ hasText: 'Avsluta ärendet' });
    await expect(closeModal).toBeVisible();
    await expect(closeModal.locator('[data-cy="current-resolution"]')).toHaveText('Förberett');
    await expect(closeModal.getByRole('button', { name: 'Ändra lösningskod' })).toBeVisible();
    await closeModal.getByRole('button', { name: 'Klart' }).click();
    await expect(closeModal).toBeHidden();
  });

  /** Hands the KC errand over to the label target, given the preview it gets; returns the sent mapping. */
  const handOverToLabelTarget = async (
    {
      page,
      mockRoute,
      dismissCookieConsent,
    }: { page: Page } & Pick<BaseFixtures, 'mockRoute' | 'dismissCookieConsent'>,
    preview: unknown
  ) => {
    await mockRoute('**/supportnamespaceconfigs/2281', [...mockNamespaceConfigs, mockLabelTarget], { method: 'GET' });
    await mockRoute('**/supportnamespacemetadata/2281/*', mockLabelTargetMetadata, { method: 'GET' });
    await mockRoute(`**/supporterrands/2281/${mockSupportErrand.id}/handover/preview`, preview, { method: 'POST' });

    await page.goto('arende/KC-00000001');
    await page.waitForResponse((resp) => resp.url().includes('supporterrands') && resp.status() === 200);
    await dismissCookieConsent();

    await page.locator('[data-cy="forward-button"]').filter({ hasText: 'Överlämna ärendet' }).click();
    await expect(page.locator(MODAL_DIALOG)).toBeVisible();
    await page.locator(`${MODAL_DIALOG} [type="radio"]`).nth(0).check();

    const previewResponse = page.waitForResponse((resp) => resp.url().includes('/handover/preview'));
    await page.locator(`${MODAL_DIALOG} [data-cy="resolution-input"]`).selectOption(mockLabelTarget.namespace);
    await previewResponse;

    // The deepest suggested label and its ancestors are preselected and marked as an auto-suggestion.
    const labels = page.locator('[data-cy="handover-labels"]');
    await expect(labels.locator('[data-cy="labelCategory-input"][placeholder="Lön"]')).toBeVisible();
    await expect(labels.locator('[data-cy="labelType-input"][placeholder="Lönespecifikation"]')).toBeVisible();
    await expect(labels.locator('[data-cy="handover-auto-suggest"]')).toBeVisible();

    await page.locator('[data-cy="handover-submit-button"]').filter({ hasText: 'Överlämna ärendet' }).click();
    const handoverRequest = page.waitForRequest((req) => req.url().endsWith('/handover') && req.method() === 'POST');
    await page.locator('.sk-dialog .sk-btn-primary').filter({ hasText: 'Ja' }).click();
    return (await handoverRequest).postDataJSON().mapping;
  };

  test('sends the suggested labels and classification for a label target', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const mapping = await handOverToLabelTarget({ page, mockRoute, dismissCookieConsent }, mockLabelTargetPreview);

    expect(mapping.labels).toEqual(['label-salary', 'label-payslip']);
    expect(mapping.classification).toEqual({ category: 'ADMINISTRATION', type: 'GENERAL' });
  });

  test('leaves the classification out for a label target the preview suggests none for', async ({
    page,
    mockRoute,
    dismissCookieConsent,
  }) => {
    const { mappingRequired } = mockLabelTargetPreview;
    const preview = {
      ...mockLabelTargetPreview,
      mappingRequired: {
        ...mappingRequired,
        classification: { ...mappingRequired.classification, suggestedCategory: null, suggestedType: null },
      },
    };

    const mapping = await handOverToLabelTarget({ page, mockRoute, dismissCookieConsent }, preview);

    expect(mapping).not.toHaveProperty('classification');
  });
});
