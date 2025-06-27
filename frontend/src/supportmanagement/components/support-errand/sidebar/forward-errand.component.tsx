import CommonNestedEmailArrayV2 from '@common/components/commonNestedEmailArrayV2';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { User } from '@common/interfaces/user';
import { isKA } from '@common/services/application-service';
import sanitized from '@common/services/sanitizer-service';
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
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  forwardSupportErrand,
  getSupportErrandById,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getEscalationEmails, getEscalationMessage } from '@supportmanagement/services/support-escalation-service';
import { sendClosingMessage } from '@supportmanagement/services/support-message-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import { useEffect, useRef, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
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
        then: yup.string().min(1, 'Ange minst en e-postadress').required('Ange minst en e-postadress'),
      }),
    department: yup.string().required('Verksamhet är obligatoriskt'),
    message: yup.string().required('Meddelande är obligatoriskt'),
    messageBodyPlaintext: yup.string(),
  },
  [['emails', 'recipient']]
);

export type RECIPIENT = 'DEPARTMENT' | 'EMAIL';

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
    supportAdmins,
    supportMetadata,
    supportAttachments,
  }: {
    user: User;
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: any;
    supportAdmins: SupportAdmin[];
    supportMetadata: SupportMetadata;
    supportAttachments: SupportAttachment[];
  } = useAppContext();
  const confirm = useConfirm();
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const quillRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<RECIPIENT>(
    appConfig.features.useDepartmentEscalation ? undefined : 'EMAIL'
  );
  const [richText, setRichText] = useState<string>('');
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [closingMessage, setClosingMessage] = useState<boolean>(false);
  const [latestErrand, setLatestErrand] = useState<SupportErrand>(supportErrand);

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
    resolver: yupResolver(yupForwardForm),
    defaultValues: {
      recipient: isKA() ? 'EMAIL' : 'DEPARTMENT',
      emails: [],
      department: 'MEX',
      message: '',
      messageBodyPlaintext: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (showModal) {
      if (isKA()) {
        setRecipient('EMAIL');
        setValue('recipient', 'EMAIL');
      } else if (!appConfig.features.useDepartmentEscalation) {
        setRecipient('EMAIL');
        setValue('recipient', 'EMAIL');
      } else {
        setRecipient(undefined);
        setValue('recipient', undefined);
      }

      setValue('emails', []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  const onRichTextChange = (val) => {
    if (quillRef.current) {
      const editor = quillRef.current?.getEditor();
      const length = editor?.getLength();
      setRichText(val);
      setValue('message', sanitized(length > 1 ? val : undefined));
      setValue('messageBodyPlaintext', quillRef.current.getEditor().getText());
      trigger('message');
    }
  };

  const handleForwardErrand = (data: ForwardFormProps, msg: boolean) => {
    setIsLoading(true);
    setError(false);

    return forwardSupportErrand(user, supportErrand, municipalityId, data, supportAttachments)
      .then(() => {
        if (msg) {
          const admin = supportAdmins.find((a) => a.adAccount === supportErrand.assignedUserId);
          const adminName = getAdminName(admin, supportErrand);
          return sendClosingMessage(adminName, supportErrand, municipalityId);
        }
      })
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet vidarebefordrades',
          status: 'success',
        });
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
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  useEffect(() => {
    if (!showModal || !supportErrand?.id) return;

    getSupportErrandById(supportErrand.id, municipalityId)
      .then(({ errand }) => setLatestErrand(errand))
      .catch(console.error);
  }, [showModal, supportErrand?.id, municipalityId]);

  useEffect(() => {
    if (latestErrand && supportAttachments && supportMetadata && showModal) {
      getEscalationEmails(latestErrand, supportMetadata).then((emails) => {
        if (emails.length > 0) {
          setValue('emails', [{ value: emails[0].value }]);
        }
      });

      getEscalationMessage(latestErrand, `${user.firstName} ${user.lastName}`).then((text) => {
        setRichText(text);
      });
    }
  }, [latestErrand, supportAttachments, supportMetadata, showModal, user.firstName, user.lastName, setValue]);

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
        onClick={() => {
          if (appConfig.features.useDepartmentEscalation) {
            setRecipient(undefined);
            setValue('recipient', undefined);
          }
          setValue('emails', []);
          setShowModal(true);
        }}
      >
        Överlämna ärendet
      </Button>
      <Modal show={showModal} label="Överlämna ärendet" className="w-[52rem]" onClose={() => setShowModal(false)}>
        <Modal.Content>
          {appConfig.features.useDepartmentEscalation &&
            (isKA() ? (
              <Input type="hidden" {...register('recipient')} value="EMAIL" />
            ) : (
              <>
                <p className="text-content font-semibold">Överlämna via:</p>
                <small>
                  Verksamheter som inte använder Draken kan inte ta emot ärenden via systemet. Använd e-post i dessa
                  fall.
                </small>
                <FormControl id="resolution" className="w-full mb-md" required>
                  <RadioButton.Group inline>
                    <RadioButton
                      value="DEPARTMENT"
                      defaultChecked={recipient === 'DEPARTMENT'}
                      onClick={(e) => {
                        setRecipient('DEPARTMENT');
                        setValue('recipient', 'DEPARTMENT');
                      }}
                    >
                      Draken
                    </RadioButton>
                    <RadioButton
                      value="EMAIL"
                      defaultChecked={recipient === 'EMAIL'}
                      onClick={(e) => {
                        setRecipient('EMAIL');
                        setValue('recipient', 'EMAIL');
                      }}
                    >
                      E-post
                    </RadioButton>
                  </RadioButton.Group>
                </FormControl>
              </>
            ))}
          {getValues().recipient === 'EMAIL' ? (
            <FormControl id="email" className="w-full mb-md">
              <CommonNestedEmailArrayV2
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
          ) : getValues().recipient === 'DEPARTMENT' ? (
            <FormControl id="resolution" className="w-full mb-md" required={getValues().recipient === 'EMAIL'}>
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
              <RichTextEditor
                ref={quillRef}
                value={richText}
                errors={!!errors.message}
                isMaximizable={false}
                toggleModal={() => {}}
                onChange={(value, delta, source, editor) => {
                  if (source === 'user') {
                    setTextIsDirty(true);
                  }
                  return onRichTextChange(value);
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
              isLoading || !formState.isValid || (recipient === 'EMAIL' && getValues('emails').length === 0) || disabled
            }
            className="w-full"
            loading={isLoading}
            loadingText="Vidarebefordrar ärende"
            onClick={() => {
              confirm
                .showConfirmation('Överlämna ärendet', 'Vill du överlämna ärendet?', 'Ja', 'Nej', 'info', 'info')
                .then((confirmed) => {
                  if (confirmed) {
                    handleForwardErrand(getValues(), closingMessage);
                  }
                });
            }}
          >
            Överlämna ärendet
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
