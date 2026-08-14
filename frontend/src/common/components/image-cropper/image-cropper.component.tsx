import 'react-image-crop/dist/ReactCrop.css';

import { Button, cx, FormErrorMessage } from '@sk-web-gui/react';
import { ArrowLeft, Check, CircleX } from 'lucide-react';
import { FC, SyntheticEvent, useRef, useState } from 'react';
import ReactCrop, { centerCrop, convertToPixelCrop, Crop, makeAspectCrop, PixelCrop } from 'react-image-crop';

import { cropImage, CroppedImage } from './crop-image';

/** No zoom control is offered, so the image is always drawn at its natural scale. */
const IMAGE_SCALE = 1;

export interface ImageCropperProps {
  /** data: or blob: URL. Must be same-origin, otherwise the canvas is tainted and export fails. */
  src: string;
  alt?: string;
  mimeType: string;
  extension?: string;
  /** Locks the selection to a fixed ratio when set. */
  aspect?: number;
  /** Requires a second click before onSave runs. On by default. */
  confirmSave?: boolean;
  onCancel: () => void;
  onSave: (result: CroppedImage) => Promise<void>;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 100,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropper: FC<ImageCropperProps> = ({
  src,
  alt = 'Uppladdad bild',
  mimeType,
  extension,
  aspect,
  confirmSave = true,
  onCancel,
  onSave,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotate, setRotate] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, aspect ?? width / height);
    setCrop(initialCrop);
    // onComplete only fires once the user drags, so the pixel crop is seeded here as well.
    // Otherwise saving the preselected full-image crop straight away would fail.
    setCompletedCrop(convertToPixelCrop(initialCrop, width, height));
  };

  const handleSave = async () => {
    setError(undefined);

    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) {
      setError('Markera ett område att beskära');
      setConfirming(false);
      return;
    }

    setIsSaving(true);
    try {
      // The blob is produced here rather than kept in state, so it always reflects the
      // selection as it looks at the moment of saving.
      const result = await cropImage(
        imgRef.current,
        { crop: completedCrop, rotate, scale: IMAGE_SCALE },
        { mimeType, extension }
      );
      await onSave(result);
    } catch (e) {
      setError('Bilden kunde inte sparas. Försök igen.');
      setConfirming(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex-grow-0 my-md">
        <div className="flex flex-col justify-center items-center my-lg">
          <div className="flex flex-col items-center justify-center my-sm">
            <label htmlFor="rotate-input">Rotera bilden ({rotate}&deg;) </label>
            <div className="relative px-lg flex item-center gap-md">
              <input
                id="rotate-input"
                data-cy="crop-rotate-input"
                type="range"
                min="-180"
                max="180"
                value={rotate}
                className="w-80"
                onChange={(e) => setRotate(Math.min(180, Math.max(-180, Number(e.target.value))))}
              />
              <CircleX
                className={cx(
                  `absolute -right-1 ${rotate === 0 ? 'cursor-disabled text-gray-400' : 'cursor-pointer text-black'}`
                )}
                onClick={() => setRotate(0)}
              />
            </div>
          </div>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            ruleOfThirds={true}
            aspect={aspect}
          >
            {/* A plain img rather than sk-web-gui's Image: that one swaps the element while its
                loading fallback resolves, which fights ReactCrop's ResizeObserver. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt={alt} style={{ transform: `rotate(${rotate}deg)` }} onLoad={onImageLoad} />
          </ReactCrop>
        </div>
      </div>

      {error && <FormErrorMessage className="mb-md">{error}</FormErrorMessage>}

      <div className="my-md">
        {confirming ? (
          <>
            <div className="text-center mb-md">
              <strong>Är du säker?</strong>
            </div>
            <div className="my-md flex gap-md">
              <Button
                variant="secondary"
                disabled={isSaving}
                onClick={() => setConfirming(false)}
                leftIcon={<ArrowLeft />}
              >
                Ångra
              </Button>
              <Button
                data-cy="crop-confirm-save-button"
                variant="primary"
                color="primary"
                loading={isSaving}
                loadingText="Sparar"
                onClick={handleSave}
                leftIcon={<Check />}
              >
                Ja, spara
              </Button>
            </div>
          </>
        ) : (
          <div className="flex gap-md">
            <Button variant="secondary" onClick={onCancel} leftIcon={<ArrowLeft />}>
              Avbryt
            </Button>
            <Button
              data-cy="crop-save-button"
              variant="primary"
              color="primary"
              loading={isSaving}
              loadingText="Sparar"
              onClick={() => (confirmSave ? setConfirming(true) : handleSave())}
              leftIcon={<Check />}
            >
              Spara
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
