import { useAttachmentContents } from '@casedata/hooks/useAttachmentContents';
import { useSaveCasedataErrand } from '@casedata/hooks/useSaveCasedataErrand';
import {
  MEXAllAttachmentLabels,
  MEXAttachmentCategory,
  PTAttachmentCategory,
  PTAttachmentLabels,
  SingleCasedataAttachment,
} from '@casedata/interfaces/attachment';
import {
  deleteAttachment,
  deleteDecisionAttachment,
  editAttachment,
  editDecisionAttachment,
  fetchAttachment,
  fetchDecisionAttachment,
  MAX_FILE_SIZE_MB,
  onlyOneAllowed,
  replaceAttachmentFile,
} from '@casedata/services/casedata-attachment-service';
import { getErrand, isErrandLocked } from '@casedata/services/casedata-errand-service';
import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { isCroppableImage } from '@common/components/image-cropper/crop-geometry';
import { CroppedImage } from '@common/components/image-cropper/crop-image';
import { useToastMessages } from '@common/hooks/use-toast-messages';
import { getAttachmentChannelLabel, isKnownAttachmentChannel } from '@common/interfaces/attachment-channel';
import { isMEX } from '@common/services/application-service';
import { base64ToFile, mapAttachmentToUploadFile } from '@common/services/attachment-service';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, FileUpload, PopupMenu, UploadFile, useConfirm } from '@sk-web-gui/react';
import { useCasedataStore, useConfigStore } from '@stores/index';
import dayjs from 'dayjs';
import { Eye, Pencil, Trash, Upload } from 'lucide-react';
import { FC, Fragment, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Attachment } from 'src/data-contracts/backend/data-contracts';
import * as yup from 'yup';

import { ShowAttachmentModal } from './show-attachment-modal.component';
import { UploadAttachmentModal } from './upload-attachment-modal.component';
export interface CasedataAttachmentFormModel {
  files: UploadFile[];
  newFiles: UploadFile[];
}

const defaultAttachmentInformation: CasedataAttachmentFormModel = {
  files: [],
  newFiles: [],
};

// Sentinel errors thrown by the crop and replace steps, mapped to what the handler should read.
const cropSaveErrorMessages: Record<string, string> = {
  MAX_SIZE: `Den beskurna bilden överskrider maximal storlek (${MAX_FILE_SIZE_MB} Mb)`,
  CANVAS_EMPTY: 'Bilden kunde inte beskäras',
};
const defaultCropSaveErrorMessage = 'Något gick fel när den beskurna bilagan sparades';

export const CasedataAttachments: FC = () => {
  const [modalAttachment, setModalAttachment] = useState<SingleCasedataAttachment | undefined>();
  const [addAttachmentWindowIsOpen, setAddAttachmentWindowIsOpen] = useState<boolean>(false);
  const [attachmentTypeExists, setAttachmentTypeExists] = useState<boolean>(false);
  const [modalFetching, setModalFetching] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [originalFile, setOriginalFile] = useState<UploadFile | null>(null);

  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
  const { contents, cacheContent, dropContent } = useAttachmentContents(municipalityId, errand);
  const removeConfirm = useConfirm();
  const { showError, showSuccess, showWarning } = useToastMessages();

  const closeModal = () => {
    getErrand(municipalityId, errand!.id.toString())
      .then((data) => setErrand(data.errand))
      .catch((e) => {
        showError('Något gick fel när ärendet skulle hämtas');
      });
    setIsCropping(false);
    setIsOpen(false);
    setTimeout(() => setModalAttachment(undefined), 250);
  };
  const openModal = () => {
    setIsOpen(true);
  };

  const uploadFileSchema = yup
    .mixed<UploadFile>()
    .required()
    .test('file-name-required', 'Namn måste anges', (value) => !!value?.meta?.name);

  const formSchema: yup.ObjectSchema<CasedataAttachmentFormModel> = yup
    .object({
      files: yup.array().of(uploadFileSchema).defined().required(),
      newFiles: yup.array().of(uploadFileSchema).defined().required(),
    })
    .required();

  const methods = useForm<CasedataAttachmentFormModel, any, yup.InferType<typeof formSchema>>({
    resolver: yupResolver(formSchema),
    defaultValues: defaultAttachmentInformation,
    mode: 'onChange',
  });

  const {
    watch,
    setValue,
    formState: { errors },
  } = methods;

  const files = watch('files');
  const saveErrand = useSaveCasedataErrand(false);

  useEffect(() => {
    const uploadFiles =
      errand?.attachments?.map((a) => {
        const uploadFile = mapAttachmentToUploadFile(a);
        const content = a.id ? contents[a.id] : undefined;
        // Without content the UploadFile carries an empty File and the list preview stays blank.
        return content ? { ...uploadFile, file: base64ToFile(content, a.name, a.mimeType) } : uploadFile;
      }) ?? [];
    setValue('files', uploadFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand?.attachments, contents]);

  useEffect(() => {
    const files: UploadFile[] = watch('files') || [];
    const newFiles: UploadFile[] = watch('newFiles') || [];

    // Files staged in the upload modal count too, so a duplicate is caught before it is
    // uploaded rather than after.
    const allFiles = [...files, ...newFiles];

    const duplicates: Record<string, number> = {};
    allFiles.forEach((file) => {
      if (onlyOneAllowed(file?.meta.category as MEXAttachmentCategory | PTAttachmentCategory)) {
        const cat = file?.meta.category ?? '';
        duplicates[cat] = (duplicates[cat] || 0) + 1;
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

  const downloadDocument = (attachment: SingleCasedataAttachment) => {
    const { name, mimeType } = attachment.errandAttachmentHeader;
    const file = base64ToFile(attachment.base64EncodedString, name, mimeType);
    const blobUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = name;
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

  const clickHandler = async (uploadFile: UploadFile) => {
    const attachment: Attachment | undefined = errand?.attachments.find((a) => a.id?.toString() === uploadFile.id);
    if (!attachment) {
      return;
    }
    setModalFetching(true);
    try {
      // Decision attachments are fetched from the decision sub-resource, errand attachments from the
      // errand endpoint.
      const data = attachment.decisionId
        ? await fetchDecisionAttachment(municipalityId, errand!.id, attachment.decisionId, attachment)
        : await fetchAttachment(municipalityId, errand!.id, attachment);
      const attachmentId = attachment.id;
      if (attachmentId) {
        cacheContent(attachmentId, data.base64EncodedString);
      }
      if (imageMimeTypes.includes(attachment.mimeType)) {
        setModalAttachment(data);
        openModal();
      } else {
        downloadDocument(data);
      }
    } catch (e) {
      showError('Något gick fel när bilagan skulle hämtas');
    } finally {
      setModalFetching(false);
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

      const decisionId = attachment.meta?.decisionId as number | undefined;
      if (decisionId && attachment.id) {
        await deleteDecisionAttachment(municipalityId, errand!.id, decisionId, Number(attachment.id));
      } else {
        await deleteAttachment(municipalityId, errand!.id, attachment);
      }
      const res = await getErrand(municipalityId, errand!.id.toString());
      setErrand(res.errand);
      showSuccess('Bilagan togs bort');
    } catch (e) {
      showError('Något gick fel när bilagan togs bort');
    }
  };

  const cropHeader = modalAttachment?.errandAttachmentHeader;
  const canCrop =
    !!errand &&
    !isErrandLocked(errand) &&
    !!cropHeader &&
    !cropHeader.decisionId &&
    isCroppableImage(cropHeader.mimeType);

  const handleCropSave = async (result: CroppedImage) => {
    if (!cropHeader?.id || !errand) {
      return;
    }
    const replacedId = cropHeader.id;

    try {
      const saved = await saveErrand();
      if (!saved) return;

      const baseName = cropHeader.name.replace(/\.[^/.]+$/, '');
      const file = new File([result.blob], `${baseName}.${result.extension}`, { type: result.mimeType });

      const { originalRemoved } = await replaceAttachmentFile(
        municipalityId,
        errand.id,
        errand.errandNumber,
        cropHeader,
        file
      );

      // The replaced attachment is gone, so its cached content goes with it.
      dropContent(replacedId);

      if (originalRemoved) {
        showSuccess('Bilagan beskars och sparades');
      } else {
        showWarning('Den beskurna bilagan sparades, men originalet kunde inte tas bort. Ta bort det manuellt.');
      }

      closeModal();
    } catch (e) {
      // Reported here rather than rethrown: the cropper leaves saving failures to its caller, so
      // rethrowing would surface the same failure twice.
      showError((e instanceof Error && cropSaveErrorMessages[e.message]) || defaultCropSaveErrorMessage);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="w-full py-24 px-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <h2 className="text-h4-sm md:text-h4-md">Bilagor</h2>
          <Button
            data-cy="add-attachment-button"
            disabled={errand ? isErrandLocked(errand) : false}
            color="vattjom"
            rightIcon={<Upload size={16} />}
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

        <div className="mt-md" data-cy="casedataAttachments-list">
          <FileUpload.List name="files">
            {files?.map((singleAttachment, i) => {
              return (
                <FileUpload.ListItem
                  className="flex flex-wrap wrapping-list-item"
                  key={singleAttachment?.id}
                  index={i}
                  isEdit={editIndex === i}
                  nameProps={{
                    description: (
                      <>
                        <b>Uppladdad:</b> {dayjs(singleAttachment?.meta.created as string).format('YYYY-MM-DD HH:mm')}
                        {singleAttachment?.meta.isValidAttachment ? '' : ' (ogiltig fil)'}
                        {isKnownAttachmentChannel(singleAttachment?.meta.channel as string | undefined) && (
                          <>
                            {' '}
                            <b>Kanal:</b>{' '}
                            {getAttachmentChannelLabel(singleAttachment?.meta.channel as string | undefined)}
                          </>
                        )}
                      </>
                    ) as unknown as string,
                  }}
                  categoryProps={{
                    categories: isMEX() ? MEXAllAttachmentLabels : PTAttachmentLabels,
                  }}
                  actionsProps={{
                    onEditSave: () => {
                      // yup.mixed() reports on the array element itself, so the message
                      // lands on files[i], not on a nested files[i].meta.name.
                      if (errors?.files?.[i]?.message) {
                        showError('Namn måste anges');
                        return;
                      }
                      if (!singleAttachment?.id) {
                        return;
                      }
                      const decisionId = singleAttachment?.meta?.decisionId as number | undefined;
                      if (decisionId) {
                        editDecisionAttachment(
                          municipalityId,
                          errand!.id.toString(),
                          decisionId,
                          singleAttachment?.id,
                          `${singleAttachment?.meta.name}.${singleAttachment?.meta.ending}`,
                          singleAttachment?.meta.category ?? ''
                        );
                      } else {
                        editAttachment(
                          municipalityId,
                          errand!.id.toString(),
                          singleAttachment?.id,
                          `${singleAttachment?.meta.name}.${singleAttachment?.meta.ending}`,
                          singleAttachment?.meta.category ?? ''
                        );
                      }
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
                      <Fragment key={`item-${i}`}>
                        {editIndex !== i && (
                          <Button
                            key="view"
                            variant="tertiary"
                            leftIcon={<Eye />}
                            data-cy={`open-attachment-${singleAttachment?.id}`}
                            onClick={() => {
                              clickHandler(singleAttachment);
                            }}
                            size="sm"
                          >
                            Öppna
                          </Button>
                        )}
                      </Fragment>,
                    ],
                    showMore: errand ? !isErrandLocked(errand) : true,
                    morePopupMenuPanel: (
                      <PopupMenu.Panel>
                        <PopupMenu.Items>
                          <PopupMenu.Group>
                            <PopupMenu.Item>
                              <Button
                                data-cy={`edit-attachment-${singleAttachment?.id}`}
                                leftIcon={<Pencil />}
                                onClick={() => {
                                  // meta is cloned too, otherwise onEditCancel restores the very
                                  // object react-hook-form mutated while editing.
                                  setOriginalFile({ ...singleAttachment, meta: { ...singleAttachment.meta } });
                                  setEditIndex(i);
                                }}
                              >
                                Ändra
                              </Button>
                            </PopupMenu.Item>
                            <PopupMenu.Item>
                              <Button
                                data-cy={`delete-attachment-${singleAttachment?.id}`}
                                leftIcon={<Trash />}
                                onClick={async () => {
                                  handleRemove(singleAttachment);
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
                  file={singleAttachment}
                />
              );
            })}
          </FileUpload.List>
        </div>
      </div>
      <UploadAttachmentModal
        isOpen={addAttachmentWindowIsOpen}
        attachmentTypeExists={attachmentTypeExists}
        errand={errand}
        municipalityId={municipalityId}
        saveErrand={saveErrand}
        setErrand={setErrand}
        closeHandler={closeHandler}
      />
      <ShowAttachmentModal
        isOpen={isOpen}
        modalFetching={modalFetching}
        modalAttachment={modalAttachment}
        isCropping={isCropping}
        canCrop={canCrop}
        onClose={closeModal}
        onToggleCrop={() => setIsCropping((cropping) => !cropping)}
        onCropSave={handleCropSave}
      />
    </FormProvider>
  );
};
