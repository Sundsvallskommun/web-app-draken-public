import { FileUploadWrapper } from '@common/components/file-upload/file-upload-dragdrop-context';

import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { useAppContext } from '@common/contexts/app.context';
import { isKC } from '@common/services/application-service';
import { mapAttachmentToUploadFile, mapSupportAttachmentsToUploadFiles } from '@common/services/attachment-service';
import { base64Decode } from '@common/services/helper-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  Image,
  Input,
  Modal,
  PopupMenu,
  Spinner,
  UploadFile,
  useConfirm,
  useSnackbar,
  FileUpload,
} from '@sk-web-gui/react';
import {
  ACCEPTED_UPLOAD_FILETYPES,
  SingleSupportAttachment,
  SupportAttachment,
  deleteSupportAttachment,
  documentMimeTypes,
  getSupportAttachment,
  saveSupportAttachments,
} from '@supportmanagement/services/support-attachment-service';
import {
  getSupportErrandById,
  isSupportErrandLocked,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import dayjs from 'dayjs';
import { Fragment, useEffect, useRef, useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { SupportUploadAttachmentModal } from './support-upload-attachment-modal.component';
import { IErrand } from '@casedata/interfaces/errand';

export interface SupportAttachmentFormModel {
  files: UploadFile[];
  newFiles: UploadFile[];
}

const defaultAttachmentInformation: SupportAttachmentFormModel = {
  files: [],
  newFiles: [],
};

export const SupportErrandAttachmentsTab: React.FC<{
  update: () => void;
}> = (props) => {
  const { supportErrand, setSupportErrand, supportAttachments, user, municipalityId } = useAppContext();
  const [modalAttachment, setModalAttachment] = useState<UploadFile>();
  const [addNewAttachment, setAddNewAttachment] = useState(false);
  const [modalFetching, setModalFetching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addAttachmentWindowIsOpen, setAddAttachmentWindowIsOpen] = useState<boolean>(false);
  const [selectedAttachment, setSelectedAttachment] = useState<SupportAttachment>();
  // const [attachmentTypeExists, setAttachmentTypeExists] = useState(false);
  const removeConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [dragDrop, setDragDrop] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const modalFocus = useRef(null);
  const setModalFocus = () => {
    setTimeout(() => {
      modalFocus.current && modalFocus.current.focus();
    });
  };

  const closeModal = async () => {
    await getSupportErrandById(supportErrand.id.toString(), municipalityId)
      .then((data) => setSupportErrand(data.errand))
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ärendet skulle hämtas`,
          status: 'error',
        });
      });
    setIsOpen(false);
    setAddAttachmentWindowIsOpen(false);
    setDragDrop(false);
    setTimeout(() => setModalAttachment(undefined), 250);
  };
  const openModal = () => {
    setIsOpen(true);
    setModalFocus();
  };

  let formSchema = yup.object({
    id: yup.string(),
    newAttachment: yup.mixed(),
    attachments: yup.array().when('attachmentType', () => {
      return selectedAttachment ? yup.array() : yup.array().min(1).required('Fil måste bifogas');
    }),
  });

  const methods = useForm<SupportAttachmentFormModel>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: defaultAttachmentInformation,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const {
    register,
    control,
    trigger,
    watch,
    reset,
    setValue,
    getValues,
    formState,
    formState: { errors },
  } = methods;

  useEffect(() => {
    if (modalAttachment?.file) {
      const url = URL.createObjectURL(modalAttachment.file);
      setImageUrl(url);

      return () => {
        URL.revokeObjectURL(url); // revoke using the string URL
        setImageUrl(null);
      };
    }
  }, [modalAttachment]);

  // const {
  //   fields: attachmentFields,
  //   append: appendAttachment,
  //   remove: removeAttachment,
  // } = useFieldArray({
  //   control,
  //   name: 'attachments',
  // });

  // const attachments = watch('attachments');

  const files = watch('files');
  const newFiles = watch('files');

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

  // const downloadDocument = (a: SupportAttachment) => {
  //   getSupportAttachment(supportErrand.id.toString(), municipalityId, a)
  //     .then((att) => {
  //       const uri = `data:${a.mimeType};base64,${att.base64EncodedString}`;
  //       const link = document.createElement('a');
  //       link.href = uri;
  //       link.setAttribute('download', `${a.fileName}`);
  //       document.body.appendChild(link);
  //       link.click();
  //     })
  //     .catch(() => {
  //       setPdfError(true);
  //     });
  // };

  // const vals: SupportAttachmentFormModel = getValues();
  // useEffect(() => {
  //   const vals: SupportAttachmentFormModel = getValues();
  //   trigger();
  //   if (vals.attachments) {
  //     trigger();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // useEffect(() => {
  //   setSizeError(false);
  // }, [attachments]);

  const openHandler = () => {
    // setDragDrop(true);
    // setSelectedAttachment(undefined);
    setAddAttachmentWindowIsOpen(true);
  };

  const closeHandler = () => {
    setAddAttachmentWindowIsOpen(false);
  };

  const clickHandler = (attachment: UploadFile) => {
    if (imageMimeTypes.includes(attachment.file.type)) {
      setModalFetching(true);
      setModalAttachment(attachment);
      setModalFetching(false);
      setIsOpen(true);
    } else {
      downloadDocument(attachment);
    }
  };

  useEffect(() => {
    const fetchUploadFiles = async () => {
      const uploadFiles = await mapSupportAttachmentsToUploadFiles(
        supportErrand.id,
        municipalityId,
        supportAttachments
      );
      setValue('files', uploadFiles || []);
    };
    if (supportAttachments) {
      fetchUploadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportAttachments]);

  // const clickHandler = (attachment) => {
  //   if (documentMimeTypes.includes(attachment.mimeType)) {
  //     downloadDocument(attachment);
  //   } else if (imageMimeTypes.includes(attachment.mimeType)) {
  //     setModalFetching(true);
  //     getSupportAttachment(supportErrand.id.toString(), municipalityId, attachment)
  //       .then((res) => setModalAttachment(res))
  //       .then(() => {
  //         setModalFetching(false);
  //       })
  //       .then((res) => openModal());
  //   }
  //   // exclusive exception for .msg
  //   else if (attachment.fileName.endsWith(`.msg`)) {
  //     downloadDocument(attachment);
  //   } else {
  //     toastMessage({
  //       position: 'bottom',
  //       closeable: false,
  //       message: 'Fel: okänd filtyp',
  //       status: 'error',
  //     });
  //   }
  // };

  const onDelete = (file: UploadFile) => {
    removeConfirm.showConfirmation('Ta bort?', 'Vill du ta bort denna bilaga?').then((confirmed) => {
      if (confirmed) {
        return deleteSupportAttachment(supportErrand?.id.toString(), municipalityId, file.id)
          .then(() => {
            props.update();
            reset();
          })
          .then(() => {
            setSelectedAttachment(null);
          })
          .then(() => {
            toastMessage(
              getToastOptions({
                message: 'Bilagan togs bort',
                status: 'success',
              })
            );
            setIsLoading(false);
          })
          .catch((e) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när bilagan togs bort',
              status: 'error',
            });
            setIsLoading(false);
          });
      }
    });
  };

  const editAttachmentModal = (
    <Modal className="w-[84rem]" show={isOpen} onClose={closeModal} label={modalAttachment?.file?.name}>
      <div className="flex-grow-0 my-md">
        <div className="flex flex-col justify-center items-center my-lg">
          {modalFetching ? (
            <Spinner size={24} />
          ) : (
            <Image alt={modalAttachment?.file?.name} key={modalAttachment?.id} src={imageUrl || undefined} />
          )}
        </div>
      </div>
    </Modal>
  );

  return (
    <FormProvider {...methods}>
      <div className="w-full py-40 px-48 gap-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <h2 className="text-h2-md max-medium-device:text-h4-md">Bilagor</h2>
          <div>
            {/* <Input type="hidden" {...register('id')} /> */}
            <Modal
              show={false}
              className="w-[43rem]"
              onClose={() => {
                closeHandler();
                // reset();
              }}
              label={'Ladda upp bilaga'}
            >
              <FileUploadWrapper>
                <Modal.Content>
                  <FormControl id="attachment" className="w-full">
                    {/* <FileUpload
                    key="attachments-tab"
                    fieldName="attachments"
                    fields={attachmentFields}
                    items={attachments}
                    uniqueFileUploaderKey="supporterrand-attachments-tab"
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                    append={appendAttachment}
                    remove={removeAttachment}
                    editing={false}
                    accept={ACCEPTED_UPLOAD_FILETYPES}
                    helperText="Maximal filstorlek: 10 MB"
                    dragDrop={dragDrop}
                    allowMultiple={isKC() ? true : false}
                  /> */}
                  </FormControl>
                </Modal.Content>

                <Modal.Footer>
                  <Button
                    className="w-full"
                    disabled={!formState.isValid}
                    type="submit"
                    variant="primary"
                    color="primary"
                    loading={isLoading}
                    loadingText="Laddar upp"
                    onClick={(e) => {
                      e.preventDefault();
                      const vals: SupportAttachmentFormModel = getValues();
                      const attachmentsData: { file: File }[] = vals.files.map((a) => ({
                        file: a.file,
                      }));
                      setIsLoading(true);
                      saveSupportAttachments(supportErrand.id.toString(), municipalityId, attachmentsData)
                        .then(() => props.update())
                        .then(() => setAddNewAttachment(false))
                        .then(() => setSelectedAttachment(null))
                        .then(() => setIsLoading(false))
                        .then(() => setError(false))
                        .then(() => setSizeError(false))
                        .then(() => {
                          reset();
                          setAddAttachmentWindowIsOpen(false);
                          setDragDrop(false);
                          toastMessage(
                            getToastOptions({
                              message: 'Bilagan sparades',
                              status: 'success',
                            })
                          );
                        })
                        .catch((e) => {
                          if (e.message === 'MAX_SIZE') {
                            toastMessage({
                              position: 'bottom',
                              closeable: false,
                              message: 'Max filstorlek överskreds',
                              status: 'error',
                            });
                            setSizeError(true);
                            setIsLoading(false);
                          } else {
                            toastMessage({
                              position: 'bottom',
                              closeable: false,
                              message: 'Bilagan gick inte att spara',
                              status: 'error',
                            });
                            setError(true);
                            setIsLoading(false);
                          }
                        });
                    }}
                  >
                    Ladda upp
                  </Button>
                </Modal.Footer>
              </FileUploadWrapper>
            </Modal>
            <Button
              data-cy="add-attachment-button"
              disabled={isSupportErrandLocked(supportErrand) || supportErrandIsEmpty(supportErrand)}
              color="vattjom"
              rightIcon={<LucideIcon name="upload" size={16} />}
              inverted
              size="sm"
              onClick={() => {
                // setSizeError(false);
                // setAddNewAttachment(true);
                // reset();
                openHandler();
              }}
            >
              Ladda upp bilaga
            </Button>
          </div>
        </div>
        <div>
          <p className="py-8">Här samlas bilagor som är kopplade till ärendet.</p>
        </div>
        {isLoading ? (
          <Spinner />
        ) : (
          <FileUpload.List name="files">
            {files?.map((file, i) => (
              <FileUpload.ListItem
                key={file.id}
                index={i}
                nameProps={{
                  description: `Uppladdad: ${dayjs(file?.meta?.created as string).format('YYYY-MM-DD HH:mm')}`,
                }}
                actionsProps={{
                  extraActions: [
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
                    </Button>,
                  ],
                  showMore: !isSupportErrandLocked(supportErrand),
                  morePopupMenuPanel: (
                    <PopupMenu.Panel>
                      <PopupMenu.Items>
                        <PopupMenu.Group>
                          <PopupMenu.Item>
                            <Button
                              data-cy={`delete-attachment-${file.id}`}
                              leftIcon={<LucideIcon name="trash" />}
                              onClick={async () => {
                                onDelete(file);
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
        )}
        {/* {!isLoading ? (
        <div className="mt-md flex flex-col" data-cy="supportattachments-list">
          {supportAttachments?.map((attachment, key) => (
            <Fragment key={key}>
              <div
                data-cy={`attachment-${attachment.id}`}
                className={`attachment-item flex justify-between gap-12 rounded-sm p-12 text-md border-t`}
              >
                <div
                  className="flex gap-12 cursor-pointer items-center"
                  onClick={() => {
                    clickHandler(attachment);
                  }}
                >
                  <div className={`self-center bg-vattjom-surface-accent p-12 rounded`}>
                    <LucideIcon
                      name={documentMimeTypes.find((d) => d.includes(attachment.mimeType)) ? 'file' : 'image'}
                      className="block"
                      size={24}
                    />
                  </div>
                  <div>
                    <p>
                      <strong>{attachment.fileName}</strong>{' '}
                    </p>
                    <p>Uppladdad den {dayjs(attachment.created).format('YYYY-MM-DD HH:mm')}</p>
                  </div>
                </div>

                <div className="self-center relative">
                  <PopupMenu>
                    <PopupMenu.Button
                      size="sm"
                      variant="primary"
                      aria-label="Alternativ"
                      color="primary"
                      iconButton
                      inverted
                      onClick={() => setSelectedAttachment(attachment)}
                    >
                      <LucideIcon name="ellipsis" />
                    </PopupMenu.Button>
                    <PopupMenu.Panel>
                      <PopupMenu.Items>
                        <PopupMenu.Group>
                          <PopupMenu.Item>
                            <Button
                              data-cy={`open-attachment-${attachment.id}`}
                              leftIcon={<LucideIcon name="eye" />}
                              onClick={() => {
                                clickHandler(attachment);
                              }}
                            >
                              Öppna
                            </Button>
                          </PopupMenu.Item>
                        </PopupMenu.Group>
                        {!isSupportErrandLocked(supportErrand) && (
                          <PopupMenu.Group>
                            <PopupMenu.Item>
                              <Button
                                data-cy={`delete-attachment-${attachment.id}`}
                                leftIcon={<LucideIcon name="trash" />}
                                onClick={onDelete}
                              >
                                Ta bort
                              </Button>
                            </PopupMenu.Item>
                          </PopupMenu.Group>
                        )}
                      </PopupMenu.Items>
                    </PopupMenu.Panel>
                  </PopupMenu>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      ) : (
        <Spinner />
      )} */}
      </div>
      <SupportUploadAttachmentModal
        isOpen={addAttachmentWindowIsOpen}
        supportErrand={supportErrand}
        // saveErrand={function (): Promise<boolean> {
        //   throw new Error('Function not implemented.');
        // }}
        // setErrand={function (errand: IErrand): void {
        //   throw new Error('Function not implemented.');
        // }}
        closeHandler={closeHandler}
      />
      {editAttachmentModal}
    </FormProvider>
  );
};
