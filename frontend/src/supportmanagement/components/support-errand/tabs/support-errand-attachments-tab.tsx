import { FileUploadWrapper } from '@common/components/file-upload/file-upload-dragdrop-context';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { useAppContext } from '@common/contexts/app.context';
import { isIS, isKC } from '@common/services/application-service';
import { Dialog, Transition } from '@headlessui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  LucideIcon as Icon,
  Image,
  Input,
  Modal,
  PopupMenu,
  Spinner,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import {
  ACCEPTED_UPLOAD_FILETYPES,
  SingleSupportAttachment,
  SupportAttachment,
  deleteSupportAttachment,
  documentMimeTypes,
  getSupportAttachment,
  imageMimeTypes,
  saveSupportAttachments,
} from '@supportmanagement/services/support-attachment-service';
import { getSupportErrandById, isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';

export interface SingleAttachment {
  file: File | undefined;
}
export interface SupportAttachmentFormModel {
  id?: string;
  newAttachment: FileList | undefined;
  attachments: SingleAttachment[];
  attachmentList: SingleAttachment[];
}

const defaultAttachmentInformation: SupportAttachmentFormModel = {
  id: undefined,
  newAttachment: undefined,
  attachments: [],
  attachmentList: [],
};

export const SupportErrandAttachmentsTab: React.FC<{
  update: () => void;
}> = (props) => {
  const { supportErrand, setSupportErrand, supportAttachments, user, municipalityId } = useAppContext();
  const [modalAttachment, setModalAttachment] = useState<SingleSupportAttachment>();
  const [addNewAttachment, setAddNewAttachment] = useState(false);
  const [modalFetching, setModalFetching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addAttachmentWindowIsOpen, setAddAttachmentWindowIsOpen] = useState<boolean>(false);
  const [selectedAttachment, setSelectedAttachment] = useState<SupportAttachment>();
  const [attachmentTypeExists, setAttachmentTypeExists] = useState(false);
  const removeConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [dragDrop, setDragDrop] = useState<boolean>(false);

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

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    reset,
    clearErrors,
    setValue,
    getValues,
    formState,
    formState: { errors },
  } = useForm<SupportAttachmentFormModel>({
    resolver: yupResolver(formSchema),
    defaultValues: defaultAttachmentInformation,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const {
    fields: attachmentFields,
    append: appendAttachment,
    remove: removeAttachment,
  } = useFieldArray({
    control,
    name: 'attachments',
  });

  const attachments = watch('attachments');

  const downloadDocument = (a: SupportAttachment) => {
    getSupportAttachment(supportErrand.id.toString(), municipalityId, a)
      .then((att) => {
        const uri = `data:${a.mimeType};base64,${att.base64EncodedString}`;
        const link = document.createElement('a');
        link.href = uri;
        link.setAttribute('download', `${a.fileName}`);
        document.body.appendChild(link);
        link.click();
      })
      .catch(() => {
        setPdfError(true);
      });
  };

  const vals: SupportAttachmentFormModel = getValues();
  useEffect(() => {
    const vals: SupportAttachmentFormModel = getValues();
    trigger();
    if (vals.attachments) {
      trigger();
    }
  }, []);

  useEffect(() => {
    setSizeError(false);
  }, [attachments]);

  const openHandler = () => {
    setDragDrop(true);
    setSelectedAttachment(undefined);
    setAddAttachmentWindowIsOpen(true);
  };

  const closeHandler = () => {
    setAddAttachmentWindowIsOpen(false);
  };

  const onDelete = () => {
    removeConfirm.showConfirmation('Ta bort?', 'Vill du ta bort denna bilaga?').then((confirmed) => {
      if (confirmed) {
        return deleteSupportAttachment(supportErrand?.id.toString(), municipalityId, selectedAttachment.id)
          .then(() => {
            props.update();
            reset();
          })
          .then(() => {
            setSelectedAttachment(null);
          })
          .then(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Bilagan togs bort',
              status: 'success',
            });
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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-20 overflow-y-auto bg-opacity-50 bg-gray-500" onClose={closeModal}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-[840px] p-xl py-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <button ref={modalFocus} className="modal-close-btn" onClick={closeModal}>
                <span className="material-icons-outlined">close</span>
              </button>
              <Dialog.Title as="h1" className="text-xl my-sm">
                {modalAttachment?.errandAttachmentHeader?.fileName}
              </Dialog.Title>

              <div className="flex flex-col justify-center items-center my-lg">
                <>
                  <div className="flex-grow-0 my-md">
                    <div className="flex flex-col justify-center items-center my-lg">
                      {modalFetching ? (
                        <Spinner size={24} />
                      ) : (
                        <Image
                          alt={modalAttachment?.errandAttachmentHeader?.fileName}
                          key={modalAttachment?.errandAttachmentHeader?.id}
                          src={`data:${modalAttachment?.errandAttachmentHeader.mimeType};base64,${modalAttachment?.base64EncodedString}`}
                        />
                      )}
                    </div>
                  </div>
                </>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );

  return (
    <>
      <div className="w-full py-40 px-48 gap-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <h2 className="text-h2-md max-medium-device:text-h4-md">Bilagor</h2>
          <div>
            <Input type="hidden" {...register('id')} />
            <Modal
              show={addAttachmentWindowIsOpen}
              className="w-[43rem]"
              onClose={() => {
                closeHandler();
                setSelectedAttachment(null);
                setAddNewAttachment(false);
                reset();
              }}
              label={'Ladda upp bilaga'}
            >
              <FileUploadWrapper>
                <Modal.Content>
                  <FormControl id="attachment" className="w-full">
                    <FileUpload
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
                      allowMultiple={isKC() || isIS() ? true : false}
                    />
                  </FormControl>

                  {attachmentTypeExists ? (
                    <FormErrorMessage className="my-sm text-error">
                      En bilaga av denna typ finns redan. För att lägga till en ny, ta först bort den gamla.
                    </FormErrorMessage>
                  ) : null}
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
                      const attachmentsData: { file: File }[] = vals.attachments.map((a) => ({
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
                          toastMessage({
                            position: 'bottom',
                            closeable: false,
                            message: 'Bilagan sparades',
                            status: 'success',
                          });
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
              disabled={isSupportErrandLocked(supportErrand)}
              color="vattjom"
              rightIcon={<Icon name="upload" size={16} />}
              inverted
              size="sm"
              onClick={() => {
                setSizeError(false);
                setAddNewAttachment(true);
                setAttachmentTypeExists(false);
                reset();
                openHandler();
              }}
            >
              Ladda upp bilaga
            </Button>
          </div>
        </div>
        <div>
          <p className="py-8">Här samlas bilagor som är kopplade till ärendet.</p>
          {!supportAttachments?.length && (
            <>
              <Divider className="pt-16" />
              <p className="pt-24 text-dark-disabled">Inga bilagor har laddats upp</p>
            </>
          )}
        </div>
        {!isLoading ? (
          <div className="mt-md flex flex-col" data-cy="supportattachments-list">
            {supportAttachments?.map((attachment, key) => (
              <Fragment key={key}>
                <div
                  data-cy={`attachment-${attachment.id}`}
                  className={`attachment-item flex justify-between gap-12 rounded-sm p-12 text-md border-b first:border-t`}
                >
                  <div className="flex gap-12">
                    <div className={`self-center bg-vattjom-surface-accent p-12 rounded`}>
                      <Icon
                        name={documentMimeTypes.find((d) => d.includes(attachment.mimeType)) ? 'file' : 'image'}
                        className="block"
                        size={24}
                      />
                    </div>
                    <div>
                      <p>
                        <strong>{attachment.fileName}</strong>{' '}
                      </p>
                    </div>
                  </div>

                  <div className="self-center relative">
                    {/* Popup menu  */}
                    {!isSupportErrandLocked(supportErrand) && (
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
                          <Icon name="ellipsis" />
                        </PopupMenu.Button>
                        <PopupMenu.Panel>
                          <PopupMenu.Items>
                            <PopupMenu.Group>
                              <PopupMenu.Item>
                                <Button
                                  data-cy={`open-attachment-${attachment.id}`}
                                  leftIcon={<Icon name="eye" />}
                                  onClick={() => {
                                    if (documentMimeTypes.includes(attachment.mimeType)) {
                                      downloadDocument(attachment);
                                    } else if (imageMimeTypes.includes(attachment.mimeType)) {
                                      setModalFetching(true);
                                      getSupportAttachment(supportErrand.id.toString(), municipalityId, attachment)
                                        .then((res) => setModalAttachment(res))
                                        .then(() => {
                                          setModalFetching(false);
                                        })
                                        .then((res) => openModal());
                                    }
                                    // exclusive exception for .msg
                                    else if (attachment.mimeType === '' && attachment.name.endsWith(`.msg`)) {
                                      downloadDocument(attachment);
                                    } else {
                                      toastMessage({
                                        position: 'bottom',
                                        closeable: false,
                                        message: 'Fel: okänd filtyp',
                                        status: 'error',
                                      });
                                    }
                                  }}
                                >
                                  Öppna
                                </Button>
                              </PopupMenu.Item>
                            </PopupMenu.Group>
                            <PopupMenu.Group>
                              <PopupMenu.Item>
                                <Button
                                  data-cy={`delete-attachment-${attachment.id}`}
                                  leftIcon={<Icon name="trash" />}
                                  onClick={onDelete}
                                >
                                  Ta bort
                                </Button>
                              </PopupMenu.Item>
                            </PopupMenu.Group>
                          </PopupMenu.Items>
                        </PopupMenu.Panel>
                      </PopupMenu>
                    )}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        ) : (
          <Spinner />
        )}

        {editAttachmentModal}
      </div>
    </>
  );
};
