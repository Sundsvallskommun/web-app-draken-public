import { Attachment } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { getImageAspect } from '@casedata/services/casedata-attachment-service';
import { saveCroppedImage } from '@casedata/services/casedata-errand-service';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, cx, Image } from '@sk-web-gui/react';
import { useRef, useState } from 'react';
import ReactCrop, { centerCrop, Crop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export const CommonImageCropper: React.FC<{ errand: IErrand; attachment: Attachment; onClose: () => void }> = (
  props
) => {
  const { municipalityId } = useAppContext();
  const imgRef = useRef<HTMLImageElement>(null);
  const [blob, setBlob] = useState<Blob>();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [save, setSave] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [aspect, setAspect] = useState<number | undefined>(getImageAspect(props.attachment));

  function getCroppedImg(image: HTMLImageElement, crop: Crop, fileName: string) {
    // Used code from:
    // https://stackoverflow.com/questions/58698458/how-to-get-cropped-image-after-crop-as-a-form-data-in-react
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // First, rotate in a temporary canvas
    const rotationCanvas = document.createElement('canvas');
    rotationCanvas.width = image.naturalWidth;
    rotationCanvas.height = image.naturalHeight;
    const rotationCtx = rotationCanvas.getContext('2d');
    rotationCtx.translate(rotationCanvas.width / 2, rotationCanvas.height / 2);
    rotationCtx.rotate((rotate * Math.PI) / 180);
    rotationCtx.translate(-rotationCanvas.width / 2, -rotationCanvas.height / 2);
    rotationCtx.drawImage(
      image,
      0,
      0,
      rotationCanvas.width * scaleX,
      rotationCanvas.height * scaleY,
      0,
      0,
      rotationCanvas.width * scaleX,
      rotationCanvas.height * scaleY
    );

    // Then, crop and scale in a final canvas
    const croppedCanvas = document.createElement('canvas');
    const MAX_SIZE = 11000;
    const scale = Math.min(MAX_SIZE / crop.width, MAX_SIZE / crop.height, 1);
    croppedCanvas.width = scale * crop.width;
    croppedCanvas.height = scale * crop.height;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.fillStyle = '#fff';
    croppedCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
    croppedCtx.drawImage(
      rotationCanvas,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );

    return new Promise((resolve, reject) => {
      croppedCanvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        setBlob(blob);
      }, props.attachment.mimeType);
    });
  }

  function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
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

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    if (aspect) {
      setCrop(centerAspectCrop(width, height, aspect));
    } else {
      setCrop(centerAspectCrop(width, height, width / height));
    }
  }

  function onSave() {
    saveCroppedImage(municipalityId, props.errand.id, props.attachment, blob);
  }

  useDebounceEffect(
    async () => {
      if (completedCrop?.width && completedCrop?.height && imgRef.current) {
        getCroppedImg(imgRef.current, completedCrop, props.attachment.name);
      }
    },
    100,
    [completedCrop, scale, rotate]
  );

  return (
    <>
      <div className="flex-grow-0 my-md">
        <div className="flex flex-col justify-center items-center my-lg">
          <div className="flex flex-col items-center justify-center my-sm">
            <label htmlFor="rotate-input">Rotera bilden ({rotate}&deg;) </label>
            <div className="relative px-lg flex item-center gap-md">
              <input
                id="rotate-input"
                type="range"
                min="-180"
                max="180"
                value={rotate}
                className="w-80"
                onChange={(e) => setRotate(Math.min(180, Math.max(-180, Number(e.target.value))))}
              />
              <LucideIcon
                name="circle-x"
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
            <Image
              ref={imgRef}
              src={`data:${props.attachment?.mimeType};base64,${props.attachment?.file}`}
              style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
              onLoad={onImageLoad}
              alt="Uppladdad bild"
            />
          </ReactCrop>
        </div>
      </div>
      <div className="my-md">
        {save ? (
          <>
            <div className="text-center mb-md">
              <strong>Är du säker?</strong>
            </div>
            <div className="my-md flex gap-md">
              <Button
                variant="secondary"
                onClick={() => {
                  setSave(false);
                }}
                leftIcon={<LucideIcon name="arrow-left" />}
              >
                Ångra
              </Button>
              <Button
                variant="primary"
                color="primary"
                loading={isLoading}
                loadingText={'Sparar'}
                onClick={() => {
                  setIsLoading(true);
                  onSave();
                  setTimeout(() => {
                    props.onClose();
                    setTimeout(() => {
                      setIsLoading(false);
                    }, 250);
                  }, 1000);
                }}
                leftIcon={<LucideIcon name="check" />}
              >
                Ja, spara
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-md">
              <strong></strong>
            </div>
            <Button
              variant="primary"
              color="primary"
              onClick={() => {
                setSave(true);
              }}
              leftIcon={<LucideIcon name="check" />}
            >
              Spara
            </Button>
          </>
        )}
      </div>
    </>
  );
};
