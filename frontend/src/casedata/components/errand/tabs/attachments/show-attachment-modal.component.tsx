import { SingleCasedataAttachment } from '@casedata/interfaces/attachment';
import { getAttachmentLabel } from '@casedata/services/casedata-attachment-service';
import { Image, Modal, Spinner } from '@sk-web-gui/react';
import { FC } from 'react';
interface ShowAttachmentModalProps {
  isOpen: boolean;
  modalFetching: boolean;
  modalAttachment?: SingleCasedataAttachment;
  onClose: () => void;
}

export const ShowAttachmentModal: FC<ShowAttachmentModalProps> = ({
  isOpen,
  modalFetching,
  modalAttachment,
  onClose,
}) => {
  return (
    <Modal
      className="w-[84rem]"
      show={isOpen}
      onClose={onClose}
      label={`${modalAttachment?.errandAttachmentHeader?.name}`}
    >
      <div className="flex flex-col justify-center items-center my-lg">
        <div className="flex-grow-0 my-md">
          <div className="flex flex-col justify-center items-center my-lg">
            {modalFetching ? (
              <Spinner size={24} />
            ) : (
              <Image
                alt={getAttachmentLabel(modalAttachment?.errandAttachmentHeader?.category ?? '')}
                key={modalAttachment?.errandAttachmentHeader?.hash}
                src={`data:${modalAttachment?.errandAttachmentHeader?.mimeType};base64,${modalAttachment?.base64EncodedString}`}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
