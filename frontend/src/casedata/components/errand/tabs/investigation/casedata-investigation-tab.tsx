import { DecisionOutcome } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { GenericExtraParameters } from '@casedata/interfaces/extra-parameters';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import {
  getProposedOrRecommendedDecision,
  getUtredningPhrases,
  lawMapping,
  renderUtredningPdf,
  saveDecision,
} from '@casedata/services/casedata-decision-service';
import { getErrand, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { EditorModal } from '@common/components/rich-text-editor/editor-modal.component';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { Law } from '@common/data-contracts/case-data/data-contracts';
import sanitized from '@common/services/sanitizer-service';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import CheckIcon from '@mui/icons-material/Check';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  cx,
  FormControl,
  FormErrorMessage,
  FormLabel,
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
  descriptionPlaintext: string;
  law: Law[];
  decisionTemplate: string;
  outcome: string;
  validFrom: string;
  validTo: string;
  decidedBy: CreateStakeholderDto;
  extraParameters: GenericExtraParameters;
}

let formSchema = yup
  .object({
    id: yup.string(),
    errandNumber: yup.string(),
    description: yup.string().required('Text måste anges'),
    law: yup.array().min(1, 'Lagrum måste anges'),
    outcome: yup.string().required('Förslag till beslut måste anges'),
  })
  .required();

export const CasedataInvestigationTab: React.FC<{
  errand: IErrand;
  setUnsaved: (unsaved: boolean) => void;
}> = (props) => {
  const toastMessage = useSnackbar();
  const saveConfirm = useConfirm();
  const { municipalityId, errand, user, administrators }: AppContextInterface = useAppContext();
  const { setErrand } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [richText, setRichText] = useState<string>('');
  const [isSigned, setIsSigned] = useState<boolean>();
  const [modalAction, setModalAction] = useState<() => Promise<any>>();
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
    try {
      setIsLoading(true);
      const rendered = await renderUtredningPdf(errand, data);
      const saved = await saveDecision(municipalityId, props.errand, data, 'PROPOSED', rendered.pdfBase64);
      setIsLoading(false);
      setError(undefined);
      props.setUnsaved(false);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Utredningen sparades',
        status: 'success',
      });
      await getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när utredningen skulle sparas',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
      setError(undefined);
    }
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
      setValue('law', decision.law);
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
            rightIcon={<LucideIcon name="download" size={18} />}
            onClick={getPdfPreview}
            data-cy="preview-investigation-button"
          >
            Förhandsgranska PDF
          </Button>
        </div>
        <div className="mt-lg">
          {errand?.decisions && errand?.decisions.find((d) => d.decisionType === 'RECOMMENDED') && (
            <div className="bg-background-200 rounded-groups gap-12 flex py-10 px-16 mb-lg">
              <div>
                <LucideIcon name="info" color="vattjom" />
              </div>
              <div>
                <p className="m-0 pr-24" data-cy="recommended-decision">
                  {errand?.decisions.find((d) => d.decisionType === 'RECOMMENDED').description}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(save)} data-cy="utredning-form">
            <Input type="hidden" {...register('decidedBy')} value={user.username} />
            <div className="flex gap-24">
              <FormControl className="w-full">
                <FormLabel>Lagrum</FormLabel>
                <Input type="hidden" {...register('law')} />
                <Select
                  className={cx(`w-full`, errors.law ? 'border-error' : '')}
                  data-cy="investigation-law-select"
                  name="law"
                  size="sm"
                  onChange={(e) => {
                    setValue(
                      'law',
                      lawMapping.filter((law) => {
                        return law.heading === e.target.value;
                      }),
                      { shouldDirty: true }
                    );
                    props.setUnsaved(true);
                    trigger();
                  }}
                  placeholder="Välj lagrum"
                  value={getValues('law')?.[0] ? getValues('law')[0].heading : undefined}
                >
                  <Select.Option value={''}>Välj lagrum</Select.Option>
                  {lawMapping.map((law, index) => {
                    return (
                      <Select.Option key={index} value={law.heading}>
                        {law.heading}
                      </Select.Option>
                    );
                  })}
                </Select>
                <div className="my-sm text-error">
                  {errors.law && formState.dirtyFields.law && <FormErrorMessage>{errors.law.message}</FormErrorMessage>}
                </div>
              </FormControl>
              <FormControl className="w-full" data-cy="decision-outcome-dropdown">
                <FormLabel>Förslag till beslut</FormLabel>
                <Input data-cy="utredning-outcome-input" type="hidden" {...register('outcome')} />
                <Select
                  className={cx(`w-full`, errors.outcome ? 'border-error' : '')}
                  data-cy="outcome-select"
                  size="sm"
                  disabled={isErrandLocked(errand) || !allowed}
                  onChange={(e) => handleOutcomeChange(e.currentTarget.value)}
                  placeholder="Välj beslut"
                  value={getValues('outcome') ? getValues('outcome') : ''}
                >
                  <Select.Option data-cy="outcome-input-item" value={''}>
                    Välj utfall
                  </Select.Option>
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
                <div className="my-sm text-error">
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
                // disabled={!allowed || isErrandLocked(errand) || !formState.isValid || !textIsDirty}
                disabled={!allowed || isErrandLocked(errand) || !formState.isValid || !formState.isDirty}
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
      </div>
    </>
  );
};
