import type { PixelCrop } from 'react-image-crop';

import { computeCropGeometry, extensionForMimeType, resolveCropOutput } from './crop-geometry';

/** Quality passed to the JPEG encoder. High enough that a re-saved scan does not visibly degrade. */
const JPEG_QUALITY = 0.92;

export interface CropTransform {
  crop: PixelCrop;
  /** Degrees. */
  rotate: number;
  /** CSS scale applied to the image, 1 means untouched. */
  scale: number;
}

export interface CroppedImage {
  blob: Blob;
  mimeType: string;
  extension: string;
  /** True when the result had to be re-encoded to another format than the source. */
  converted: boolean;
}

function drawCroppedImage(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  transform: CropTransform,
  opts?: { fillBackground?: string }
): void {
  const geometry = computeCropGeometry({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    displayWidth: image.width,
    displayHeight: image.height,
    crop: transform.crop,
    rotate: transform.rotate,
    scale: transform.scale,
  });

  canvas.width = geometry.canvasWidth;
  canvas.height = geometry.canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('CANVAS_CONTEXT_MISSING');
  }

  ctx.imageSmoothingQuality = 'high';

  // JPEG has no alpha channel: without a fill, the corners exposed by a rotation and any
  // transparent pixels encode as black. PNG keeps its alpha, so it is left unfilled.
  if (opts?.fillBackground) {
    ctx.fillStyle = opts.fillBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Mirrors what the user sees: the crop overlay sits over the untransformed layout box while
  // the image element carries `transform: scale() rotate()` around its centre.
  ctx.scale(geometry.outputScale, geometry.outputScale);
  ctx.translate(-geometry.cropX, -geometry.cropY);
  ctx.translate(geometry.centerX, geometry.centerY);
  ctx.rotate(geometry.rotateRads);
  ctx.scale(geometry.scale, geometry.scale);
  ctx.translate(-geometry.centerX, -geometry.centerY);
  ctx.drawImage(image, 0, 0);
}

/** Promise wrapper that settles on every path, including a tainted canvas throwing SecurityError. */
function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('CANVAS_EMPTY'))), mimeType, quality);
    } catch (e) {
      reject(e);
    }
  });
}

export async function cropImage(
  image: HTMLImageElement,
  transform: CropTransform,
  source: { mimeType: string; extension?: string }
): Promise<CroppedImage> {
  const output = resolveCropOutput(source.mimeType, source.extension);

  const canvas = document.createElement('canvas');
  drawCroppedImage(image, canvas, transform, {
    fillBackground: output.mimeType === 'image/jpeg' ? '#fff' : undefined,
  });

  const blob = await canvasToBlob(canvas, output.mimeType, output.mimeType === 'image/jpeg' ? JPEG_QUALITY : undefined);

  // Trust what the encoder actually produced rather than what it was asked for. This is what
  // guarantees the extension always matches the bytes.
  const mimeType = blob.type || output.mimeType;
  return {
    blob,
    mimeType,
    extension: extensionForMimeType(mimeType, source.extension),
    converted: mimeType !== source.mimeType,
  };
}
