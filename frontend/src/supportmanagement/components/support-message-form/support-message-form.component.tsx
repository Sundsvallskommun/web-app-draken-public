'use client';

import { useMessageTemplates } from '@casedata/hooks/useMessageTemplates';
import { ACCEPTED_UPLOAD_FILETYPES } from '@casedata/services/casedata-attachment-service';
import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import CommonNestedPhoneArrayV2 from '@common/components/commonNestedPhoneArrayV2';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { useAppContext } from '@common/contexts/app.context';
import { Relation } from '@common/data-contracts/relations/data-contracts';
import { User } from '@common/interfaces/user';
import { isKA, isKC, isLOP } from '@common/services/application-service';
import { invalidPhoneMessage, supportManagementPhonePattern } from '@common/services/helper-service';
import { getSourceRelations } from '@common/services/relations-service';
import sanitized, { sanitizeHtmlMessageBody } from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Chip,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  Input,
  Modal,
  RadioButton,
  Select,
  cx,
  useSnackbar,
} from '@sk-web-gui/react';
import { getInternalSignature } from '@supportmanagement/services/message-template-service';
import {
  SingleSupportAttachment,
  SupportAttachment,
  getSupportAttachment,
} from '@supportmanagement/services/support-attachment-service';
import {
  getOrCreateSupportConversationId,
  sendSupportConversationMessage,
} from '@supportmanagement/services/support-conversation-service';
import {
  Channels,
  Status,
  SupportErrand,
  getSupportErrandById,
  isSupportErrandLocked,
  setSupportErrandStatus,
} from '@supportmanagement/services/support-errand-service';
import { Message, MessageRequest, sendMessage } from '@supportmanagement/services/support-message-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { File, Paperclip, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Resolver, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { removeEmailInformation } from '../templates/default-message-template';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

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

export const SupportMessageForm: React.FC<{
  locked?: boolean;
  prefillPhone?: string;
  prefillEmail?: string;
  showMessageForm: boolean;
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
    setSupportErrand,
  }: {
    municipalityId: string;
    user: User;
    supportErrand: SupportErrand;
    supportAttachments: SupportAttachment[];
    setSupportErrand: (errand: SupportErrand) => void;
  } = useAppContext();

  const toastMessage = useSnackbar();
  const [isSending, setIsSending] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [replying, setReplying] = useState(false);
  const [typeOfMessage, setTypeOfMessage] = useState<string>('newMessage');
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState<boolean>(false);
  const [selectedRelationId, setSelectedRelationId] = useState<string>('');
  const [relationErrands, setRelationErrands] = useState<Relation[]>([]);

  const [internalSignature, setInternalSignature] = useState<string>('');

  const { templates } = useMessageTemplates(user, props.showMessageForm);

  const emailBody = templates?.byId[`${templates.app}.email.default`]
    ? templates.byId[`${templates.app}.email.default`] + templates.emailSignature
    : '';
  const smsBody = templates?.smsTemplate || '';

  const closeAttachmentModal = () => {
    setIsAttachmentModalOpen(false);
  };

  useEffect(() => {
    if (props.showMessageForm && templates && !internalSignature) {
      getInternalSignature({ user: `${user.firstName} ${user.lastName}` }).then((sig) => {
        setInternalSignature(sig || '');
      });
    }
  }, [props.showMessageForm, templates, internalSignature, user]);

  const formControls = useForm<SupportMessageFormModel>({
    defaultValues: {
      id: supportErrand.id,
      messageContact: true,
      contactMeans:
        Channels[supportErrand.channel] === Channels.ESERVICE ||
        Channels[supportErrand.channel] === Channels.ESERVICE_INTERNAL
          ? 'webmessage'
          : 'email',
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

  useEffect(() => {
    if (templates && emailBody && !props.message) {
      setValue('messageBody', sanitized(emailBody));
      setValue('messageBodyPlaintext', emailBody);
    }
  }, [templates, emailBody, props.message, setValue]);

  const {
    contactMeans,
    messageAttachments,
    newMessageAttachments,
    addExisting,
    existingAttachments,
    messageBody,
    messageBodyPlaintext,
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
    getSupportAttachment(supportErrand?.id, municipalityId, attachment).then((res) => {
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
        props?.message?.conversationId
      );

      sendPromise = sendSupportConversationMessage(
        municipalityId,
        supportErrand.id,
        conversationId,
        data.messageBody,
        data.messageAttachments
      );
    } else {
      const messageData: MessageRequest = {
        municipalityId: municipalityId,
        errandId: supportErrand.id,
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
        messageData.senderName = appConfig.applicationName;
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
          await setSupportErrandStatus(supportErrand.id, municipalityId, Status.PENDING);
        } else if (typeOfMessage === 'internalCompletion') {
          await setSupportErrandStatus(supportErrand.id, municipalityId, Status.AWAITING_INTERNAL_RESPONSE);
        }

        const updated = await getSupportErrandById(supportErrand.id, municipalityId);
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
        props.setUnsaved(false);
        setIsSending(false);
        reset();
        clearErrors();
      });
  };

  useEffect(() => {
    setReplying(!!props?.message?.communicationID);

    if (props.message) {
      setValue(
        'contactMeans',
        props.message.communicationType === 'WEB_MESSAGE'
          ? 'webmessage'
          : props.message.communicationType === 'DRAKEN'
          ? 'draken'
          : props.message.communicationType === 'MINASIDOR'
          ? 'minasidor'
          : 'email'
      );
      const replyTo = props.message?.emailHeaders?.['MESSAGE_ID']?.[0] || '';
      const references = props.message?.emailHeaders?.['REFERENCES'] || [];
      references.push(replyTo);
      setValue('headerReplyTo', replyTo);
      setValue('headerReferences', references.join(','));
      setValue(
        'emails',
        props.message.direction === 'OUTBOUND' ? [{ value: props.message?.target }] : [{ value: props.message.sender }]
      );
      const historyHeader = `<br><br>-----Ursprungligt meddelande-----<br>Från: ${props.message.sender}<br>Skickat: ${props.message.sent}<br>Till: Sundsvalls kommun<br>Ämne: ${props.message.subject}<br><br>`;

      let signature = contactMeans === 'draken' ? internalSignature : removeEmailInformation(contactMeans, emailBody);

      setValue(
        'messageBody',
        signature +
          historyHeader +
          (props.message.htmlMessageBody
            ? sanitizeHtmlMessageBody(props.message.htmlMessageBody)
            : props.message.messageBody)
      );
      trigger();
    } else {
      let body: string;
      let prefillPhone = props.prefillPhone || '';

      switch (contactMeans) {
        case 'sms':
          setValue('newPhoneNumber', prefillPhone);
          body = smsBody;
          clearErrors();
          break;

        case 'draken':
          body = internalSignature;
          break;

        default:
          body = removeEmailInformation(contactMeans, emailBody);
          break;
      }

      setValue('headerReplyTo', '');
      setValue('headerReferences', '');
      setValue('emails', []);
      setValue('phoneNumbers', []);

      setValue('messageBody', sanitized(body));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactMeans, props.message]);

  useEffect(() => {
    getSourceRelations(municipalityId, supportErrand.id, 'ASC').then((res) => {
      const sortedRelations = [...res].sort((a, b) => a.target.type.localeCompare(b.target.type));
      setRelationErrands(sortedRelations);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.showMessageForm]);

  useEffect(() => {
    if (contactMeans === 'draken' && relationErrands.length > 0 && !selectedRelationId) {
      setSelectedRelationId(relationErrands[0].target.resourceId);
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
                name="useEmail"
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
                name="useSms"
                id="useSms"
                value="sms"
                {...register('contactMeans')}
              >
                SMS
              </RadioButton>
            )}
            {Channels[supportErrand.channel] === Channels.ESERVICE_INTERNAL ? (
              <RadioButton
                disabled={props.locked}
                data-cy="useWebmessage-radiobutton-true"
                className="mr-sm mt-4"
                name="useWebmessage"
                id="useWebmessage"
                value="webmessage"
                {...register('contactMeans')}
              >
                E-tjänst (intern)
              </RadioButton>
            ) : null}
            {/* Only show webmessage option if errand is from e-service and LOP */}
            {Channels[supportErrand.channel] === Channels.ESERVICE && isLOP() ? (
              <RadioButton
                disabled={props.locked}
                data-cy="useWebmessage-radiobutton-true"
                className="mr-sm mt-4"
                name="useWebmessage"
                id="useWebmessage"
                value="webmessage"
                {...register('contactMeans')}
              >
                E-tjänst (extern)
              </RadioButton>
            ) : null}
            {appConfig.features.useStakeholderRelations && (
              <RadioButton
                disabled={props.locked}
                data-cy="useDraken-radiobutton-true"
                className="mr-sm mt-4"
                name="useDraken"
                id="useDraken"
                value="draken"
                {...register('contactMeans')}
              >
                Draken
              </RadioButton>
            )}
            {appConfig.features.useMyPages &&
              getSupportOwnerStakeholder(supportErrand)?.personNumber &&
              Channels[supportErrand.channel] !== Channels.ESERVICE_INTERNAL && (
                <RadioButton
                  disabled={props.locked}
                  data-cy="useMinasidor-radiobutton-true"
                  className="mr-sm mt-4"
                  name="useMinasidor"
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
          <strong className="text-md block mb-sm">Välj länkat ärende</strong>
          {relationErrands.length > 0 ? (
            <Select
              value={selectedRelationId}
              onChange={(e) => {
                const selectedId = e.currentTarget.value;
                setSelectedRelationId(selectedId);
              }}
            >
              {relationErrands.map((item) => (
                <Select.Option key={item.target.resourceId} value={item.target.resourceId}>
                  {item.target.type}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Select disabled value="">
              <Select.Option value="">Laddar ärenden...</Select.Option>
            </Select>
          )}
        </div>
      )}

      <div className="w-full pt-16">
        <strong className="text-md">Typ av meddelande</strong>
        <RadioButton.Group data-cy="message-type-radio-button-group" className="mt-sm !gap-4">
          <RadioButton
            disabled={props.locked}
            name="useNewMessage"
            id="useNewMessage"
            value="newMessage"
            checked={typeOfMessage === 'newMessage'}
            onChange={(e) => setTypeOfMessage(e.target.value)}
          >
            Nytt meddelande
          </RadioButton>
          <RadioButton
            disabled={props.locked}
            name="useInfoCompletion"
            id="useInfoCompletion"
            value="infoCompletion"
            checked={typeOfMessage === 'infoCompletion'}
            onChange={(e) => setTypeOfMessage(e.target.value)}
          >
            Begär komplettering
          </RadioButton>
          <RadioButton
            disabled={props.locked}
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
      {templates && (contactMeans === 'email' || contactMeans === 'sms') && (
        <FormControl className="w-full my-12" size="sm" id="messageTemplate">
          <FormLabel>Välj meddelandemall</FormLabel>
          <Select
            {...register('messageTemplate')}
            className="w-full text-dark-primary"
            variant="tertiary"
            size="sm"
            onChange={(e) => {
              const templateId = e.currentTarget.value;
              setValue('messageTemplate', templateId);

              if (!templateId) {
                const defaultBody = contactMeans === 'sms' ? smsBody : emailBody;
                setValue('messageBody', sanitized(defaultBody));
                return;
              }

              const content = templates.byId[templateId] || '';
              const signature = contactMeans === 'sms' ? templates.smsSignature : templates.emailSignature;
              setValue('messageBody', sanitized(content + signature));
            }}
          >
            <Select.Option value="">Välj mall</Select.Option>
            {(contactMeans === 'email' ? templates.emailTemplates : templates.smsTemplates)?.map((t) => (
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
              value={{ plainText: messageBodyPlaintext, markup: messageBody }}
              onChange={(e) => {
                setValue('messageBody', e.target.value.markup);
                setValue('messageBodyPlaintext', e.target.value.plainText);
                trigger('messageBody');
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

      {contactMeans === 'email' || contactMeans === 'webmessage' ? (
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
            ? supportErrand.stakeholders
                .filter((o) => o.role.indexOf('PRIMARY') !== -1)
                .map((filteredOwner, idx) => (
                  <div key={`owner-${idx}`}>
                    <FormLabel>Mottagare:</FormLabel> {filteredOwner.firstName} {filteredOwner.lastName}
                  </div>
                ))
            : null}
          {contactMeans === 'email' || contactMeans === 'webmessage' ? (
            <FormControl id="addExisting" className="w-full mt-md">
              <FormLabel>Bilagor från ärendet</FormLabel>
              <div className="flex items-center justify-between">
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
          ) : null}
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
            props.setUnsaved(false);
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
          disabled={isSending || formState.isSubmitting || !formState.isValid || contactMeans === ''}
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
