'use client';

import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import TextEditor from '@common/components/dynamic-text-editor';
import { PriorityComponent } from '@common/components/priority/priority.component';
import { deepFlattenToObject, prettyTime } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  cx,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  RadioButton,
  Select,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  Channels,
  findPriorityLabelForPriorityKey,
  forwardSupportErrand,
  getLabelCategory,
  getLabelType,
  getSupportErrandById,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getEscalationEmails, getEscalationMessage } from '@supportmanagement/services/support-escalation-service';
import { ChevronDown, ChevronUp, Forward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useFormContext, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';

const yupForwardForm = yup.object().shape(
  {
    recipient: yup.string().required('Mottagare är obligatoriskt'),
    newEmail: yup
      .string()
      .email('E-postadress har fel format')
      .when(['emails', 'recipient'], {
        is: (emails: [], recipient: string) => {
          return !emails.length && recipient === 'EMAIL';
        },
        then: (schema) => schema.min(1, 'Ange minst en e-postadress').required('Ange minst en e-postadress'),
      }),
    department: yup.string().required('Verksamhet är obligatoriskt'),
    message: yup.string(),
    messageBodyPlaintext: yup.string().when('recipient', {
      is: 'EMAIL',
      then: (schema) =>
        schema
          .required('Meddelande är obligatoriskt')
          .test('not-empty', 'Meddelande är obligatoriskt', (value) => !!value?.trim()),
      otherwise: (schema) => schema.optional(),
    }),
    emails: yup
      .array()
      .of(
        yup
          .object({
            value: yup.string().email('Ogiltig e-postadress').required('E-postadress krävs'),
          })
          .required()
      )
      .required('Minst en e-postadress krävs'),
  },
  [
    ['emails', 'recipient'],
    ['messageBodyPlaintext', 'recipient'],
  ]
);

export interface ForwardFormProps {
  recipient: string;
  emails: { value: string }[];
  department: string;
  message: string;
  messageBodyPlaintext: string;
  existingEmail?: string;
  newEmail?: string;
}

export const SupportForwardErrandButtonComponent: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const user = useUserStore((s) => s.user);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const supportAttachments = useSupportStore((s) => s.supportAttachments);
  const confirm = useConfirm();
  const errandFormControls: UseFormReturn<SupportErrand, any, undefined> = useFormContext();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isDescriptionClamped, setIsDescriptionClamped] = useState(false);
  const descriptionRef = useRef<HTMLSpanElement>(null);
  const toastMessage = useSnackbar();

  const {
    register,
    control,
    watch,
    reset,
    setValue,
    getValues,
    formState,
    trigger,
    formState: { errors },
  } = useForm<ForwardFormProps>({
    resolver: yupResolver(yupForwardForm) as any,
    defaultValues: {
      recipient: !appConfig.features.useDepartmentEscalation ? 'EMAIL' : '',
      emails: [],
      department: 'SBK_MEX',
      message: '',
      messageBodyPlaintext: '',
    },
    mode: 'onChange',
  });

  const { recipient, message, messageBodyPlaintext } = watch();

  const handleForwardErrand = (data: ForwardFormProps) => {
    setIsLoading(true);

    return forwardSupportErrand(user, supportErrand!, municipalityId, data, supportAttachments ?? [])
      .then(() => {
        toastMessage(
          getToastOptions({
            message: 'Ärendet vidarebefordrades',
            status: 'success',
          })
        );
        setTimeout(() => {
          window.close();
        }, 2000);
        setIsLoading(false);
        setShowModal(false);
        getSupportErrandById(supportErrand!.id!, municipalityId).then((res) => setSupportErrand(res.errand));
      })
      .catch((e: Error) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message:
            e.message === 'MISSING_NAME'
              ? 'Intressent saknar för- eller efternamn'
              : e.message === 'MISSING_PHONE'
              ? 'Intressent saknar telefonnummer'
              : e.message === 'MISSING_EMAIL'
              ? 'Intressent saknar e-post'
              : e.message === 'ATTACHMENTS_FAILED'
              ? 'Ärendet vidarebefordrades men det gick inte att bifoga filer'
              : 'Något gick fel när ärendet skulle vidarebefordras',
          status: 'error',
        });
        setIsLoading(false);
        return;
      });
  };

  useEffect(() => {
    if (!appConfig.features.useDepartmentEscalation) {
      setValue('recipient', 'EMAIL');
    }
  }, [appConfig.features.useDepartmentEscalation]);

  useEffect(() => {
    if (supportErrand) {
      setValue('message', '', { shouldValidate: true, shouldDirty: false });
      setValue('messageBodyPlaintext', '');

      getEscalationEmails(supportErrand, supportMetadata!).then((emails) => {
        if (emails.length > 0) {
          setValue('emails', [{ value: emails[0].value }]);
        }
      });

      if (recipient === 'EMAIL') {
        getEscalationMessage(supportErrand, recipient, `${user.firstName} ${user.lastName}`).then((text) => {
          setValue('message', sanitized(text), { shouldValidate: true, shouldDirty: false });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient, showModal]);

  useEffect(() => {
    const element = descriptionRef.current;
    if (element && !showFullDescription) {
      setIsDescriptionClamped(element.scrollHeight > element.clientHeight);
    }
     
  }, [recipient, showModal, showFullDescription, supportErrand?.description]);

  const handleModal = () => {
    setShowModal(!showModal);
    setShowFullDescription(false);
    setIsDescriptionClamped(false);
    reset({
      recipient: !appConfig.features.useDepartmentEscalation ? 'EMAIL' : '',
      emails: [],
      department: 'SBK_MEX',
      message: '',
      messageBodyPlaintext: '',
    });
  };

  if (!appConfig.features.useEscalation) {
    return null;
  }

  return (
    <>
      <Button
        className="w-full"
        data-cy="forward-button"
        color="vattjom"
        leftIcon={<Forward />}
        variant="secondary"
        disabled={disabled}
        onClick={() => handleModal()}
      >
        Överlämna ärendet
      </Button>
      <Modal
        show={showModal}
        label={
          Object.values(deepFlattenToObject(errandFormControls.formState.dirtyFields)).some((v) => v)
            ? 'Du har osparade ändringar'
            : 'Överlämna ärendet'
        }
        className="w-[91rem]"
        onClose={() => handleModal()}
      >
        {Object.values(deepFlattenToObject(errandFormControls.formState.dirtyFields)).some((v) => v) ? (
          <>
            <Modal.Content>
              <p>Ärendet kan inte överlämnas då du har osparade ändringar. Var god spara för att fortsätta.</p>
            </Modal.Content>
            <Modal.Footer>
              <Button onClick={() => setShowModal(false)} variant="primary" color="vattjom">
                Ok
              </Button>
            </Modal.Footer>
          </>
        ) : (
          <>
            <Modal.Content>
              {appConfig.features.useDepartmentEscalation && (
                <>
                  <p className="text-content font-semibold">Överlämna via</p>
                  <FormControl id="resolution" className="w-full" required>
                    <RadioButton.Group inline>
                      <RadioButton value="DEPARTMENT" {...register('recipient')}>
                        Draken
                      </RadioButton>
                      <RadioButton value="EMAIL" {...register('recipient')}>
                        E-post
                      </RadioButton>
                    </RadioButton.Group>
                  </FormControl>
                  <small className="text-small">
                    Verksamheter som inte använder Draken kan inte ta emot ärenden via systemet. Använd e-post i dessa
                    fall.
                  </small>
                </>
              )}
              {recipient === 'EMAIL' ? (
                <FormControl id="email" className="w-full mb-md">
                  <CommonNestedEmailArrayV2
                    size="md"
                    errand={supportErrand}
                    data-cy="email-input"
                    disabled={disabled}
                    {...{ control, register, errors, watch, setValue, trigger, reset, getValues }}
                  />
                  {errors && formState.errors.emails && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>{formState.errors.emails?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>
              ) : recipient === 'DEPARTMENT' ? (
                <FormControl id="resolution" className="w-full py-12">
                  <FormLabel className="text-content font-semibold">Mottagande verksamhet</FormLabel>
                  <Select
                    className="w-fit"
                    size="md"
                    data-cy="resolution-input"
                    placeholder="Välj verksamhet"
                    aria-label="Välj verksamhet"
                    {...register('department')}
                  >
                    <Select.Option value="SBK_MEX">Mark och exploatering (MEX)</Select.Option>
                  </Select>
                </FormControl>
              ) : null}
              {recipient !== '' && <Divider />}
              {recipient === 'DEPARTMENT' ? (
                <>
                  <h4 className="text-h4-md py-12">Uppgifter från ärendet som överlämnas</h4>
                  <div className="flex flex-row gap-80">
                    <div className="flex flex-col">
                      <span className="font-bold text-small">Ärendetyp</span>
                      <span className="text-small">
                        {appConfig.features.useThreeLevelCategorization
                          ? `${getLabelCategory(supportErrand!, supportMetadata!)?.displayName || ''}${
                              getLabelType(supportErrand!)?.displayName
                                ? ` - ${getLabelType(supportErrand!)?.displayName}`
                                : ''
                            }`
                          : supportMetadata?.categories
                              ?.find((c) => c.name === supportErrand?.category)
                              ?.types?.find((t) => t.name === supportErrand?.type)?.displayName || supportErrand?.type}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-small">Ärendenummer</span>
                      <span className="text-small">{supportErrand?.errandNumber}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-small">Prioritet</span>
                      <div className="flex text-small items-center gap-4">
                        <PriorityComponent priority={findPriorityLabelForPriorityKey(supportErrand?.priority || '')} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-small">Inkom via</span>
                      <span className="text-small">{Channels[supportErrand?.channel as keyof typeof Channels]}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-small">Registrerat</span>
                      <span className="text-small">{prettyTime(supportErrand?.created || '')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-small">Ärendebeskrivning</span>
                    <span
                      ref={descriptionRef}
                      className={`text-small ${showFullDescription ? '' : 'line-clamp-3'}`}
                      dangerouslySetInnerHTML={{ __html: sanitized(supportErrand?.description || '') }}
                    />
                  </div>
                  {supportErrand?.description && (isDescriptionClamped || showFullDescription) && (
                    <Button
                      size="sm"
                      className="w-fit"
                      variant="tertiary"
                      rightIcon={showFullDescription ? <ChevronUp /> : <ChevronDown />}
                      onClick={() => setShowFullDescription(!showFullDescription)}
                    >
                      {showFullDescription ? 'Visa mindre' : 'Visa mer'}
                    </Button>
                  )}

                  <span className="font-bold text-small">Parter</span>
                  <div className="flex flex-col gap-24 mb-12">
                    {supportErrand?.customer?.map((stakeholder, index) => {
                      const role = supportMetadata?.roles?.find((r) => r.name === stakeholder.role)?.displayName;
                      const name =
                        stakeholder.stakeholderType === 'ORGANIZATION'
                          ? `${stakeholder.organizationName || ''}`
                          : `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`;
                      const idNumber =
                        stakeholder.stakeholderType === 'ORGANIZATION'
                          ? stakeholder.organizationNumber || stakeholder.externalId
                          : stakeholder.personNumber;
                      return (
                        <div key={`customer-${index}`} className="flex flex-col gap-4">
                          <span className="text-small">
                            {name}
                            {idNumber ? `, ${idNumber}` : ''} ({role || stakeholder.role})
                          </span>
                          {stakeholder.address && (
                            <span className="text-small">
                              {stakeholder.address} {stakeholder.zipCode} {stakeholder.city}
                            </span>
                          )}
                          {stakeholder.emails?.map((email, idx) => (
                            <span key={`email-${idx}`} className="text-small">
                              {email.value}
                            </span>
                          ))}
                          {stakeholder.phoneNumbers?.map((phone, idx) => (
                            <span key={`phone-${idx}`} className="text-small">
                              {phone.value}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                    {supportErrand?.contacts?.map((stakeholder, index) => {
                      const role = supportMetadata?.roles?.find((r) => r.name === stakeholder.role)?.displayName;
                      const name =
                        stakeholder.stakeholderType === 'ORGANIZATION'
                          ? `${stakeholder.organizationName || ''}`
                          : `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`;
                      const idNumber =
                        stakeholder.stakeholderType === 'ORGANIZATION'
                          ? stakeholder.organizationNumber || stakeholder.externalId
                          : stakeholder.personNumber;
                      return (
                        <div key={`contact-${index}`} className="flex flex-col gap-4">
                          <span className="text-small">
                            {name}
                            {idNumber ? `, ${idNumber}` : ''} ({role || stakeholder.role})
                          </span>
                          {stakeholder.address && (
                            <span className="text-small">
                              {stakeholder.address} {stakeholder.zipCode} {stakeholder.city}
                            </span>
                          )}
                          {stakeholder.emails?.map((email, idx) => (
                            <span key={`email-${idx}`} className="text-small">
                              {email.value}
                            </span>
                          ))}
                          {stakeholder.phoneNumbers?.map((phone, idx) => (
                            <span key={`phone-${idx}`} className="text-small">
                              {phone.value}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <Divider />
                  <h4 className="text-h4-md mt-12">Meddelande</h4>
                  <span>Skriv ett meddelande om du vill skicka med mer information på ärendet.</span>
                </>
              ) : recipient === 'EMAIL' ? (
                <h4 className="text-h4-md mt-12">Meddelande*</h4>
              ) : null}

              {recipient !== '' && (
                <FormControl id="comment" className="w-full" required>
                  <Input data-cy="message-body-input" type="hidden" {...register('message')} />
                  <div data-cy="escalation-richtext-wrapper">
                    <TextEditor
                      readOnly={false}
                      className={cx(`mb-50`, recipient === 'EMAIL' ? 'h-[50rem]' : 'h-[15rem]')}
                      value={{ plainText: messageBodyPlaintext, markup: message }}
                      onChange={(e) => {
                        setValue('message', e.target.value.markup ?? '');
                        setValue('messageBodyPlaintext', e.target.value.plainText ?? '');
                      }}
                    />
                  </div>

                  {errors && formState.errors.messageBodyPlaintext && (
                    <div className="text-error">
                      <FormErrorMessage>{formState.errors.messageBodyPlaintext?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>
              )}
            </Modal.Content>
            <Modal.Footer className="flex flex-row">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Avbryt
              </Button>
              <Button
                variant="primary"
                color="vattjom"
                disabled={
                  isLoading ||
                  !formState.isValid ||
                  (recipient === 'EMAIL' && getValues('emails').length === 0) ||
                  disabled
                }
                loading={isLoading}
                loadingText="Vidarebefordrar ärende"
                onClick={() => {
                  confirm
                    .showConfirmation('Överlämna ärendet', 'Vill du överlämna ärendet?', 'Ja', 'Nej', 'info', 'info')
                    .then((confirmed) => {
                      if (confirmed) {
                        handleForwardErrand(getValues());
                      }
                    });
                }}
              >
                Överlämna ärendet
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
};
