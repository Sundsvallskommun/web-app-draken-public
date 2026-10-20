import type { DecisionOutcome } from '@common/data-contracts/supportmanagement/data-contracts';
import { Input, Select, Textarea } from '@sk-web-gui/react';
import {
  selectableSupportDecisionOutcomes,
  SUPPORT_DECISION_ROLE_KEYS,
} from '@supportmanagement/services/support-decision-service';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { DecisionCard } from './decision-card.component';
import { DecisionField } from './decision-field.component';
import { DecisionTerms } from './decision-terms.component';
import type { DecisionForm } from './use-decision-form';

/** The decision as the handler writes it, one card per group of fields. */
export const DecisionFields: FC<{
  form: DecisionForm;
  outcomes: DecisionOutcome[];
  /** A permit that is printed needs the dates the certificate carries. */
  printed: boolean;
  disabled: boolean;
}> = ({ form, outcomes, printed, disabled }) => {
  const { t } = useTranslation();
  const { values, set } = form;

  return (
    <>
      <DecisionCard>
        <DecisionField id="decision-outcome" label={t('common:decision.outcome')} required>
          <Select
            className="w-full max-w-[28rem]"
            value={values.outcome}
            onChange={(event) => set('outcome', event.target.value)}
            disabled={disabled}
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
        </DecisionField>
      </DecisionCard>

      <DecisionCard>
        <DecisionField
          id="decision-justification"
          label={t('common:decision.justification')}
          help={t('common:decision.justification_help')}
        >
          <Textarea
            className="w-full"
            rows={4}
            value={values.justification}
            placeholder={t('common:decision.justification_placeholder')}
            onChange={(event) => set('justification', event.target.value)}
            disabled={disabled}
            data-cy="decision-justification"
          />
        </DecisionField>
      </DecisionCard>

      <DecisionCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <DecisionField id="decision-legal-basis" label={t('common:decision.legal_basis')}>
            <Input
              className="w-full"
              value={values.legalBasis}
              onChange={(event) => set('legalBasis', event.target.value)}
              disabled={disabled}
            />
          </DecisionField>

          <DecisionField id="decision-delegation" label={t('common:decision.delegation')}>
            <Input
              className="w-full"
              value={values.delegationReference}
              onChange={(event) => set('delegationReference', event.target.value)}
              disabled={disabled}
            />
          </DecisionField>
        </div>
      </DecisionCard>

      <DecisionCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <DecisionField id="decision-valid-from" label={t('common:decision.valid_from')} required={printed}>
            <Input
              type="date"
              className="w-full"
              value={values.validFrom}
              onChange={(event) => set('validFrom', event.target.value)}
              disabled={disabled}
              data-cy="decision-valid-from"
            />
          </DecisionField>

          <DecisionField id="decision-valid-to" label={t('common:decision.valid_to')}>
            <Input
              type="date"
              className="w-full"
              value={values.validTo}
              onChange={(event) => set('validTo', event.target.value)}
              disabled={disabled}
              data-cy="decision-valid-to"
            />
          </DecisionField>

          {printed ? (
            <DecisionField
              id="decision-issued-on"
              label={t('common:decision.issued_on')}
              help={t('common:decision.issued_on_help')}
              required
            >
              <Input
                type="date"
                className="w-full"
                value={values.issuedOn}
                onChange={(event) => set('issuedOn', event.target.value)}
                disabled={disabled}
                data-cy="decision-issued-on"
              />
            </DecisionField>
          ) : null}
        </div>
      </DecisionCard>

      <DecisionCard>
        <DecisionTerms terms={values.terms} onChange={(terms) => set('terms', terms)} disabled={disabled} />
      </DecisionCard>

      <DecisionCard>
        <DecisionField id="decision-role" label={t('common:decision.role')} help={t('common:decision.role_help')}>
          <Select
            className="w-full max-w-[28rem]"
            value={values.decidedByRole}
            onChange={(event) => set('decidedByRole', event.target.value)}
            disabled={disabled}
            data-cy="decision-role"
          >
            {SUPPORT_DECISION_ROLE_KEYS.map((key) => (
              <Select.Option key={key} value={t(key)}>
                {t(key)}
              </Select.Option>
            ))}
          </Select>
        </DecisionField>
      </DecisionCard>
    </>
  );
};
