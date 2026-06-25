'use client';

import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import TextEditor from '@common/components/dynamic-text-editor';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { useMessageBodyTemplateState } from '@common/hooks/use-message-body-template-state';
import { isKA, isKC, isLOP } from '@common/services/application-service';
import { invalidPhoneMessage, supportManagementPhonePattern } from '@common/services/helper-service';
import {
  buildMessageTemplateBody,
  getDefaultMessageBody,
  getDefaultTemplateId,
  getTemplateOptions,
  MessageContactMeans,
  removeEmailInformation,
} from '@common/services/message-template-body-service';
import { getAllRelatedErrands, RelationWithErrandNumber } from '@common/services/relations-service';
import sanitized from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Chip,
  cx,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  Input,
  Modal,
  RadioButton,
  Select,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { useMessageTemplates } from '@supportmanagement/hooks/useMessageTemplates';
import {
  ACCEPTED_UPLOAD_FILETYPES,
  getSupportAttachment,
  SingleSupportAttachment,
  SupportAttachment,
} from '@supportmanagement/services/support-attachment-service';
import {
  getOrCreateSupportConversationId,
  sendSupportConversationMessage,
} from '@supportmanagement/services/support-conversation-service';
import {
  Channels,
  ExternalIdType,
  getSupportErrandById,
  isSupportErrandLocked,
  setSupportErrandStatus,
  Status,
} from '@supportmanagement/services/support-errand-service';
import { buildSupportReplyContext } from '@supportmanagement/services/support-message-reply-context-service';
import { Message, MessageRequest, sendMessage } from '@supportmanagement/services/support-message-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { File, Paperclip, X } from 'lucide-react';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import { Resolver, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';

export interface SupportMessageFormModel {
  id: string;
  messageContact: boolean;
  contactMeans: MessageContactMeans;
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
  messageTemplate?: string;
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
        is: (emails: any[], means: string) => (!emails || emails.length === 0) && means === 'email',
        then: (schema) => schema.min(1, 'Ange minst en e-postadress').required('Ange minst en e-postadress'),
        otherwise: (schema) => schema,
      }),
    emails: yup.array().when('contactMeans', {
      is: (means: string) => means === 'email',
      then: (schema) =>
        schema
          .of(
            yup.object().shape({
              value: yup.string().email('E-postadress har fel format'),
            })
          )
          .min(1, 'Ange minst en e-postadress')
          .required('Ange minst en e-postadress'),
      otherwise: (schema) => schema,
    }),
    newPhoneNumber: yup.string(),
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
                .matches(supportManagementPhonePattern, invalidPhoneMessage),
            })
          )
          .min(1, 'Ange minst ett telefonnummer')
          .required('Ange minst ett telefonnummer'),
      otherwise: (schema) => schema,
    }),
    messageBody: yup.string().required('Meddelandetext måste anges'),
    messageBodyPlaintext: yup.string(),
    newMessageAttachment: yup.array(),
    messageAttachments: yup.array(),
    headerReplyTo: yup.string(),
    headerReferences: yup.string(),
    existingAttachments: yup.array(),
    messageTemplate: yup.string(),
  })
  .required();

export const SupportMessageForm: FC<{
  locked?: boolean;
  prefillPhone?: string;
  prefillEmail?: string;
  showMessageForm: boolean;
  message: Message;
  setShowMessageForm: Dispatch<SetStateAction<boolean>>;
  setUnsaved?: (unsaved: boolean) => void;
  update?: () => void;
}> = (props) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const user = useUserStore((s) => s.user);
  const _supportErrand = useSupportStore((s) => s.supportErrand);
  const _supportAttachments = useSupportStore((s) => s.supportAttachments);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const supportErrand = _supportErrand!;
  const supportAttachments = _supportAttachments ?? [];

  const toastMessage = useSnackbar();
  const [isSending, setIsSending] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [replying, setReplying] = useState(false);
  const [typeOfMessage, setTypeOfMessage] = useState<string>('newMessage');
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState<boolean>(false);
  const [selectedRelationId, setSelectedRelationId] = useState<string>('');
  const [relationErrands, setRelationErrands] = useState<RelationWithErrandNumber[]>([]);
  const {
    bodyEdited,
    lastAppliedTemplateRef,
    replyHistoryRef,
    setBodyEditedState,
    shouldSkipAutoApply,
    markAutoApplied,
  } = useMessageBodyTemplateState();

  const confirm = useConfirm();

  const { templates } = useMessageTemplates(user, props.showMessageForm);

  const emailBody = buildMessageTemplateBody({
    templates,
    templateId: getDefaultTemplateId(templates, 'email'),
    means: 'email',
  });
  const smsBody = buildMessageTemplateBody({
    templates,
    templateId: getDefaultTemplateId(templates, 'sms'),
    means: 'sms',
  });
  const internalSignature = getDefaultMessageBody(templates, 'draken');

  const closeAttachmentModal = () => {
    setIsAttachmentModalOpen(false);
  };

  const formControls = useForm<SupportMessageFormModel>({
    defaultValues: {
      id: supportErrand.id,
      messageContact: true,
      contactMeans:
        (Channels as Record<string, string>)[supportErrand.channel!] === Channels.ESERVICE ||
        (Channels as Record<string, string>)[supportErrand.channel!] === Channels.ESERVICE_INTERNAL
          ? 'webmessage'
          : ('email' as MessageContactMeans),
      newEmail: '',
      newPhoneNumber: '',
      emails: [],
      phoneNumbers: [],
      messageBody: '',
      messageBodyPlaintext: '',
      messageAttachments: [],
      newMessageAttachments: [],
      headerReplyTo: '',
      headerReferences: '',
      addExisting: '',
      existingAttachments: [],
    },
    resolver: yupResolver(formSchema) as unknown as Resolver<SupportMessageFormModel>,
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

  const {
    contactMeans,
    messageAttachments,
    newMessageAttachments,
    addExisting,
    existingAttachments,
    messageBody,
    messageBodyPlaintext,
    messageTemplate,
  } = watch();

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

  const getSingleSupportAttachment = (attachment: SupportAttachment) => {
    getSupportAttachment(supportErrand?.id!, municipalityId, attachment).then((res) => {
      appendExistingAttachment(res);
    });
  };

  const onSubmit: () => void = async () => {
    setIsSending(true);
    setMessageError(false);
    const data = getValues();

    let sendPromise: Promise<any>;

    if (contactMeans === 'draken' || contactMeans === 'minasidor') {
      const conversationId = await getOrCreateSupportConversationId(
        municipalityId,
        supportErrand,
        contactMeans,
        selectedRelationId,
        relationErrands,
        props?.message?.conversationId ?? ''
      );

      sendPromise = sendSupportConversationMessage(
        municipalityId,
        supportErrand.id!,
        conversationId,
        data.messageBody,
        data.messageAttachments as { file: File }[],
        existingAttachments
      );
    } else {
      const messageData: MessageRequest = {
        municipalityId: municipalityId,
        errandId: supportErrand.id!,
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
        ...((contactMeans === 'email' || contactMeans === 'webmessage') && { attachments: messageAttachments }),
        ...((contactMeans === 'email' || contactMeans === 'webmessage') && {
          existingAttachments: existingAttachments,
        }),
      };
      if (isKC() || isKA()) {
        messageData.senderName = appConfig.applicationName as string;
      }
      sendPromise = sendMessage(messageData).then(async (success) => {
        if (!success) {
          throw new Error('');
        }
        return true;
      });
    }

    sendPromise
      .then(async () => {
        props.setShowMessageForm(false);
        setValue('messageBody', emailBody);

        if (typeOfMessage === 'infoCompletion') {
          await setSupportErrandStatus(supportErrand.id!, municipalityId, Status.PENDING);
        } else if (typeOfMessage === 'internalCompletion') {
          await setSupportErrandStatus(supportErrand.id!, municipalityId, Status.AWAITING_INTERNAL_RESPONSE);
        }

        const updated = await getSupportErrandById(supportErrand.id!, municipalityId);
        setSupportErrand(updated.errand);

        toastMessage(
          getToastOptions({
            message:
              data.emails.length > 1 || data.phoneNumbers.length > 1
                ? 'Dina meddelanden skickades'
                : 'Ditt meddelande skickades',
            status: 'success',
          })
        );
      })
      .catch((e) => {
        console.error(e);
        setIsSending(false);
        setMessageError(true);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när meddelandet skulle skickas',
          status: 'error',
        });
      })
      .finally(() => {
        props.setUnsaved?.(false);
        setIsSending(false);
        reset();
        clearErrors();
      });
  };

  // Reply setup and new-message defaults. Headers, recipients and the selected template are
  // synced unconditionally so the UI matches the current scenario; only the body is preserved
  // when the user has already typed for this same scenario (so a late template load does not
  // wipe their text).
  useEffect(() => {
    setReplying(!!props?.message?.communicationID);

    if (props.message) {
      const replyContext = buildSupportReplyContext(props.message);
      if (replyContext.contactMeans !== contactMeans) {
        setValue('contactMeans', replyContext.contactMeans);
      }
      setValue('headerReplyTo', replyContext.headerReplyTo);
      setValue('headerReferences', replyContext.headerReferences);
      setValue('emails', replyContext.recipients);

      replyHistoryRef.current = replyContext.historyHtml;

      const defaultId = getDefaultTemplateId(templates, replyContext.contactMeans);
      setValue('messageTemplate', defaultId);
      lastAppliedTemplateRef.current = defaultId;

      if (!shouldSkipAutoApply(replyContext.setupKey)) {
        setValue(
          'messageBody',
          buildMessageTemplateBody({
            templates,
            templateId: defaultId,
            means: replyContext.contactMeans,
            history: replyContext.historyHtml,
          })
        );
        setBodyEditedState(false);
      }
      markAutoApplied(replyContext.setupKey);
      trigger();
    } else {
      const setupKey = `new:${contactMeans}`;
      const prefillPhone = props.prefillPhone || '';
      if (contactMeans === 'sms') {
        setValue('newPhoneNumber', prefillPhone);
        clearErrors();
      }

      setValue('headerReplyTo', '');
      setValue('headerReferences', '');
      setValue('emails', []);
      setValue('phoneNumbers', []);

      replyHistoryRef.current = '';

      const defaultId = getDefaultTemplateId(templates, contactMeans);
      setValue('messageTemplate', defaultId);
      lastAppliedTemplateRef.current = defaultId;

      if (!shouldSkipAutoApply(setupKey)) {
        let body: string;
        switch (contactMeans) {
          case 'sms':
            body = smsBody;
            break;
          case 'draken':
            body = internalSignature;
            break;
          default:
            body = removeEmailInformation(contactMeans, emailBody);
            break;
        }
        setValue('messageBody', sanitized(body));
        setBodyEditedState(false);
      }
      markAutoApplied(setupKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactMeans, props.message, templates]);

  useEffect(() => {
    getAllRelatedErrands(municipalityId, supportErrand.id!).then(setRelationErrands);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.showMessageForm]);

  useEffect(() => {
    if (contactMeans === 'draken' && relationErrands.length > 0 && !selectedRelationId) {
      setSelectedRelationId(relationErrands[0].otherResourceId);
    }
  }, [relationErrands, contactMeans, selectedRelationId]);

  return (
    <div className="px-40 py-8 gap-24">
      <input type="hidden" {...register('id')} />

      {!replying ? (
        <div className="w-full pt-16">
          <strong className="text-md">Kontaktväg</strong>
          <RadioButton.Group inline data-cy="message-channel-radio-button-group" className="mt-8">
            {appConfig.features.useEmailContactChannel && (
              <RadioButton
                disabled={props.locked}
                data-cy="useEmail-radiobutton-true"
                className="mr-sm mt-4"
                id="useEmail"
                value="email"
                {...register('contactMeans')}
              >
                E-post
              </RadioButton>
            )}
            {appConfig.features.useSmsContactChannel && (
              <RadioButton
                disabled={props.locked}
                data-cy="useSms-radiobutton-true"
                className="mr-sm mt-4"
                id="useSms"
                value="sms"
                {...register('contactMeans')}
              >
                SMS
              </RadioButton>
            )}
            {(Channels as Record<string, string>)[supportErrand.channel!] === Channels.ESERVICE_INTERNAL ? (
              <RadioButton
                disabled={props.locked}
                data-cy="useWebmessage-radiobutton-true"
                className="mr-sm mt-4"
                id="useWebmessage"
                value="webmessage"
                {...register('contactMeans')}
              >
                E-tjänst (intern)
              </RadioButton>
            ) : null}
            {/* Only show webmessage option if errand is from e-service and LOP */}
            {(Channels as Record<string, string>)[supportErrand.channel!] === Channels.ESERVICE && isLOP() ? (
              <RadioButton
                disabled={props.locked}
                data-cy="useWebmessage-radiobutton-true"
                className="mr-sm mt-4"
                id="useWebmessage"
                value="webmessage"
                {...register('contactMeans')}
              >
                E-tjänst (extern)
              </RadioButton>
            ) : null}
            {appConfig.features.useRelations && (
              <RadioButton
                disabled={props.locked}
                data-cy="useDraken-radiobutton-true"
                className="mr-sm mt-4"
                id="useDraken"
                value="draken"
                {...register('contactMeans')}
              >
                Draken
              </RadioButton>
            )}
            {appConfig.features.useMyPages &&
              (getSupportOwnerStakeholder(supportErrand)?.personNumber ||
                ([ExternalIdType.COMPANY, ExternalIdType.ENTERPRISE].includes(
                  getSupportOwnerStakeholder(supportErrand)?.externalIdType as ExternalIdType
                ) &&
                  getSupportOwnerStakeholder(supportErrand)?.externalId)) &&
              (Channels as Record<string, string>)[supportErrand.channel!] !== Channels.ESERVICE_INTERNAL && (
                <RadioButton
                  disabled={props.locked}
                  data-cy="useMinasidor-radiobutton-true"
                  className="mr-sm mt-4"
                  id="useMinasidor"
                  value="minasidor"
                  {...register('contactMeans')}
                >
                  Mina sidor
                </RadioButton>
              )}
          </RadioButton.Group>
        </div>
      ) : null}

      {contactMeans === 'draken' && !replying && (
        <div className="w-full pt-16">
          <strong className="text-md block mb-sm">Välj kopplat ärende</strong>
          {relationErrands.length > 0 ? (
            <Select
              value={selectedRelationId}
              onChange={(e) => {
                const selectedId = e.currentTarget.value;
                setSelectedRelationId(selectedId);
              }}
            >
              {relationErrands.map((item) => (
                <Select.Option key={item.otherResourceId} value={item.otherResourceId}>
                  {item.errandNumber}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <p className="text-error">Koppla ett ärende för att kunna skicka meddelande</p>
          )}
        </div>
      )}

      <div className="w-full pt-16">
        <strong className="text-md">Typ av meddelande</strong>
        <RadioButton.Group data-cy="message-type-radio-button-group" className="mt-sm !gap-4">
          <RadioButton
            disabled={props.locked}
            name="typeOfMessage"
            id="useNewMessage"
            value="newMessage"
            checked={typeOfMessage === 'newMessage'}
            onChange={(e) => setTypeOfMessage(e.target.value)}
          >
            Nytt meddelande
          </RadioButton>
          <RadioButton
            disabled={props.locked}
            name="typeOfMessage"
            id="useInfoCompletion"
            value="infoCompletion"
            checked={typeOfMessage === 'infoCompletion'}
            onChange={(e) => setTypeOfMessage(e.target.value)}
          >
            Begär komplettering
          </RadioButton>
          <RadioButton
            disabled={props.locked}
            name="typeOfMessage"
            id="useInternalCompletion"
            value="internalCompletion"
            checked={typeOfMessage === 'internalCompletion'}
            onChange={(e) => setTypeOfMessage(e.target.value)}
          >
            Begär intern återkoppling
          </RadioButton>
        </RadioButton.Group>
      </div>
      {templates && (contactMeans === 'email' || contactMeans === 'sms') && (
        <FormControl className="w-full my-12" size="sm" id="messageTemplate">
          <FormLabel>Välj meddelandemall</FormLabel>
          <Select
            {...register('messageTemplate')}
            className="w-full text-dark-primary"
            size="sm"
            value={messageTemplate ?? ''}
            onChange={(e) => {
              const templateId = e.currentTarget.value;
              const apply = () => {
                setValue('messageTemplate', templateId);
                const history = replyHistoryRef.current;
                if (templateId) {
                  const templateBody = buildMessageTemplateBody({
                    templates,
                    templateId,
                    means: contactMeans,
                  });
                  setValue('messageBody', sanitized(templateBody) + history);
                } else {
                  const defaultBody = contactMeans === 'sms' ? smsBody : emailBody;
                  setValue('messageBody', sanitized(defaultBody) + history);
                }
                lastAppliedTemplateRef.current = templateId;
                setBodyEditedState(false);
              };

              if (bodyEdited) {
                confirm
                  .showConfirmation(
                    'Skriv över texten?',
                    'Att byta mall ersätter den text du har skrivit. Vill du fortsätta?',
                    'Ja, skriv över',
                    'Avbryt',
                    'info',
                    'info'
                  )
                  .then((confirmed) => {
                    if (confirmed) {
                      apply();
                    } else {
                      setValue('messageTemplate', lastAppliedTemplateRef.current);
                    }
                  });
              } else {
                apply();
              }
            }}
          >
            {getTemplateOptions(templates, contactMeans).map((t) => (
              <Select.Option key={t.identifier} value={t.identifier}>
                {t.name}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      )}
      <div className="flex mt-24">
        <div className="w-full">
          <strong>Ditt meddelande</strong>
          <Input type="hidden" {...register('headerReplyTo')} />
          <Input type="hidden" {...register('headerReferences')} />
          <Input data-cy="message-body-input" type="hidden" {...register('messageBody')} />
          <Input data-cy="message-body-input" type="hidden" {...register('messageBodyPlaintext')} />
          <div className={cx(`h-[26rem] mb-16`)} data-cy="decision-richtext-wrapper">
            <TextEditor
              className={cx(`mb-md h-[80%]`)}
              readOnly={props.locked}
              value={{ plainText: messageBodyPlaintext ?? '', markup: messageBody ?? '' }}
              onChange={(e) => {
                setValue('messageBody', e.target.value.markup ?? '');
                setValue('messageBodyPlaintext', e.target.value.plainText ?? '');
                trigger('messageBody');
              }}
              onTextChange={(_delta, _oldDelta, source) => {
                // Only treat user input as an edit; ignore programmatic / silent updates
                // so setValue() on body does not flag the form as dirty and skip auto-apply.
                if (source === 'user') {
                  setBodyEditedState(true);
                }
              }}
            />
          </div>
          {!!errors.messageBodyPlaintext && (
            <div className="-mt-lg mb-lg">
              <FormErrorMessage className="text-error">{errors.messageBodyPlaintext?.message}</FormErrorMessage>
            </div>
          )}
        </div>
      </div>

      {contactMeans === 'email' ||
      contactMeans === 'webmessage' ||
      contactMeans === 'draken' ||
      contactMeans === 'minasidor' ? (
        <div className="w-full gap-xl mb-lg">
          {contactMeans === 'email' && (
            <CommonNestedEmailArrayV2
              disabled={isSupportErrandLocked(supportErrand)}
              data-cy="email-input"
              key={`nested-email-array`}
              {...{ control, register, errors, watch, setValue, trigger, reset, getValues }}
              errand={supportErrand}
            />
          )}

          {contactMeans === 'email' && errors?.emails ? (
            <div className="text-error">
              <FormErrorMessage>{errors?.emails?.message}</FormErrorMessage>
            </div>
          ) : null}
          {contactMeans === 'webmessage'
            ? (supportErrand.stakeholders ?? [])
                .filter((o) => o.role?.indexOf('PRIMARY') !== -1)
                .map((filteredOwner, idx) => (
                  <div key={`owner-${idx}`}>
                    <FormLabel>Mottagare:</FormLabel> {filteredOwner.firstName} {filteredOwner.lastName}
                  </div>
                ))
            : null}
          <FormControl id="addExisting" className="w-full mt-md">
            <FormLabel>Bilagor från ärendet</FormLabel>
            <div className="flex items-center justify-between">
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
                disabled={!addExisting}
                color="primary"
                onClick={(e) => {
                  e.preventDefault();
                  if (addExisting) {
                    const attachment = supportAttachments.find((a: SupportAttachment) => a.fileName === addExisting);
                    getSingleSupportAttachment(attachment!);
                    setValue(`addExisting`, '');
                  }
                }}
                className="rounded-button ml-16"
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
            <div className="flex items-center w-full flex-wrap justify-start gap-md mt-16">
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
        <div className="w-full gap-xl mb-lg">
          <CommonNestedPhoneArrayV2
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="newPhoneNumber"
            required
            error={!!formState.errors.phoneNumbers}
            key={`nested-phone-array`}
            {...{ control, register, errors, watch, setValue, trigger }}
          />

          {errors?.newPhoneNumber && (
            <div className="my-sm text-error">
              <FormErrorMessage>{errors?.newPhoneNumber?.message}</FormErrorMessage>
            </div>
          )}
        </div>
      ) : null}

      {(!props.locked && contactMeans === 'email') ||
      contactMeans === 'webmessage' ||
      contactMeans === 'draken' ||
      contactMeans === 'minasidor' ? (
        <div className="flex mb-24">
          <Button
            variant="tertiary"
            color="primary"
            leftIcon={<Icon icon={<Paperclip />} />}
            onClick={() => setIsAttachmentModalOpen(true)}
            data-cy="add-attachment-button"
          >
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
                      <Icon icon={<File />} size={25} />
                    </div>
                    <div className="self-center justify-start px-8">
                      {(attachment.file as unknown as FileList)?.[0]?.name}
                    </div>
                  </div>
                  <div>
                    <Button
                      aria-label={`Ta bort ${(attachment.file as unknown as FileList)?.[0]?.name}`}
                      iconButton
                      inverted
                      className="self-end"
                      onClick={() => removeMessageAttachment(index)}
                    >
                      <Icon icon={<X />} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="flex my-md gap-md">
        <Button
          disabled={isSending}
          onClick={() => {
            props.setShowMessageForm(false);
            setValue('messageBody', emailBody);
            props.setUnsaved?.(false);
            setIsSending(false);
            reset();
            clearErrors();
          }}
          variant="secondary"
          color="primary"
        >
          Avbryt
        </Button>
        <Button
          variant="primary"
          color="primary"
          type="button"
          loading={isSending}
          loadingText="Skickar meddelande"
          disabled={isSending || formState.isSubmitting || !formState.isValid}
          onClick={handleSubmit(onSubmit)}
          data-cy="send-message-button"
        >
          Skicka meddelande
        </Button>
      </div>
      <div className="my-sm">
        {messageError && (
          <FormErrorMessage className="text-error">Något gick fel när meddelandet skulle skickas</FormErrorMessage>
        )}
      </div>

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
