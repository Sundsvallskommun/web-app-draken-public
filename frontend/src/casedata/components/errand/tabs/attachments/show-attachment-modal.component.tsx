import { SingleCasedataAttachment } from '@casedata/interfaces/attachment';
import { getAttachmentLabel, getImageAspect } from '@casedata/services/casedata-attachment-service';
import { CroppedImage } from '@common/components/image-cropper/crop-image';
import { ImageCropper } from '@common/components/image-cropper/image-cropper.component';
import { Button, Image, Modal, Spinner } from '@sk-web-gui/react';
import { Crop } from 'lucide-react';
import { FC } from 'react';
interface ShowAttachmentModalProps {
  isOpen: boolean;
  modalFetching: boolean;
  modalAttachment?: SingleCasedataAttachment;
  isCropping: boolean;
  canCrop: boolean;
  onClose: () => void;
  onToggleCrop: () => void;
  onCropSave: (result: CroppedImage) => Promise<void>;
}

export const ShowAttachmentModal: FC<ShowAttachmentModalProps> = ({
  isOpen,
  modalFetching,
  modalAttachment,
  isCropping,
  canCrop,
  onClose,
  onToggleCrop,
  onCropSave,
}) => {
  const header = modalAttachment?.errandAttachmentHeader;
  const source = `data:${header?.mimeType};base64,${modalAttachment?.base64EncodedString}`;

  return (
    <Modal
      className="w-[84rem]"
      show={isOpen}
      onClose={onClose}
      label={`${isCropping ? 'Beskär ' : ''}${header?.name ?? ''}`}
    >
      <div className="flex flex-col justify-center items-center my-lg">
        {isCropping && header ? (
          <ImageCropper
            src={source}
            alt={getAttachmentLabel(header.category ?? '')}
            mimeType={header.mimeType}
            extension={header.extension}
            aspect={getImageAspect(header.category ?? '')}
            onCancel={onToggleCrop}
            onSave={onCropSave}
          />
        ) : (
          <>
            <div className="flex-grow-0 my-md">
              <div className="flex flex-col justify-center items-center my-lg">
                {modalFetching ? (
                  <Spinner size={24} />
                ) : (
                  <Image alt={getAttachmentLabel(header?.category ?? '')} key={header?.hash} src={source} />
                )}
              </div>
            </div>
            {canCrop && (
              <div className="my-md">
                <Button
                  data-cy="crop-attachment-button"
                  variant="primary"
                  color="primary"
                  onClick={onToggleCrop}
                  leftIcon={<Crop />}
                >
                  Beskär bild
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
