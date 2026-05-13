import { Attachment } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { getAttachmentLabel } from '@casedata/services/casedata-attachment-service';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { CommonImageCropper } from '@common/components/image-cropper/common-image-cropper.component';
import { Button, Image, Modal, Spinner } from '@sk-web-gui/react';
import { Crop } from 'lucide-react';
import { FC } from 'react';
interface EditAttachmentModalProps {
  isOpen: boolean;
  isCropping: boolean;
  modalFetching: boolean;
  modalAttachment?: Attachment;
  errand: IErrand | undefined;
  onClose: () => void;
  onToggleCrop: () => void;
}

export const EditAttachmentModal: FC<EditAttachmentModalProps> = ({
  isOpen,
  isCropping,
  modalFetching,
  modalAttachment,
  errand,
  onClose,
  onToggleCrop,
}) => {
  return (
    <Modal
      className="w-[84rem]"
      show={isOpen}
      onClose={onClose}
      label={`${isCropping ? 'Beskär ' : ''}${modalAttachment?.name}`}
    >
      <div className="flex flex-col justify-center items-center my-lg">
        {isCropping ? (
          <CommonImageCropper errand={errand!} attachment={modalAttachment!} onClose={onClose} />
        ) : (
          <>
            <div className="flex-grow-0 my-md">
              <div className="flex flex-col justify-center items-center my-lg">
                {modalFetching ? (
                  <Spinner size={24} />
                ) : (
                  <Image
                    alt={getAttachmentLabel(modalAttachment!)}
                    key={modalAttachment?.id}
                    src={`data:${modalAttachment?.mimeType};base64,${modalAttachment?.file}`}
                  />
                )}
              </div>
            </div>
            <div className="my-md">
              <Button
                variant="primary"
                disabled={errand ? isErrandLocked(errand) : false}
                color="primary"
                onClick={onToggleCrop}
                leftIcon={<Crop />}
              >
                {isCropping ? 'Spara' : 'Beskär bild'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
