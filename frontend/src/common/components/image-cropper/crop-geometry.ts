import type { PixelCrop } from 'react-image-crop';

/**
 * Canvas encoders that every supported browser can both decode and re-encode. canvas.toBlob
 * silently falls back to PNG for anything else, so a wider list would produce a PNG saved under
 * the source file's name and extension.
 */
const canvasEncoders: Record<string, { extensions: string[]; defaultExtension: string }> = {
  'image/jpeg': { extensions: ['jpg', 'jpeg'], defaultExtension: 'jpg' },
  'image/png': { extensions: ['png'], defaultExtension: 'png' },
};

/**
 * Mime types that get a crop button. Deliberately narrower than imageMimeTypes: tiff, heic and
 * heif are not decoded by Chrome at all, and gif and bmp decode but cannot be re-encoded.
 */
const croppableImageMimeTypes = Object.keys(canvasEncoders);

export const isCroppableImage = (mimeType?: string): boolean =>
  !!mimeType && croppableImageMimeTypes.includes(mimeType);

export interface CropOutput {
  mimeType: string;
  extension: string;
  /** True when the source format could not be re-encoded and the result is a PNG instead. */
  converted: boolean;
}

/** Picks the encoder mime type together with an extension that actually matches it. */
export const resolveCropOutput = (sourceMimeType: string, sourceExtension?: string): CropOutput => {
  const encoder = canvasEncoders[sourceMimeType];
  if (!encoder) {
    return { mimeType: 'image/png', extension: 'png', converted: true };
  }

  const extension = sourceExtension?.toLowerCase().replace(/^\./, '');
  return {
    mimeType: sourceMimeType,
    extension: extension && encoder.extensions.includes(extension) ? extension : encoder.defaultExtension,
    converted: false,
  };
};

/** Reverse lookup, so the extension can be derived from the blob the browser actually produced. */
export const extensionForMimeType = (mimeType: string, preferredExtension?: string): string =>
  resolveCropOutput(mimeType, preferredExtension).extension;

/**
 * Browsers cap the total canvas area, Safari considerably lower than Chrome. Crops larger than
 * this are scaled down rather than silently producing a blank canvas.
 */
const MAX_OUTPUT_PIXELS = 33_000_000;

export interface CropGeometryInput {
  naturalWidth: number;
  naturalHeight: number;
  /** Layout size of the img element; the crop rect is expressed in this coordinate space. */
  displayWidth: number;
  displayHeight: number;
  crop: PixelCrop;
  /** Degrees. */
  rotate: number;
  /** CSS scale applied to the image, 1 means untouched. */
  scale: number;
  maxOutputPixels?: number;
}

export interface CropGeometry {
  canvasWidth: number;
  canvasHeight: number;
  /** Crop origin in natural image pixels. */
  cropX: number;
  cropY: number;
  /** Downscale applied when the crop exceeds maxOutputPixels, 1 when untouched. */
  outputScale: number;
  rotateRads: number;
  centerX: number;
  centerY: number;
  scale: number;
}

export function computeCropGeometry(input: CropGeometryInput): CropGeometry {
  const {
    naturalWidth,
    naturalHeight,
    displayWidth,
    displayHeight,
    crop,
    rotate,
    scale,
    maxOutputPixels = MAX_OUTPUT_PIXELS,
  } = input;

  if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) {
    throw new Error('CROP_EMPTY');
  }
  if (crop.width <= 0 || crop.height <= 0) {
    throw new Error('CROP_EMPTY');
  }

  // The crop rect comes from the rendered element, the source pixels come from the decoded image.
  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;

  const cropWidth = crop.width * scaleX;
  const cropHeight = crop.height * scaleY;

  // Deliberately not multiplied by devicePixelRatio: that belongs to on-screen preview canvases
  // and would only inflate the exported file on high density displays.
  const outputScale = Math.min(1, Math.sqrt(maxOutputPixels / (cropWidth * cropHeight)));

  return {
    canvasWidth: Math.floor(cropWidth * outputScale),
    canvasHeight: Math.floor(cropHeight * outputScale),
    cropX: crop.x * scaleX,
    cropY: crop.y * scaleY,
    outputScale,
    rotateRads: (rotate * Math.PI) / 180,
    centerX: naturalWidth / 2,
    centerY: naturalHeight / 2,
    scale,
  };
}
