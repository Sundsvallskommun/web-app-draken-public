import { TemplatePdfPreview } from '@common/components/template-preview/template-pdf-preview.component';
import type { Decision } from '@common/data-contracts/supportmanagement/data-contracts';
import { appConfig } from '@config/appconfig';
import { Divider, Spinner } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { DecisionPremises } from '@supportmanagement/components/premises/decision-premises.component';
import { useDecisionPremises } from '@supportmanagement/components/premises/use-decision-premises';
import { getDecisionBasisForm } from '@supportmanagement/services/support-decision-basis-service';
import { applicationPremisesPhone } from '@supportmanagement/services/support-decision-parameters-service';
import { premisesFromErrandParameters } from '@supportmanagement/services/support-decision-premises-service';
import {
  resolveScope,
  scopeFromDecision,
  scopeFromForm,
  servingHoursSlotsFor,
} from '@supportmanagement/services/support-decision-scope-service';
import {
  getSupportDecisions,
  isSupportDecisionDraft,
  SUPPORT_DECISION_ROLE_KEYS,
} from '@supportmanagement/services/support-decision-service';
import { getPremisesAddress, hasServingPremises } from '@supportmanagement/services/support-premises-address-service';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DecisionCard } from './decision-card.component';
import { DecisionFields } from './decision-fields.component';
import { decisionPermit } from './decision-permit';
import { DecisionBeveragesField, DecisionServingHoursFields } from './decision-scope-fields.component';
import { DecisionServingPremises } from './decision-serving-premises.component';
import { DecisionSummary } from './decision-summary.component';
import { SupportErrandDecisionBasis } from './support-errand-decision-basis.component';
import { useDecisionForm } from './use-decision-form';
import { useDecisionSave } from './use-decision-save';
import { usePremisesText } from './use-premises-text';

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
  const isActive = useSupportStore((s) => s.activeTabKey) === 'decision';

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  // The premises lookup costs a request, so it waits until the tab has been opened once.
  const [opened, setOpened] = useState(isActive);
  if (isActive && !opened) setOpened(true);

  const outcomes = supportMetadata?.decisionOutcomes ?? [];
  const permit = useMemo(() => decisionPermit(supportErrand), [supportErrand]);
  const handlesPremises = appConfig.features.useLicensedBusiness && hasServingPremises(supportErrand);

  const premises = useMemo(
    () => getPremisesAddress(supportErrand, supportMetadata?.namespace),
    [supportErrand, supportMetadata?.namespace]
  );
  const savedPremises = useMemo(
    () => premisesFromErrandParameters(supportErrand?.parameters),
    [supportErrand?.parameters]
  );
  const decisionPremisesState = useDecisionPremises(
    handlesPremises && opened ? municipalityId : undefined,
    premises,
    savedPremises
  );
  const premisesToSend = decisionPremisesState.decided ?? savedPremises;
  const premisesText = usePremisesText();

  const applicationForm = useMemo(
    () => getDecisionBasisForm(supportErrand, supportMetadata?.namespace)?.value,
    [supportErrand, supportMetadata?.namespace]
  );
  const servingHoursSlots = useMemo(
    () => servingHoursSlotsFor(permit.errandType, applicationForm),
    [permit.errandType, applicationForm]
  );

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

  // The saved decision where it has a key, the application elsewhere; the fields start from this.
  const scopeAsSaved = useMemo(
    () =>
      resolveScope(
        scopeFromDecision(decision?.parameters, servingHoursSlots),
        scopeFromForm(applicationForm, permit.errandType, servingHoursSlots),
        servingHoursSlots
      ),
    [decision?.parameters, servingHoursSlots, applicationForm, permit.errandType]
  );

  const form = useDecisionForm({
    decision,
    editable,
    savedPremises,
    premisesToSend,
    applicationPremisesPhone: applicationPremisesPhone(applicationForm),
    scopeAsSaved,
    defaultRole: t(SUPPORT_DECISION_ROLE_KEYS[0]),
  });

  const { certificateParameters } = useDecisionSave({
    decision,
    values: form.values,
    edited: form.edited,
    editable,
    permit,
    premisesToSend,
    applicationForm,
    servingHoursSlots,
    onSaved: setDecisions,
  });

  useEffect(() => {
    setUnsaved(form.edited);
  }, [form.edited, setUnsaved]);

  useEffect(() => {
    setHasContent(decisions.length > 0);
  }, [decisions, setHasContent]);

  const premisesReadOnly = !canEdit || isLoading || error || !editable;

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24">
      {supportErrand ? (
        <>
          <SupportErrandDecisionBasis
            supportErrand={supportErrand}
            supportMetadata={supportMetadata}
            premisesHandling={
              handlesPremises ? (
                <DecisionPremises state={decisionPremisesState} readOnly={premisesReadOnly} />
              ) : undefined
            }
            servingPremisesHandling={
              permit.serving ? <DecisionServingPremises form={form} disabled={premisesReadOnly} /> : undefined
            }
            servingHoursHandling={
              servingHoursSlots.length ? (
                <DecisionServingHoursFields
                  slots={servingHoursSlots}
                  value={form.values.scope.servingHours}
                  onChange={(slot, range) =>
                    form.set('scope', {
                      ...form.values.scope,
                      servingHours: { ...form.values.scope.servingHours, [slot]: range },
                    })
                  }
                  disabled={premisesReadOnly}
                />
              ) : undefined
            }
            servingHandling={
              permit.serving ? (
                <DecisionBeveragesField
                  value={form.values.scope.beverages}
                  onChange={(beverages) => form.set('scope', { ...form.values.scope, beverages })}
                  disabled={premisesReadOnly}
                />
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
          <DecisionSummary decision={decision} outcomes={outcomes} premises={savedPremises} />
        </DecisionCard>
      ) : null}

      {!isLoading && !error && !decision && !writable ? (
        <p className="m-0">{t('common:decision.step_passed')}</p>
      ) : null}

      {!isLoading && !error && editable ? (
        <div className="flex flex-col gap-16">
          <DecisionFields form={form} outcomes={outcomes} printed={!!permit.certificate} disabled={!canEdit} />

          {supportErrand ? (
            <TemplatePdfPreview
              watermarked
              title={t('common:decision.preview')}
              identifier={permit.certificate}
              parameters={certificateParameters}
            />
          ) : null}

          {handlesPremises ? (
            <p className="text-small text-dark-secondary m-0" data-cy="decision-premises-to-send">
              {premisesToSend
                ? t('common:decision.premises.sent', { premises: premisesText(premisesToSend) })
                : t('common:decision.premises.not_chosen')}
            </p>
          ) : null}

          {form.edited ? (
            <p className="text-small text-dark-secondary m-0" data-cy="decision-unsaved">
              {t('common:decision.unsaved_hint')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
