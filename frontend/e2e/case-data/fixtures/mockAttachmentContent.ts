import { readFileSync } from 'fs';

// CaseData no longer returns attachment content together with the metadata. The content of a
// single attachment is fetched from GET .../errands/{errandId}/attachments/{attachmentId},
// which responds with the raw base64-encoded bytes as a plain string (not JSON). These
// fixtures are what that endpoint returns in tests.

/**
 * A real 1x1 JPEG, so a preview built from it actually decodes in the browser rather than
 * silently rendering as a broken image — which is exactly the regression these tests guard.
 */
export const mockJpegBase64 = readFileSync('e2e/case-data/files/testimage.jpg').toString('base64');

/** The same PDF that the upload tests send, so a download can be verified byte for byte. */
export const mockPdfBase64 = readFileSync('e2e/case-data/files/testpdf.pdf').toString('base64');
