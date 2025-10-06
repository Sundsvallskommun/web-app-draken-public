'use client';

import { DecisionOutcomeKey } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { GenericExtraParameters } from '@casedata/interfaces/extra-parameters';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import { renderUtredningPdf, saveDecision } from '@casedata/services/casedata-decision-service';
import { getErrand, isErrandAdmin, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { Law } from '@common/data-contracts/case-data/data-contracts';
import { User } from '@common/interfaces/user';
import { sanitized } from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, cx, FormControl, FormErrorMessage, Input, useSnackbar } from '@sk-web-gui/react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import * as yup from 'yup';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export interface UtredningFormModel {
  id?: string;
  errandNumber?: string;
  personalNumber?: string;
  errandCaseType?: string;
  description: string;
  law: Law;
  outcome: string;
  validFrom?: string;
  validTo?: string;
  decidedBy?: CreateStakeholderDto;
  extraParameters: GenericExtraParameters;
}

let formSchema = yup
  .object({
    id: yup.string(),
    errandNumber: yup.string(),
    personalNumber: yup.string(),
    errandCaseType: yup.string(),
    description: yup.string().required('Text måste anges'),
    law: yup.object(),
    outcome: yup.string(),
    validFrom: yup.string(),
    validTo: yup.string(),
    decidedBy: yup.object(),
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const {
    register,
    watch,
    trigger,
    formState,
    setValue,
    getValues,
    formState: { errors },
  }: UseFormReturn<UtredningFormModel, any, undefined> = useForm({
    resolver: yupResolver(formSchema) as any,
    mode: 'onChange',
  });

  const { description, outcome } = watch();

  const save = async (data: UtredningFormModel) => {
    try {
      setIsLoading(true);
      const rendered = await renderUtredningPdf(errand, data);
      await saveDecision(municipalityId, errand, data, 'PROPOSED', rendered.pdfBase64);
      await getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
      setIsLoading(false);
      setError(false);
      toastMessage(
        getToastOptions({
          message: 'Utredningen sparades',
          status: 'success',
        })
      );
    } catch {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när utredningen sparades',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
      setError(false);
    }
  };

  const onSubmit = () => {
    const data = getValues();
    save(data);
  };

  useEffect(() => {
    const existingUtredning = errand.decisions?.find((d) => d.decisionType === 'PROPOSED');
    setValue('errandNumber', errand.errandNumber);
    setValue('personalNumber', getOwnerStakeholder(errand)?.personalNumber);
    setValue('errandCaseType', errand.caseType);
    setValue('outcome', DecisionOutcomeKey.Bifall);
    if (existingUtredning) {
      setValue('id', existingUtredning.id.toString());
      setValue('description', existingUtredning.description);
      setValue('outcome', existingUtredning.decisionOutcome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">Utredningstext</span>
      </div>

      <div className="w-full mt-xl flex flex-col items-start gap-12">
        <Input type="hidden" {...register('id')} />
        <Input type="hidden" {...register('errandNumber')} />
        <Input type="hidden" {...register('errandCaseType')} />
        <Input type="hidden" {...register('personalNumber')} />
        <Input type="hidden" {...register('outcome')} />
        <FormControl id="description" className="w-full">
          <Input data-cy="utredning-description-input" type="hidden" {...register('description')} />
          <div className="h-[42rem] -mb-48" data-cy="utredning-richtext-wrapper">
            <TextEditor
              className={cx(`mb-md h-[80%]`)}
              onChange={(e) => {
                setValue('description', e.target.value.markup);
                trigger('description');
              }}
              value={{ markup: description }}
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
