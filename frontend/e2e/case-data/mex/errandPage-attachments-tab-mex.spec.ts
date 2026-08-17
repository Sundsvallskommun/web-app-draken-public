import { expect, test } from '../../fixtures/base.fixture';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockCropJpegBase64, mockJpegBase64, mockPdfBase64 } from '../fixtures/mockAttachmentContent';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockContractAttachment, mockLeaseAgreement } from '../fixtures/mockContract';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';
import { mockHistory } from '../fixtures/mockHistory';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPersonId } from '../fixtures/mockPersonId';
import { mockRelations, mockResolvedRelations } from '../fixtures/mockRelations';

const [imageAttachment, pdfAttachment] = mockAttachments.data;

// Decision attachments live on the errand's decisions and are merged into the attachment list, so
// they count towards the tab badge and the rendered rows alongside the errand attachments.
const decisionAttachmentCount = mockMexErrand_base.data.decisions.flatMap((d) => d.attachments ?? []).length;
const totalAttachmentCount = mockAttachments.data.length + decisionAttachmentCount;

// Reassigned per test, so the cropping tests can serve a larger image without affecting the
// preview and download tests that assert the 1x1 fixture byte for byte.
let attachmentContent: Record<number, string>;

const attachmentIdFromUrl = (url: string) => Number(new URL(url).pathname.split('/').pop());

test.describe('Errand page attachments tab', () => {
  // Ids whose content was fetched from the single-attachment endpoint, in request order.
  let contentRequests: number[];
  // Upload requests, so the multipart body can be inspected. Chromium streams file parts
  // separately from the rest of the body, so neither the file bytes nor Content-Length are
  // visible to Playwright — only the part headers and the plain fields can be asserted here.
  let uploadedRequests: { body: string; contentType: string }[];
  // Ids passed to the delete endpoint, in request order.
  let deletedIds: number[];
  // Writes against the attachment collection in the order they happened. Cropping replaces an
  // attachment by uploading the new version before deleting the old one, and that order is the
  // whole point — a failed upload must never leave the errand without the original.
  let writeSequence: ('upload' | 'delete')[];
  // Let a single test make the upload or the delete fail without redefining the route.
  let uploadStatus: number;
  let deleteStatus: number;

  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    contentRequests = [];
    uploadedRequests = [];
    deletedIds = [];
    writeSequence = [];
    uploadStatus = 201;
    deleteStatus = 200;
    attachmentContent = {
      [imageAttachment.id]: mockJpegBase64,
      [pdfAttachment.id]: mockPdfBase64,
    };

    await mockRoute('**/messages/MEX-2024-000280*', mockMessages, { method: 'GET' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    // Left unmocked these reach a real backend. A 401 from any call sends handleError to the
    // login page, which fails every test in this file for a reason unrelated to attachments.
    await mockRoute('**/casedatanotifications/*', [], { method: 'GET' });
    await mockRoute('**/relations/referredfrom/*', mockRelations, { method: 'GET' });
    await mockRoute('**/resolvedrelations/**/**', mockResolvedRelations, { method: 'GET' });
    await mockRoute('**/communication/conversations', [], { method: 'GET' });
    await mockRoute('**/templates?**', [], { method: 'GET' });
    await mockRoute('**/singleEstateByPropertyDesignation/*1:1', mockEstateInfo11, { method: 'GET' });
    await mockRoute('**/singleEstateByPropertyDesignation/*1:2', mockEstateInfo12, { method: 'GET' });
    await mockRoute('**/personid', mockPersonId, { method: 'POST' });
    await mockRoute('**/errands/*', { data: 'ok', message: 'ok' }, { method: 'PATCH' }); // @patchErrand
    await mockRoute('**/errands/*/extraparameters', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    // saveErrand() runs before the upload and saves facilities and extra parameters first;
    // if either fails the upload is never attempted.
    await mockRoute('**/errands/*/facilities', { data: 'ok', message: 'ok' }, { method: 'POST' });
    await mockRoute('**/errands/*/facilities', { data: 'ok', message: 'ok' }, { method: 'PATCH' });
    await mockRoute('**/errand/errandNumber/*', mockMexErrand_base, { method: 'GET' }); // @getErrand
    await mockRoute('**/stakeholders/personNumber', mockMexErrand_base.data.stakeholders, { method: 'POST' });
    await mockRoute(
      '**/contract/2024-01026',
      mockMexErrand_base.data.extraParameters.find((param) => param.key === 'contractId')?.values[0],
      { method: 'GET' }
    ); // @getContract
    await mockRoute('**/errands/*/history', mockHistory, { method: 'GET' }); // @getHistory
    await mockRoute('**/contracts/2024-01026', mockLeaseAgreement, { method: 'GET' }); // @getContract
    await mockRoute('**/contracts/2281/2024-01026/attachments/1', mockContractAttachment, { method: 'GET' }); // @getContractAttachment
    await mockRoute('**/estateInfo/**1:1', mockEstateInfo11, { method: 'GET' }); // @getEstateInfo
    await mockRoute('**/estateInfo/**1:2', mockEstateInfo12, { method: 'GET' }); // @getEstateInfo

    await page.route(/\/errand\/\d*/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMexErrand_base),
      });
    }); // @getErrandById

    // Note the singular /errand/ — this is the attachment *list*, and it is what populates
    // errand.attachments. It carries metadata only, never file content.
    await page.route(/\/errand\/\d+\/attachments$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAttachments),
      });
    }); // @getErrandAttachments

    await page.route(/\/errand\/\d+\/messages$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMessages),
      });
    });

    // Content of a single attachment: raw base64 as plain text, matching what the BFF sends.
    await page.route(/\/errands\/\d+\/attachments\/\d+$/, async (route) => {
      const method = route.request().method();
      const id = attachmentIdFromUrl(route.request().url());
      if (method === 'GET') {
        contentRequests.push(id);
        await route.fulfill({ status: 200, contentType: 'text/plain', body: attachmentContent[id] ?? '' });
        return;
      }
      if (method === 'DELETE') {
        deletedIds.push(id);
        writeSequence.push('delete');
        await route.fulfill({
          status: deleteStatus,
          contentType: 'application/json',
          body: JSON.stringify(deleteStatus >= 400 ? { message: 'failed' } : { data: 'ok', message: 'ok' }),
        });
        return;
      }
      if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: 'ok', message: 'ok' }),
        });
        return;
      }
      await route.fallback();
    }); // @getAttachmentContent

    await page.route(/\/errands\/\d+\/attachments$/, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      uploadedRequests.push({
        body: route.request().postDataBuffer()?.toString('latin1') ?? '',
        contentType: route.request().headers()['content-type'] ?? '',
      });
      writeSequence.push('upload');
      if (uploadStatus >= 400) {
        await route.fulfill({
          status: uploadStatus,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Attachment could not be created' }),
        });
        return;
      }
      await route.fulfill({
        status: uploadStatus,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockMexErrand_base.data, message: 'Attachment created' }),
      });
    }); // @uploadAttachment

    await page.goto(`arende/${mockMexErrand_base.data.id}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const attachmentsTab = page.getByRole('tab', { name: /^Bilagor/ });
    await expect(attachmentsTab).toHaveText(`Bilagor (${totalAttachmentCount})`);
    await attachmentsTab.click();
  });

  test('lists the errand attachments', async ({ page }) => {
    const rows = page.locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item');
    await expect(rows).toHaveCount(totalAttachmentCount);
    await expect(rows.nth(0)).toContainText(imageAttachment.name);
    await expect(rows.nth(1)).toContainText(pdfAttachment.name);
    // Both fixtures carry a hash, so neither may be marked as invalid.
    await expect(page.getByText('(ogiltig fil)')).toHaveCount(0);
  });

  test('renders a preview for image attachments only', async ({ page }) => {
    const imageRow = page
      .locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item')
      .filter({ hasText: imageAttachment.name });
    const preview = imageRow.locator('.sk-form-file-upload-list-item-icon img');

    await expect(preview).toHaveAttribute('src', `data:${imageAttachment.mimeType};base64,${mockJpegBase64}`);
    // Guards the regression where the preview was built from an empty File and rendered blank.
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    // The pdf row shows an icon instead of a preview, and its content is never fetched.
    const pdfRow = page
      .locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item')
      .filter({ hasText: pdfAttachment.name });
    await expect(pdfRow.locator('.sk-form-file-upload-list-item-icon img')).toHaveCount(0);
    expect(contentRequests).toEqual([imageAttachment.id]);
  });

  test('opens an image attachment in a modal', async ({ page }) => {
    const imageRow = page
      .locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item')
      .filter({ hasText: imageAttachment.name });
    await imageRow.getByRole('button', { name: 'Öppna' }).click();

    const modalImage = page.locator('.sk-modal-dialog img');
    await expect(modalImage).toBeVisible();
    await expect(modalImage).toHaveAttribute('src', `data:${imageAttachment.mimeType};base64,${mockJpegBase64}`);
    await expect.poll(() => modalImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('downloads a pdf attachment with intact content', async ({ page }) => {
    const pdfRow = page
      .locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item')
      .filter({ hasText: pdfAttachment.name });
    const downloadPromise = page.waitForEvent('download');
    await pdfRow.getByRole('button', { name: 'Öppna' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(pdfAttachment.name);

    // Guards the regression where a File object was interpolated into the data URI, which
    // made the payload the string "[object File]" rather than the file itself.
    const chunks: Buffer[] = [];
    const stream = await download.createReadStream();
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const downloaded = Buffer.concat(chunks);
    expect(downloaded.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(downloaded.toString('base64')).toBe(mockPdfBase64);
  });

  test('uploads an image attachment as multipart with the file attached', async ({ page }) => {
    await page.locator('[data-cy="add-attachment-button"]').click();
    await page.locator('.sk-modal-content input[type=file]').setInputFiles('e2e/case-data/files/testimage.jpg');
    await page.locator('select[name="newFiles.0.meta.category"]').selectOption({ label: 'Förfrågan markköp' });
    await page.locator('.sk-modal-footer button').filter({ hasText: 'Ladda upp' }).click();

    await expect(page.getByText('Bilagan sparades')).toBeVisible();

    expect(uploadedRequests).toHaveLength(1);
    const [upload] = uploadedRequests;
    expect(upload.contentType).toContain('multipart/form-data');
    expect(upload.body).toContain('name="files"; filename="testimage.jpg"');
    expect(upload.body).toContain('name="category"');
    expect(upload.body).toContain('name="name"');
  });

  test('uploads a pdf attachment as multipart with the file attached', async ({ page }) => {
    await page.locator('[data-cy="add-attachment-button"]').click();
    await page.locator('.sk-modal-content input[type=file]').setInputFiles('e2e/case-data/files/testpdf.pdf');
    await page.locator('select[name="newFiles.0.meta.category"]').selectOption({ label: 'Förfrågan markköp' });
    await page.locator('.sk-modal-footer button').filter({ hasText: 'Ladda upp' }).click();

    await expect(page.getByText('Bilagan sparades')).toBeVisible();

    expect(uploadedRequests).toHaveLength(1);
    const [upload] = uploadedRequests;
    expect(upload.contentType).toContain('multipart/form-data');
    expect(upload.body).toContain('name="files"; filename="testpdf.pdf"');
    expect(upload.body).toContain('name="mimeType"');
    expect(upload.body).toContain('application/pdf');
  });

  test.describe('cropping', () => {
    test.beforeEach(() => {
      // Serve the 400x300 fixture instead: the modal refetches the content when the attachment
      // is opened, so this is what the cropper receives.
      attachmentContent[imageAttachment.id] = mockCropJpegBase64;
    });

    // Opens the image preview and switches it into crop mode.
    const startCropping = async (page: import('@playwright/test').Page) => {
      const imageRow = page
        .locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item')
        .filter({ hasText: imageAttachment.name });
      await imageRow.getByRole('button', { name: 'Öppna' }).click();
      await page.locator('[data-cy="crop-attachment-button"]').click();
    };

    // The selection is preseeded to the whole image on load, so a crop can be saved without
    // dragging first.
    const saveCrop = async (page: import('@playwright/test').Page) => {
      await page.locator('[data-cy="crop-save-button"]').click();
      await page.locator('[data-cy="crop-confirm-save-button"]').click();
    };

    // The snackbar renders its message twice, once visually and once for screen readers, so the
    // assertion has to name the visible element.
    const toast = (page: import('@playwright/test').Page, message: string) =>
      page.locator('.sk-snackbar-text').filter({ hasText: message });

    test('offers cropping for image attachments', async ({ page }) => {
      const imageRow = page
        .locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item')
        .filter({ hasText: imageAttachment.name });
      await imageRow.getByRole('button', { name: 'Öppna' }).click();

      await expect(page.locator('[data-cy="crop-attachment-button"]')).toBeVisible();
      await page.locator('[data-cy="crop-attachment-button"]').click();

      // Crop mode replaces the preview with the cropper and its rotation control.
      await expect(page.locator('[data-cy="crop-rotate-input"]')).toBeVisible();
      await expect(page.locator('.ReactCrop')).toBeVisible();
      await expect(page.getByText(`Beskär ${imageAttachment.name}`)).toBeVisible();
    });

    test('uploads the cropped version before deleting the original', async ({ page }) => {
      await startCropping(page);
      await saveCrop(page);

      await expect(toast(page, 'Bilagan beskars och sparades')).toBeVisible();

      // The ordering is the safety property: the replacement exists on the server before the
      // original is removed, so a failed upload can never lose the file.
      expect(writeSequence).toEqual(['upload', 'delete']);
      expect(deletedIds).toEqual([imageAttachment.id]);

      expect(uploadedRequests).toHaveLength(1);
      const [upload] = uploadedRequests;
      expect(upload.contentType).toContain('multipart/form-data');
      // Name, extension and mime type must agree, otherwise the stored bytes and the file name
      // describe different formats.
      expect(upload.body).toContain(`name="files"; filename="${imageAttachment.name}"`);
      expect(upload.body).toContain(imageAttachment.mimeType);
      expect(upload.body).toContain(imageAttachment.extension);
      // The category is carried over from the attachment being replaced.
      expect(upload.body).toContain(imageAttachment.category);
    });

    test('keeps the original when the cropped upload fails', async ({ page }) => {
      uploadStatus = 500;

      await startCropping(page);
      await saveCrop(page);

      await expect(toast(page, 'Något gick fel när den beskurna bilagan sparades')).toBeVisible();

      // Nothing may be deleted when the replacement never made it to the server.
      expect(deletedIds).toEqual([]);
      expect(writeSequence).not.toContain('delete');
      // Exactly one attempt: the replace path opts out of sendAttachments' retries, because a
      // retried upload can leave a duplicate behind when only the response was lost.
      expect(uploadedRequests).toHaveLength(1);
    });

    test('warns when the original could not be removed', async ({ page }) => {
      deleteStatus = 500;

      await startCropping(page);
      await saveCrop(page);

      // The errand is left with both copies, which the handler has to resolve manually.
      await expect(
        toast(page, 'Den beskurna bilagan sparades, men originalet kunde inte tas bort. Ta bort det manuellt.')
      ).toBeVisible();
      expect(writeSequence).toEqual(['upload', 'delete']);
    });
  });
});
