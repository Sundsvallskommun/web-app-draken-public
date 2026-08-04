import { test, expect } from '../../fixtures/base.fixture';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockJpegBase64, mockPdfBase64 } from '../fixtures/mockAttachmentContent';
import { mockAttachments } from '../fixtures/mockAttachments';
import { mockLeaseAgreement, mockContractAttachment } from '../fixtures/mockContract';
import { mockEstateInfo11, mockEstateInfo12 } from '../fixtures/mockEstateInfo';
import { mockHistory } from '../fixtures/mockHistory';
import { mockMe } from '../fixtures/mockMe';
import { mockMessages } from '../fixtures/mockMessages';
import { mockMexErrand_base } from '../fixtures/mockMexErrand';
import { mockPersonId } from '../fixtures/mockPersonId';

const [imageAttachment, pdfAttachment] = mockAttachments.data;

const attachmentContent: Record<number, string> = {
  [imageAttachment.id]: mockJpegBase64,
  [pdfAttachment.id]: mockPdfBase64,
};

const attachmentIdFromUrl = (url: string) => Number(new URL(url).pathname.split('/').pop());

test.describe('Errand page attachments tab', () => {
  // Ids whose content was fetched from the single-attachment endpoint, in request order.
  let contentRequests: number[];
  // Upload requests, so the multipart body can be inspected. Chromium streams file parts
  // separately from the rest of the body, so neither the file bytes nor Content-Length are
  // visible to Playwright — only the part headers and the plain fields can be asserted here.
  let uploadedRequests: { body: string; contentType: string }[];

  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    contentRequests = [];
    uploadedRequests = [];

    await mockRoute('**/messages/MEX-2024-000280*', mockMessages, { method: 'GET' });
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
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
      if (method === 'PATCH' || method === 'DELETE') {
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
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockMexErrand_base.data, message: 'Attachment created' }),
      });
    }); // @uploadAttachment

    await page.goto(`arende/${mockMexErrand_base.data.id}`);
    await page.waitForResponse((resp) => resp.url().includes('/errand/errandNumber/') && resp.status() === 200);
    await dismissCookieConsent();
    const attachmentsTab = page.getByRole('tab', { name: /^Bilagor/ });
    await expect(attachmentsTab).toHaveText(`Bilagor (${mockAttachments.data.length})`);
    await attachmentsTab.click();
  });

  test('lists the errand attachments', async ({ page }) => {
    const rows = page.locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item');
    await expect(rows).toHaveCount(mockAttachments.data.length);
    await expect(rows.nth(0)).toContainText(imageAttachment.name);
    await expect(rows.nth(1)).toContainText(pdfAttachment.name);
    // Both fixtures carry a hash, so neither may be marked as invalid.
    await expect(page.getByText('(ogiltig fil)')).toHaveCount(0);
  });

  test('renders a preview for image attachments only', async ({ page }) => {
    const imageRow = page.locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item').filter({ hasText: imageAttachment.name });
    const preview = imageRow.locator('.sk-form-file-upload-list-item-icon img');

    await expect(preview).toHaveAttribute('src', `data:${imageAttachment.mimeType};base64,${mockJpegBase64}`);
    // Guards the regression where the preview was built from an empty File and rendered blank.
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    // The pdf row shows an icon instead of a preview, and its content is never fetched.
    const pdfRow = page.locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item').filter({ hasText: pdfAttachment.name });
    await expect(pdfRow.locator('.sk-form-file-upload-list-item-icon img')).toHaveCount(0);
    expect(contentRequests).toEqual([imageAttachment.id]);
  });

  test('opens an image attachment in a modal', async ({ page }) => {
    const imageRow = page.locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item').filter({ hasText: imageAttachment.name });
    await imageRow.getByRole('button', { name: 'Öppna' }).click();

    const modalImage = page.locator('.sk-modal-dialog img');
    await expect(modalImage).toBeVisible();
    await expect(modalImage).toHaveAttribute('src', `data:${imageAttachment.mimeType};base64,${mockJpegBase64}`);
    await expect.poll(() => modalImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('downloads a pdf attachment with intact content', async ({ page }) => {
    const pdfRow = page.locator('[data-cy="casedataAttachments-list"] li.sk-form-file-upload-list-item').filter({ hasText: pdfAttachment.name });
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
});
