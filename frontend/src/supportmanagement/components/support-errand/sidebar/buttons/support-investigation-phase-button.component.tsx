import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportErrandById } from '@supportmanagement/services/support-errand-service';
import {
  startSupportInvestigation,
  SUPPORT_INVESTIGATION_SECTIONS,
} from '@supportmanagement/services/support-investigation-service';
import {
  getSupportErrandProcess,
  hasReachedSupportProcessStep,
  isSupportProcessSignalStale,
  sendSupportProcessSignal,
  supportProcessAwaitingSignals,
  SupportProcessStep,
} from '@supportmanagement/services/support-process-service';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export const SupportInvestigationPhaseButton: FC = () => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setActiveTabKey = useSupportStore((s) => s.setActiveTabKey);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { reset } = useFormContext();
  const [isStarting, setIsStarting] = useState(false);

  const process = getSupportErrandProcess(supportErrand);
  const reachedInvestigation = hasReachedSupportProcessStep(SupportProcessStep.INVESTIGATION, process);
  const atReview = hasReachedSupportProcessStep(SupportProcessStep.REVIEW, process) && !reachedInvestigation;
  const awaitingSignal = supportProcessAwaitingSignals(process)[0];

  if (!supportErrand?.id) {
    return null;
  }

  if (reachedInvestigation) {
    return (
      <Button className="w-full my-8" variant="primary" disabled data-cy="ready-for-decision-button">
        {t('common:investigation.ready_for_decision')}
      </Button>
    );
  }

  if (!atReview) {
    return null;
  }

  const startInvestigation = async () => {
    setIsStarting(true);
    try {
      await sendSupportProcessSignal(supportErrand.id!, municipalityId, awaitingSignal.name!);
      await startSupportInvestigation(
        supportErrand.id!,
        municipalityId,
        t('common:investigation.title'),
        SUPPORT_INVESTIGATION_SECTIONS.map((section) => ({
          sectionKey: section.sectionKey,
          heading: t(section.headingKey),
          sortOrder: section.sortOrder,
        }))
      ).catch(() => undefined);

      const updated = await getSupportErrandById(supportErrand.id!, municipalityId);
      setSupportErrand(updated.errand);
      reset(updated.errand);
      setActiveTabKey('investigation');
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t('common:investigation.started'),
        status: 'success',
      });
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: isSupportProcessSignalStale(error)
          ? t('common:investigation.start_stale')
          : t('common:investigation.start_error'),
        status: 'error',
      });
      const updated = await getSupportErrandById(supportErrand.id!, municipalityId).catch(() => undefined);
      if (updated) setSupportErrand(updated.errand);
    } finally {
      setIsStarting(false);
    }
  };

  const confirmStart = () =>
    confirm
      .showConfirmation(
        t('common:investigation.start_confirm_title'),
        <div className="flex flex-col gap-8">
          <span>{t('common:investigation.start_confirm_text')}</span>
          <strong>{t('common:investigation.start_confirm_question')}</strong>
        </div>,
        t('common:investigation.confirm_yes'),
        t('common:investigation.confirm_no'),
        'primary'
      )
      .then((confirmed) => {
        if (confirmed) startInvestigation();
      });

  return (
    <Button
      className="w-full my-8"
      variant="primary"
      loading={isStarting}
      disabled={!canEdit || isStarting || !awaitingSignal?.name}
      onClick={confirmStart}
      data-cy="start-investigation-button"
    >
      {t('common:investigation.start_phase')}
    </Button>
  );
};
