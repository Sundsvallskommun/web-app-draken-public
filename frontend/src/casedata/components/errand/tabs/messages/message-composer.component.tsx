import { Attachment } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { ACCEPTED_UPLOAD_FILETYPES, getAttachmentLabel } from '@casedata/services/casedata-attachment-service';
import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { renderMessageWithTemplates, sendMessage, sendSms } from '@casedata/services/casedata-message-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { isMEX, isPT } from '@common/services/application-service';
import {
  invalidPhoneMessage,
  phonePattern,
  supportManagementPhonePatternOrCountryCode,
} from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Chip,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  RadioButton,
  Select,
  Spinner,
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { MessageWrapper } from './message-wrapper.component';
import { Role } from '@casedata/interfaces/role';
import { MessageResponse } from 'src/data-contracts/backend/data-contracts';
import { useTranslation } from 'next-i18next';

export interface CasedataMessageTabFormModel {
  contactMeans: 'email' | 'sms' | 'webmessage' | 'digitalmail' | 'paper';
  messageClassification: string;
  messageTemplate?: string;
  emails: { value: string }[];
  newEmail: string;
  phoneNumbers: string[];
  newPhoneNumber: string;
  messageBody: string;
  messageBodyPlaintext: string;
  attachUtredning: boolean;
  existingAttachments: Attachment[];
  addExisting: string;
  messageAttachments: { file: FileList | undefined }[];
  newAttachments: { file: FileList | undefined }[];
  newItem: FileList | undefined;
  headerReplyTo: string;
  headerReferences: string;
}

const defaultMessage = {
  contactMeans: 'email' as const,
  emails: [],
  newEmail: '',
  phoneNumbers: [],
  newPhoneNumber: '',
  messageBody: '',
  messageBodyPlaintext: '',
  attachUtredning: false,
  existingAttachments: [],
  addExisting: '',
  newAttachments: [],
  newItem: undefined,
  headerReplyTo: '',
  headerReferences: '',
};

let formSchema = yup
  .object({
    headerReplyTo: yup.string(),
    headerReferences: yup.string(),
    contactMeans: yup.string(),
    messageClassification: yup.string(),
    messageTemplate: yup.string(),
    emails: yup.array().when('contactMeans', {
      is: (means: string) => means === 'email',
      then: yup
        .array()
        .of(
          yup
            .object()
            .shape({
              value: yup.string().email('E-postadress har fel format'),
            })
            .required()
        )
        .min(1, 'Ange minst en E-postadress'),
    }),
    newEmail: yup.string().when('contactMeans', {
      is: (means: string) => means === 'email',
      then: yup.string().email('E-postadressen har fel format'),
    }),
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
              .matches(supportManagementPhonePatternOrCountryCode, invalidPhoneMessage),
          })
        )
        .min(1, 'Ange minst ett telefonnummer')
        .required('Ange minst ett telefonnummer'),
    }),
    newPhoneNumber: yup
      .string()
      .trim()
      .transform((val) => val && val.replace('-', ''))
      .matches(phonePattern, invalidPhoneMessage),
    messageBody: yup.string().required('Text måste anges'),
    messageBodyPlaintext: yup.string(),
    attachUtredning: yup.bool(),
    existingAttachments: yup.array(
      yup.object().shape({
        category: yup.string(),
        name: yup.string(),
        note: yup.string(),
        extension: yup.string(),
        mimeType: yup.string(),
        file: yup.string(),
      })
    ),
    addExisting: yup.mixed(),
    newAttachments: yup.array(),
    addNew: yup.mixed(),
  })
  .required();

export const MessageComposer: React.FC<{
  message: MessageResponse;
  show: boolean;
  closeHandler: () => void;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const { municipalityId, errand, user }: { municipalityId: string; errand: IErrand; user: User } = useAppContext();
  const quillRef = useRef(null);
  const [richText, setRichText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [replying, setReplying] = useState(false);
  const [filteredAttachments, setFilteredAttachments] = useState([]);
  const submitConfirm = useConfirm();
  const closeConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  const { t } = useTranslation();
  useEffect(() => {
    const _a = validateAction(errand, user) && !!errand.administrator;
    setAllowed(_a);
  }, [user, errand]);

  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState<boolean>(false);

  const closeAttachmentModal = () => {
    setIsAttachmentModalOpen(false);
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    trigger,
    formState,
    getFieldState,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CasedataMessageTabFormModel>({
    resolver: yupResolver(formSchema),
    defaultValues: defaultMessage,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const { fields, remove, append } = useFieldArray({
    control,
    name: 'existingAttachments',
  });

  const {
    fields: newAttachmentsFields,
    append: appendNewAttachment,
    remove: removeNewAttachment,
  } = useFieldArray({
    control,
    name: 'newAttachments',
  });

  const {
    fields: messageAttachments,
    append: appendMessageAttachment,
    remove: removeMessageAttachment,
  } = useFieldArray({
    control,
    name: 'messageAttachments',
  });

  const clearAndClose = () => {
    setTimeout(() => {
      setValue('messageBody', '', { shouldDirty: true });
      setValue('emails', [], { shouldDirty: true });
      removeNewAttachment();
      setRichText('');
      remove();
      props.closeHandler();
    }, 0);
  };

  const onSubmit = async (data: CasedataMessageTabFormModel) => {
    const apiCall = data.contactMeans === 'sms' ? sendSms : sendMessage;
    setIsLoading(true);

    isMEX() ? (data.messageClassification = 'Informationsmeddelande') : null;

    const renderedHtml = await renderMessageWithTemplates(data.messageBody);
    data.messageBody = renderedHtml.html;

    apiCall(municipalityId, errand, data)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `${
            data.contactMeans === 'sms' ? 'SMS:et' : data.contactMeans === 'email' ? 'E-postmeddelandet' : 'Meddelandet'
          } skickades`,
          status: 'success',
        });
        setIsLoading(false);
        props.update();
        clearAndClose();
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: `Något gick fel när ${
            data.contactMeans === 'sms' ? 'SMS:et' : data.contactMeans === 'email' ? 'e-postmeddelandet' : 'meddelandet'
          } skickades`,
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const abortHandler = () => {
    if (getFieldState('messageBody').isDirty && getValues().messageBody !== props.message?.message) {
      closeConfirm
        .showConfirmation('Vill du avbryta?', 'Du har osparade ändringar.', 'Ja', 'Nej', 'info', 'info')
        .then((confirmed) => {
          if (confirmed) {
            clearAndClose();
          }
        });
    } else {
      clearAndClose();
    }
  };

  const addExisting = watch('addExisting');
  const existingAttachments = watch('existingAttachments');
  const newAttachments = watch('newAttachments');
  const { contactMeans } = watch();

  const onRichTextChange = (val) => {
    if (quillRef.current?.getEditor()) {
      const editor = quillRef.current.getEditor();
      const length = editor?.getLength();
      setRichText(val);
      setValue('messageBody', sanitized(length > 1 ? val : undefined), { shouldDirty: true });
      setValue('messageBodyPlaintext', quillRef.current.getEditor().getText());
      trigger('messageBody');
    }
  };

  useEffect(() => {
    errand.attachments;
    setFilteredAttachments(
      errand.attachments?.filter((a) => !fields.map((f) => (f as Attachment).name).includes(a.name))
    );
  }, [existingAttachments]);

  useEffect(() => {
    if (contactMeans === 'sms') {
      setValue('newPhoneNumber', getOwnerStakeholder(errand)?.phoneNumbers?.[0]?.value || '+46');
    }
    setTimeout(() => {
      props.setUnsaved(false);
    }, 0);
  }, [contactMeans]);

  const defaultSignature = () => {
    return t('messages:templates.case_data_default_signature', {
      user: errand.administratorName,
      department: isMEX()
        ? 'Stadsbyggnadskontoret<br>Mark- och exploateringsavdelningen'
        : isPT()
        ? 'Gatuavdelningen, Trafiksektionen'
        : null,
    });
  };

  useEffect(() => {
    setReplying(!!props.message?.messageId);
    setValue('messageTemplate', '');
    if (props.message) {
      const replyTo = props.message?.emailHeaders.find((h) => h.header === 'MESSAGE_ID')?.values[0];
      const references = props.message?.emailHeaders.find((h) => h.header === 'REFERENCES')?.values || [];
      references.push(replyTo);
      setValue('headerReplyTo', replyTo);
      setValue('headerReferences', references.join(','));
      setValue('emails', [{ value: props.message.email }]);
      setValue('contactMeans', props.message.messageType === 'WEBMESSAGE' ? 'webmessage' : 'email');
      const historyHeader = `<br><br>-----Ursprungligt meddelande-----<br>Från: ${props.message.email}<br>Skickat: ${props.message.sent}<br>Till: Sundsvalls kommun<br>Ämne: ${props.message.subject}<br><br>`;
      setRichText(defaultSignature() + historyHeader + props.message.message);
      trigger();
    } else {
      setRichText(defaultSignature());
      setValue('headerReplyTo', '');
      setValue('headerReferences', '');
      setValue('contactMeans', !!errand.externalCaseId ? 'webmessage' : 'email');
    }
  }, [props.message, errand]);

  const changeTemplate = (inTemplateValue: string) => {
    if (inTemplateValue === 'mex-feedbackPrio') {
      setRichText(
        t('messages:templates.email.MEX.priority') +
          defaultSignature() +
          t('messages:templates.email.MEX.public_documents')
      );
    } else if (inTemplateValue === 'mex-feedbackNormal') {
      setRichText(
        t('messages:templates.email.MEX.normal') +
          defaultSignature() +
          t('messages:templates.email.MEX.public_documents')
      );
    } else if (inTemplateValue === 'mex-additionalInformation') {
      setRichText(t('messages:templates.email.MEX.additional_information') + defaultSignature());
    } else if (inTemplateValue === 'mex-internalReferralBuildingPermit') {
      setRichText(t('messages:templates.email.MEX.internal_referral_building_permit') + defaultSignature());
    } else if (inTemplateValue === 'mex-internalReferralWire') {
      setRichText(t('messages:templates.email.MEX.internal_referral_wire') + defaultSignature());
    } else if (inTemplateValue === 'mex-internalReferralWireCheck') {
      setRichText(t('messages:templates.email.MEX.internal_referral_wire_check') + defaultSignature());
    } else {
      setRichText(t('messages:templates.email.default') + defaultSignature());
    }
  };

  return (
    <>
      <MessageWrapper label="Nytt meddelande" closeHandler={clearAndClose} show={props.show}>
        <div className="my-md py-8 px-40 flex flex-col gap-12 ">
          <Input type="hidden" {...register('headerReplyTo')} />
          <Input type="hidden" {...register('headerReferences')} />

          {!replying ? (
            <fieldset className="flex mt-8 gap-lg justify-start items-start w-full" data-cy="radio-button-group">
              <legend className="text-md my-sm">
                <strong>Kontaktväg</strong>
              </legend>
              <RadioButton
                tabIndex={props.show ? 0 : -1}
                data-cy="useEmail-radiobutton-true"
                size="lg"
                className="mr-sm"
                name="useEmail"
                id="useEmail"
                value={'email'}
                defaultChecked={!errand.externalCaseId}
                {...register('contactMeans')}
              >
                E-post
              </RadioButton>
              <RadioButton
                tabIndex={props.show ? 0 : -1}
                data-cy="useSms-radiobutton-true"
                size="lg"
                className="mr-sm"
                name="useSms"
                id="useSms"
                value={'sms'}
                defaultChecked={false}
                {...register('contactMeans')}
              >
                SMS
              </RadioButton>
              {!!errand.externalCaseId && (
                <RadioButton
                  tabIndex={props.show ? 0 : -1}
                  data-cy="useWebMessage-radiobutton-true"
                  size="lg"
                  className="mr-sm"
                  name="useWebMessage"
                  id="useWebMessage"
                  value={'webmessage'}
                  defaultChecked={!!errand.externalCaseId}
                  {...register('contactMeans')}
                >
                  E-tjänst
                </RadioButton>
              )}
            </fieldset>
          ) : null}

          <FormControl className="w-full my-12" size="sm" id="messageTemplate">
            <FormLabel>Välj meddelandemall</FormLabel>
            <Select
              tabIndex={props.show ? 0 : -1}
              {...register('messageTemplate')}
              className="w-full text-dark-primary"
              variant="tertiary"
              size="sm"
              onChange={(e) => {
                changeTemplate(e.currentTarget.value);
              }}
              data-cy="messageTemplate"
            >
              <Select.Option value="">Välj mall</Select.Option>
              {isMEX() ? (
                <>
                  <Select.Option value="mex-feedbackPrio">Återkoppling – Prio</Select.Option>
                  <Select.Option value="mex-feedbackNormal">Återkoppling – Normal prio</Select.Option>
                  <Select.Option value="mex-additionalInformation">Begära in kompletterande uppgifter</Select.Option>
                  <Select.Option value="mex-internalReferralBuildingPermit">Internremiss bygglov</Select.Option>
                  <Select.Option value="mex-internalReferralWire">Internremiss ledningar</Select.Option>
                  <Select.Option value="mex-internalReferralWireCheck">Ledningskoll - hänvisning</Select.Option>
                </>
              ) : isPT() ? (
                <>
                  <Select.Option value="pt-grundmall">Grundmall</Select.Option>
                </>
              ) : null}
            </Select>
          </FormControl>

          {props.show ? (
            <FormControl id="message-body" className="w-full">
              <FormLabel>Ditt meddelande</FormLabel>
              <Input data-cy="message-body-input" type="hidden" {...register('messageBody')} />
              <Input data-cy="message-body-input" type="hidden" {...register('messageBodyPlaintext')} />
              <div className={cx(`h-[28rem] mb-12`)} data-cy="decision-richtext-wrapper">
                <RichTextEditor
                  ref={quillRef}
                  value={richText}
                  isMaximizable={false}
                  errors={!!errors.messageBody}
                  toggleModal={() => {}}
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
            </FormControl>
          ) : null}
          {contactMeans === 'email' ? (
            <>
              <FormControl id="messageEmail" className="w-full">
                <CommonNestedEmailArrayV2
                  errand={errand}
                  disabled={isErrandLocked(errand)}
                  data-cy="email-input"
                  key={`nested-email-array`}
                  {...{ control, register, errors, watch, setValue, trigger, reset, getValues }}
                />
              </FormControl>

              {errors?.emails ? (
                <div className="text-error">
                  <FormErrorMessage>{errors?.emails?.message}</FormErrorMessage>
                </div>
              ) : null}
            </>
          ) : contactMeans === 'sms' ? (
            <>
              <FormControl id="phoneNumbers" className="w-full mb-16">
                <CommonNestedPhoneArrayV2
                  disabled={isErrandLocked(errand)}
                  data-cy="newPhoneNumber"
                  required
                  error={!!formState.errors.phoneNumbers}
                  key={`nested-phone-array`}
                  {...{ control, register, errors, watch, setValue, trigger }}
                />
              </FormControl>

              {errors?.newPhoneNumber && (
                <div className="my-sm text-error">
                  <FormErrorMessage data-cy="messagePhone-error">{errors?.newPhoneNumber?.message}</FormErrorMessage>
                </div>
              )}
            </>
          ) : null}

          {contactMeans === 'email' || contactMeans === 'webmessage' ? (
            <>
              {contactMeans === 'webmessage'
                ? errand.stakeholders
                    .filter((o) => o.roles.indexOf(Role.APPLICANT) !== -1)
                    .map((filteredOwner, idx) => (
                      <div key={`owner-${idx}`}>
                        <FormLabel>Mottagare:</FormLabel> {filteredOwner.firstName} {filteredOwner.lastName}
                      </div>
                    ))
                : null}
              <FormControl id="addExisting" className="w-full">
                <FormLabel>Bilagor från ärendet</FormLabel>
                <div className="flex gap-16">
                  {/* <Input type="hidden" {...register('addExisting')} /> */}
                  <Select
                    tabIndex={props.show ? 0 : -1}
                    {...register('addExisting')}
                    className="w-full"
                    placeholder="Välj bilaga"
                    onChange={(r) => {
                      setValue('addExisting', r.currentTarget.value);
                    }}
                    value={getValues('addExisting')}
                    data-cy="select-errand-attachment"
                  >
                    <Select.Option value="">Välj bilaga</Select.Option>
                    {errand.attachments
                      ?.filter((a) => !fields.map((f) => (f as Attachment).name).includes(a.name))
                      .map((att, idx) => {
                        const label = `${getAttachmentLabel(att)}: ${att.name}`;
                        return (
                          <Select.Option
                            value={att.name}
                            key={`attachmentId-${idx}`}
                            className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                          >
                            {label}
                          </Select.Option>
                        );
                      })}
                  </Select>
                  <Button
                    tabIndex={props.show ? 0 : -1}
                    type="button"
                    variant="tertiary"
                    disabled={!addExisting}
                    onClick={(e) => {
                      e.preventDefault();
                      if (addExisting) {
                        const att = errand.attachments.find((a) => a.name === addExisting);
                        append(att);
                        setValue(`addExisting`, undefined);
                      }
                    }}
                    className="rounded"
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
              {fields.length > 0 ? (
                <div className="flex items-center w-full flex-wrap justify-start gap-md">
                  {fields.map((field, k) => {
                    const att = field as Attachment;
                    return (
                      <div key={`${att?.id}-${k}`}>
                        <Chip
                          aria-label={`Ta bort bilaga ${att.name}`}
                          key={field.id}
                          onClick={() => {
                            remove(k);
                          }}
                        >
                          {getAttachmentLabel(att)}: {att.name}
                        </Chip>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {props.show ? (
                <div className="flex mb-24 mt-8">
                  <Button
                    variant="tertiary"
                    color="primary"
                    leftIcon={<LucideIcon name="paperclip" />}
                    onClick={() => setIsAttachmentModalOpen(true)}
                    data-cy="add-attachment-button-email"
                  >
                    Bifoga fil
                  </Button>
                </div>
              ) : null}

              {messageAttachments.length > 0 ? (
                <>
                  <strong className="text-md">Bifogade filer</strong>
                  <div className="flex flex-col items-center w-full gap-8 mt-8 pb-8">
                    {messageAttachments.map((attachment, index) => {
                      return (
                        <div
                          key={'attachment-' + index}
                          className="flex w-full border-1 rounded-16 px-12 py-8 border-divider justify-between"
                        >
                          <div className="flex w-5/6 gap-10">
                            <div className="bg-vattjom-surface-accent pt-4 pb-0 px-4 rounded self-center">
                              <LucideIcon name="file" size={25} />
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
                              <LucideIcon name="x" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          <div className="flex justify-start gap-lg">
            <Button
              key="cancelButton"
              type="button"
              variant="tertiary"
              onClick={abortHandler}
              tabIndex={props.show ? 0 : -1}
            >
              Avbryt
            </Button>
            <Button
              tabIndex={props.show ? 0 : -1}
              data-cy="send-message-button"
              type="button"
              loading={isLoading}
              loadingText="Skickar meddelande"
              onClick={handleSubmit(
                () => {
                  return submitConfirm
                    .showConfirmation('Skicka', 'Vill du skicka meddelandet?', 'Ja', 'Nej', 'info', 'info')
                    .then((confirmed) => {
                      if (confirmed) {
                        onSubmit(getValues());
                      }
                      return confirmed ? () => true : () => {};
                    });
                },
                () => {}
              )}
              variant="primary"
              color="primary"
              disabled={isLoading || !formState.isValid || !allowed}
              leftIcon={isLoading ? <Spinner size={2} className="mr-sm" /> : null}
            >
              Skicka meddelande
            </Button>
          </div>
          {error && <FormErrorMessage>Något gick fel när meddelandet sparades.</FormErrorMessage>}
        </div>
      </MessageWrapper>

      <Modal show={isAttachmentModalOpen} onClose={closeAttachmentModal} label="Ladda upp bilaga" className="w-[40rem]">
        <Modal.Content>
          <FormControl id="newAttachments" className="w-full">
            <FormLabel className="flex-grow"></FormLabel>
            <FileUpload
              editing={false}
              fieldName="newAttachments"
              fields={newAttachmentsFields}
              uniqueFileUploaderKey="message-tab"
              items={newAttachments}
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
              append={appendNewAttachment}
              remove={removeNewAttachment}
              allowMultiple={true}
              accept={ACCEPTED_UPLOAD_FILETYPES}
              dragDrop={false}
            />
          </FormControl>
        </Modal.Content>

        <Modal.Footer>
          <Button
            className="w-full"
            disabled={!newAttachments.length}
            onClick={() => {
              newAttachmentsFields.forEach((field) => {
                appendMessageAttachment(field);
              });

              closeAttachmentModal();
            }}
            data-cy="upload-button"
          >
            Ladda upp
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
