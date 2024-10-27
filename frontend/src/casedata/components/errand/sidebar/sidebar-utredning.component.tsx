import { DecisionOutcomeKey } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { GenericExtraParameters } from '@casedata/interfaces/extra-parameters';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import {
  getProposedDecisonWithHighestId,
  getProposedOrRecommendedDecision,
  renderUtredningPdf,
  saveDecision,
} from '@casedata/services/casedata-decision-service';
import { getErrand, isErrandAdmin, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { sanitized } from '@common/services/sanitizer-service';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, FormControl, FormErrorMessage, Input, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useEffect, useRef, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import * as yup from 'yup';

export interface UtredningFormModel {
  id?: number;
  errandNumber?: string;
  description: string;
  law: string;
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
    law: yup.string(),
    outcome: yup.string(),
    validFrom: yup.string(),
    validTo: yup.string(),
    decidedBy: yup.string(),
    extraParameters: yup.object(),
  })
  .required();

export const SidebarUtredning: React.FC = () => {
  const {
    municipalityId,
    errand,
    setErrand,
    user,
  }: { municipalityId: string; errand: IErrand; setErrand: (e: IErrand) => void; user: User } = useAppContext();
  const quillRefUtredning = useRef(null);
  const [richText, setRichText] = useState<string>('');
  const [isSigned, setIsSigned] = useState<boolean>();
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [selectedLagrum, setSelectedLagrum] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const outcomeChangeConfirm = useConfirm();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
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
  }: UseFormReturn<UtredningFormModel, any, undefined> = useForm({
    resolver: yupResolver(formSchema),
    mode: 'onChange',
  });

  const description = watch().description;
  const outcome = watch().outcome;

  const save = async (data: UtredningFormModel) => {
    try {
      setIsLoading(true);
      const rendered = await renderUtredningPdf(errand, data);
      const saved = await saveDecision(municipalityId, errand, data, 'PROPOSED', rendered.pdfBase64);
      const refresh = await getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
      setIsLoading(false);
      setError(undefined);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Utredningen sparades',
        status: 'success',
      });
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
      setError(undefined);
    }
  };

  const getPdfPreview = async () => {
    const createAndClickLink = (d: { pdfBase64: string; error?: string }) => {
      if (typeof d.error === 'undefined' && typeof d.pdfBase64 !== 'undefined') {
        const uri = `data:application/pdf;base64,${d.pdfBase64}`;
        const link = document.createElement('a');
        link.href = uri;
        link.setAttribute('download', `Utredning-${errand.errandNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        setIsPreviewLoading(false);
      } else {
        setIsPreviewLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel förhandsgranskningen skapades',
          status: 'error',
        });
        console.error('Error when fetching preview');
      }
    };
    try {
      setIsPreviewLoading(true);
      let data: UtredningFormModel;
      if (isSigned) {
        const decision = getProposedOrRecommendedDecision(errand.decisions);
        data = {
          id: decision.id,
          description: decision.description,
          law: decision.law[0].heading,
          outcome: DecisionOutcomeKey.Bifall,
          validFrom: decision.validFrom,
          validTo: decision.validTo,
          extraParameters: decision.extraParameters,
        };
      } else {
        data = getValues();
      }
      let pdfData: {
        pdfBase64: string;
        error?: string;
      };
      if (!isSigned) {
        const rendered = await renderUtredningPdf(errand, data);
        const saved = await saveDecision(municipalityId, errand, data, 'PROPOSED', rendered.pdfBase64);
      }
      const refresh = await getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
      const decision = getProposedDecisonWithHighestId(errand.decisions);
      if (!decision) {
        setIsPreviewLoading(false);
        throw new Error('Inget beslut hittades');
      }
      const pdfBase64 = decision?.attachments?.[0]?.file;
      if (!pdfBase64) {
        throw new Error('Ingen PDF hittades');
      }
      pdfData = {
        pdfBase64,
        error: !pdfBase64 ? 'Error when fetching existing pdf data' : undefined,
      };
      createAndClickLink(pdfData);
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: error.message,
        status: 'error',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const onSubmit = () => {
    const data = getValues();
    save(data);
  };

  const onError = (e) => {
    console.error('Something went wrong when saving utredning', e);
  };

  const onRichTextChange = (val) => {
    const editor = quillRefUtredning.current.getEditor();
    const length = editor.getLength();
    setRichText(val);
    setValue('description', sanitized(length > 1 ? val : undefined));
    trigger('description');
  };

  useEffect(() => {
    const existingUtredning = errand.decisions?.find((d) => d.decisionType === 'PROPOSED');
    setValue('errandNumber', errand.errandNumber);
    setValue('outcome', DecisionOutcomeKey.Bifall);
    if (existingUtredning) {
      setValue('id', existingUtredning.id);
      setValue('description', existingUtredning.description);
      setRichText(existingUtredning.description);
      // setValue('law', existingUtredning.law[0].)
      setValue('outcome', existingUtredning.decisionOutcome);
    }
  }, [errand]);

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">Utredningstext</span>
      </div>

      <div className="w-full mt-xl flex flex-col items-start gap-12">
        <Input type="hidden" {...register('id')} />
        <Input type="hidden" {...register('errandNumber')} />
        <Input type="hidden" {...register('outcome')} />
        <FormControl id="description" className="w-full">
          <Input data-cy="utredning-description-input" type="hidden" {...register('description')} />
          <div className="h-[42rem] -mb-48" data-cy="utredning-richtext-wrapper">
            <RichTextEditor
              ref={quillRefUtredning}
              containerLabel="utredning"
              value={richText}
              isMaximizable={false}
              readOnly={isSigned || !isErrandAdmin(errand, user)}
              // toggleModal={() => {
              //   setIsEditorModalOpen(!isEditorModalOpen);
              // }}
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
        <Input type="hidden" {...register('law')} value={''} />
        <Input type="hidden" {...register('outcome')} value={DecisionOutcomeKey.Okänt} />
        <div className="flex gap-8">
          <Button
            color="primary"
            disabled={
              !errand?.id ||
              description === '' ||
              outcome === '' ||
              isErrandLocked(errand) ||
              !allowed ||
              !isErrandAdmin(errand, user)
            }
            loadingText="Sparar"
            loading={isLoading}
            size="sm"
            onClick={() => onSubmit()}
            data-cy="save-investigation-description-button"
          >
            Spara
          </Button>
        </div>
      </div>
    </div>
  );
};
