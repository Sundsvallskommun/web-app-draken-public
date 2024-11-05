import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { User } from '@common/interfaces/user';
import { getApplicationName, isLOP } from '@common/services/application-service';
import { invalidPhoneMessage, supportManagementPhonePatternOrCountryCode } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Chip,
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
  getSupportErrandById,
  requestInternal,
  Status,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useRef, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';

const yupRequestFeedbackForm = yup.object().shape(
  {
    contactMeans: yup.string().required('Kontaktsätt är obligatoriskt'),
    email: yup.string().when('contactMeans', {
      is: (contactMeans: string) => contactMeans === 'email',
      then: yup.string().trim().email('E-postadress har fel format').required('E-postadress måste anges'),
    }),
    phone: yup.string().when('contactMeans', {
      is: (contactMeans: string) => contactMeans === 'sms',
      then: yup
        .string()
        .test('empty-check', 'Telefonnummer måste anges för sms-meddelande', (phone) => phone.length >= 4)
        .required('Telefonnummer måste anges för sms-meddelande')
        .trim()
        .transform((val) => val && val.replace('-', ''))
        .matches(supportManagementPhonePatternOrCountryCode, invalidPhoneMessage),
    }),
    message: yup.string().required('Meddelande är obligatoriskt'),
    messageBodyPlaintext: yup.string(),
  },
  [
    ['email', 'contactMeans'],
    ['phone', 'contactMeans'],
  ]
);

export type ContactMeans = 'sms' | 'email';

export interface RequestInternalFormProps {
  contactMeans: string;
  email: string;
  phone: string;
  message: string;
  messageBodyPlaintext: string;
}

export const RequestInternalComponent: React.FC<{ disabled: boolean }> = ({ disabled }) => {
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
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const quillRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contactMeans, setContactMeans] = useState<ContactMeans>('email');
  const [richText, setRichText] = useState<string>('');
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [isAttachmentSelected, setIsAttachmentSelected] = useState<SupportAttachment>();
  const [addedAttachment, setAddedAttachment] = useState<SupportAttachment[]>([]);
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
  }: UseFormReturn<RequestInternalFormProps, any, undefined> = useForm({
    resolver: yupResolver(yupRequestFeedbackForm),
    defaultValues: { contactMeans: 'email', email: '', phone: '', message: '', messageBodyPlaintext: '' },
    mode: 'onChange',
  });

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

  const handleRequestInternal = (data: RequestInternalFormProps) => {
    setIsLoading(true);
    setError(false);
    const applicationName = getApplicationName();
    return requestInternal(user, supportErrand, municipalityId, data, addedAttachment, applicationName)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Komplettering begärd',
          status: 'success',
        });
        setIsLoading(false);
        setShowModal(false);
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
        setAddedAttachment([]);
        reset();
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
              : 'Något gick fel när komplettering begärdes',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  useEffect(() => {
    const _email = supportErrand?.customer?.[0]?.emails?.[0]?.value;
    const _phone = supportErrand?.customer?.[0]?.phoneNumbers?.[0]?.value;
    if (contactMeans === 'email') {
      setValue('email', _email || '');
    } else if (contactMeans === 'sms') {
      setValue('phone', _phone || '+46');
    }
  }, [supportErrand, contactMeans]);

  useEffect(() => {
    if (supportErrand && supportAttachments && supportMetadata && showModal) {
      setValue('contactMeans', 'email');
      setContactMeans('email');
      setTimeout(() => {
        const emailBody = `Hej!<br><br>Tack för att du kontaktar oss.<br><br><br><br><br><br>${
          isLOP()
            ? `Du är välkommen att höra av dig om du har några frågor.<br>Vänligen ändra inte ämnesraden om du besvarar mejlet.<br><br>Med vänliga hälsningar<br><strong>${user.firstName} ${user.lastName}</strong><br><strong>Servicecenter Lön och pension</strong><br><a href="mailto:lonochpension@sundsvall.se">lonochpension@sundsvall.se</a><br>060-19 26 00, telefontid 9.00-12.00<br><a href="www.sundsvall.se">www.sundsvall.se</a><br><br>Sundsvalls kommun behandlar dina personuppgifter enligt dataskyddsförordningen (GDPR). Läs mer på <a href="www.sundsvall.se/personuppgifter">www.sundsvall.se/personuppgifter</a>`
            : 'Begäran om intern återkoppling'
        }.`;
        setRichText(emailBody);
      }, 0);
    }
  }, [supportErrand, supportAttachments, supportMetadata, showModal]);

  return (
    <>
      {!(supportErrand?.status === Status.PENDING || supportErrand?.status === Status.AWAITING_INTERNAL_RESPONSE) ? (
        <Button
          className="w-full"
          data-cy="forward-button"
          color="vattjom"
          leftIcon={<LucideIcon name="file-input" />}
          variant="secondary"
          disabled={disabled}
          onClick={() => setShowModal(true)}
        >
          Begär intern återkoppling
        </Button>
      ) : null}
      <Modal show={showModal} label="Intern återkoppling" className="w-[52rem]" onClose={() => setShowModal(false)}>
        <Modal.Content>
          {!isLOP() && (
            <>
              <p className="text-content font-semibold">Kontaktsätt</p>
              <FormControl id="resolution" className="w-full" required>
                <RadioButton.Group inline>
                  <RadioButton
                    value={'email'}
                    defaultChecked={contactMeans === ('email' as ContactMeans)}
                    onClick={(e) => {
                      setContactMeans((e.target as HTMLInputElement).value as ContactMeans);
                      setValue('contactMeans', (e.target as HTMLInputElement).value as ContactMeans);
                    }}
                  >
                    E-postadress
                  </RadioButton>
                  <RadioButton
                    value={'sms'}
                    defaultChecked={contactMeans === ('sms' as ContactMeans)}
                    onClick={(e) => {
                      setContactMeans((e.target as HTMLInputElement).value as ContactMeans);
                      setValue('contactMeans', (e.target as HTMLInputElement).value as ContactMeans);
                    }}
                  >
                    SMS
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
            </>
          )}
          {getValues().contactMeans === 'email' ? (
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
          ) : getValues().contactMeans === 'sms' ? (
            <FormControl id="phone" className="w-full">
              <FormLabel className="text-content font-semibold">Ange mottagarens telefonnummer</FormLabel>
              <Input
                data-cy="phone-input"
                type="text"
                placeholder="Telefonnummer"
                aria-label="Telefonnummer"
                {...register('phone')}
              />
              {errors && formState.errors.phone && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{formState.errors.phone?.message}</FormErrorMessage>
                </div>
              )}
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
          </FormControl>
          {contactMeans === 'email' ? (
            <>
              <FormControl id="addExisting" className="w-full">
                <FormLabel>Bilagor från ärendet</FormLabel>
                <div className="flex items-center justify-between">
                  <Select
                    className="w-full"
                    size="sm"
                    placeholder="Välj bilaga"
                    onChange={(selectedAttachment) => {
                      setIsAttachmentSelected(
                        supportAttachments.find((att) => att.id === selectedAttachment.currentTarget.value)
                      );
                    }}
                    data-cy="select-errand-attachment"
                  >
                    <Select.Option value="">Välj bilaga</Select.Option>

                    {supportAttachments?.map((att, idx) => {
                      return (
                        <Select.Option
                          value={att.id}
                          key={`attachmentId-${idx}`}
                          className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                        >
                          {att.fileName}
                        </Select.Option>
                      );
                    })}
                  </Select>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<LucideIcon name="plus" size="lg" className="mr-sm" />}
                    disabled={!isAttachmentSelected}
                    color="primary"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isAttachmentSelected && addedAttachment.indexOf(isAttachmentSelected) === -1) {
                        setAddedAttachment((addedAttachment) => [...addedAttachment, isAttachmentSelected]);
                      }
                    }}
                    className="w-96 rounded-lg ml-sm"
                    data-cy="add-selected-attachment"
                  >
                    Lägg till
                  </Button>
                </div>
              </FormControl>
              {addedAttachment.length > 0 ? (
                <div className="flex items-center w-full flex-wrap justify-start gap-md">
                  {addedAttachment.map((attachment, k) => {
                    return (
                      <div key={`${attachment.fileName}-${k}`}>
                        <Chip
                          aria-label={`Ta bort bilaga ${attachment.fileName}`}
                          key={attachment.id}
                          onClick={() => {
                            setAddedAttachment((addedAttachment) =>
                              addedAttachment.filter((att) => att.id !== attachment.id)
                            );
                          }}
                        >
                          {attachment.fileName}
                        </Chip>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : null}
        </Modal.Content>
        <Modal.Footer>
          <Button
            variant="primary"
            color="vattjom"
            disabled={isLoading || !formState.isValid || disabled}
            className="w-full"
            loading={isLoading}
            loadingText="Begär intern återkoppling"
            onClick={() => {
              confirm
                .showConfirmation(
                  'Begär intern återkoppling',
                  'Vill du begära intern återkoppling?',
                  'Ja',
                  'Nej',
                  'info',
                  'info'
                )
                .then((confirmed) => {
                  if (confirmed) {
                    handleRequestInternal(getValues());
                  }
                });
            }}
          >
            Begär intern återkoppling
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
