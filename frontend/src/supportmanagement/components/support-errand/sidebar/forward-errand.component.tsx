import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { User } from '@common/interfaces/user';
import { isLOP } from '@common/services/application-service';
import sanitized from '@common/services/sanitizer-service';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Checkbox,
  cx,
  FormControl,
  FormErrorMessage,
  FormLabel,
  LucideIcon as Icon,
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
  ResolutionLabel,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getEscalationEmails, getEscalationMessage } from '@supportmanagement/services/support-escalation-service';
import { sendClosingMessage } from '@supportmanagement/services/support-message-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { applicantHasContactChannel, getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import { useEffect, useRef, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';

const yupForwardForm = yup.object().shape(
  {
    recipient: yup.string().required('Mottagare är obligatoriskt'),
    email: yup.string().when('recipient', {
      is: (recipient: string) => recipient === 'EMAIL',
      then: yup.string().trim().email('E-postadress har fel format').required('E-postadress måste anges'),
    }),
    department: yup.string().required('Verksamhet är obligatoriskt'),
    message: yup.string().max(8192, 'Meddelande är för långt').required('Meddelande är obligatoriskt'),
    messageBodyPlaintext: yup.string(),
  },
  [['email', 'recipient']]
);

export type RECIPIENT = 'DEPARTMENT' | 'EMAIL';

export interface ForwardFormProps {
  recipient: string;
  email: string;
  department: 'MEX';
  message: string;
  messageBodyPlaintext: string;
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
  const [recipient, setRecipient] = useState<RECIPIENT>('DEPARTMENT');
  const [richText, setRichText] = useState<string>('');
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [closingMessage, setClosingMessage] = useState<boolean>(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState,
    trigger,
    formState: { errors },
  }: UseFormReturn<ForwardFormProps, any, undefined> = useForm({
    resolver: yupResolver(yupForwardForm),
    defaultValues: { recipient: 'DEPARTMENT', email: '', department: 'MEX', message: '', messageBodyPlaintext: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isLOP()) {
      setValue('recipient', 'EMAIL');
    }
  }, []);

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
          return sendClosingMessage(
            adminName,
            supportErrand,
            ResolutionLabel.REGISTERED_EXTERNAL_SYSTEM,
            municipalityId
          );
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
    if (supportErrand && supportAttachments && supportMetadata && showModal) {
      getEscalationEmails(supportErrand, supportMetadata).then((emails) => {
        if (emails.length > 0) {
          setValue('email', emails[0].value || '');
        }
      });
      getEscalationMessage(
        supportErrand,
        supportAttachments,
        supportMetadata,
        user.firstName + ' ' + user.lastName
      ).then((text) => {
        setTimeout(() => {
          setRichText(text);
        }, 0);
      });
    }
  }, [supportErrand, supportAttachments, supportMetadata, showModal]);

  return (
    <>
      <Button
        className="w-full"
        data-cy="forward-button"
        color="vattjom"
        leftIcon={<Icon name="forward" />}
        variant="secondary"
        disabled={disabled}
        onClick={() => setShowModal(true)}
      >
        Vidarebefordra ärendet
      </Button>
      <Modal show={showModal} label="Vidarebefordra ärende" className="w-[52rem]" onClose={() => setShowModal(false)}>
        <Modal.Content>
          {!isLOP() && (
            <>
              <p className="text-content font-semibold">Mottagare</p>
              <FormControl id="resolution" className="w-full" required>
                <RadioButton.Group inline>
                  <RadioButton
                    value={'DEPARTMENT'}
                    defaultChecked={recipient === ('DEPARTMENT' as RECIPIENT)}
                    onClick={(e) => {
                      setRecipient((e.target as HTMLInputElement).value as RECIPIENT);
                      setValue('recipient', (e.target as HTMLInputElement).value as RECIPIENT);
                    }}
                  >
                    Verksamhet
                  </RadioButton>
                  <RadioButton
                    value={'EMAIL'}
                    defaultChecked={recipient === ('EMAIL' as RECIPIENT)}
                    onClick={(e) => {
                      setRecipient((e.target as HTMLInputElement).value as RECIPIENT);
                      setValue('recipient', (e.target as HTMLInputElement).value as RECIPIENT);
                    }}
                  >
                    E-postadress
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
            </>
          )}
          {getValues().recipient === 'EMAIL' ? (
            <FormControl id="email" className="w-full">
              <FormLabel className="text-content font-semibold">Ange mottagarens e-postadress</FormLabel>
              <Input
                data-cy="email-input"
                type="email"
                placeholder="E-postadress"
                aria-label="E-postadress"
                {...register('email')}
              />
              {errors && formState.errors.email && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{formState.errors.email?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          ) : getValues().recipient === 'DEPARTMENT' ? (
            <FormControl id="resolution" className="w-full" required={getValues().recipient === 'EMAIL'}>
              <FormLabel className="text-content font-semibold">Välj verksamhet</FormLabel>
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
          {/* Not decided yet */}
          {/* <FormControl id="closingmessage" className="w-full mb-sm px-2">
            <Checkbox
              id="closingmessagecheckbox"
              disabled={!applicantHasContactChannel(supportErrand)}
              data-cy="show-contactReasonDescription-input"
              className="w-full"
              checked={applicantHasContactChannel(supportErrand) && closingMessage}
              onChange={() => setClosingMessage(!sendClosingMessage)}
            >
              Skicka meddelande till ärendeägare
            </Checkbox>
          </FormControl> */}
          <Button
            variant="primary"
            color="vattjom"
            disabled={isLoading || !formState.isValid || disabled}
            className="w-full"
            loading={isLoading}
            loadingText="Vidarebefordrar ärende"
            onClick={() => {
              confirm
                .showConfirmation(
                  'Vidarebefordra ärende',
                  'Vill du vidarebefordra ärendet?',
                  'Ja',
                  'Nej',
                  'info',
                  'info'
                )
                .then((confirmed) => {
                  if (confirmed) {
                    handleForwardErrand(getValues(), closingMessage);
                  }
                });
            }}
          >
            Vidarebefordra ärende
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
