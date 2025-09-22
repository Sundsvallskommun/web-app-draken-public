import { ACCEPTED_UPLOAD_FILETYPES } from '@casedata/services/casedata-attachment-service';
import { useAppContext } from '@contexts/app.context';
import { Button, FileUpload, Modal, useSnackbar } from '@sk-web-gui/react';
import { saveSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { SupportAttachmentFormModel } from './support-errand-attachments-tab';

export const SupportUploadAttachmentModal: React.FC<{
  isOpen: boolean;
  supportErrand: SupportErrand;
  // saveErrand: () => Promise<boolean>;
  // setErrand: (errand: IErrand) => void;
  closeHandler: () => void;
}> = ({ isOpen, supportErrand, closeHandler }) => {
  const { municipalityId } = useAppContext();
  const { watch, getValues } = useFormContext<SupportAttachmentFormModel>();
  const newFiles = watch('newFiles');

  const [isLoading, setIsLoading] = useState(false);
  const toastMessage = useSnackbar();

  const handleUpload = async () => {
    if (!newFiles || newFiles.length === 0) return;

    setIsLoading(true);
    try {
      const files = newFiles.map((f) => ({ file: f.file }));
      console.log('files', files);
      await saveSupportAttachments(supportErrand.id, municipalityId, files);

      toastMessage({
        message: newFiles.length > 1 ? 'Bilagorna sparades' : 'Bilagan sparades',
        status: 'success',
        position: 'bottom',
      });
    } catch (e: any) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: `Något gick fel när ${newFiles.length > 1 ? 'bilagorna' : 'bilagan'} sparades`,
        status: 'error',
      });
    }
    setIsLoading(false);
    closeHandler();
  };

  return (
    <Modal className="max-w-[86rem]" show={isOpen} onClose={closeHandler} label="Ladda upp bilagor">
      <Modal.Content>
        <div className="flex justify-center">
          {newFiles && newFiles.length > 0 ? (
            <FileUpload.List name="newFiles">
              {newFiles.map((file, i) => (
                <FileUpload.ListItem key={file.id} index={i} isEdit file={file} actionsProps={{ showRemove: true }} />
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
      </Modal.Content>

      {newFiles && newFiles.length > 0 && (
        <Modal.Footer>
          <Button
            className="w-full"
            disabled={isLoading}
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
