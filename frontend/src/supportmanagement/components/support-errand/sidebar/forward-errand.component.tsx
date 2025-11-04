'use client';

import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import { User } from '@common/interfaces/user';
import { isKA } from '@common/services/application-service';
import { deepFlattenToObject } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  cx,
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
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  forwardSupportErrand,
  getSupportErrandById,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getEscalationEmails, getEscalationMessage } from '@supportmanagement/services/support-escalation-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useForm, useFormContext, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

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
    message: yup.string().required('Meddelande är obligatoriskt'),
    messageBodyPlaintext: yup.string(),
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
  [['emails', 'recipient']]
);

export interface ForwardFormProps {
  recipient: string;
  emails: { value: string }[];
  department: 'MEX';
  message: string;
  messageBodyPlaintext: string;
  existingEmail?: string;
  newEmail?: string;
}

export const ForwardErrandComponent: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const {
    user,
    municipalityId,
    supportErrand,
    setSupportErrand,
    supportMetadata,
    supportAttachments,
  }: {
    user: User;
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: any;
    supportMetadata: SupportMetadata;
    supportAttachments: SupportAttachment[];
  } = useAppContext();
  const confirm = useConfirm();
  const errandFormControls: UseFormReturn<SupportErrand, any, undefined> = useFormContext();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
  }: UseFormReturn<ForwardFormProps, any, undefined> = useForm({
    resolver: yupResolver(yupForwardForm) as any,
    defaultValues: {
      recipient: !appConfig.features.useDepartmentEscalation ? 'EMAIL' : '',
      emails: [],
      department: 'MEX',
      message: '',
      messageBodyPlaintext: '',
    },
    mode: 'onChange',
  });

  const { recipient, message, messageBodyPlaintext } = watch();

  const handleForwardErrand = (data: ForwardFormProps) => {
    setIsLoading(true);

    return forwardSupportErrand(user, supportErrand, municipalityId, data, supportAttachments)
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
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
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
    if (supportErrand) {
      getEscalationEmails(supportErrand, supportMetadata).then((emails) => {
        if (emails.length > 0) {
          setValue('emails', [{ value: emails[0].value }]);
        }
      });

      getEscalationMessage(supportErrand, recipient, `${user.firstName} ${user.lastName}`).then((text) => {
        setValue('message', sanitized(text), { shouldValidate: true, shouldDirty: false });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient, showModal]);

  const handleModal = () => {
    setShowModal(!showModal);
    reset();
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
        leftIcon={<LucideIcon name="forward" />}
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
        className="w-[52rem]"
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
                  <small>
                    Verksamheter som inte använder Draken kan inte ta emot ärenden via systemet. Använd e-post i dessa
                    fall.
                  </small>
                  <p className="text-content font-semibold">Överlämna via</p>
                  <FormControl id="resolution" className="w-full mb-md" required>
                    <RadioButton.Group inline>
                      <RadioButton value="DEPARTMENT" {...register('recipient')}>
                        Draken
                      </RadioButton>
                      <RadioButton value="EMAIL" {...register('recipient')}>
                        E-post
                      </RadioButton>
                    </RadioButton.Group>
                  </FormControl>
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
                <FormControl id="resolution" className="w-full mb-md">
                  <FormLabel className="text-content font-semibold">Mottagande verksamhet</FormLabel>
                  <Select
                    className="w-full"
                    size="md"
                    data-cy="resolution-input"
                    placeholder="Välj verksamhet"
                    aria-label="Välj verksamhet"
                    {...register('department')}
                  >
                    <Select.Option value="MEX">Mark och exploatering (MEX)</Select.Option>
                  </Select>
                </FormControl>
              ) : null}
              <FormControl id="comment" className="w-full" required>
                <FormLabel className="text-content font-semibold">Meddelande</FormLabel>
                <Input data-cy="message-body-input" type="hidden" {...register('message')} />
                <div className={cx(`h-[40rem]`)} data-cy="decision-richtext-wrapper">
                  <TextEditor
                    readOnly={!formState.isValid}
                    className={cx(`mb-md h-[80%]`)}
                    value={{ plainText: messageBodyPlaintext, markup: message }}
                    onChange={(e) => {
                      setValue('message', e.target.value.markup);
                      setValue('messageBodyPlaintext', e.target.value.plainText);
                    }}
                  />
                </div>

                {errors && formState.errors.message && (
                  <div className="text-error">
                    <FormErrorMessage>{formState.errors.message?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </Modal.Content>
            <Modal.Footer className="flex flex-col">
              <Button
                variant="primary"
                color="vattjom"
                disabled={
                  isLoading ||
                  !formState.isValid ||
                  (recipient === 'EMAIL' && getValues('emails').length === 0) ||
                  disabled
                }
                className="w-full"
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
