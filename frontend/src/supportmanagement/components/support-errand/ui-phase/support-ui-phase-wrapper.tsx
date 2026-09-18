'use client';

import { ProgressStepper } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { hasSupportErrandProcess } from '@supportmanagement/services/support-process-service';
import {
  getSupportUiPhase,
  SUPPORT_UI_PHASE_ORDER,
  supportUiPhaseTranslationKey,
} from '@supportmanagement/services/support-ui-phase-service';
import { useTranslation } from 'react-i18next';

import { SupportProcessRow } from './support-process-row.component';

export const SupportUiPhaseWrapper = () => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const activePhase = getSupportUiPhase(supportErrand);

  if (hasSupportErrandProcess(supportErrand)) {
    return <SupportProcessRow />;
  }

  const steps = SUPPORT_UI_PHASE_ORDER.map((phase) => t(supportUiPhaseTranslationKey(phase)));
  const current = SUPPORT_UI_PHASE_ORDER.findIndex((phase) => phase === activePhase);

  return (
    <ProgressStepper
      steps={steps}
      current={current}
      labelPosition="right"
      size="sm"
      className="w-fit"
      data-cy="ui-phase-stepper"
    />
  );
};
