import { SaveRow } from '@common/components/save-row/save-row.component';
import type { Decision, DecisionOutcome } from '@common/data-contracts/supportmanagement/data-contracts';
import { appConfig } from '@config/appconfig';
import {
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { DecisionPremises } from '@supportmanagement/components/premises/decision-premises.component';
import { useDecisionPremises } from '@supportmanagement/components/premises/use-decision-premises';
import {
  type DecisionPremises as DecisionPremisesValue,
  fromDecisionParameters,
} from '@supportmanagement/services/support-decision-premises-service';
import {
  createSupportDecision,
  getSupportDecisions,
  isSupportDecisionDraft,
  isSupportDecisionLocked,
  outcomeForTerms,
  outcomeWithoutConditions,
  selectableSupportDecisionOutcomes,
  SUPPORT_DECISION_ROLE_KEYS,
  updateSupportDecision,
} from '@supportmanagement/services/support-decision-service';
import {
  formatAddress,
  getPremisesAddress,
  hasServingPremises,
} from '@supportmanagement/services/support-premises-address-service';
import dayjs from 'dayjs';
import { CircleCheck, Plus, Trash } from 'lucide-react';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportErrandDecisionBasis } from './support-errand-decision-basis.component';

const outcomeLabel = (outcomes: DecisionOutcome[], name: string | undefined): string =>
  outcomes.find((outcome) => outcome.name === name)?.displayName || name || '';

const termTexts = (decision: Decision | undefined): string[] =>
  [...(decision?.terms ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((term) => term.text ?? '');

const DecisionCard: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="border-1 rounded-12 p-16">{children}</div>
);

/** Address and restaurant number (or "new") as text. */
const usePremisesText = () => {
  const { t } = useTranslation();

  return (premises: DecisionPremisesValue): string =>
    [
      formatAddress({ streetAddress: premises.street, postalCode: premises.postalCode, postalArea: premises.city }),
      premises.restaurantNumber
        ? t('common:decision.premises.number', { number: premises.restaurantNumber })
        : t('common:decision.premises.new_number'),
    ].join(' · ');
};

const DecisionSummary: FC<{ decision: Decision; outcomes: DecisionOutcome[] }> = ({ decision, outcomes }) => {
  const { t } = useTranslation();
  const premisesText = usePremisesText();
  const empty = t('common:decision.empty_value');
  const premises = fromDecisionParameters(decision.parameters);

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
        {premises ? (
          <>
            <dt className="text-dark-secondary">{t('common:decision.premises.label')}</dt>
            <dd className="m-0" data-cy="decision-summary-premises">
              {premisesText(premises)}
            </dd>
          </>
        ) : null}
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

export const SupportErrandDecisionTab: FC<{
  setUnsaved: (unsaved: boolean) => void;
  setHasContent: (hasContent: boolean) => void;
  writable: boolean;
}> = ({ setUnsaved, setHasContent, writable }) => {
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

  const isActive = useSupportStore((s) => s.activeTabKey) === 'decision';
  const [opened, setOpened] = useState(isActive);
  if (isActive && !opened) setOpened(true);
  const handlesPremises = appConfig.features.useLicensedBusiness && hasServingPremises(supportErrand);
  const premises = useMemo(
    () => getPremisesAddress(supportErrand, supportMetadata?.namespace),
    [supportErrand, supportMetadata?.namespace]
  );
  const savedPremises = useMemo(() => fromDecisionParameters(decisions[0]?.parameters), [decisions]);
  const decisionPremises = useDecisionPremises(
    handlesPremises && opened ? municipalityId : undefined,
    premises,
    savedPremises
  );
  const premisesText = usePremisesText();
  const premisesToSend = fromDecisionParameters(decisionPremises.parameters) ?? savedPremises;

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
  }, [supportErrand?.id, municipalityId, supportErrand?.process?.currentActivityId]);

  const decision = decisions[0];
  const editable = writable && (!decision || isSupportDecisionDraft(decision));

  const fillFormFrom = (draft: Decision) => {
    setOutcome(outcomeWithoutConditions(draft.outcome));
    setDecidedByRole(draft.decidedByRole || t(SUPPORT_DECISION_ROLE_KEYS[0]));
    setLegalBasis(draft.legalBasis ?? '');
    setDelegationReference(draft.delegationReference ?? '');
    setJustification(draft.justification ?? '');
    setTerms(termTexts(draft));
  };

  useEffect(() => {
    if (decision) fillFormFrom(decision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision?.id, decision?.version]);

  const formInHand = () => ({
    outcome,
    decidedByRole,
    legalBasis,
    delegationReference,
    justification,
    terms: terms.filter(Boolean),
    premises: premisesToSend ?? null,
  });

  const formAsSaved = () => ({
    outcome: outcomeWithoutConditions(decision?.outcome),
    decidedByRole: decision?.decidedByRole || t(SUPPORT_DECISION_ROLE_KEYS[0]),
    legalBasis: decision?.legalBasis ?? '',
    delegationReference: decision?.delegationReference ?? '',
    justification: decision?.justification ?? '',
    terms: termTexts(decision),
    premises: savedPremises ?? null,
  });

  const edited = editable && JSON.stringify(formInHand()) !== JSON.stringify(formAsSaved());

  useEffect(() => {
    setUnsaved(edited);
  }, [edited, setUnsaved]);

  useEffect(() => {
    setHasContent(decisions.length > 0);
  }, [decisions, setHasContent]);

  const setTerm = (index: number, value: string) =>
    setTerms((current) => current.map((term, position) => (position === index ? value : term)));

  const removeTerm = (index: number) => setTerms((current) => current.filter((_, position) => position !== index));

  const save = () => {
    if (!supportErrand?.id || !outcome) return;
    setIsSaving(true);
    const writtenTerms = terms.map((term) => term.trim()).filter(Boolean);
    const written = {
      outcome: outcomeForTerms(outcome, writtenTerms, outcomes),
      decidedByRole,
      legalBasis,
      delegationReference,
      justification,
      terms: writtenTerms,
      parameters: decisionPremises.parameters,
    };

    const saving = decision?.id
      ? updateSupportDecision(supportErrand.id, municipalityId, decision.id, written)
      : createSupportDecision(supportErrand.id, municipalityId, written);

    saving
      .then((saved) => {
        setDecisions([saved]);
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

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24">
      {supportErrand ? (
        <>
          <SupportErrandDecisionBasis
            supportErrand={supportErrand}
            supportMetadata={supportMetadata}
            premisesHandling={
              handlesPremises ? (
                <DecisionPremises state={decisionPremises} readOnly={!canEdit || isLoading || error || !editable} />
              ) : undefined
            }
          />
          <Divider />
        </>
      ) : null}

      <div>
        <h2 className="text-h2-md mb-8">{t('common:decision.heading')}</h2>
        {!isLoading && !error && editable ? (
          <p className="m-0 text-dark-secondary">{t('common:decision.intro')}</p>
        ) : null}
      </div>

      {isLoading ? <Spinner size={3} aria-label={t('common:decision.loading')} /> : null}
      {error ? <p>{t('common:decision.error')}</p> : null}

      {!isLoading && !error && decision && !editable ? (
        <DecisionCard>
          <DecisionSummary decision={decision} outcomes={outcomes} />
        </DecisionCard>
      ) : null}

      {!isLoading && !error && !decision && !writable ? (
        <p className="m-0">{t('common:decision.step_passed')}</p>
      ) : null}

      {!isLoading && !error && editable ? (
        <div className="flex flex-col gap-16">
          <DecisionCard>
            <FormControl id="decision-outcome" className="w-full" required>
              <FormLabel>{t('common:decision.outcome')}</FormLabel>
              <Select
                className="w-full max-w-[28rem]"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                disabled={!canEdit}
                data-cy="decision-outcome"
              >
                <Select.Option value="" disabled>
                  {t('common:decision.outcome_placeholder')}
                </Select.Option>
                {selectableSupportDecisionOutcomes(outcomes).map((option) => (
                  <Select.Option key={option.name} value={option.name}>
                    {option.displayName || option.name}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
          </DecisionCard>

          <DecisionCard>
            <FormControl id="decision-justification" className="w-full">
              <FormLabel>{t('common:decision.justification')}</FormLabel>
              <FormHelperText className="p-0 m-0 text-small text-dark-secondary">
                {t('common:decision.justification_help')}
              </FormHelperText>
              <Textarea
                className="w-full"
                rows={4}
                value={justification}
                placeholder={t('common:decision.justification_placeholder')}
                onChange={(event) => setJustification(event.target.value)}
                disabled={!canEdit}
                data-cy="decision-justification"
              />
            </FormControl>
          </DecisionCard>

          <DecisionCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <FormControl id="decision-legal-basis" className="w-full">
                <FormLabel>{t('common:decision.legal_basis')}</FormLabel>
                <Input
                  className="w-full"
                  value={legalBasis}
                  onChange={(event) => setLegalBasis(event.target.value)}
                  disabled={!canEdit}
                />
              </FormControl>

              <FormControl id="decision-delegation" className="w-full">
                <FormLabel>{t('common:decision.delegation')}</FormLabel>
                <Input
                  className="w-full"
                  value={delegationReference}
                  onChange={(event) => setDelegationReference(event.target.value)}
                  disabled={!canEdit}
                />
              </FormControl>
            </div>
          </DecisionCard>

          <DecisionCard>
            <div className="flex flex-col items-start gap-8">
              <FormLabel>{t('common:decision.terms')}</FormLabel>
              {terms.map((term, index) => (
                <div key={`term-${index}`} className="flex gap-8 items-center w-full">
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
          </DecisionCard>

          <DecisionCard>
            <FormControl id="decision-role" className="w-full">
              <FormLabel>{t('common:decision.role')}</FormLabel>
              <FormHelperText className="p-0 m-0 text-small text-dark-secondary">
                {t('common:decision.role_help')}
              </FormHelperText>
              <Select
                className="w-full max-w-[28rem]"
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
          </DecisionCard>

          {handlesPremises ? (
            <p className="text-small text-dark-secondary m-0" data-cy="decision-premises-to-send">
              {premisesToSend
                ? t('common:decision.premises.sent', { premises: premisesText(premisesToSend) })
                : t('common:decision.premises.not_chosen')}
            </p>
          ) : null}

          <SaveRow
            label={t('common:decision.save')}
            leftIcon={<CircleCheck size={18} />}
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
