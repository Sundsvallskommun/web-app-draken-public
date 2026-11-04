import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { useUnsavedEdits } from '@common/hooks/use-unsaved-edits';
import { renderTemplateHtml } from '@common/services/template-render-service';
import { Button, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { type ExaminedInvestigation, investigationVariantFor } from '@supportmanagement/investigations';
import { isSupportMigratedErrand } from '@supportmanagement/services/support-errand-service';
import {
  missingSupportInvestigationSections,
  sectionKeyOf,
  supportInvestigationSectionInputs,
  visibleSupportInvestigationSections,
} from '@supportmanagement/services/support-investigation-sections';
import {
  completeSupportInvestigationSections,
  getSupportInvestigation,
  isSupportInvestigationCompleted,
  isSupportInvestigationConflict,
  saveSupportInvestigation,
  saveSupportInvestigationSection,
  startSupportInvestigation,
} from '@supportmanagement/services/support-investigation-service';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InspectionProtocol } from './inspection-protocol.component';
import { InvestigationBasis } from './investigation-basis.component';
import { InvestigationConclusionDisclosure } from './investigation-conclusion-disclosure.component';
import { SectionDisclosure } from './investigation-disclosure.component';
import { asInvestigationDate, InvestigationMetaItem } from './investigation-meta.component';
import { MigratedInvestigation } from './migrated-investigation.component';

const conclusionEditsOf = (investigation: Investigation | undefined) => ({
  proposal: investigation?.summary ?? '',
  conclusion: investigation?.conclusion ?? '',
  recommendation: investigation?.recommendation ?? '',
  recommendationMotivation: investigation?.recommendationMotivation ?? '',
});

type SectionSave = React.MutableRefObject<(() => Promise<boolean>) | undefined>;

interface InvestigationTabProps {
  setUnsaved: (unsaved: boolean) => void;
  setHasContent: (hasContent: boolean) => void;
  inStep: boolean;
  writable: boolean;
}

export const SupportErrandInvestigationTab: React.FC<InvestigationTabProps> = (props) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const variant = useMemo(() => investigationVariantFor(supportErrand), [supportErrand]);

  if (isSupportMigratedErrand(supportErrand)) {
    return <MigratedInvestigation setHasContent={props.setHasContent} />;
  }

  return variant.body === 'protocol' ? (
    <InspectionProtocol writable={props.writable} setHasContent={props.setHasContent} />
  ) : (
    <ExaminedInvestigationBody {...props} variant={variant} />
  );
};

const ExaminedInvestigationBody: React.FC<InvestigationTabProps & { variant: ExaminedInvestigation }> = ({
  setUnsaved,
  setHasContent,
  inStep,
  writable,
  variant,
}) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const toastMessage = useSnackbar();

  const [investigation, setInvestigation] = useState<Investigation>();
  const [editedSections, setEditedSections] = useState<Record<string, boolean>>({});
  const sectionSaves = useRef<Record<string, SectionSave>>({});
  const savedInvestigation = useRef<Investigation>(undefined);
  const saveLatest = useRef<() => Promise<boolean>>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { values, set, load, merge, edited } = useUnsavedEdits(conclusionEditsOf(undefined));

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
  const examinationsCompleted = useRef(false);
  const legalBasisFilled = useRef(false);
  const readOnly = !canEdit || !writable || isSupportInvestigationCompleted(investigation);

  const receive = (result: Investigation | undefined) => {
    setInvestigation(result);
    load(conclusionEditsOf(result));
  };

  const receiveKeepingUnsavedEdits = useCallback(
    (result: Investigation | undefined) => {
      setInvestigation(result);
      merge(conclusionEditsOf(result));
    },
    [merge]
  );

  const receiveFromSection = useCallback(
    (result: Investigation) => {
      savedInvestigation.current = result;
      receiveKeepingUnsavedEdits(result);
    },
    [receiveKeepingUnsavedEdits]
  );

  const saveRefOfSection = (sectionKey: string): SectionSave =>
    (sectionSaves.current[sectionKey] ??= { current: undefined });

  const noteSectionEdited = useCallback((sectionKey: string, sectionEdited: boolean) => {
    setEditedSections((current) =>
      current[sectionKey] === sectionEdited ? current : { ...current, [sectionKey]: sectionEdited }
    );
  }, []);

  const someSectionEdited = Object.values(editedSections).some(Boolean);

  const saveTheSections = async (): Promise<boolean> => {
    let allSaved = true;
    for (const save of Object.values(sectionSaves.current)) {
      if (!((await save.current?.()) ?? true)) allSaved = false;
    }
    return allSaved;
  };

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
    setUnsaved(edited || someSectionEdited);
  }, [edited, someSectionEdited, setUnsaved]);

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
      supportInvestigationSectionInputs(t, variant.sections)
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

  const completeTheExaminations = (): Promise<void> => {
    const missing = missingSupportInvestigationSections(investigation, variant.sections);
    if (!errandId || !investigation?.id || missing.length === 0) return Promise.resolve();

    return completeSupportInvestigationSections(
      errandId,
      municipalityId,
      investigation.id,
      supportInvestigationSectionInputs(t, variant.sections, missing)
    )
      .then(receiveKeepingUnsavedEdits)
      .catch(() => {
        examinationsCompleted.current = false;
      });
  };

  useEffect(() => {
    if (isLoading || error || !investigation || readOnly || examinationsCompleted.current) return;
    examinationsCompleted.current = true;
    void completeTheExaminations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, investigation, readOnly]);

  const fillTheLegalBasis = async (section: InvestigationSection): Promise<void> => {
    if (!errandId || !investigation?.id || !section.id || !variant.legalBasisTemplate) return;

    const text = await renderTemplateHtml(variant.legalBasisTemplate).catch(() => '');
    if (!text.trim()) return;

    await saveSupportInvestigationSection(errandId, municipalityId, investigation.id, section.id, { text })
      .then(receiveFromSection)
      .catch(() => undefined);
  };

  useEffect(() => {
    if (isLoading || error || !investigation || readOnly || legalBasisFilled.current) return;

    const section = (investigation.sections ?? []).find((candidate) => sectionKeyOf(candidate) === 'legal_basis');
    if (!section) return;

    legalBasisFilled.current = true;
    if ((section.text ?? '').trim()) return;
    void fillTheLegalBasis(section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, investigation, readOnly]);

  const reportSaved = () =>
    toastMessage({
      position: 'bottom',
      closeable: false,
      message: t('common:investigation.saved'),
      status: 'success',
    });

  const save = async (): Promise<boolean> => {
    if (!errandId || !investigation?.id) return true;

    savedInvestigation.current = investigation;
    if (!(await saveTheSections())) return false;

    const latest = savedInvestigation.current;
    if (!edited) {
      reportSaved();
      return true;
    }

    setIsSaving(true);
    try {
      receive(
        await saveSupportInvestigation(errandId, municipalityId, investigation.id, {
          version: latest?.version ?? 0,
          summary: values.proposal,
          conclusion: values.conclusion,
          recommendation: values.recommendation || undefined,
          recommendationMotivation: values.recommendationMotivation,
        })
      );
      reportSaved();
      return true;
    } catch (error) {
      reportFailure(error);
      reload();
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  saveLatest.current = save;

  const sections = useMemo(
    () => visibleSupportInvestigationSections(investigation, variant.sections),
    [investigation, variant]
  );

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24">
      <div>
        <h2 className="text-h2-md mb-8">{t('common:investigation.heading')}</h2>
        <p className="m-0">{t(variant.introKey)}</p>
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
            <InvestigationMetaItem
              label={t('common:investigation.investigator')}
              value={investigation.investigatorUserId ?? '-'}
            />
            <InvestigationMetaItem
              label={t('common:investigation.started_at')}
              value={asInvestigationDate(investigation.startedAt)}
            />
            <InvestigationMetaItem
              label={t('common:investigation.due_at')}
              value={asInvestigationDate(investigation.dueAt)}
            />
            {isSupportInvestigationCompleted(investigation) ? (
              <InvestigationMetaItem
                label={t('common:investigation.status_completed')}
                value={asInvestigationDate(investigation.completedAt)}
              />
            ) : null}
          </div>
          <p className="text-small text-dark-secondary italic m-0">{t('common:investigation.processing_time')}</p>
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <SectionDisclosure
                key={section.id ?? section.sectionKey}
                section={section}
                writable={!readOnly}
                onEdited={noteSectionEdited}
                onSaved={receiveFromSection}
                saveRef={saveRefOfSection(sectionKeyOf(section))}
                investigationId={investigation.id}
              />
            ))}
            <InvestigationConclusionDisclosure values={values} readOnly={readOnly} set={set} outcomes={outcomes} />
            {variant.basisTemplate ? (
              <InvestigationBasis
                investigation={investigation}
                template={variant.basisTemplate}
                unsaved={edited || someSectionEdited}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
