import type { Decision, DecisionOutcome } from '@common/data-contracts/supportmanagement/data-contracts';
import { Label } from '@sk-web-gui/react';
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import {
  scopeFromDecision,
  SERVING_HOURS_SLOTS,
  servingHoursText,
} from '@supportmanagement/services/support-decision-scope-service';
import { isSupportDecisionLocked, outcomeLabel } from '@supportmanagement/services/support-decision-service';
import dayjs from 'dayjs';
import { FC, Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { usePremisesText } from './use-premises-text';

/** A decision that can no longer be changed, read rather than edited. */
export const DecisionSummary: FC<{
  decision: Decision;
  outcomes: DecisionOutcome[];
  premises: DecisionPremises | undefined;
}> = ({ decision, outcomes, premises }) => {
  const { t } = useTranslation();
  const premisesText = usePremisesText();
  const empty = t('common:decision.empty_value');
  const decided = scopeFromDecision(decision.parameters, SERVING_HOURS_SLOTS);
  const decidedHours = SERVING_HOURS_SLOTS.filter((spec) => decided.servingHours[spec.slot]);

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
        {decided.beverages ? (
          <>
            <dt className="text-dark-secondary">{t('common:decision.scope.beverages.label')}</dt>
            <dd className="m-0" data-cy="decision-summary-beverages">
              {decided.beverages.map((beverage) => t(`common:decision.scope.beverages.${beverage}`)).join(', ') ||
                t('common:decision.scope.none')}
            </dd>
          </>
        ) : null}
        {decidedHours.map((spec) => (
          <Fragment key={spec.slot}>
            <dt className="text-dark-secondary">{t(spec.labelKey)}</dt>
            <dd className="m-0" data-cy={`decision-summary-serving-hours-${spec.slot}`}>
              {servingHoursText(decided.servingHours[spec.slot]) ?? empty}
            </dd>
          </Fragment>
        ))}
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
