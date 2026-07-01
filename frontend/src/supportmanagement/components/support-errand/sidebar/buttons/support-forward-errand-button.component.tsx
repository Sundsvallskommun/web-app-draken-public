'use client';

import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import TextEditor from '@common/components/dynamic-text-editor';
import { deepFlattenToObject } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
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
  Spinner,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  forwardSupportErrand,
  getSupportErrandById,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getEscalationEmails, getEscalationMessage } from '@supportmanagement/services/support-escalation-service';
import { Forward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useFormContext, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';

import { ForwardErrandSummary } from './forward-errand-summary.component';
import { HandoverReview } from './handover/handover-review.component';
import { MEX_DEPARTMENT_VALUE, useSupportHandover } from './handover/use-support-handover';

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
  const toastMessage = useSnackbar();
  const handover = useSupportHandover({ errandId: supportErrand?.id, sourceMunicipalityId: municipalityId });

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

  const { recipient, message, messageBodyPlaintext, emails, department } = watch();

  // Routing: under "Draken" the target dropdown lists MEX (the existing casedata forward) plus the
  // supportmanagement namespaces. MEX keeps the old flow; any other namespace uses the new handover.
  const handoverTarget =
    appConfig.features.useHandover && recipient === 'DEPARTMENT' && department !== MEX_DEPARTMENT_VALUE
      ? handover.handoverTargets.find((target) => target.namespace === department)
      : undefined;
  const isHandover = !!handoverTarget;
  const isMexTarget = recipient === 'DEPARTMENT' && department === MEX_DEPARTMENT_VALUE;

  // Selecting a target namespace immediately fetches the preview and advances to step 2 – no extra
  // "Nästa" click. Cached previews are reused, so switching back and forth keeps earlier choices.
  useEffect(() => {
    if (handoverTarget) {
      handover.runPreview(handoverTarget);
    } else {
      handover.setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  const isForwardDisabled =
    isLoading ||
    disabled ||
    recipient === '' ||
    (recipient === 'EMAIL' && (emails?.length === 0 || !messageBodyPlaintext?.trim())) ||
    (recipient === 'DEPARTMENT' && !department);

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

  // Mirrors the MEX forward success: toast, close the modal, refresh the (now closed) source errand
  // and close the tab. No in-modal confirmation view.
  const handleHandoverSuccess = () => {
    toastMessage(getToastOptions({ message: 'Ärendet överlämnades', status: 'success' }));
    setShowModal(false);
    getSupportErrandById(supportErrand!.id!, municipalityId).then((res) => setSupportErrand(res.errand));
    setTimeout(() => {
      window.close();
    }, 2000);
  };

  useEffect(() => {
    if (!appConfig.features.useDepartmentEscalation) {
      setValue('recipient', 'EMAIL');
    }
  }, [setValue]);

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

  const handleModal = () => {
    setShowModal(!showModal);
    handover.reset();
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
                    {appConfig.features.useHandover &&
                      handover.handoverTargets.map((target) => (
                        <Select.Option key={target.namespace} value={target.namespace}>
                          {target.displayName || target.namespace}
                        </Select.Option>
                      ))}
                  </Select>
                </FormControl>
              ) : null}
              {recipient !== '' && <Divider />}
              {isMexTarget ? (
                <>
                  <h4 className="text-h4-md py-12">Uppgifter från ärendet som överlämnas</h4>
                  <ForwardErrandSummary errand={supportErrand} metadata={supportMetadata} />

                  <Divider />
                  <h4 className="text-h4-md mt-12">Meddelande</h4>
                  <span>Skriv ett meddelande om du vill skicka med mer information på ärendet.</span>
                </>
              ) : recipient === 'EMAIL' ? (
                <h4 className="text-h4-md mt-12">Meddelande*</h4>
              ) : null}

              {(recipient === 'EMAIL' || isMexTarget) && (
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

              {isHandover && (
                <>
                  {handover.step === 1 && handover.previewLoading && (
                    <div className="flex items-center gap-8 mt-12" data-cy="handover-preview-loading">
                      <Spinner size={2} /> Hämtar förslag…
                    </div>
                  )}
                  {handover.step === 1 && handover.previewError && (
                    <Alert type="error" className="mt-12" data-cy="handover-preview-error">
                      <Alert.Icon />
                      <Alert.Content>
                        <Alert.Content.Description>{handover.previewError}</Alert.Content.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                  {handover.step === 2 && <HandoverReview handover={handover} supportErrand={supportErrand!} />}
                  {handover.step === 2 && handover.handoverError && (
                    <Alert type="error" className="mt-12" data-cy="handover-error">
                      <Alert.Icon />
                      <Alert.Content>
                        <Alert.Content.Description>{handover.handoverError}</Alert.Content.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                </>
              )}
            </Modal.Content>
            <Modal.Footer className="flex flex-row">
              {isHandover ? (
                <>
                  {handover.step === 1 && (
                    <Button variant="secondary" onClick={() => handleModal()}>
                      Avbryt
                    </Button>
                  )}
                  {handover.step === 2 && (
                    <>
                      <Button variant="secondary" onClick={() => handleModal()}>
                        Avbryt
                      </Button>
                      <Button
                        variant="primary"
                        color="vattjom"
                        data-cy="handover-submit-button"
                        loading={handover.handoverLoading}
                        loadingText="Överlämnar ärende"
                        disabled={handover.handoverLoading || !handover.requiredMappingsAnswered}
                        onClick={() => {
                          confirm
                            .showConfirmation(
                              'Överlämna ärendet',
                              'Vill du överlämna ärendet?',
                              'Ja',
                              'Nej',
                              'info',
                              'info'
                            )
                            .then((confirmed) => {
                              if (confirmed && handoverTarget) {
                                handover.runHandover(handoverTarget).then((result) => {
                                  if (result) {
                                    handleHandoverSuccess();
                                  }
                                });
                              }
                            });
                        }}
                      >
                        Överlämna ärendet
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setShowModal(false)}>
                    Avbryt
                  </Button>
                  <Button
                    variant="primary"
                    color="vattjom"
                    disabled={isForwardDisabled}
                    loading={isLoading}
                    loadingText="Vidarebefordrar ärende"
                    onClick={() => {
                      confirm
                        .showConfirmation(
                          'Överlämna ärendet',
                          'Vill du överlämna ärendet?',
                          'Ja',
                          'Nej',
                          'info',
                          'info'
                        )
                        .then((confirmed) => {
                          if (confirmed) {
                            handleForwardErrand(getValues());
                          }
                        });
                    }}
                  >
                    Överlämna ärendet
                  </Button>
                </>
              )}
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
};
