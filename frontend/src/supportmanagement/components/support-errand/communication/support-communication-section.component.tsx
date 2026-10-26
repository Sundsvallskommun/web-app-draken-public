'use client';

import { FormControl, FormLabel, Input } from '@sk-web-gui/react';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  supportApplicationCompleteAt,
  withSupportApplicationCompleteAt,
} from '@supportmanagement/services/support-investigation-processing-service';
import { supportInvestigationTextKeys } from '@supportmanagement/services/support-investigation-sections';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';

export const SupportCommunicationSection: FC<InvestigationSectionProps> = (props) => {
  const { writable } = props;
  const { t } = useTranslation();
  const { getValues, setValue, watch } = useFormContext<SupportErrand>();

  const completeAt = supportApplicationCompleteAt(watch('parameters'));

  const write = (value: string) =>
    setValue('parameters', withSupportApplicationCompleteAt(getValues('parameters'), value), { shouldDirty: true });

  return (
    <div className="flex flex-col gap-24" data-cy="communication-section">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
        <FormControl className="min-w-0">
          <FormLabel className="text-small font-bold text-dark-secondary">
            {t('common:investigation.application_complete_at')}
          </FormLabel>
          <Input
            type="date"
            disabled={!writable}
            value={completeAt}
            onChange={(event) => write(event.target.value)}
            data-cy="application-complete-at"
          />
        </FormControl>
      </div>

      <InvestigationSectionText {...props} name="communication" {...supportInvestigationTextKeys('communication')} />
    </div>
  );
};
