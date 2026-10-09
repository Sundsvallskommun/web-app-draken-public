/**
 * Kept apart from the upload component so that services can read the list without pulling in the
 * component, which itself depends on the casedata attachment service (an import cycle otherwise).
 */
export const imageMimeTypes = [
  'image/jpeg',
  'image/gif',
  'image/png',
  'image/tiff',
  'image/bmp',
  'image/heic',
  'image/heif',
];
