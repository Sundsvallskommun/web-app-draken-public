import { MEXAllAttachmentLabels, PTAttachmentLabels } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { ACCEPTED_UPLOAD_FILETYPES, sendAttachments } from '@casedata/services/casedata-attachment-service';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { isMEX } from '@common/services/application-service';
import { Button, FileUpload, FormErrorMessage, Modal, UploadFile, useSnackbar } from '@sk-web-gui/react';
import React, { useState } from 'react';

interface UploadAttachmentModalProps {
  isOpen: boolean;
  newFiles: UploadFile[];
  attachmentTypeExists: boolean;
  errand: IErrand;
  municipalityId: string;
  saveErrand: () => Promise<boolean>;
  setErrand: (errand: IErrand) => void;
  closeHandler: () => void;
}

export const UploadAttachmentModal: React.FC<UploadAttachmentModalProps> = ({
  isOpen,
  newFiles,
  attachmentTypeExists,
  errand,
  municipalityId,
  saveErrand,
  setErrand,
  closeHandler,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toastMessage = useSnackbar();

  const handleUpload = async () => {
    if (!newFiles || newFiles.length === 0) return;

    setIsLoading(true);
    try {
      const saved = await saveErrand();
      if (!saved) return;

      await sendAttachments(municipalityId, errand.id, errand.errandNumber, newFiles);
      const res = await getErrand(municipalityId, errand.id.toString());
      setErrand(res.errand);

      toastMessage({
        message: newFiles.length > 1 ? 'Bilagorna sparades' : 'Bilagan sparades',
        status: 'success',
        position: 'bottom',
      });

      closeHandler();
    } catch (e: any) {
      if (e.message === 'MAX_SIZE') {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Filen överskrider maximal storlek (10 Mb)',
          status: 'error',
        });
      } else if (e.message === 'TYPE_MISSING') {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Typ måste anges för bilaga',
          status: 'error',
        });
      } else {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när bilagan sparades',
          status: 'error',
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <Modal className="max-w-[86rem]" show={isOpen} onClose={closeHandler} label="Ladda upp bilagor">
      <Modal.Content>
        <div className="flex justify-center">
          {newFiles && newFiles.length > 0 ? (
            <FileUpload.List name="newFiles">
              {newFiles.map((file, i) => (
                <FileUpload.ListItem
                  key={file.id}
                  index={i}
                  isEdit
                  file={file}
                  categoryProps={{
                    categories: isMEX() ? MEXAllAttachmentLabels : PTAttachmentLabels,
                  }}
                  actionsProps={{ showRemove: true }}
                />
              ))}
            </FileUpload.List>
          ) : (
            <FileUpload.Field
              className="inline-block"
              accept={ACCEPTED_UPLOAD_FILETYPES}
              variant="horizontal"
              name="newFiles"
              maxFileSizeMB={50}
            />
          )}
        </div>

        {attachmentTypeExists && (
          <FormErrorMessage className="mt-2 text-error">
            En bilaga av denna typ finns redan. För att lägga till en ny, ta först bort den gamla.
          </FormErrorMessage>
        )}
      </Modal.Content>

      {newFiles && newFiles.length > 0 && (
        <Modal.Footer>
          <Button
            className="w-full"
            disabled={attachmentTypeExists || isLoading}
            variant="primary"
            color="primary"
            loading={isLoading}
            loadingText="Laddar upp"
            onClick={handleUpload}
          >
            Ladda upp
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};
