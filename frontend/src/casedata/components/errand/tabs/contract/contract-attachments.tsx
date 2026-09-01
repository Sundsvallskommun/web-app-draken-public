import { ContractData } from '@casedata/interfaces/contract-data';
import { ACCEPTED_UPLOAD_FILETYPES, MAX_FILE_SIZE_MB } from '@casedata/services/casedata-attachment-service';
import { getErrand } from '@casedata/services/casedata-errand-service';
import {
  deleteSignedContractAttachment,
  fetchSignedContractAttachment,
  mapContractAttachmentMetadataToUploadFile,
  saveSignedContractAttachment,
} from '@casedata/services/contract-service';
import { downloadBase64File } from '@common/services/attachment-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Button, FileUpload, PopupMenu, UploadFile, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useCasedataStore, useConfigStore } from '@stores/index';
import { Eye, FilePen, Trash } from 'lucide-react';
import { FC, useMemo, useState } from 'react';

export const ContractAttachments: FC<{
  existingContract: ContractData;
  readOnly?: boolean;
}> = ({ existingContract, readOnly = false }) => {
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
  const removeConfirm = useConfirm();
  const [openingId, setOpeningId] = useState<string | undefined>(undefined);

  const contractId = existingContract?.contractId ?? '';

  // Attachment content is no longer part of the contract payload, so the list is built from the
  // metadata the contract already carries and the bytes are fetched only when a file is opened.
  const files: UploadFile[] = useMemo(
    () => (existingContract?.attachmentMetaData ?? []).map(mapContractAttachmentMetadataToUploadFile),
    [existingContract?.attachmentMetaData]
  );

  // Refetching the errand re-runs the contract fetch in casedata-contract-tab, which re-renders
  // this component with fresh attachment metadata. The read-only contract overview panel has no
  // mutating actions and so never gets here, but the guard stays: there is no errand in the store
  // there, and refreshing a stale unrelated errand would be worse than not refreshing at all.
  const refreshErrand = () => {
    if (!errand) {
      return Promise.resolve();
    }
    return getErrand(municipalityId, errand.id.toString()).then((res) => {
      setErrand(res.errand);
    });
  };

  const openFileHandler = async (file: UploadFile) => {
    setOpeningId(file.id);
    try {
      const content = await fetchSignedContractAttachment(municipalityId, contractId, Number.parseInt(file.id));
      downloadBase64File(content, file.file.name, file.meta.mimeType as string);
    } catch {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när bilagan hämtades',
        status: 'error',
      });
    } finally {
      setOpeningId(undefined);
    }
  };

  const handleRemoveFile = (file: UploadFile) => {
    removeConfirm
      .showConfirmation('Ta bort signerat avtal?', 'Vill du ta bort denna bilaga?', 'Ja', 'Nej', 'info', 'info')
      .then((confirmed) => {
        if (confirmed) {
          deleteSignedContractAttachment(municipalityId, contractId, Number.parseInt(file.id))
            .then(refreshErrand)
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

  const morePanel = (file: UploadFile) => (
    <PopupMenu.Panel data-cy="attachment-context-menu">
      <PopupMenu.Items>
        <PopupMenu.Group>
          <PopupMenu.Item>
            <Button
              data-cy={`open-attachment-${file.id}`}
              leftIcon={<Eye />}
              disabled={openingId === file.id}
              onClick={() => {
                openFileHandler(file);
              }}
            >
              Öppna
            </Button>
          </PopupMenu.Item>
          {!readOnly && (
            <PopupMenu.Item>
              <Button
                data-cy={`delete-attachment-${file.id}`}
                leftIcon={<Trash />}
                onClick={() => {
                  handleRemoveFile(file);
                }}
              >
                Ta bort
              </Button>
            </PopupMenu.Item>
          )}
        </PopupMenu.Group>
      </PopupMenu.Items>
    </PopupMenu.Panel>
  );

  return (
    <div className="my-16 flex flex-col gap-24 items-center">
      {/* The contract overview panel renders this read-only: it has no errand in the store, so a
          successful upload could not refresh the list and would report a success the user cannot see.
          Attachments are managed from the errand contract tab. */}
      {!readOnly && (
        <FileUpload.Field
          className="[&_.sk-form-file-upload-field-button-content-restrictions-mimetypes]:hidden"
          data-cy={`contract-upload-field`}
          accept={ACCEPTED_UPLOAD_FILETYPES}
          maxFileSizeMB={MAX_FILE_SIZE_MB}
          onChange={(e) => {
            const uploads = e.target.value;
            saveSignedContractAttachment(municipalityId, contractId, uploads, '')
              .then((res) => {
                if (!res) {
                  throw new Error('Error saving attachment');
                }
                return refreshErrand();
              })
              .then(() => {
                toastMessage(
                  getToastOptions({
                    message: 'Bilagan/orna sparades',
                    status: 'success',
                  })
                );
              })
              .catch((e) => {
                toastMessage({
                  position: 'bottom',
                  closeable: false,
                  message:
                    e?.message === 'MISSING_CONTRACT_ID'
                      ? 'Avtalet måste sparas innan bilagor kan laddas upp'
                      : 'Något gick fel när bilagan/orna sparades',
                  status: 'error',
                });
              });
          }}
        ></FileUpload.Field>
      )}
      <small className="w-full">
        Tillåtna filtyper: bilder (jpeg, png, gif, tiff, bmp) samt dokument (pdf, Word, Excel, OpenDocument, txt m.fl.)
      </small>
      <div className="w-full flex flex-col gap-lg">
        {/* `files` must be passed explicitly: without it (and without a `name` for a real form field)
            FileUpload.List falls back to watching a nonexistent `files` field in the surrounding
            contract form context, which yields a new array every render and loops setState. The
            useMemo above is load-bearing for the same reason. */}
        <FileUpload.List isEdit={false} files={files}>
          {files?.map((file, i) => (
            <FileUpload.ListItem
              data-cy={`contract-attachment-item-${file.id}`}
              key={file.id}
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
                onRemove: readOnly ? undefined : handleRemoveFile,
              }}
            />
          ))}
        </FileUpload.List>
      </div>
    </div>
  );
};
