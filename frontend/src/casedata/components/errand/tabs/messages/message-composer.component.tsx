'use client';

import { Attachment } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Role } from '@casedata/interfaces/role';
import { ACCEPTED_UPLOAD_FILETYPES, getAttachmentLabel } from '@casedata/services/casedata-attachment-service';
import { getOrCreateConversationId, sendConversationMessage } from '@casedata/services/casedata-conversation-service';
import { isErrandLocked, setErrandStatus, validateAction } from '@casedata/services/casedata-errand-service';
import {
  MessageNode,
  renderMessageWithTemplates,
  sendMessage,
  sendSms,
} from '@casedata/services/casedata-message-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { MessageWrapper } from '@common/components/message/message-wrapper.component';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { isMEX, isPT } from '@common/services/application-service';
import {
  invalidPhoneMessage,
  phonePattern,
  supportManagementPhonePatternOrCountryCode,
} from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
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
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Resolver, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export interface CasedataMessageTabFormModel {
  contactMeans: 'email' | 'sms' | 'webmessage' | 'digitalmail' | 'paper' | 'draken' | 'minasidor';
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
      is: (val: string) => val === 'email',
      then: (schema) =>
        schema
          .of(
            yup.object().shape({
              value: yup.string().email('E-postadress har fel format'),
            })
          )
          .min(1, 'Ange minst en E-postadress'),
      otherwise: (schema) => schema,
    }),
    newEmail: yup.string().when('contactMeans', {
      is: (means: string) => means === 'email',
      then: (schema) => schema.email('E-postadressen har fel format'),
      otherwise: (schema) => schema,
    }),
    phoneNumbers: yup.array().when('contactMeans', {
      is: (means: string) => means === 'sms',
      then: (schema) =>
        schema
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
      otherwise: (schema) => schema,
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
  message?: MessageNode;
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
  const [replying, setReplying] = useState(false);
  const [typeOfMessage, setTypeOfMessage] = useState<string>('newMessage');

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
    resolver: yupResolver(formSchema) as unknown as Resolver<CasedataMessageTabFormModel>,
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
      setValue('messageBody', defaultSignature(), { shouldDirty: false });
      setValue('messageBodyPlaintext', defaultSignature(), { shouldDirty: false });
      setValue('emails', [], { shouldDirty: false });
      removeNewAttachment();
      setRichText(defaultSignature());
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

    if (data.contactMeans === 'draken' || data.contactMeans === 'minasidor') {
      const conversationId = await getOrCreateConversationId(
        municipalityId,
        errand,
        contactMeans,
        props?.message?.conversationId
      );

      sendConversationMessage(
        municipalityId,
        errand.id,
        conversationId,
        data.messageBody,
        data.messageAttachments.map((a) => a.file).filter((f): f is FileList => !!f)
      )
        .then(() => {
          toastMessage(
            getToastOptions({
              message: `Meddelandet skickades`,
              status: 'success',
            })
          );
          setIsLoading(false);
          props.update();
          clearAndClose();
        })
        .catch((e) => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `Något gick fel när meddelandet skickades`,
            status: 'error',
          });
          console.error('Något gick fel när meddelandet skickades', e);
          setError(true);
          setIsLoading(false);
          return;
        });
    } else {
      apiCall(municipalityId, errand, data)
        .then(() => {
          toastMessage(
            getToastOptions({
              message: `${
                data.contactMeans === 'sms'
                  ? 'SMS:et'
                  : data.contactMeans === 'email'
                  ? 'E-postmeddelandet'
                  : 'Meddelandet'
              } skickades`,
              status: 'success',
            })
          );
          setIsLoading(false);
          props.update();
          clearAndClose();
        })
        .catch((e) => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `Något gick fel när ${
              data.contactMeans === 'sms'
                ? 'SMS:et'
                : data.contactMeans === 'email'
                ? 'e-postmeddelandet'
                : 'meddelandet'
            } skickades`,
            status: 'error',
          });
          setError(true);
          setIsLoading(false);
          return;
        });
    }
    if (
      errand.status.statusType !== ErrandStatus.VantarPaKomplettering &&
      errand.status.statusType !== ErrandStatus.InterntAterkoppling
    ) {
      if (typeOfMessage === 'infoCompletion') {
        await setErrandStatus(errand.id, municipalityId, ErrandStatus.VantarPaKomplettering, null, null);
      } else if (typeOfMessage === 'internalCompletion') {
        await setErrandStatus(errand.id, municipalityId, ErrandStatus.InterntAterkoppling, null, null);
      }
    }
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

  const onRichTextChange = (delta, oldDelta, source) => {
    if (source === 'api') {
      return;
    }
    setValue('messageBody', sanitized(delta.ops[0].retain > 1 ? quillRef.current.root.innerHTML : undefined), {
      shouldDirty: true,
    });
    setValue('messageBodyPlaintext', quillRef.current.getText(), { shouldDirty: true });
    trigger('messageBody');
  };

  useEffect(() => {
    if (contactMeans === 'sms') {
      setValue('newPhoneNumber', getOwnerStakeholder(errand)?.phoneNumbers?.[0]?.value || '+46');
    }
    setRichText(defaultSignature());
    quillRef.current?.clipboard?.dangerouslyPasteHTML(defaultSignature());
    setTimeout(() => {
      props.setUnsaved(false);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactMeans]);

  const defaultSignature = () => {
    if (getValues('contactMeans') === 'draken' || getValues('contactMeans') === 'minasidor') {
      return t('messages:templates.conversation_default_signature', { user: user.firstName + ' ' + user.lastName });
    }
    return t('messages:templates.case_data_default_signature', {
      user: errand.administratorName,
      department: isMEX()
        ? 'Stadsbyggnadskontoret<br>Mark- och exploateringsavdelningen'
        : isPT()
        ? 'Gatuavdelningen, Trafiksektionen'
        : null,
      interpolation: { escapeValue: false },
    });
  };

  useEffect(() => {
    setReplying(!!props.message?.messageId);
    setValue('messageTemplate', '');
    if (props.message) {
      const replyTo = props.message?.emailHeaders?.find((h) => h.header === 'MESSAGE_ID')?.values[0];
      const references = props.message?.emailHeaders?.find((h) => h.header === 'REFERENCES')?.values || [];
      references.push(replyTo);
      setValue('headerReplyTo', replyTo);
      setValue('headerReferences', references.join(','));
      setValue(
        'emails',
        props.message.direction === 'OUTBOUND'
          ? props.message?.recipients?.map((email) => ({
              value: email,
            }))
          : [{ value: props.message.email }]
      );
      setValue(
        'contactMeans',
        props.message.messageType === 'WEBMESSAGE'
          ? 'webmessage'
          : props.message.messageType === 'DRAKEN'
          ? 'draken'
          : props.message.messageType === 'MINASIDOR'
          ? 'minasidor'
          : 'email'
      );
      const historyHeader = `<br><br>-----Ursprungligt meddelande-----<br>Från: ${
        !!props.message?.conversationId ? props.message?.firstName + ' ' + props.message?.lastName : props.message.email
      }<br>Skickat: ${props.message.sent}<br>Till: Sundsvalls kommun<br>Ämne: ${props.message.subject}<br><br>`;
      setRichText(defaultSignature() + historyHeader + props.message.message);
      trigger();
    } else {
      setRichText(defaultSignature());
      setValue('headerReplyTo', '');
      setValue('headerReferences', '');
      setValue('contactMeans', !!errand.externalCaseId ? 'webmessage' : 'email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } else if (inTemplateValue === 'mex-treeRemovalRequestRejection') {
      setRichText(t('messages:templates.email.MEX.tree_removal_request_rejection') + defaultSignature());
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
              <RadioButton.Group inline>
                <RadioButton
                  tabIndex={props.show ? 0 : -1}
                  data-cy="useEmail-radiobutton-true"
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
                    className="mr-sm"
                    name="useWebMessage"
                    id="useWebMessage"
                    value={'webmessage'}
                    defaultChecked={!!errand.externalCaseId}
                    {...register('contactMeans')}
                  >
                    E-tjänst Intern
                  </RadioButton>
                )}
                {!!getOwnerStakeholder(errand)?.personalNumber && (
                  <RadioButton
                    tabIndex={props.show ? 0 : -1}
                    data-cy="useMinaSidor-radiobutton-true"
                    className="mr-sm"
                    name="useMinaSidor"
                    id="useMinaSidor"
                    value={'minasidor'}
                    defaultChecked={!!errand.externalCaseId}
                    {...register('contactMeans')}
                  >
                    Mina sidor
                  </RadioButton>
                )}
              </RadioButton.Group>
            </fieldset>
          ) : null}

          <div className="w-full pt-16">
            <strong className="text-md">Typ av meddelande</strong>
            <RadioButton.Group data-cy="message-type-radio-button-group" className="mt-sm !gap-4">
              <RadioButton
                disabled={isLoading || !allowed}
                name="useNewMessage"
                id="useNewMessage"
                value="newMessage"
                checked={typeOfMessage === 'newMessage'}
                onChange={(e) => setTypeOfMessage(e.target.value)}
              >
                Nytt meddelande
              </RadioButton>
              <RadioButton
                disabled={isLoading || !allowed}
                name="useInfoCompletion"
                id="useInfoCompletion"
                value="infoCompletion"
                checked={typeOfMessage === 'infoCompletion'}
                onChange={(e) => setTypeOfMessage(e.target.value)}
              >
                Begär komplettering
              </RadioButton>
              <RadioButton
                disabled={isLoading || !allowed}
                name="useInternalCompletion"
                id="useInternalCompletion"
                value="internalCompletion"
                checked={typeOfMessage === 'internalCompletion'}
                onChange={(e) => setTypeOfMessage(e.target.value)}
              >
                Begär intern återkoppling
              </RadioButton>
            </RadioButton.Group>
          </div>

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
                  <Select.Option value="mex-treeRemovalRequestRejection">Träd - nekande svar</Select.Option>
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
                <TextEditor
                  className={cx(`mb-md h-[80%]`)}
                  key={richText}
                  ref={quillRef}
                  defaultValue={richText}
                  onTextChange={(delta, oldDelta, source) => {
                    props.setUnsaved(true);
                    return onRichTextChange(delta, oldDelta, source);
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

          {contactMeans === 'email' ||
          contactMeans === 'webmessage' ||
          contactMeans === 'draken' ||
          contactMeans === 'minasidor' ? (
            <>
              {contactMeans === 'webmessage' || contactMeans === 'minasidor'
                ? errand.stakeholders
                    .filter((o) => o.roles.indexOf(Role.APPLICANT) !== -1)
                    .map((filteredOwner, idx) => (
                      <div key={`owner-${idx}`}>
                        <FormLabel>Mottagare:</FormLabel> {filteredOwner.firstName} {filteredOwner.lastName}
                      </div>
                    ))
                : null}
              {contactMeans === 'email' || contactMeans === 'webmessage' ? (
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
              ) : null}
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
              onClick={handleSubmit(() => {
                onSubmit(getValues());
              })}
              variant="primary"
              color="primary"
              disabled={isLoading || !formState.isValid || !allowed}
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
