import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import {
  Button,
  Disclosure,
  FormControl,
  FormLabel,
  Label,
  Select,
  Spinner,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getSupportInvestigation,
  isSupportInvestigationCompleted,
  isSupportInvestigationConflict,
  saveSupportInvestigation,
  saveSupportInvestigationSection,
  startSupportInvestigation,
  SUPPORT_INVESTIGATION_ASSESSMENTS,
  SUPPORT_INVESTIGATION_SECTIONS,
  supportInvestigationAssessmentKey,
} from '@supportmanagement/services/support-investigation-service';
import {
  getSupportErrandProcess,
  hasReachedSupportProcessStep,
  SupportProcessStep,
} from '@supportmanagement/services/support-process-service';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const sectionsInOrder = (investigation: Investigation | undefined): InvestigationSection[] =>
  [...(investigation?.sections ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const asDate = (value: string | undefined): string => value?.slice(0, 10) ?? '–';

const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-small text-dark-secondary">{label}</span>
    <span>{value}</span>
  </div>
);

const SectionDisclosure: React.FC<{
  section: InvestigationSection;
  readOnly: boolean;
  onSave: (section: InvestigationSection, values: { text: string; assessment: string }) => Promise<void>;
}> = ({ section, readOnly, onSave }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(section.text ?? '');
  const [assessment, setAssessment] = useState(section.assessment ?? 'PENDING');
  const [isSaving, setIsSaving] = useState(false);

  const unsaved = text !== (section.text ?? '') || assessment !== (section.assessment ?? 'PENDING');

  const save = () => {
    setIsSaving(true);
    onSave(section, { text, assessment }).finally(() => setIsSaving(false));
  };

  return (
    <Disclosure variant="alt" className="w-full" data-cy={`section-${section.sectionKey}`}>
      <Disclosure.Header>
        <Disclosure.Title>{section.heading}</Disclosure.Title>
        <Label rounded color={section.assessment === 'PENDING' ? 'tertiary' : 'gronsta'}>
          {t(supportInvestigationAssessmentKey(section.assessment))}
        </Label>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <div className="flex flex-col gap-16">
          <FormControl id={`assessment-${section.id}`} className="w-full max-w-[24rem]">
            <FormLabel>{t('common:investigation.assessment')}</FormLabel>
            <Select
              className="w-full"
              value={assessment}
              disabled={readOnly}
              onChange={(event) => setAssessment(event.target.value)}
              data-cy={`assessment-${section.sectionKey}`}
            >
              {SUPPORT_INVESTIGATION_ASSESSMENTS.map((value) => (
                <Select.Option key={value} value={value}>
                  {t(supportInvestigationAssessmentKey(value))}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          <FormControl id={`text-${section.id}`} className="w-full">
            <FormLabel>{t('common:investigation.section_text')}</FormLabel>
            <Textarea
              className="w-full"
              rows={4}
              value={text}
              disabled={readOnly}
              onChange={(event) => setText(event.target.value)}
              data-cy={`text-${section.sectionKey}`}
            />
          </FormControl>

          {section.completedBy ? (
            <p className="text-small text-dark-secondary m-0">
              {t('common:investigation.assessed_by', { user: section.completedBy, date: asDate(section.completedAt) })}
            </p>
          ) : null}

          {readOnly ? null : (
            <div>
              <Button
                variant="secondary"
                size="sm"
                loading={isSaving}
                disabled={isSaving || !unsaved}
                onClick={save}
                data-cy={`save-${section.sectionKey}`}
              >
                {t('common:investigation.save_section')}
              </Button>
            </div>
          )}
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
};

export const SupportErrandInvestigationTab: React.FC = () => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const toastMessage = useSnackbar();

  const [investigation, setInvestigation] = useState<Investigation>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [recommendationMotivation, setRecommendationMotivation] = useState('');

  const outcomes = supportMetadata?.decisionOutcomes ?? [];
  const errandId = supportErrand?.id;
  const modified = supportErrand?.modified;
  const inInvestigationStep = hasReachedSupportProcessStep(
    SupportProcessStep.INVESTIGATION,
    getSupportErrandProcess(supportErrand)
  );
  const startedAutomatically = useRef(false);
  const readOnly = !canEdit || isSupportInvestigationCompleted(investigation);

  const receive = (result: Investigation | undefined) => {
    setInvestigation(result);
    setSummary(result?.summary ?? '');
    setConclusion(result?.conclusion ?? '');
    setRecommendation(result?.recommendation ?? '');
    setRecommendationMotivation(result?.recommendationMotivation ?? '');
  };

  useEffect(() => {
    if (!errandId) return undefined;
    let current = true;
    getSupportInvestigation(errandId, municipalityId)
      .then((result) => {
        if (!current) return;
        receive(result);
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
  }, [errandId, municipalityId, modified]);

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

  const start = () => {
    if (!errandId) return Promise.resolve();
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
      .then(receive)
      .catch(reportFailure)
      .finally(() => setIsSaving(false));
  };

  useEffect(() => {
    if (isLoading || error || investigation || !inInvestigationStep || !canEdit || startedAutomatically.current) return;
    startedAutomatically.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, investigation, inInvestigationStep, canEdit]);

  const saveSection = (section: InvestigationSection, values: { text: string; assessment: string }) => {
    if (!errandId || !investigation?.id || !section.id) return Promise.resolve();
    return saveSupportInvestigationSection(errandId, municipalityId, investigation.id, section.id, values)
      .then(receive)
      .catch((failure) => {
        reportFailure(failure);
        reload();
      });
  };

  const save = () => {
    if (!errandId || !investigation?.id) return;
    setIsSaving(true);
    saveSupportInvestigation(errandId, municipalityId, investigation.id, {
      version: investigation.version ?? 0,
      summary,
      conclusion,
      recommendation: recommendation || undefined,
      recommendationMotivation,
    })
      .then((result) => {
        receive(result);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: t('common:investigation.saved'),
          status: 'success',
        });
      })
      .catch((failure) => {
        reportFailure(failure);
        reload();
      })
      .finally(() => setIsSaving(false));
  };

  const sections = useMemo(() => sectionsInOrder(investigation), [investigation]);

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24">
      <div>
        <h2 className="text-h2-md mb-8">{t('common:investigation.heading')}</h2>
        <p className="m-0 max-w-[64rem]">{t('common:investigation.intro')}</p>
      </div>

      {isLoading ? <Spinner size={3} aria-label={t('common:investigation.loading')} /> : null}
      {error ? <p>{t('common:investigation.error')}</p> : null}

      {!isLoading && !error && !investigation && inInvestigationStep ? (
        <Spinner size={3} aria-label={t('common:investigation.starting')} />
      ) : null}

      {!isLoading && !error && !investigation && !inInvestigationStep ? (
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
        <div className="flex flex-col gap-24 max-w-[64rem]">
          <div className="flex flex-wrap gap-40">
            <MetaItem label={t('common:investigation.investigator')} value={investigation.investigatorUserId ?? '–'} />
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
                key={[section.id, section.assessment, section.text].join('-')}
                section={section}
                readOnly={readOnly}
                onSave={saveSection}
              />
            ))}

            <Disclosure variant="alt" className="w-full" data-cy="investigation-conclusion-section">
              <Disclosure.Header>
                <Disclosure.Title>{t('common:investigation.conclusion_heading')}</Disclosure.Title>
                <Disclosure.Button />
              </Disclosure.Header>
              <Disclosure.Content>
                <div className="flex flex-col gap-16">
                  <FormControl id="investigation-summary" className="w-full">
                    <FormLabel>{t('common:investigation.summary')}</FormLabel>
                    <Textarea
                      className="w-full"
                      rows={3}
                      value={summary}
                      disabled={readOnly}
                      onChange={(event) => setSummary(event.target.value)}
                      data-cy="investigation-summary"
                    />
                  </FormControl>

                  <FormControl id="investigation-conclusion" className="w-full">
                    <FormLabel>{t('common:investigation.conclusion')}</FormLabel>
                    <Textarea
                      className="w-full"
                      rows={3}
                      value={conclusion}
                      disabled={readOnly}
                      onChange={(event) => setConclusion(event.target.value)}
                      data-cy="investigation-conclusion"
                    />
                  </FormControl>

                  <FormControl id="investigation-recommendation" className="w-full max-w-[32rem]">
                    <FormLabel>{t('common:investigation.recommendation')}</FormLabel>
                    <Select
                      className="w-full"
                      value={recommendation}
                      disabled={readOnly}
                      onChange={(event) => setRecommendation(event.target.value)}
                      data-cy="investigation-recommendation"
                    >
                      <Select.Option value="">{t('common:investigation.recommendation_placeholder')}</Select.Option>
                      {outcomes.map((outcome) => (
                        <Select.Option key={outcome.name} value={outcome.name}>
                          {outcome.displayName || outcome.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl id="investigation-motivation" className="w-full">
                    <FormLabel>{t('common:investigation.recommendation_motivation')}</FormLabel>
                    <Textarea
                      className="w-full"
                      rows={3}
                      value={recommendationMotivation}
                      disabled={readOnly}
                      onChange={(event) => setRecommendationMotivation(event.target.value)}
                      data-cy="investigation-motivation"
                    />
                  </FormControl>

                  {readOnly ? null : (
                    <div>
                      <Button
                        variant="secondary"
                        loading={isSaving}
                        disabled={isSaving}
                        onClick={save}
                        data-cy="save-investigation"
                      >
                        {t('common:investigation.save')}
                      </Button>
                    </div>
                  )}
                </div>
              </Disclosure.Content>
            </Disclosure>
          </div>
        </div>
      ) : null}
    </div>
  );
};
