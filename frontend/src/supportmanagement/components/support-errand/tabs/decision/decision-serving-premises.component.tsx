import { Input, Textarea } from '@sk-web-gui/react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { DecisionField } from './decision-field.component';
import type { DecisionForm } from './use-decision-form';

/**
 * What the decision says about the serving premises, shown under the premises in the basis above.
 * Both are printed on the certificate, and neither is asked for anywhere else: the application does
 * not insist on a telephone, and nothing asks which rooms serving is allowed within.
 */
export const DecisionServingPremises: FC<{ form: DecisionForm; disabled: boolean }> = ({ form, disabled }) => {
  const { t } = useTranslation();

  return (
    <>
      <DecisionField
        id="decision-serving-area"
        label={t('common:decision.basis.serving_premises.description')}
        required
      >
        <Textarea
          className="w-full"
          rows={3}
          value={form.values.servingArea}
          onChange={(event) => form.set('servingArea', event.target.value)}
          disabled={disabled}
          data-cy="decision-serving-area"
        />
      </DecisionField>

      <DecisionField
        id="decision-premises-phone"
        label={t('common:decision.premises.phone')}
        help={t('common:decision.premises.phone_help')}
        required
      >
        <Input
          className="w-full max-w-[20rem]"
          value={form.values.premisesPhone}
          onChange={(event) => form.set('premisesPhone', event.target.value)}
          disabled={disabled}
          data-cy="decision-premises-phone"
        />
      </DecisionField>
    </>
  );
};
