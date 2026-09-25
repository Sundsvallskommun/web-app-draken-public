import { SaveRow } from '@common/components/save-row/save-row.component';
import type { Decision, DecisionOutcome } from '@common/data-contracts/supportmanagement/data-contracts';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  createSupportDecision,
  getSupportDecisions,
  isSupportDecisionLocked,
  SUPPORT_DECISION_ROLE_KEYS,
} from '@supportmanagement/services/support-decision-service';
import dayjs from 'dayjs';
import { Plus, Trash } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const outcomeLabel = (outcomes: DecisionOutcome[], name: string | undefined): string =>
  outcomes.find((outcome) => outcome.name === name)?.displayName || name || '';

const DecisionSummary: FC<{ decision: Decision; outcomes: DecisionOutcome[] }> = ({ decision, outcomes }) => {
  const { t } = useTranslation();
  const empty = t('common:decision.empty_value');

  return (
    <div className="flex flex-col gap-16" data-cy="decision-summary">
      <div className="flex items-center gap-12 flex-wrap">
        <Label rounded color="gronsta" inverted>
          {outcomeLabel(outcomes, decision.outcome)}
        </Label>
        {isSupportDecisionLocked(decision) ? <Label rounded>{t('common:decision.locked')}</Label> : null}
        <span className="text-small text-dark-secondary">
          {decision.method === 'MANUAL' ? t('common:decision.method.manual') : t('common:decision.method.automatic')}
        </span>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-24 gap-y-8 m-0">
        <dt className="text-dark-secondary">{t('common:decision.decided_by')}</dt>
        <dd className="m-0">{[decision.decidedByRole, decision.decidedBy].filter(Boolean).join(' · ') || empty}</dd>
        <dt className="text-dark-secondary">{t('common:decision.decided_at')}</dt>
        <dd className="m-0">{decision.decidedAt ? dayjs(decision.decidedAt).format('YYYY-MM-DD HH:mm') : empty}</dd>
        <dt className="text-dark-secondary">{t('common:decision.legal_basis')}</dt>
        <dd className="m-0">{decision.legalBasis || empty}</dd>
        <dt className="text-dark-secondary">{t('common:decision.delegation')}</dt>
        <dd className="m-0">{decision.delegationReference || empty}</dd>
      </dl>
      {decision.justification ? (
        <div>
          <h3 className="text-h4-md mb-8">{t('common:decision.justification')}</h3>
          <p className="m-0 whitespace-pre-wrap">{decision.justification}</p>
        </div>
      ) : null}
      {decision.terms?.length ? (
        <div>
          <h3 className="text-h4-md mb-8">{t('common:decision.terms')}</h3>
          <ol className="pl-24 m-0 flex flex-col gap-4">
            {decision.terms.map((term) => (
              <li key={term.id ?? term.text}>{term.text}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
};

export const SupportErrandDecisionTab: FC<{ setUnsaved: (unsaved: boolean) => void }> = ({ setUnsaved }) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const canEdit = useUserStore((s) => s.user.permissions.canEditSupportManagement);
  const toastMessage = useSnackbar();

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [decidedByRole, setDecidedByRole] = useState(t(SUPPORT_DECISION_ROLE_KEYS[0]));
  const [legalBasis, setLegalBasis] = useState('');
  const [delegationReference, setDelegationReference] = useState('');
  const [justification, setJustification] = useState('');
  const [terms, setTerms] = useState<string[]>([]);

  const outcomes = supportMetadata?.decisionOutcomes ?? [];

  useEffect(() => {
    if (!supportErrand?.id) return;
    // The errand can change under a request in flight; only the latest one is allowed to answer.
    let current = true;
    getSupportDecisions(supportErrand.id, municipalityId)
      .then((result) => {
        if (!current) return;
        setDecisions(result);
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
  }, [supportErrand?.id, municipalityId]);

  // A decision is written once, with its own button, so anything filled in is still unsaved.
  const edited =
    !decisions.length && (!!outcome || !!legalBasis || !!delegationReference || !!justification || terms.some(Boolean));

  useEffect(() => {
    setUnsaved(edited);
  }, [edited, setUnsaved]);

  const setTerm = (index: number, value: string) =>
    setTerms((current) => current.map((term, position) => (position === index ? value : term)));

  const removeTerm = (index: number) => setTerms((current) => current.filter((_, position) => position !== index));

  const save = () => {
    if (!supportErrand?.id || !outcome) return;
    setIsSaving(true);
    createSupportDecision(supportErrand.id, municipalityId, {
      outcome,
      decidedByRole,
      legalBasis: legalBasis || undefined,
      delegationReference: delegationReference || undefined,
      justification: justification || undefined,
      terms: terms.map((term) => term.trim()).filter(Boolean),
    })
      .then((decision) => {
        setDecisions([decision]);
        setIsSaving(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: t('common:decision.saved'),
          status: 'success',
        });
      })
      .catch(() => {
        setIsSaving(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: t('common:decision.save_error'),
          status: 'error',
        });
      });
  };

  const decision = decisions[0];

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24">
      <h2 className="text-h2-md">{t('common:decision.heading')}</h2>

      {isLoading ? <Spinner size={3} aria-label={t('common:decision.loading')} /> : null}
      {error ? <p>{t('common:decision.error')}</p> : null}

      {!isLoading && !error && decision ? <DecisionSummary decision={decision} outcomes={outcomes} /> : null}

      {!isLoading && !error && !decision ? (
        <div className="flex flex-col gap-16 max-w-[48rem]">
          <FormControl id="decision-outcome" className="w-full" required>
            <FormLabel>{t('common:decision.outcome')}</FormLabel>
            <Select
              className="w-full"
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              disabled={!canEdit}
              data-cy="decision-outcome"
            >
              <Select.Option value="">{t('common:decision.outcome_placeholder')}</Select.Option>
              {outcomes.map((option) => (
                <Select.Option key={option.name} value={option.name}>
                  {option.displayName || option.name}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          <FormControl id="decision-role" className="w-full">
            <FormLabel>{t('common:decision.role')}</FormLabel>
            <Select
              className="w-full"
              value={decidedByRole}
              onChange={(event) => setDecidedByRole(event.target.value)}
              disabled={!canEdit}
              data-cy="decision-role"
            >
              {SUPPORT_DECISION_ROLE_KEYS.map((key) => (
                <Select.Option key={key} value={t(key)}>
                  {t(key)}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          <FormControl id="decision-legal-basis" className="w-full">
            <FormLabel>{t('common:decision.legal_basis')}</FormLabel>
            <Input value={legalBasis} onChange={(event) => setLegalBasis(event.target.value)} disabled={!canEdit} />
          </FormControl>

          <FormControl id="decision-delegation" className="w-full">
            <FormLabel>{t('common:decision.delegation')}</FormLabel>
            <Input
              value={delegationReference}
              onChange={(event) => setDelegationReference(event.target.value)}
              disabled={!canEdit}
            />
          </FormControl>

          <FormControl id="decision-justification" className="w-full">
            <FormLabel>{t('common:decision.justification')}</FormLabel>
            <Textarea
              className="w-full"
              rows={4}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              disabled={!canEdit}
            />
          </FormControl>

          <div className="flex flex-col gap-8">
            <FormLabel>{t('common:decision.terms')}</FormLabel>
            {terms.map((term, index) => (
              <div key={`term-${index}`} className="flex gap-8 items-center">
                <Input
                  className="w-full"
                  value={term}
                  onChange={(event) => setTerm(index, event.target.value)}
                  disabled={!canEdit}
                  aria-label={t('common:decision.term_label', { number: index + 1 })}
                />
                <Button
                  iconButton
                  variant="tertiary"
                  showBackground={false}
                  onClick={() => removeTerm(index)}
                  disabled={!canEdit}
                  aria-label={t('common:decision.remove_term', { number: index + 1 })}
                >
                  <Trash size={16} />
                </Button>
              </div>
            ))}
            <Button
              variant="tertiary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => setTerms((current) => [...current, ''])}
              disabled={!canEdit}
              data-cy="decision-add-term"
            >
              {t('common:decision.add_term')}
            </Button>
          </div>

          <SaveRow
            label={t('common:decision.save')}
            loadingText={t('common:decision.saving')}
            saving={isSaving}
            disabled={!canEdit || !outcome || isSaving}
            onSave={save}
            unsaved={edited}
            unsavedTitle={t('common:decision.unsaved')}
            unsavedText={t('common:tabs.unsaved_decision')}
            dataCy="decision-save"
          />
        </div>
      ) : null}
    </div>
  );
};
