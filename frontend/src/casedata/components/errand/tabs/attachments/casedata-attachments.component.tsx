import { useSaveCasedataErrand } from '@casedata/hooks/useSaveCasedataErrand';
import {
  Attachment,
  MEXAllAttachmentLabels,
  MEXAttachmentCategory,
  PTAttachmentCategory,
  PTAttachmentLabels,
} from '@casedata/interfaces/attachment';
import {
  deleteAttachment,
  editAttachment,
  fetchAttachment,
  onlyOneAllowed,
} from '@casedata/services/casedata-attachment-service';
import { getErrand, isErrandLocked } from '@casedata/services/casedata-errand-service';
import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { useAppContext } from '@common/contexts/app.context';
import { isMEX } from '@common/services/application-service';
import { mapAttachmentToUploadFile } from '@common/services/attachment-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FileUpload, PopupMenu, UploadFile, useConfirm, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { EditAttachmentModal } from './edit-attachment-modal.component';
import { UploadAttachmentModal } from './upload-attachment-modal.component';
export interface CasedataAttachmentFormModel {
  files: UploadFile[];
  newFiles: UploadFile[];
}

const defaultAttachmentInformation: CasedataAttachmentFormModel = {
  files: [],
  newFiles: [],
};

export const CasedataAttachments: React.FC = () => {
  const [modalAttachment, setModalAttachment] = useState<Attachment>();
  const [addAttachmentWindowIsOpen, setAddAttachmentWindowIsOpen] = useState<boolean>(false);
  const [attachmentTypeExists, setAttachmentTypeExists] = useState<boolean>(false);
  const [modalFetching, setModalFetching] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [originalFile, setOriginalFile] = useState<UploadFile | null>(null);

  const { municipalityId, errand, setErrand } = useAppContext();
  const removeConfirm = useConfirm();
  const toastMessage = useSnackbar();

  const closeModal = () => {
    getErrand(municipalityId, errand.id.toString())
      .then((data) => setErrand(data.errand))
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ärendet skulle hämtas`,
          status: 'error',
        });
      });
    setIsOpen(false);
    setTimeout(() => setIsCropping(false), 250);
    setTimeout(() => setModalAttachment(undefined), 250);
  };
  const openModal = () => {
    setIsOpen(true);
  };

  let formSchema = yup.object({
    files: yup.array().of(
      yup.object({
        meta: yup.object({
          name: yup.string().required('Namn måste anges'),
        }),
      })
    ),
    newFiles: yup.array().of(
      yup.object({
        meta: yup.object({
          name: yup.string().required('Namn måste anges'),
        }),
      })
    ),
  });

  const methods = useForm<CasedataAttachmentFormModel>({
    resolver: yupResolver(formSchema, { context: { allFiles: [] } }),
    defaultValues: defaultAttachmentInformation,
    mode: 'onChange',
  });

  const {
    watch,
    setValue,
    formState: { errors },
  } = methods;

  const files = watch('files');
  const newFiles = watch('newFiles');
  const saveErrand = useSaveCasedataErrand(false);

  useEffect(() => {
    const uploadFiles = errand?.attachments?.map((a) => mapAttachmentToUploadFile(a));
    setValue('files', uploadFiles || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand?.attachments]);

  useEffect(() => {
    const files: UploadFile[] = watch('files') || [];
    const newFiles: UploadFile[] = watch('newFiles') || [];

    const allFiles = [...files, ...newFiles];

    const duplicates: Record<string, number> = {};
    allFiles.forEach((file) => {
      if (onlyOneAllowed(file.meta.category as MEXAttachmentCategory | PTAttachmentCategory)) {
        duplicates[file.meta.category] = (duplicates[file.meta.category] || 0) + 1;
      }
    });

    const hasDuplicate = Object.values(duplicates).some((count) => count > 1);
    setAttachmentTypeExists(hasDuplicate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    watch('files'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    watch('newFiles')
      .map((f) => f.meta.category)
      .join(','),
  ]);

  const downloadDocument = (a: UploadFile) => {
    const blobUrl = URL.createObjectURL(a.file);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = a.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };
  const openHandler = () => {
    setAddAttachmentWindowIsOpen(true);
  };

  const closeHandler = () => {
    setValue('newFiles', []);
    setAddAttachmentWindowIsOpen(false);
  };

  const clickHandler = (attachment: UploadFile) => {
    if (imageMimeTypes.includes(attachment.file.type)) {
      setModalFetching(true);
      fetchAttachment(municipalityId, errand.id, attachment.id)
        .then((res) => setModalAttachment(res.data))
        .then(() => {
          setModalFetching(false);
        })
        .then((res) => openModal());
    } else {
      downloadDocument(attachment);
    }
  };

  const handleRemove = async (attachment: UploadFile) => {
    const confirmed = await removeConfirm.showConfirmation(
      'Ta bort?',
      'Vill du ta bort denna bilaga?',
      'Ja',
      'Nej',
      'info',
      'info'
    );
    if (!confirmed) return;
    try {
      const saved = await saveErrand();
      if (!saved) return;

      await deleteAttachment(municipalityId, errand?.id, attachment);
      const res = await getErrand(municipalityId, errand.id.toString());
      setErrand(res.errand);
      toastMessage(
        getToastOptions({
          message: 'Bilagan togs bort',
          status: 'success',
        })
      );
    } catch (e) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när bilagan togs bort',
        status: 'error',
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="w-full py-24 px-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <h2 className="text-h4-sm md:text-h4-md">Bilagor</h2>
          <Button
            data-cy="add-attachment-button"
            disabled={isErrandLocked(errand)}
            color="vattjom"
            rightIcon={<LucideIcon name="upload" size={16} />}
            inverted
            size="sm"
            onClick={() => {
              openHandler();
            }}
          >
            Ladda upp bilaga
          </Button>
        </div>
        <div>
          <p className="py-8">Här samlas bilagor som är kopplade till ärendet.</p>
        </div>

        <div className="mt-md flex flex-col" data-cy="casedataAttachments-list">
          <FileUpload.List name="files">
            {files?.map((file, i) => (
              <FileUpload.ListItem
                key={file.id}
                index={i}
                isEdit={editIndex === i}
                nameProps={{
                  description: `Uppladdad: ${dayjs(file?.meta?.created as string).format('YYYY-MM-DD HH:mm')}`,
                }}
                categoryProps={{
                  categories: isMEX() ? MEXAllAttachmentLabels : PTAttachmentLabels,
                }}
                actionsProps={{
                  onEditSave: () => {
                    if (errors?.files?.[i]?.meta?.name?.message) {
                      toastMessage({
                        position: 'bottom',
                        closeable: false,
                        message: 'Namn måste anges',
                        status: 'error',
                      });
                      return;
                    }
                    editAttachment(
                      municipalityId,
                      errand.id.toString(),
                      file.id,
                      `${file.meta.name}.${file.meta.ending}`,
                      file.meta.category
                    );
                    setEditIndex(null);
                  },
                  onEditCancel: () => {
                    if (originalFile) {
                      setValue(`files.${i}`, originalFile, {
                        shouldDirty: false,
                        shouldTouch: false,
                        shouldValidate: false,
                      });
                    }
                    setEditIndex(null);
                    setOriginalFile(null);
                  },
                  showEditSave: editIndex === i,
                  showEditCancel: editIndex === i,
                  extraActions: [
                    <>
                      {editIndex !== i && (
                        <Button
                          key="view"
                          variant="tertiary"
                          leftIcon={<LucideIcon name="eye" />}
                          data-cy={`open-attachment-${file.id}`}
                          onClick={() => {
                            clickHandler(file);
                          }}
                          size="sm"
                        >
                          Öppna
                        </Button>
                      )}
                    </>,
                  ],
                  showMore: !isErrandLocked(errand),
                  morePopupMenuPanel: (
                    <PopupMenu.Panel>
                      <PopupMenu.Items>
                        <PopupMenu.Group>
                          <PopupMenu.Item>
                            <Button
                              data-cy={`edit-attachment-${file.id}`}
                              leftIcon={<LucideIcon name="pencil" />}
                              onClick={() => {
                                setOriginalFile({ ...file, meta: { ...file.meta } });
                                setEditIndex(i);
                              }}
                            >
                              Ändra
                            </Button>
                          </PopupMenu.Item>
                          <PopupMenu.Item>
                            <Button
                              data-cy={`delete-attachment-${file.id}`}
                              leftIcon={<LucideIcon name="trash" />}
                              onClick={async () => {
                                handleRemove(file);
                              }}
                            >
                              Ta bort
                            </Button>
                          </PopupMenu.Item>
                        </PopupMenu.Group>
                      </PopupMenu.Items>
                    </PopupMenu.Panel>
                  ),
                }}
                file={file}
              />
            ))}
          </FileUpload.List>
        </div>
      </div>
      <UploadAttachmentModal
        isOpen={addAttachmentWindowIsOpen}
        newFiles={newFiles}
        attachmentTypeExists={attachmentTypeExists}
        errand={errand}
        saveErrand={saveErrand}
        setErrand={setErrand}
        closeHandler={closeHandler}
      />
      <EditAttachmentModal
        isOpen={isOpen}
        isCropping={isCropping}
        modalFetching={modalFetching}
        modalAttachment={modalAttachment}
        errand={errand}
        onClose={closeModal}
        onToggleCrop={() => setIsCropping(!isCropping)}
      />
    </FormProvider>
  );
};
