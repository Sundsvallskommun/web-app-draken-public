import { DecisionOutcome } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { GenericExtraParameters } from '@casedata/interfaces/extra-parameters';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import {
  getProposedOrRecommendedDecision,
  getUtredningPhrases,
  renderUtredningPdf,
  saveDecision,
} from '@casedata/services/casedata-decision-service';
import { getErrand, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { EditorModal } from '@common/components/rich-text-editor/editor-modal.component';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { VerificationModal } from '@common/components/verification-modal/verification-modal.component';
import sanitized from '@common/services/sanitizer-service';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import CheckIcon from '@mui/icons-material/Check';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  LucideIcon as Icon,
  Input,
  Select,
  Spinner,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useFormContext, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';

export interface UtredningFormModel {
  id?: number;
  errandNumber?: string;
  description: string;
  descriptionPlaintext?: string;
  law: string;
  decisionTemplate?: string;
  outcome: string;
  validFrom?: string;
  validTo?: string;
  decidedBy?: CreateStakeholderDto;
  extraParameters: GenericExtraParameters;
}

let formSchema = yup
  .object({
    id: yup.number(),
    errandNumber: yup.string(),
    description: yup.string().required('Text måste anges'),
    law: yup.string().required('Lagrum måste anges'),
    outcome: yup.string().required('Förslag till beslut måste anges'),
  })
  .required();

export const CasedataInvestigationTab: React.FC<{
  errand: IErrand;
  setUnsaved: (unsaved: boolean) => void;
}> = (props) => {
  const toastMessage = useSnackbar();
  const saveConfirm = useConfirm();
  const formControls: UseFormReturn<IErrand, any, undefined> = useFormContext();
  const { municipalityId, errand, user } = useAppContext();
  const { setErrand } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningLoading, setIsSigningLoading] = useState(false);
  const [error, setError] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [richText, setRichText] = useState<string>('');
  const [isSigned, setIsSigned] = useState<boolean>();
  const [selectedLagrum, setSelectedLagrum] = useState<number>(1);
  const [modalAction, setModalAction] = useState<() => Promise<any>>();
  const [modalHeader, setModalHeader] = useState<string>();
  const [modalBody, setModalBody] = useState<string>();
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [firstDescriptionChange, setFirstDescriptionChange] = useState(true);
  const [firstOutcomeChange, setFirstOutcomeChange] = useState(true);
  const [phrasesAppended, setPhrasesAppended] = useState<boolean>(false);
  const [confirmContent, setConfirmContent] = useState<{ title: string; content: string | JSX.Element }>({
    title: 'Spara utredning',
    content: 'Vill du spara den här utredningen?',
  });
  const quillRef = useRef(null);

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
    setValue,
    getValues,
    formState: { errors },
  } = useForm<UtredningFormModel>({
    resolver: yupResolver(formSchema),
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const description = watch().description;
  const outcome = watch().outcome;

  const save = async (data: UtredningFormModel) => {
    setIsLoading(true);
    return renderUtredningPdf(props.errand, data)
      .then((d) => {
        return saveDecision(municipalityId, props.errand, data, 'PROPOSED', d.pdfBase64);
      })
      .then(() => {
        toastMessage({
          status: 'success',
          position: 'bottom',
          closeable: false,
          message: 'Utredningen sparades',
        });
        setIsLoading(false);
        props.setUnsaved(false);
        setTextIsDirty(false);
        reset();
        setError(false);
        return true;
      })
      .catch((e) => {
        toastMessage({
          status: 'error',
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när utredningen skulle sparas',
        });
        console.error('Something went wrong when saving utredning');
        setIsLoading(false);
        setError(true);
        props.setUnsaved(true);
      })
      .finally(() => setIsVerificationModalOpen(false));
  };

  const getPdfPreview = () => {
    const data = getValues();
    renderUtredningPdf(props.errand, data).then(async (d) => {
      const saved = await saveDecision(municipalityId, props.errand, data, 'PROPOSED', d.pdfBase64);
      const refresh = await getErrand(municipalityId, props.errand.id.toString()).then((res) => setErrand(res.errand));
      if (typeof d.error === 'undefined' && typeof d.pdfBase64 !== 'undefined') {
        const uri = `data:application/pdf;base64,${d.pdfBase64}`;
        const link = document.createElement('a');
        link.href = uri;
        link.setAttribute('download', `Utredning-${props.errand.errandNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        setPreviewError(false);
      } else {
        console.error('Error when fetching preview');
        setPreviewError(true);
      }
    });
  };

  const outcomeModalCallback = async (outcome) => {
    const { phrases } = await getUtredningPhrases(props.errand, outcome as DecisionOutcome);
    setRichText(phrases);
    setIsVerificationModalOpen(false);
    setTextIsDirty(true);
    props.setUnsaved(true);
  };

  const handleOutcomeChange = (newOutcome) => {
    if (newOutcome !== outcome) {
      saveConfirm
        .showConfirmation(
          'Är du säker?',
          'Om du byter beslutsförslag kommer nuvarande utredningstext att ersättas.',
          'Ja',
          'Nej',
          'info',
          'info'
        )
        .then((confirmed) => {
          if (confirmed) {
            setFirstOutcomeChange(false);
            setValue('outcome', newOutcome, { shouldDirty: true });
            trigger('outcome');
            outcomeModalCallback(newOutcome);
          }
          return confirmed ? () => true : () => {};
        });
    }
  };

  const onRichTextChange = (val) => {
    const editor = quillRef.current.getEditor();
    const length = editor.getLength();
    setRichText(val);
    setValue('description', sanitized(length > 1 ? val : undefined), { shouldDirty: true });
    trigger('description');
  };

  const appendPhrases = async () => {
    const { phrases } = await getUtredningPhrases(props.errand, 'REJECTION');
    setRichText(phrases);
    setPhrasesAppended(true);
  };

  useEffect(() => {
    setFirstDescriptionChange(true);
    setFirstOutcomeChange(true);
    const decision = getProposedOrRecommendedDecision(props.errand.decisions);
    setIsSigned(decision?.extraParameters['signed'] === 'true');
    if (decision) {
      setValue('outcome', decision.decisionOutcome);
    } else {
      setFirstOutcomeChange(false);
    }
    if (decision) {
      if (decision?.decisionType === 'PROPOSED') {
        setValue('id', decision?.id);
      }
      if (decision.decisionType === 'PROPOSED' || decision?.decisionOutcome === 'APPROVAL') {
        setValue('description', decision.description);
        setRichText((_) => decision?.description);
      } else if (
        !phrasesAppended &&
        decision?.decisionType === 'RECOMMENDED' &&
        decision?.decisionOutcome === 'REJECTION'
      ) {
        appendPhrases();
      }
    }
    setValue('errandNumber', props.errand.errandNumber);
    props.setUnsaved(false);
    trigger();
  }, [props.errand]);

  useEffect(() => {
    props.setUnsaved(textIsDirty);
  }, [textIsDirty]);

  useEffect(() => {
    props.setUnsaved(formState.isDirty);
  }, [formState.isDirty]);

  useEffect(() => {
    if (description && description !== '') {
      if (firstDescriptionChange || phrasesAppended) {
        setFirstDescriptionChange(false);
        setPhrasesAppended(false);
      } else {
        props.setUnsaved(textIsDirty);
      }
    }
  }, [description]);

  const lagrumsMapping = [
    {
      id: 1,
      label: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
    },
  ];

  return (
    <>
      <div className="w-full py-24 px-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <div className="inline-flex mt-ms gap-lg justify-start items-center flex-wrap">
            <h2 className="text-h4-sm md:text-h4-md">Utredning</h2>
          </div>
          <Button
            type="button"
            disabled={!formState.isValid || isErrandLocked(errand) || !allowed}
            size="sm"
            variant="primary"
            color="vattjom"
            inverted={!(isErrandLocked(errand) || !allowed)}
            rightIcon={<Icon name="download" size={18} />}
            onClick={getPdfPreview}
            data-cy="preview-investigation-button"
          >
            Förhandsgranska PDF
          </Button>
        </div>
        <div className="mt-lg">
          {errand?.decisions && errand?.decisions[0]?.decisionType === 'RECOMMENDED' && (
            <div className="bg-background-200 rounded-groups gap-12 flex py-10 px-16 mb-lg">
              <div>
                <Icon name="info" color="vattjom" />
              </div>
              <div>
                <p className="m-0 pr-24" data-cy="recommended-decision">
                  {errand?.decisions[0].description}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(save)} data-cy="utredning-form">
            <div className="flex gap-24">
              <FormControl className="w-full">
                <FormLabel>Välj lagrum</FormLabel>
                <Input
                  type="hidden"
                  {...register('law')}
                  value={lagrumsMapping.find((l) => l.id === selectedLagrum).label}
                />
                <Select
                  className="w-full"
                  data-cy="lagrum-select"
                  disabled={isErrandLocked(errand) || !allowed}
                  name="lagrum"
                  onChange={(e) => setValue('law', e.currentTarget.value)}
                  placeholder="Välj lagrum"
                  value={getValues('law')}
                >
                  {lagrumsMapping.map((lagrum, index) => (
                    <Select.Option key={index} value={lagrum.label}>
                      {lagrum.label}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl className="w-full" data-cy="decision-outcome-dropdown">
                <FormLabel>Förslag till beslut</FormLabel>
                <Input data-cy="utredning-outcome-input" type="hidden" {...register('outcome')} />
                <Select
                  className="w-full"
                  data-cy="outcome-select"
                  disabled={isErrandLocked(errand) || !allowed}
                  onChange={(e) => handleOutcomeChange(e.currentTarget.value)}
                  placeholder="Välj beslut"
                  value={getValues('outcome') ? getValues('outcome') : errand.decisionOutcome}
                >
                  <Select.Option data-cy="outcome-input-item" value={'APPROVAL'}>
                    Bifall
                  </Select.Option>
                  <Select.Option data-cy="outcome-input-item" value={'REJECTION'}>
                    Avslag
                  </Select.Option>
                  <Select.Option data-cy="outcome-input-item" value={'CANCELLATION'}>
                    Ärendet avskrivs
                  </Select.Option>
                </Select>
                <div className="my-sm">
                  {errors.outcome && formState.dirtyFields.outcome && (
                    <FormErrorMessage>{errors.outcome.message}</FormErrorMessage>
                  )}
                </div>
              </FormControl>
            </div>
            <FormControl className="w-full">
              <FormLabel>Utredningstext</FormLabel>
              <Input type="hidden" {...register('id')} />
              <Input data-cy="utredning-description-input" type="hidden" {...register('description')} />
              <Input type="hidden" {...register('errandNumber')} />
              <div className="h-[28rem]" data-cy="utredning-richtext-wrapper">
                <RichTextEditor
                  ref={quillRef}
                  value={richText}
                  isMaximizable={false}
                  readOnly={!allowed}
                  toggleModal={() => {}}
                  onChange={(value, delta, source, editor) => {
                    if (source === 'user') {
                      setTextIsDirty(true);
                    }
                    return onRichTextChange(value);
                  }}
                />
              </div>
              <div className="my-sm">
                {errors.description && formState.isDirty && (
                  <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
                )}
              </div>
            </FormControl>
            <div className="flex justify-between">
              <Button
                data-cy="save-utredning-button"
                variant="primary"
                color="primary"
                type="button"
                onClick={handleSubmit(() => {
                  return saveConfirm
                    .showConfirmation(confirmContent.title, confirmContent.content, 'Ja', 'Nej', 'info', 'info')
                    .then((confirmed) => {
                      if (confirmed) {
                        save(getValues());
                      }
                      return confirmed ? () => true : () => {};
                    });
                })}
                disabled={!allowed || isErrandLocked(errand) || !formState.isValid || !textIsDirty}
                leftIcon={
                  isLoading ? (
                    <Spinner color="tertiary" size={2} className="mr-sm" />
                  ) : (
                    <CheckIcon fontSize="large" className="mr-sm" />
                  )
                }
              >
                {isLoading ? 'Sparar' : 'Spara'}
              </Button>
            </div>
            <div className="mt-lg">
              {error && <FormErrorMessage>Något gick fel när utredningen sparades.</FormErrorMessage>}
            </div>
            <div className="mt-lg">
              {previewError && <FormErrorMessage>Något gick fel när förhandsgranskningen skapades.</FormErrorMessage>}
            </div>
          </form>
        </div>
        {isEditorModalOpen && (
          <EditorModal
            isOpen={isEditorModalOpen}
            modalHeader="Utredningstext"
            modalBody={quillRef.current.getEditor().getContents()}
            onChange={(delta) => {
              setTextIsDirty(true);
              return onRichTextChange(delta);
            }}
            onClose={() => {
              setIsEditorModalOpen(false);
            }}
            onCancel={() => {
              setIsEditorModalOpen(false);
            }}
            onContinue={modalAction}
          />
        )}
        {isVerificationModalOpen && (
          <VerificationModal
            isOpen={isVerificationModalOpen}
            modalHeader="Är du säker?"
            modalBody={modalBody}
            onClose={() => {
              setIsVerificationModalOpen(false);
            }}
            onCancel={() => {
              setIsVerificationModalOpen(false);
            }}
            onContinue={modalAction}
          />
        )}
      </div>
    </>
  );
};
