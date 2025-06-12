import { Attachment } from '@casedata/interfaces/attachment';
import {
  ACCEPTED_UPLOAD_FILETYPES,
  AttachmentLabels,
  deleteAttachment,
  documentMimeTypes,
  editAttachment,
  fetchAttachment,
  getAttachmentKey,
  getAttachmentLabel,
  getPTAttachmentKey,
  imageMimeTypes,
  onlyOneAllowed,
  PTAttachmentLabels,
  sendAttachments,
} from '@casedata/services/casedata-attachment-service';
import { getErrand, isErrandLocked } from '@casedata/services/casedata-errand-service';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { CommonImageCropper } from '@common/components/image-cropper/common-image-cropper.component';
import { useAppContext } from '@common/contexts/app.context';
import { isMEX } from '@common/services/application-service';
import { Dialog, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
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
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Resolver, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { FileUploadWrapper } from '../../../../../common/components/file-upload/file-upload-dragdrop-context';

export interface SingleAttachment {
  file: File | undefined;
  attachmentType: string;
  attachmentName: string;
}
export interface CasedataAttachmentFormModel {
  id?: string;
  newAttachment: FileList | undefined;
  attachments: SingleAttachment[];
  attachmentList: SingleAttachment[];
  attachmentType: string;
  attachmentName: string;
}

const defaultAttachmentInformation: CasedataAttachmentFormModel = {
  newAttachment: undefined,
  attachments: [],
  attachmentList: [],
  attachmentType: '',
  attachmentName: '',
};

export const CasedataAttachments: React.FC = () => {
  const { municipalityId, errand, setErrand, user } = useAppContext();
  const [modalAttachment, setModalAttachment] = useState<Attachment>();
  const [modalFetching, setModalFetching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [dragDrop, setDragDrop] = useState<boolean>(false);
  const [error, setError] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addAttachmentWindowIsOpen, setAddAttachmentWindowIsOpen] = useState<boolean>(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment>();
  const [attachmentTypeExists, setAttachmentTypeExists] = useState(false);
  const removeConfirm = useConfirm();
  const toastMessage = useSnackbar();

  const modalFocus = useRef(null);
  const setModalFocus = () => {
    setTimeout(() => {
      modalFocus.current && modalFocus.current.focus();
    });
  };

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
    setModalFocus();
  };

  let formSchema = dragDrop
    ? yup.object({
        id: yup.string(),
        newAttachment: yup.mixed(),
      })
    : yup.object({
        id: yup.string(),
        newAttachment: yup.mixed(),
        attachments: yup.array().when('attachmentType', () => {
          return selectedAttachment ? yup.array() : yup.array().min(1).required('Fil måste bifogas');
        }),
        attachmentType: yup.string().required('Typ måste anges'),
        attachmentName: selectedAttachment ? yup.string().required('Namn måste anges') : yup.string(),
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
  } = useForm<CasedataAttachmentFormModel | ({ newItem: FileList | undefined } & Record<string, any>)>({
    resolver: yupResolver(formSchema) as unknown as Resolver<
      CasedataAttachmentFormModel | ({ newItem: FileList | undefined } & Record<string, any>)
    >,
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
  const attachmentType = watch('attachmentType');

  const downloadDocument = (a: Attachment) => {
    const uri = `data:${a.mimeType};base64,${a.file}`;
    const link = document.createElement('a');
    const filename = a.name;
    link.href = uri;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
  };

  useEffect(() => {
    trigger();
    const vals: CasedataAttachmentFormModel | ({ newItem: FileList | undefined } & Record<string, any>) = getValues();
    const attachmentCategory = isMEX()
      ? getAttachmentKey(vals.attachmentType)
      : getPTAttachmentKey(vals.attachmentType);
    const isSelectedAttachmentType = selectedAttachment?.category === attachmentCategory;
    setAttachmentTypeExists(
      !isSelectedAttachmentType &&
        onlyOneAllowed(attachmentCategory) &&
        errand.attachments?.some((a) => a.category === attachmentCategory)
    );
    if (vals.attachmentType) {
      trigger();
    }
  }, [attachmentType, selectedAttachment]);

  useEffect(() => {
    setSizeError(false);
  }, [attachments]);

  const openHandler = () => {
    setAddAttachmentWindowIsOpen(true);
  };

  const closeHandler = () => {
    setDragDrop(false);
    setAddAttachmentWindowIsOpen(false);
  };

  const clickHandler = (attachment: Attachment) => {
    if (documentMimeTypes.includes(attachment.mimeType)) {
      downloadDocument(attachment);
    } else if (imageMimeTypes.includes(attachment.mimeType)) {
      setModalFetching(true);
      fetchAttachment(municipalityId, errand.id, attachment.id)
        .then((res) => setModalAttachment(res.data))
        .then(() => {
          setModalFetching(false);
        })
        .then((res) => openModal());
    } else if (attachment.extension === 'msg') {
      downloadDocument(attachment);
    } else {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Fel: okänd filtyp',
        status: 'error',
      });
    }
  };

  const editAttachmentModal = (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-20 overflow-y-auto bg-opacity-50 bg-gray-500" onClose={closeModal}>
        <div className="min-h-screen px-4 text-center">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
          </TransitionChild>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          <TransitionChild
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
              <DialogTitle as="h1" className="text-xl my-sm">
                {isCropping ? 'Beskär' : ''} {modalAttachment?.name}
              </DialogTitle>

              <div className="flex flex-col justify-center items-center my-lg">
                {isCropping ? (
                  <CommonImageCropper errand={errand} attachment={modalAttachment} onClose={closeModal} />
                ) : (
                  <>
                    <div className="flex-grow-0 my-md">
                      <div className="flex flex-col justify-center items-center my-lg">
                        {modalFetching ? (
                          <Spinner size={24} />
                        ) : (
                          <Image
                            alt={getAttachmentLabel(modalAttachment)}
                            key={modalAttachment?.id}
                            src={`data:${modalAttachment?.mimeType};base64,${modalAttachment?.file}`}
                          />
                        )}
                      </div>
                    </div>
                    <div className="my-md">
                      <Button
                        variant="primary"
                        disabled={isErrandLocked(errand)}
                        color="primary"
                        onClick={() => {
                          setIsCropping(!isCropping);
                        }}
                        leftIcon={<LucideIcon name="crop" />}
                      >
                        {isCropping ? 'Spara' : 'Beskär bild'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );

  return (
    <>
      <div className="w-full py-24 px-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <h2 className="text-h4-sm md:text-h4-md">Bilagor</h2>
          <div>
            <Input type="hidden" {...register('id')} />
            <Modal
              show={addAttachmentWindowIsOpen}
              className="w-[43rem]"
              onClose={() => {
                closeHandler();
                setSelectedAttachment(null);
                reset();
              }}
              label={'Ladda upp bilaga'}
            >
              <FileUploadWrapper>
                <Modal.Content>
                  <FormControl id="attachment" className="w-full mb-20">
                    <FileUpload
                      dragDrop={dragDrop}
                      fieldName="attachments"
                      fields={attachmentFields}
                      items={attachments}
                      uniqueFileUploaderKey="casedata-attachments-tab"
                      register={register}
                      setValue={setValue}
                      watch={watch}
                      errors={errors}
                      append={appendAttachment}
                      remove={removeAttachment}
                      editing={selectedAttachment ? true : false}
                      accept={ACCEPTED_UPLOAD_FILETYPES}
                      helperText="Maximal filstorlek: 50 MB"
                      allowMultiple={true}
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
                    disabled={
                      (!dragDrop && !formState.isValid) ||
                      (!selectedAttachment && attachments.length === 0) ||
                      attachmentType === 'Välj bilaga'
                    }
                    type="submit"
                    variant="primary"
                    color="primary"
                    loading={isLoading}
                    loadingText="Laddar upp"
                    onClick={(e) => {
                      e.preventDefault();
                      const vals:
                        | CasedataAttachmentFormModel
                        | ({ newItem: FileList | undefined } & Record<string, any>) = getValues();
                      const attachmentsData: { id?: string; type: string; file: FileList; attachmentName: string }[] =
                        vals.attachments.map((a) => ({
                          id: vals.id,
                          file: a.file,
                          type:
                            vals.attachments.length === 1 && !dragDrop
                              ? vals.attachmentType
                              : !a.attachmentType || a.attachmentType.length === 0
                              ? isMEX()
                                ? 'OTHER'
                                : 'OTHER_ATTACHMENT'
                              : a.attachmentType,
                          attachmentName: dragDrop ? a.file[0].name : vals.attachmentName,
                        }));
                      setIsLoading(true);

                      const apiCall = selectedAttachment
                        ? editAttachment(
                            municipalityId,
                            errand.id.toString(),
                            vals.id,
                            vals.attachmentName,
                            vals.attachmentType
                          )
                        : sendAttachments(municipalityId, errand?.id, errand.errandNumber, attachmentsData);
                      apiCall
                        .then(() =>
                          getErrand(municipalityId, errand.id.toString())
                            .then((res) => setErrand(res.errand))
                            .then(() => {
                              toastMessage({
                                position: 'bottom',
                                closeable: false,
                                message: attachments.length > 1 ? 'Bilagorna sparades' : 'Bilagan sparades',
                                status: 'success',
                              });
                              setSelectedAttachment(null);
                              setValue('id', undefined);
                              reset(defaultAttachmentInformation);
                              setIsLoading(false);
                              setError(false);
                              setSizeError(false);
                              setAddAttachmentWindowIsOpen(false);
                              setDragDrop(false);
                            })
                        )
                        .catch((e) => {
                          if (e.message === 'MAX_SIZE') {
                            toastMessage({
                              position: 'bottom',
                              closeable: false,
                              message: 'Filen överskrider maximal storlek (10 Mb)',
                              status: 'error',
                            });
                            setIsLoading(false);
                          } else if (e.message === 'TYPE_MISSING') {
                            toastMessage({
                              position: 'bottom',
                              closeable: false,
                              message: 'Typ måste anges för bilaga',
                              status: 'error',
                            });
                            setIsLoading(false);
                          } else {
                            toastMessage({
                              position: 'bottom',
                              closeable: false,
                              message: 'Något gick fel när bilagan sparades',
                              status: 'error',
                            });
                            setIsLoading(false);
                          }
                        });
                    }}
                  >
                    {selectedAttachment ? 'Spara' : 'Ladda upp'}
                  </Button>
                </Modal.Footer>
              </FileUploadWrapper>
            </Modal>
            <Button
              data-cy="add-attachment-button"
              disabled={isErrandLocked(errand)}
              color="vattjom"
              rightIcon={<LucideIcon name="upload" size={16} />}
              inverted
              size="sm"
              onClick={() => {
                setDragDrop(true);
                setSizeError(false);
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
          {!errand.attachments?.length && (
            <>
              <Divider className="pt-16" />
              <p className="pt-24 text-dark-disabled">Inga bilagor har laddats upp</p>
            </>
          )}
        </div>

        <div className="mt-md flex flex-col" data-cy="casedataAttachments-list">
          {errand.attachments?.map((attachment, key) => (
            <Fragment key={key}>
              <div
                data-cy={`attachment-${attachment.id}`}
                className="attachment-item flex justify-between gap-12 rounded-sm p-12 text-md border-t"
              >
                <div
                  className="flex gap-12 cursor-pointer"
                  onClick={() => {
                    clickHandler(attachment);
                  }}
                >
                  <div className="self-center bg-vattjom-surface-accent p-12 rounded">
                    <LucideIcon name="clipboard-check" className="block" size={24} />
                  </div>
                  <div>
                    <p>
                      <strong>{attachment.name}</strong>{' '}
                      {attachment.category &&
                      (AttachmentLabels[attachment.category] || PTAttachmentLabels[attachment.category])
                        ? isMEX()
                          ? '(' + AttachmentLabels[attachment.category] + ')'
                          : '(' + PTAttachmentLabels[attachment.category] + ')'
                        : ''}
                    </p>
                    <p>Uppladdad den {dayjs(attachment.created).format('YYYY-MM-DD HH:mm')}</p>
                  </div>
                </div>

                <div className="self-center relative">
                  {/* Popup menu  */}

                  <PopupMenu>
                    <PopupMenu.Button
                      size="sm"
                      variant="primary"
                      aria-label="Alternativ"
                      color="primary"
                      iconButton
                      inverted
                    >
                      <LucideIcon name="ellipsis" />
                    </PopupMenu.Button>
                    <PopupMenu.Panel>
                      <PopupMenu.Items>
                        <PopupMenu.Group>
                          <PopupMenu.Item>
                            <Button
                              leftIcon={<LucideIcon name="eye" />}
                              data-cy={`open-attachment-${attachment.id}`}
                              onClick={() => {
                                clickHandler(attachment);
                              }}
                            >
                              Öppna
                            </Button>
                          </PopupMenu.Item>
                          {!isErrandLocked(errand) ? (
                            <PopupMenu.Item>
                              <Button
                                data-cy={`edit-attachment-${attachment.id}`}
                                leftIcon={<LucideIcon name="pencil" />}
                                onClick={() => {
                                  setValue(`attachmentType`, attachment.category);
                                  setValue(`attachmentName`, attachment.name);
                                  setValue('id', attachment.id);
                                  setSelectedAttachment(() => {
                                    return attachment;
                                  });
                                  openHandler();
                                }}
                              >
                                Ändra
                              </Button>
                            </PopupMenu.Item>
                          ) : null}
                        </PopupMenu.Group>
                        {!isErrandLocked(errand) ? (
                          <>
                            <PopupMenu.Group>
                              <PopupMenu.Item>
                                <Button
                                  data-cy={`delete-attachment-${attachment.id}`}
                                  leftIcon={<LucideIcon name="trash" />}
                                  onClick={() => {
                                    removeConfirm
                                      .showConfirmation(
                                        'Ta bort?',
                                        'Vill du ta bort denna bilaga?',
                                        'Ja',
                                        'Nej',
                                        'info',
                                        'info'
                                      )
                                      .then((confirmed) => {
                                        if (confirmed) {
                                          deleteAttachment(municipalityId, errand?.id, attachment)
                                            .then((res) => {
                                              getErrand(municipalityId, errand.id.toString()).then((res) => {
                                                setErrand(res.errand);
                                              });
                                            })
                                            .then(() => {
                                              toastMessage({
                                                message: 'Bilagan togs bort',
                                                status: 'success',
                                              });
                                            })
                                            .catch((e) => {
                                              toastMessage({
                                                message: 'Något gick fel när bilagan togs bort',
                                                status: 'error',
                                              });
                                            });
                                        }
                                      });
                                  }}
                                >
                                  Ta bort
                                </Button>
                              </PopupMenu.Item>
                            </PopupMenu.Group>
                          </>
                        ) : null}
                      </PopupMenu.Items>
                    </PopupMenu.Panel>
                  </PopupMenu>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
        {editAttachmentModal}
      </div>
    </>
  );
};
