import { ContractData } from '@casedata/interfaces/contract-data';
import { Attachment } from '@casedata/interfaces/contracts';
import { getErrand } from '@casedata/services/casedata-errand-service';
import {
  deleteSignedContractAttachment,
  fetchSignedContractAttachment,
  mapContractAttachmentToUploadFile,
  saveSignedContractAttachment,
} from '@casedata/services/contract-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FileUpload, PopupMenu, UploadFile, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';

export const ContractAttachments: React.FC<{
  existingContract: ContractData;
}> = ({ existingContract }) => {
  const toastMessage = useSnackbar();
  const { municipalityId, errand, setErrand } = useAppContext();
  const removeConfirm = useConfirm();

  const viewFileHandler = (attachment: any) => {
    const blobUrl = URL.createObjectURL(attachment.file);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = attachment.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const [files, setFiles] = useState<UploadFile[]>([]);

  const loadFiles = async () => {
    const uploadFiles = await Promise.all(
      existingContract?.attachmentMetaData?.map(async (aM) => {
        const ra: Attachment = await fetchSignedContractAttachment(
          municipalityId,
          existingContract?.contractId,
          aM.id
        ).then((res) => res.data);

        return mapContractAttachmentToUploadFile(ra);
      }) ?? []
    );
    setFiles(uploadFiles);
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingContract, municipalityId]);

  const handleRemoveFile = (file: UploadFile) => {
    removeConfirm
      .showConfirmation('Ta bort signerat avtal?', 'Vill du ta bort denna bilaga?', 'Ja', 'Nej', 'info', 'info')
      .then((confirmed) => {
        if (confirmed) {
          deleteSignedContractAttachment(municipalityId, existingContract?.contractId, Number.parseInt(file.id))
            .then(() => {
              getErrand(municipalityId, errand.id.toString()).then((res) => {
                setErrand(res.errand);
              });
            })
            .then(() => {
              toastMessage(
                getToastOptions({
                  message: 'Bilagan togs bort',
                  status: 'success',
                })
              );
            })
            .catch(() => {
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Något gick fel när bilagan togs bort',
                status: 'error',
              });
            });
        }
      });
  };

  const morePanel = (file) => (
    <PopupMenu.Panel data-cy="attachment-context-menu">
      <PopupMenu.Items>
        <PopupMenu.Group>
          <PopupMenu.Item>
            <Button
              data-cy={`open-attachment-${file.id}`}
              leftIcon={<LucideIcon name="eye" />}
              onClick={() => {
                viewFileHandler(file);
              }}
            >
              Öppna
            </Button>
          </PopupMenu.Item>
          <PopupMenu.Item>
            <Button
              data-cy={`delete-attachment-${file.id}`}
              leftIcon={<LucideIcon name="trash" />}
              onClick={async () => {
                handleRemoveFile(file);
              }}
            >
              Ta bort
            </Button>
          </PopupMenu.Item>
        </PopupMenu.Group>
      </PopupMenu.Items>
    </PopupMenu.Panel>
  );

  return (
    <div className="my-16 flex flex-col gap-24 items-center">
      <FileUpload.Field
        data-cy={`contract-upload-field`}
        onChange={(e) => {
          const files = e.target.value;
          saveSignedContractAttachment(municipalityId, existingContract?.contractId, files, '')
            .then((res) => {
              if (!res) {
                throw new Error('Error saving attachment');
              }
              getErrand(municipalityId, errand.id.toString()).then((res) => {
                setErrand(res.errand);
                loadFiles();
                toastMessage(
                  getToastOptions({
                    message: 'Bilagan/orna sparades',
                    status: 'success',
                  })
                );
              });
            })
            .catch(() => {
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Något gick fel när bilagan/orna sparades',
                status: 'error',
              });
            });
        }}
      ></FileUpload.Field>
      <div className="w-full flex flex-col gap-lg">
        <FileUpload.List isEdit={false}>
          {files?.map((file, i) => (
            <FileUpload.ListItem
              data-cy={`contract-attachment-item-${file.id}`}
              key={file.file.name}
              file={file}
              index={i}
              iconProps={{ icon: <LucideIcon name="file-pen" /> }}
              categoryProps={{
                categories: { CONTRACT: 'Avtal' },
              }}
              actionsProps={{
                showRemove: false,
                showMore: true,
                morePopupMenuPanel: morePanel(file),
                onRemove: handleRemoveFile,
              }}
            />
          ))}
        </FileUpload.List>
      </div>
    </div>
  );
};
