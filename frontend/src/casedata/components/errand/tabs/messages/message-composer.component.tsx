import { Attachment } from '@casedata/interfaces/attachment';
import { IErrand } from '@casedata/interfaces/errand';
import { ACCEPTED_UPLOAD_FILETYPES, getAttachmentLabel } from '@casedata/services/casedata-attachment-service';
import { validateAction } from '@casedata/services/casedata-errand-service';
import { renderMessageWithTemplates, sendMessage, sendSms } from '@casedata/services/casedata-message-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { useAppContext } from '@common/contexts/app.context';
import { ErrandMessageResponse, MessageClassification } from '@common/interfaces/message';
import { User } from '@common/interfaces/user';
import { isMEX } from '@common/services/application-service';
import { invalidPhoneMessage, supportManagementPhonePatternOrCountryCode } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { yupResolver } from '@hookform/resolvers/yup';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import {
  Button,
  Chip,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  RadioButton,
  Select,
  Spinner,
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { MessageWrapper } from './message-wrapper.component';

export interface CasedataMessageTabFormModel {
  contactMeans: 'email' | 'sms' | 'webmessage' | 'digitalmail' | 'paper';
  messageClassification: string;
  messageTemplate?: string;
  messageEmail: string;
  messagePhone: string;
  messageBody: string;
  messageBodyPlaintext: string;
  attachUtredning: boolean;
  existingAttachments: Attachment[];
  addExisting: string;
  newAttachments: { file: FileList | undefined }[];
  newItem: FileList | undefined;
  headerReplyTo: string;
  headerReferences: string;
}

const defaultMessage = {
  contactMeans: 'email' as const,
  messageEmail: '',
  messagePhone: '+46',
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
    messageEmail: yup.string().when('contactMeans', {
      is: (means: string) => means === 'email',
      then: yup.string().required('Epost måste anges för e-postmeddelande').email('E-postadressen har fel format'),
    }),
    messagePhone: yup.string().when('contactMeans', {
      is: (means: string) => means === 'sms',
      then: yup
        .string()
        .required('Telefonnummer måste anges för sms-meddelande')
        .trim()
        .transform((val) => val && val.replace('-', ''))
        .matches(supportManagementPhonePatternOrCountryCode, invalidPhoneMessage),
    }),
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
  message: ErrandMessageResponse;
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
  useEffect(() => {
    const _a = validateAction(errand, user) && !!errand.administrator;
    setAllowed(_a);
  }, [user, errand]);

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

  const clearAndClose = () => {
    setTimeout(() => {
      setValue('messageBody', '', { shouldDirty: true });
      setValue('messageEmail', '', { shouldDirty: true });
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
    if (contactMeans === 'email') {
      setValue(
        'messageEmail',
        !!props.message?.messageID && props.message?.email
          ? props.message.email
          : getOwnerStakeholder(errand)?.emails?.[0]?.value
      );
    } else if (contactMeans === 'sms') {
      setValue('messagePhone', getOwnerStakeholder(errand)?.phoneNumbers?.[0]?.value || '+46');
    }
    setTimeout(() => {
      props.setUnsaved(false);
    }, 0);
  }, [contactMeans]);

  useEffect(() => {
    setReplying(!!props.message?.messageID);
    setValue('messageTemplate', '');
    if (props.message) {
      const replyTo = props.message?.emailHeaders.find((h) => h.header === 'MESSAGE_ID')?.values[0];
      const references = props.message?.emailHeaders.find((h) => h.header === 'REFERENCES')?.values || [];
      references.push(replyTo);
      setValue('headerReplyTo', replyTo);
      setValue('headerReferences', references.join(','));
      setValue('messageEmail', props.message.email);
      setValue('contactMeans', props.message.messageType === 'WEBMESSAGE' ? 'webmessage' : 'email');
      const historyHeader = `<br><br>-----Ursprungligt meddelande-----<br>Från: ${props.message.email}<br>Skickat: ${props.message.sent}<br>Till: Sundsvalls kommun<br>Ämne: ${props.message.subject}<br><br>`;
      setRichText(historyHeader + props.message.message);
      trigger();
    } else {
      setRichText('');
      setValue('headerReplyTo', '');
      setValue('headerReferences', '');
      setValue('messageEmail', getOwnerStakeholder(errand)?.emails?.[0]?.value);
      setValue('contactMeans', !!errand.externalCaseId ? 'webmessage' : 'email');
    }
  }, [props.message, errand]);

  const changeTemplate = (inTemplateValue) => {
    let content = 'Hej!<br><br>';
    if (inTemplateValue === 'feedbackPrio') {
      content +=
        'Tack för att du kontaktar oss med visat intresse för Sundsvall!<br><br>Vi har tagit emot din förfrågan gällande xx, som kräver utredning av handläggare. Vi har hög inströmning av ärenden just nu med anledning av att många vill använda och utveckla kommunens mark. <br><br>Vi prioriterar förfrågningar från företag och föreningar. <br><br>En preliminär bedömning är att ditt ärende kommer tilldelas en handläggare om ca fyra månader. När du står på tur kontaktar handläggaren dig för mer information.';
    } else if (inTemplateValue === 'feedbackNormal') {
      content +=
        'Tack för att du kontaktar oss.<br><br>Vi har tagit emot din förfrågan gällande xx, som kräver utredning av handläggare. Vi har hög inströmning av ärenden just nu med anledning av att många vill använda och utveckla kommunens mark. Vi prioriterar förfrågningar från företag och föreningar och handlägger övriga förfrågningar i turordning.<br><br>En preliminär bedömning är att ditt ärende kommer tilldelas en handläggare om ca sex månader. När det är din tur kontaktar handläggaren dig för mer information.<br><br>Vi hörs vidare!';
    } else if (inTemplateValue === 'additionalInformation') {
      content +=
        'Vi behöver få mer information från er om vad er förfrågan gäller samt vilket område det handlar om innan vi kan ta ärendet vidare. Det är viktigt för oss att veta eftersom det avgör hur vi ska prioritera ärendet för vidare handläggning och även för att bedöma vem eller vilka som ska hantera det. När det handlar om kommunägd mark är det flera förvaltningar inom kommunen som har olika ansvar, det gör att flera förvaltningar kan blir inblandade i handläggningen av ärendet.<br><br>För att kunna hjälpa er på bästa sätt måste ni inkomma med en beskrivning av er förfrågan, område och ändamål/syfte.';
    } else if (inTemplateValue === 'internalReferralBuildingPermit') {
      content +=
        'Vi önskar yttrande från er i denna fråga då den berör mark där ni har ett förvaltningsansvar. Det gäller ett bygglov, se bifogade handlingar.<br><br>Vänligen skicka skriftligt yttrande till oss senast inom 5 arbetsdagar.<br>Vid uteblivet svar kommer vi yttra oss enligt vårt kompetensområde.';
    } else if (inTemplateValue === 'internalReferralWire') {
      content +=
        'Vi önskar yttrande från er i denna fråga då den berör mark där ni har ett förvaltningsansvar. Det gäller en ny ledningssträcka, se bifogade handlingar. Kartan visar den föreslagna sträckan men det kan också finnas annat att ta hänsyn till, som exempelvis nya kabelskåp, transformatorstationer mm. Vi vill att ni svarar oss utifrån er kompetens om ni tycker sträckan är lämplig eller om ni önskar att något justeras. Det är sedan vi som undertecknar avtalet.<br><br>Skriftligt yttrande ska vara skickat till mig via e-post senast inom 7 dagar. Vid uteblivet svar kommer vi handlägga frågan utifrån vårt kompetensområde.';
    } else if (inTemplateValue === 'internalReferralWireCheck') {
      content +=
        'Tack för din förfrågan.<br><br>Vi på mark- och exploateringsavdelningen kan tyvärr inte svara på frågor om ledningar i kommunens mark. Du ska istället att vända dig till respektive ledningsägare för att få informationen du söker. Här nedan följer kontaktuppgifter till de kommunala bolagen och för kommunal gatubelysning.<br><br>MittSverige Vatten & Avfall lämnar upplysningar om va-ledningsnätet.<br>Tel kundservice: 020-120 25 00<br>E-post: kundservice@msva.se<br><br>Sundsvall Energi AB lämnar uppgifter om fjärrvärmeledningsnätet<br>Tel växel: 060-19 20 80<br>E-post: info@sundsvallenergi.se<br><br>Sundsvalls Elnät lämnar uppgifter om elkraft.<br>Tel: 060-600 50 20<br>E-post: info@sundsvallelnat.se<br><br>ServaNet lämnar uppgifter om bredband<br>Tel kundcenter: 0200-12 00 35<br><br>Gatuavdelningen belysningsingenjör lämnar upplysningar om kommunens ledningar för gatubelysning.<br>E-post: gatuavdelningen@sundsvall.se';
    }

    // Meddelande avslut
    content +=
      '<br><br>Med vänliga hälsningar<br><br>Stadsbyggnadskontoret<br>Mark- och exploateringsavdelningen<br>Handläggare ' +
      errand.administratorName;

    // info
    content += '<br><br>Vänligen ändra inte ämnesraden om du svarar på detta meddelande';

    // GDPR
    content +=
      '<br><br>De personuppgifter du lämnar kommer att behandlas i enlighet med dataskyddsförordningen GDPR. Läs mer om hur vi hanterar personuppgifter, <a href="http://www.sundsvall.se/personuppgifter" target="_blank">Behandling av personuppgifter, Sundsvalls kommun</a>';

    // lägger till enbart för feedbackPrio och feedbackNormal
    if (inTemplateValue === 'feedbackPrio' || inTemplateValue === 'feedbackNormal') {
      content +=
        '<br><br><a href="http://www.sundsvall.se/allmanhandling" target="_blank">Läs mer om allmänna handlingar, Allmän och offentlig handling, Sundsvalls kommun</a>';
    }

    setRichText(content);
  };

  return (
    <MessageWrapper label="Nytt meddelande" closeHandler={clearAndClose} show={props.show}>
      <div className="my-md py-8 px-40 flex flex-col gap-12 ">
        <Input type="hidden" {...register('headerReplyTo')} />
        <Input type="hidden" {...register('headerReferences')} />
        {!isMEX() && (
          <FormControl className="w-full my-12" size="sm" required id="messageClassification">
            <FormLabel>Välj meddelandetyp</FormLabel>
            <Select
              tabIndex={props.show ? 0 : -1}
              {...register('messageClassification')}
              className="w-full text-dark-primary"
              variant="tertiary"
              size="sm"
              value={getValues('messageClassification')}
              onChange={(e) => {
                setValue('messageClassification', e.currentTarget.value, { shouldDirty: true });
              }}
            >
              {Object.keys(MessageClassification).map((messageType: string) => {
                const id = messageType;
                const label = messageType;
                return (
                  <Select.Option
                    key={`channel-${id}`}
                    value={label}
                    className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                  >
                    {label}
                  </Select.Option>
                );
              })}
            </Select>
          </FormControl>
        )}

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
            <Select.Option value="feedbackPrio">Återkoppling – Prio</Select.Option>
            <Select.Option value="feedbackNormal">Återkoppling – Normal prio</Select.Option>
            <Select.Option value="additionalInformation">Begära in kompletterande uppgifter</Select.Option>
            <Select.Option value="internalReferralBuildingPermit">Internremiss bygglov</Select.Option>
            <Select.Option value="internalReferralWire">Internremiss ledningar</Select.Option>
            <Select.Option value="internalReferralWireCheck">Ledningskoll - hänvisning</Select.Option>
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
                OpenE
              </RadioButton>
            )}
          </fieldset>
        ) : null}
        {contactMeans === 'email' ? (
          <FormControl id="messageEmail" className="w-full">
            <FormLabel>Skicka till följande e-postadress</FormLabel>
            <Input
              tabIndex={props.show ? 0 : -1}
              size="sm"
              className={cx(errors.messageEmail ? 'border border-error' : null)}
              data-cy="messageEmail-input"
              {...register('messageEmail')}
            />

            {errors.messageEmail && (
              <div className="my-sm" data-cy="messageEmail-error">
                <FormErrorMessage className="text-error">{errors.messageEmail?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        ) : contactMeans === 'sms' ? (
          <FormControl id="messagePhone" className="w-full">
            <FormLabel>Skicka till telefonnummer (t ex +46701740635)</FormLabel>
            <Input
              tabIndex={props.show ? 0 : -1}
              size="sm"
              className={cx(errors.messagePhone ? 'border border-error' : null)}
              data-cy="messagePhone-input"
              placeholder="+467..."
              {...register('messagePhone')}
            />

            {errors.messagePhone && (
              <div className="my-sm">
                <FormErrorMessage className="text-error" data-cy="messagePhone-error">
                  {errors.messagePhone?.message}
                </FormErrorMessage>
              </div>
            )}
          </FormControl>
        ) : null}

        {contactMeans === 'email' || contactMeans === 'webmessage' ? (
          <>
            <FormControl id="addExisting" className="w-full">
              <FormLabel>Bilagor från ärendet</FormLabel>
              <div className="flex items-center justify-between">
                {/* <Input type="hidden" {...register('addExisting')} /> */}
                <Select
                  tabIndex={props.show ? 0 : -1}
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
                  variant="primary"
                  size="sm"
                  leftIcon={<AddIcon fontSize="large" className="mr-sm" />}
                  disabled={!addExisting}
                  color="primary"
                  onClick={(e) => {
                    e.preventDefault();
                    if (addExisting) {
                      const att = errand.attachments.find((a) => a.name === addExisting);
                      append(att);
                      setValue(`addExisting`, undefined);
                    }
                  }}
                  className="w-96 rounded-lg ml-sm"
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
              <FormControl id="addNew" data-cy="new-attachment-error" className="w-full">
                <FormLabel>Lägg till en ny bilaga</FormLabel>
                <FileUpload
                  fieldName="newAttachments"
                  fields={newAttachmentsFields}
                  items={newAttachments}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  append={appendNewAttachment}
                  remove={removeNewAttachment}
                  editing={false}
                  allowMultiple={true}
                  allowNameChange={false}
                  accept={ACCEPTED_UPLOAD_FILETYPES}
                  uniqueFileUploaderKey="casedata-messages-tab"
                  dragDrop={false}
                />
              </FormControl>
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
            {isLoading ? 'Skickar' : 'Skicka'}
          </Button>
        </div>
        {error && <FormErrorMessage>Något gick fel när meddelandet sparades.</FormErrorMessage>}
      </div>
    </MessageWrapper>
  );
};
