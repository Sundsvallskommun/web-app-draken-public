import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { useUnsavedEdits } from '@common/hooks/use-unsaved-edits';
import { Button, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getSupportInvestigation,
  isSupportInvestigationCompleted,
  isSupportInvestigationConflict,
  saveSupportInvestigation,
  startSupportInvestigation,
  SUPPORT_INVESTIGATION_SECTIONS,
} from '@supportmanagement/services/support-investigation-service';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationConclusionDisclosure } from './disclosure/investigation-conclusion-disclosure.component';
import { SectionDisclosure } from './disclosure/investigation-disclosure.component';

const sectionsInOrder = (investigation: Investigation | undefined): InvestigationSection[] =>
  [...(investigation?.sections ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const asDate = (value: string | undefined): string =>
  value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : '-';

const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-small text-dark-secondary">{label}</span>
    <span>{value}</span>
  </div>
);

export const SupportErrandInvestigationTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
  setHasContent: (hasContent: boolean) => void;
  inStep: boolean;
  writable: boolean;
}> = ({ setUnsaved, setHasContent, inStep, writable }) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const toastMessage = useSnackbar();

  const [investigation, setInvestigation] = useState<Investigation>();
  const [statementsEdited, setStatementsEdited] = useState(false);
  const saveStatements = useRef<() => Promise<boolean>>(undefined);
  const [suitabilityEdited, setSuitabilityEdited] = useState(false);
  const saveSuitability = useRef<() => Promise<boolean>>(undefined);
  const saveLatest = useRef<() => Promise<boolean>>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { values, set, load, merge, edited } = useUnsavedEdits({
    summary: '',
    conclusion: '',
    recommendation: '',
    recommendationMotivation: '',
  });

  const outcomes = supportMetadata?.decisionOutcomes ?? [];
  const setTabSaver = useSupportStore((s) => s.setTabSaver);
  const saver = useCallback(() => saveLatest.current?.() ?? Promise.resolve(true), []);

  useEffect(() => {
    setTabSaver('investigation', saver);
    return () => setTabSaver('investigation', undefined);
  }, [saver, setTabSaver]);
  const errandId = supportErrand?.id;
  const modified = supportErrand?.modified;
  const startedAutomatically = useRef(false);
  const readOnly = !canEdit || !writable || isSupportInvestigationCompleted(investigation);

  const receive = (result: Investigation | undefined) => {
    setInvestigation(result);
    load(result);
  };

  const receiveKeepingUnsavedEdits = useCallback(
    (result: Investigation | undefined) => {
      setInvestigation(result);
      merge(result);
    },
    [merge]
  );

  useEffect(() => {
    if (!errandId) return undefined;
    let current = true;
    getSupportInvestigation(errandId, municipalityId)
      .then((result) => {
        if (!current) return;
        receiveKeepingUnsavedEdits(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (!current) return;
        setError(true);
        setIsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [errandId, municipalityId, modified, receiveKeepingUnsavedEdits]);

  useEffect(() => {
    setUnsaved(edited || statementsEdited || suitabilityEdited);
  }, [edited, statementsEdited, suitabilityEdited, setUnsaved]);

  useEffect(() => {
    setHasContent(Boolean(investigation));
  }, [investigation, setHasContent]);

  const reportFailure = (failure: unknown) =>
    toastMessage({
      position: 'bottom',
      closeable: false,
      message: isSupportInvestigationConflict(failure)
        ? t('common:investigation.conflict')
        : t('common:investigation.save_error'),
      status: 'error',
    });

  const reload = () => {
    if (!errandId) return;
    getSupportInvestigation(errandId, municipalityId)
      .then(receive)
      .catch(() => undefined);
  };

  const forgetAStartThatFailed = (started: Investigation | undefined) => {
    if (!started) startedAutomatically.current = false;
  };

  const start = (): Promise<Investigation | undefined> => {
    if (!errandId) return Promise.resolve(undefined);
    setIsSaving(true);
    return startSupportInvestigation(
      errandId,
      municipalityId,
      t('common:investigation.title'),
      SUPPORT_INVESTIGATION_SECTIONS.map((section) => ({
        sectionKey: section.sectionKey,
        heading: t(section.headingKey),
        sortOrder: section.sortOrder,
      }))
    )
      .then((result) => {
        receive(result);
        return result;
      })
      .catch((failure) => {
        reportFailure(failure);
        return undefined;
      })
      .finally(() => setIsSaving(false));
  };

  useEffect(() => {
    if (isLoading || error || investigation || !inStep || !canEdit || startedAutomatically.current) return;
    startedAutomatically.current = true;
    void start().then(forgetAStartThatFailed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, investigation, inStep, canEdit]);

  const save = async (): Promise<boolean> => {
    if (!errandId || !investigation?.id) return true;

    const statementsSaved = (await saveStatements.current?.()) ?? true;
    const suitabilitySaved = (await saveSuitability.current?.()) ?? true;
    if (!statementsSaved || !suitabilitySaved) return false;

    setIsSaving(true);
    try {
      receive(
        await saveSupportInvestigation(errandId, municipalityId, investigation.id, {
          version: investigation.version ?? 0,
          summary: values.summary,
          conclusion: values.conclusion,
          recommendation: values.recommendation || undefined,
          recommendationMotivation: values.recommendationMotivation,
        })
      );
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t('common:investigation.saved'),
        status: 'success',
      });
      return true;
    } catch (error) {
      reportFailure(error);
      reload();
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // The saver is registered once; the ref keeps it pointing at the current fields.
  saveLatest.current = save;

  const sections = useMemo(() => sectionsInOrder(investigation), [investigation]);

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24">
      <div>
        <h2 className="text-h2-md mb-8">{t('common:investigation.heading')}</h2>
        <p className="m-0">{t('common:investigation.intro')}</p>
      </div>

      {isLoading ? <Spinner size={3} aria-label={t('common:investigation.loading')} /> : null}
      {error ? <p>{t('common:investigation.error')}</p> : null}

      {!isLoading && !error && !investigation && inStep ? (
        <Spinner size={3} aria-label={t('common:investigation.starting')} />
      ) : null}

      {!isLoading && !error && !investigation && !inStep && !writable ? (
        <p className="m-0">{t('common:investigation.step_passed')}</p>
      ) : null}

      {!isLoading && !error && !investigation && !inStep && writable ? (
        <div className="flex flex-col gap-16 max-w-[48rem]">
          <p className="m-0">{t('common:investigation.not_started')}</p>
          <div>
            <Button
              variant="primary"
              loading={isSaving}
              disabled={!canEdit || isSaving}
              onClick={start}
              data-cy="start-investigation"
            >
              {t('common:investigation.start')}
            </Button>
          </div>
        </div>
      ) : null}

      {!isLoading && !error && investigation ? (
        <div className="flex flex-col gap-24">
          <div className="flex flex-wrap gap-40">
            <MetaItem label={t('common:investigation.investigator')} value={investigation.investigatorUserId ?? '-'} />
            <MetaItem label={t('common:investigation.started_at')} value={asDate(investigation.startedAt)} />
            <MetaItem label={t('common:investigation.due_at')} value={asDate(investigation.dueAt)} />
            {isSupportInvestigationCompleted(investigation) ? (
              <MetaItem label={t('common:investigation.status_completed')} value={asDate(investigation.completedAt)} />
            ) : null}
          </div>
          <p className="text-small text-dark-secondary italic m-0">{t('common:investigation.processing_time')}</p>
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <SectionDisclosure
                key={section.id ?? section.sectionKey}
                section={section}
                writable={!readOnly}
                onStatementsEdited={setStatementsEdited}
                saveStatements={saveStatements}
                onSuitabilityEdited={setSuitabilityEdited}
                saveSuitability={saveSuitability}
              />
            ))}
            <InvestigationConclusionDisclosure values={values} readOnly={readOnly} set={set} outcomes={outcomes} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
