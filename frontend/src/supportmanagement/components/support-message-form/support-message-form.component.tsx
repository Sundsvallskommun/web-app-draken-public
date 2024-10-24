import { ACCEPTED_UPLOAD_FILETYPES } from '@casedata/services/casedata-attachment-service';
import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { EditorModal } from '@common/components/rich-text-editor/editor-modal.component';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { invalidPhoneMessage, supportManagementPhonePattern } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { yupResolver } from '@hookform/resolvers/yup';
import AddIcon from '@mui/icons-material/Add';
import {
  Button,
  Chip,
  FormControl,
  FormErrorMessage,
  FormLabel,
  LucideIcon as Icon,
  Input,
  Modal,
  RadioButton,
  Select,
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import {
  SingleSupportAttachment,
  SupportAttachment,
  getSupportAttachment,
} from '@supportmanagement/services/support-attachment-service';
import { SupportErrand, isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { Message, MessageRequest, sendMessage } from '@supportmanagement/services/support-message-service';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';

const PREFILL_VALUE = '+46';

export interface SupportMessageFormModel {
  id: string;
  messageContact: boolean;
  contactMeans: string;
  newEmail: string;
  emails: { value: string }[];
  newPhoneNumber: string;
  phoneNumbers: [];
  messageBody: string;
  messageBodyPlaintext: string;
  messageAttachments: { file: File | undefined }[];
  newMessageAttachments: { file: File | undefined }[];
  headerReplyTo: string;
  headerReferences: string;
  addExisting: string;
  existingAttachments: SingleSupportAttachment[];
}

let formSchema = yup
  .object({
    id: yup.string(),
    messageContact: yup.string(),
    contactMeans: yup.string(),
    newEmail: yup
      .string()
      .email('E-postadress har fel format')
      .when(['emails', 'contactMeans'], {
        is: (emails: [], means: string) => {
          return !emails.length && means === 'email';
        },
        then: yup.string().min(1, 'Ange minst en e-postadress').required('Ange minst en e-postadress'),
      }),
    emails: yup.array().when('contactMeans', {
      is: (means: string) => means === 'email',
      then: yup
        .array()
        .of(
          yup.object().shape({
            value: yup.string().email('E-postadress har fel format'),
          })
        )
        .min(1, 'Ange minst en e-postadress')
        .required('Ange minst en e-postadress'),
    }),
    newPhoneNumber: yup.string(),
    // .trim()
    // .transform((val) => val && val.replace('-', ''))
    // .matches(supportManagementPhonePattern, invalidPhoneMessage),
    phoneNumbers: yup.array().when('contactMeans', {
      is: (means: string) => means === 'sms',
      then: yup
        .array()
        .of(
          yup.object().shape({
            value: yup
              .string()
              .required('Telefonnummer måste anges för sms-meddelande')
              .trim()
              .transform((val) => val && val.replace('-', ''))
              .matches(supportManagementPhonePattern, invalidPhoneMessage),
          })
        )
        .min(1, 'Ange minst ett telefonnummer')
        .required('Ange minst ett telefonnummer'),
    }),
    messageBody: yup.string().required('Meddelandetext måste anges'),
    messageBodyPlaintext: yup.string(),
    newMessageAttachment: yup.array(),
    messageAttachments: yup.array(),
    headerReplyTo: yup.string(),
    headerReferences: yup.string(),
    existingAttachments: yup.array(),
  })
  .required();

export const SupportMessageForm: React.FC<{
  locked?: boolean;
  prefillPhone?: string;
  prefillEmail?: string;
  supportErrandId: string;
  showMessageForm: boolean;
  emailBody: string;
  smsBody: string;
  richText: string;
  setRichText: React.Dispatch<React.SetStateAction<string>>;
  message: Message;
  setShowMessageForm: React.Dispatch<React.SetStateAction<boolean>>;
  setUnsaved?: (boolean) => void;
  update?: () => void;
}> = (props) => {
  const {
    municipalityId,
    user,
    supportErrand,
    supportAttachments,
  }: {
    municipalityId: string;
    user: User;
    supportErrand: SupportErrand;
    supportAttachments: SupportAttachment[];
  } = useAppContext();

  const { richText, setRichText, emailBody, smsBody } = props;

  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const [isSending, setIsSending] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const quillRef = useRef(null);
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<() => Promise<any>>();
  const [messageVerification, setMessageVerification] = useState(false);
  const [replying, setReplying] = useState(false);

  const [messageEmailValidated, setMessageEmailValidated] = useState<boolean>(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState<boolean>(false);

  const closeAttachmentModal = () => {
    setIsAttachmentModalOpen(false);
  };

  const formControls = useForm<SupportMessageFormModel>({
    defaultValues: {
      id: props.supportErrandId,
      messageContact: true,
      contactMeans: 'email',
      newEmail: '',
      newPhoneNumber: '',
      emails: [],
      phoneNumbers: [],
      messageBody: sanitized(emailBody),
      messageBodyPlaintext: emailBody,
      messageAttachments: [],
      newMessageAttachments: [],
      headerReplyTo: '',
      headerReferences: '',
      addExisting: '',
      existingAttachments: [],
    },
    resolver: yupResolver(formSchema),
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    trigger,
    formState,
    getValues,
    setValue,
    clearErrors,
    formState: { errors },
  } = formControls;

  const { contactMeans, messageAttachments, newMessageAttachments, addExisting, existingAttachments } = watch();

  const {
    fields: messageAttachmentFields,
    append: appendMessageAttachment,
    remove: removeMessageAttachment,
  } = useFieldArray({
    control,
    name: 'messageAttachments',
  });

  const {
    fields: newMessageAttachmentFields,
    append: appendNewMessageAttachment,
    remove: removeNewMessageAttachment,
  } = useFieldArray({
    control,
    name: 'newMessageAttachments',
  });

  const {
    fields: existingAttachmentFields,
    append: appendExistingAttachment,
    remove: removeExistingAttachment,
  } = useFieldArray({
    control,
    name: 'existingAttachments',
  });

  const onRichTextChange = (val) => {
    const editor = quillRef.current.getEditor();
    const length = editor.getLength();
    setRichText(val);
    setValue('messageBody', sanitized(length > 1 ? val : undefined));
    setValue('messageBodyPlaintext', quillRef.current.getEditor().getText());
    trigger('messageBody');
  };

  const onSubmit = (data, event) => {
    send();
  };

  const getSingleSupportAttachment = (attachment: SupportAttachment) => {
    getSupportAttachment(supportErrand?.id, municipalityId, attachment).then((res) => {
      appendExistingAttachment(res);
    });
  };

  const send: () => void = async () => {
    setIsSending(true);
    setMessageError(false);
    const data = getValues();
    const messageData: MessageRequest = {
      municipalityId: municipalityId,
      errandId: data.id,
      contactMeans: data.contactMeans,
      emails: data.emails,
      recipientEmail: '',
      phoneNumbers: data.phoneNumbers,
      plaintextMessage: data.messageBodyPlaintext,
      htmlMessage: data.messageBody,
      senderName: user.name,
      subject: `Ärende #${supportErrand.errandNumber}`,
      headerReplyTo: data.headerReplyTo,
      headerReferences: data.headerReferences,
      ...(contactMeans === 'email' && { attachments: messageAttachments }),
      ...(contactMeans === 'email' && { existingAttachments: existingAttachments }),
    };
    sendMessage(messageData)
      .then((success) => {
        if (!success) {
          throw new Error('');
        }
        setIsSending(false);
        if (document.querySelector('input[name="useEmail"]:checked')) {
          setRichText(emailBody);
        } else if (document.querySelector('input[name="useSms"]:checked')) {
          setRichText(smsBody);
        }
        setValue('emails', []);
        setValue('phoneNumbers', []);
        removeMessageAttachment();
        removeExistingAttachment();
        setTimeout(() => {
          props.setUnsaved(false);
          setValue('messageBody', emailBody);
          clearErrors();
          props.setShowMessageForm(false);
        }, 0);
        setTimeout(() => {
          props.update();
        }, 500);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message:
            data.emails.length + data.phoneNumbers.length === 1
              ? 'Ditt meddelande skickades'
              : 'Dina meddelanden skickades',
          status: 'success',
        });
      })
      .catch((e) => {
        console.error(e);
        setIsSending(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när meddelandet skulle skickas',
          status: 'error',
        });
      });
  };

  useEffect(() => {
    if (contactMeans === 'email') {
      setValue('newEmail', props.prefillEmail);
      setRichText(emailBody);
    } else if (contactMeans === 'sms') {
      setValue('newPhoneNumber', props.prefillPhone || PREFILL_VALUE);
      setRichText(smsBody);
    }
    setTimeout(() => {
      props.setUnsaved(false);
    }, 0);
  }, [contactMeans, props.prefillEmail, props.prefillPhone]);

  useEffect(() => {
    setValue('id', props.supportErrandId);
  }, [props.supportErrandId]);

  const { fields, remove, append } = useFieldArray({
    control,
    name: 'emails',
  });

  useEffect(() => {
    setReplying(!!props.message?.emailHeaders?.['MESSAGE_ID']?.[0]);
    if (props.message) {
      const replyTo = props.message?.emailHeaders?.['MESSAGE_ID']?.[0] || '';
      const references = props.message?.emailHeaders?.['REFERENCES'] || [];
      references.push(replyTo);
      setValue('headerReplyTo', replyTo);
      setValue('headerReferences', references.join(','));
      setValue('emails', [{ value: props.message.sender }]);
      const historyHeader = `<br><br>-----Ursprungligt meddelande-----<br>Från: ${props.message.sender}<br>Skickat: ${props.message.sent}<br>Till: Sundsvalls kommun<br>Ämne: ${props.message.subject}<br><br>`;
      setRichText(historyHeader + props.message.messageBody);

      trigger();
    } else {
      setRichText(emailBody);
      setValue('headerReplyTo', '');
      setValue('headerReferences', '');
      setValue('emails', []);
      setValue('phoneNumbers', []);
    }
  }, [props.message]);

  return (
    <div className="px-40 py-8 gap-24">
      <input type="hidden" {...register('id')} />

      <div className="flex mt-16">
        <div className="w-full">
          <strong>Ditt meddelande</strong>
          <Input type="hidden" {...register('headerReplyTo')} />
          <Input type="hidden" {...register('headerReferences')} />
          <Input data-cy="message-body-input" type="hidden" {...register('messageBody')} />
          <Input data-cy="message-body-input" type="hidden" {...register('messageBodyPlaintext')} />
          <div className={cx(`h-[26rem] mb-16`)} data-cy="decision-richtext-wrapper">
            <RichTextEditor
              readOnly={props.locked}
              ref={quillRef}
              value={richText}
              isMaximizable={true}
              errors={!!errors.messageBody}
              toggleModal={() => {
                setIsEditorModalOpen(!isEditorModalOpen);
              }}
              onChange={(value, delta, source, editor) => {
                props.setUnsaved(true);
                if (source === 'user') {
                  setTextIsDirty(true);
                }
                return onRichTextChange(value);
              }}
            />
          </div>
          {!!errors.messageBody && (
            <div className="-mt-lg mb-lg">
              <FormErrorMessage className="text-error">{errors.messageBody?.message}</FormErrorMessage>
            </div>
          )}
        </div>
      </div>

      <div className="w-full pb-8">
        <strong className="text-md">Kontaktväg</strong>
        <RadioButton.Group inline={true} data-cy="message-channel-radio-button-group">
          <RadioButton
            disabled={props.locked}
            data-cy="useEmail-radiobutton-true"
            className="mr-sm"
            name="useEmail"
            id="useEmail"
            value={'email'}
            defaultChecked={true}
            {...register('contactMeans')}
          >
            Epost
          </RadioButton>
          <RadioButton
            disabled={props.locked}
            data-cy="useSms-radiobutton-true"
            className="mr-sm"
            name="useSms"
            id="useSms"
            value={'sms'}
            defaultChecked={false}
            {...register('contactMeans')}
          >
            SMS
          </RadioButton>
        </RadioButton.Group>
      </div>

      {contactMeans === 'email' ? (
        <div className="w-full mt-md gap-xl mb-lg">
          <CommonNestedEmailArrayV2
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="email-input"
            required
            error={!!formState.errors.emails}
            key={`nested-email-array`}
            {...{ control, register, errors, watch, setValue, trigger }}
          />

          <FormControl id="addExisting" className="w-full mt-md">
            <FormLabel>Bilagor från ärendet</FormLabel>
            <div className="flex items-center justify-between mb-md">
              {/*<Input type="hidden" {...register('addExisting')} />*/}
              <Select
                {...register('addExisting')}
                className="w-full"
                size="sm"
                placeholder="Välj bilaga"
                onChange={(r) => {
                  setValue('addExisting', r.currentTarget.value);
                }}
                value={getValues('addExisting')}
                data-cy="select-errand-attachment"
              >
                <Select.Option value="">Välj bilaga</Select.Option>
                {supportAttachments?.map((attachment, index) => {
                  return (
                    <Select.Option key={`attachmentId-${index}`} value={attachment?.fileName}>
                      {attachment?.fileName}
                    </Select.Option>
                  );
                })}
              </Select>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<AddIcon fontSize="large" className="mr-sm" />}
                disabled={!addExisting}
                color="primary"
                onClick={(e) => {
                  e.preventDefault();
                  if (addExisting) {
                    const attachment = supportAttachments.find((a: SupportAttachment) => a.fileName === addExisting);
                    getSingleSupportAttachment(attachment);
                    setValue(`addExisting`, undefined);
                  }
                }}
                className="rounded-lg ml-lg"
                data-cy="add-selected-attachment"
              >
                Lägg till
              </Button>
            </div>
            {errors.addExisting && (
              <div className="my-sm">
                <FormErrorMessage>{errors.addExisting.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
          {existingAttachmentFields.length > 0 ? (
            <div className="flex items-center w-full flex-wrap justify-start gap-md">
              {existingAttachmentFields.map((field, k) => {
                const att = field as SingleSupportAttachment;
                return (
                  <div key={`${field.id}-${k}`}>
                    <Chip
                      aria-label={`Ta bort bilaga ${att.errandAttachmentHeader.fileName}`}
                      key={field.id}
                      onClick={() => {
                        removeExistingAttachment(k);
                      }}
                    >
                      {att.errandAttachmentHeader.fileName}
                    </Chip>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : contactMeans === 'sms' ? (
        <div className="w-full mt-md gap-xl mb-lg">
          <CommonNestedPhoneArrayV2
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="newPhoneNumber"
            required
            error={!!formState.errors.phoneNumbers}
            key={`nested-phone-array`}
            {...{ control, register, errors, watch, setValue, trigger }}
          />
        </div>
      ) : null}

      {!props.locked && contactMeans === 'email' ? (
        <div className="flex mb-24">
          <Button
            variant="tertiary"
            color="primary"
            leftIcon={<Icon name="paperclip" />}
            onClick={() => setIsAttachmentModalOpen(true)}
            data-cy="add-attachment-button"
          >
            {' '}
            Bifoga fil
          </Button>
        </div>
      ) : null}

      {messageAttachmentFields.length ? (
        <>
          <strong className="text-md">Bifogade filer</strong>
          <div className="flex flex-col items-center w-full gap-8 mt-8 pb-16">
            {messageAttachmentFields.map((attachment, index) => {
              return (
                <div
                  key={'attachment-' + index}
                  className="flex w-full border-1 rounded-16 px-12 py-8 border-divider justify-between"
                >
                  <div className="flex w-5/6 gap-10">
                    <div className="bg-vattjom-surface-accent pt-4 pb-0 px-4 rounded self-center">
                      <Icon name="file" size={25} />
                    </div>
                    <div className="self-center justify-start px-8">{attachment.file[0]?.name}</div>
                  </div>
                  <div>
                    <Button
                      aria-label={`Ta bort ${attachment.file[0]?.name}`}
                      iconButton
                      inverted
                      className="self-end"
                      onClick={() => removeMessageAttachment(index)}
                    >
                      <Icon name="x" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="flex my-md gap-md">
        {messageVerification ? (
          <div className="text-md text-secondary my-sm">
            {/* TODO FIX */}
            {/* <Icon name="check" fontSize="inherit" className="ml-sm mr-sm" /> */}
            <span>Meddelandet har skickats</span>
          </div>
        ) : (
          <>
            <Button onClick={() => props.setShowMessageForm(false)} variant="secondary" color="primary">
              Avbryt{' '}
            </Button>
            <Button
              variant="primary"
              color="primary"
              type="button"
              onClick={handleSubmit(onSubmit)}
              data-cy="send-message-button"
            >
              {isSending ? 'Skickar meddelande' : 'Skicka meddelande'}
            </Button>
          </>
        )}
      </div>
      <div className="my-sm">
        {messageError && (
          <FormErrorMessage className="text-error">Något gick fel när meddelandet skulle skickas</FormErrorMessage>
        )}
      </div>
      {isEditorModalOpen && (
        <EditorModal
          isOpen={isEditorModalOpen}
          readOnly={props.locked}
          modalHeader="Ditt meddelande"
          modalBody={quillRef.current.getEditor().getContents()}
          onChange={(delta) => {
            setTextIsDirty(true);
            return onRichTextChange(delta);
          }}
          onClose={() => {
            setIsEditorModalOpen(false);
          }}
          onCancel={() => {
            setIsEditorModalOpen(false);
          }}
          onContinue={modalAction}
        />
      )}

      <Modal show={isAttachmentModalOpen} onClose={closeAttachmentModal} label="Ladda upp bilaga" className="w-[40rem]">
        <Modal.Content>
          <FormControl id="messageAttachments" className="w-full">
            <FormLabel className="flex-grow"></FormLabel>
            <FileUpload
              editing={false}
              fieldName="newMessageAttachments"
              fields={newMessageAttachmentFields}
              uniqueFileUploaderKey="message-tab"
              items={newMessageAttachments}
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
              append={appendNewMessageAttachment}
              remove={removeNewMessageAttachment}
              allowMultiple={true}
              accept={ACCEPTED_UPLOAD_FILETYPES}
              dragDrop={false}
            />
          </FormControl>
        </Modal.Content>

        <Modal.Footer>
          <Button
            className="w-full"
            disabled={!newMessageAttachments.length}
            onClick={() => {
              newMessageAttachmentFields.forEach((field) => {
                appendMessageAttachment(field);
              });
              setValue('newMessageAttachments', []);
              closeAttachmentModal();
            }}
            data-cy="upload-button"
          >
            Ladda upp
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};