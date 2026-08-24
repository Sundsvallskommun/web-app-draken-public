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
import { Button, FileUpload, PopupMenu, UploadFile, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useCasedataStore, useConfigStore } from '@stores/index';
import { Eye, FilePen, Trash } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
export const ContractAttachments: FC<{
  existingContract: ContractData;
  readOnly?: boolean;
}> = ({ existingContract, readOnly = false }) => {
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
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
          existingContract?.contractId ?? '',
          aM.id!
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
          deleteSignedContractAttachment(municipalityId, existingContract?.contractId ?? '', Number.parseInt(file.id))
            ?.then(() => {
              getErrand(municipalityId, errand!.id.toString()).then((res) => {
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

  const morePanel = (file: any) => (
    <PopupMenu.Panel data-cy="attachment-context-menu">
      <PopupMenu.Items>
        <PopupMenu.Group>
          <PopupMenu.Item>
            <Button
              data-cy={`open-attachment-${file.id}`}
              leftIcon={<Eye />}
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
              leftIcon={<Trash />}
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
      {/* The library prints the raw accept list (MIME types) truncated with an ellipsis; hide that
          row and describe the allowed formats in plain language below instead. */}
      <FileUpload.Field
        className="[&_.sk-form-file-upload-field-button-content-restrictions-mimetypes]:hidden"
        data-cy={`contract-upload-field`}
        onChange={(e) => {
          const files = e.target.value;
          saveSignedContractAttachment(municipalityId, existingContract?.contractId ?? '', files, '')
            .then((res) => {
              if (!res) {
                throw new Error('Error saving attachment');
              }
              getErrand(municipalityId, errand!.id.toString()).then((res) => {
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
      <small className="w-full">
        Tillåtna filtyper: bilder (jpeg, png, gif, tiff, bmp) samt dokument (pdf, Word, Excel, OpenDocument, txt m.fl.)
      </small>
      <div className="w-full flex flex-col gap-lg">
        {/* `files` must be passed explicitly: without it (and without a `name` for a real form field)
            FileUpload.List falls back to watching a nonexistent `files` field in the surrounding
            contract form context, which yields a new array every render and loops setState. */}
        <FileUpload.List isEdit={false} files={files}>
          {files?.map((file, i) => (
            <FileUpload.ListItem
              data-cy={`contract-attachment-item-${file.id}`}
              key={file.file.name}
              file={file}
              index={i}
              nameProps={{
                description: file.meta.created
                  ? `Uppladdad ${new Date(file.meta.created as string).toLocaleString()}`
                  : '',
              }}
              iconProps={{ icon: <FilePen /> }}
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
