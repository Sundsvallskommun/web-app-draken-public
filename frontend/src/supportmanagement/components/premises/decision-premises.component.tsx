'use client';

import type {
  PremisesChoice,
  PremisesChoiceEffect,
} from '@supportmanagement/services/support-decision-premises-service';
import { formatAddress } from '@supportmanagement/services/support-premises-address-service';
import { FC } from 'react';

import { PremisesLookup } from './premises-section.component';
import type { DecisionPremisesState } from './use-decision-premises';

const effectText = (effect: PremisesChoiceEffect | undefined, choice: PremisesChoice | undefined): string => {
  const number = choice?.kind === 'EXISTING' ? choice.restaurantNumber : '';
  switch (effect) {
    case 'NEW_NUMBER':
      return 'Ett nytt restaurangnummer och en ny tilldelning skapas på adressen.';
    case 'REPLACE_ASSIGNMENT':
      return `Den pågående tilldelningen på restaurangnummer ${number} avslutas och ersätts med en ny.`;
    case 'NEW_ASSIGNMENT':
      return `En ny tilldelning skapas på restaurangnummer ${number}.`;
    default:
      return 'Välj vilket restaurangnummer beslutet gäller, eller att ett nytt ska skapas.';
  }
};

interface DecisionPremisesProps {
  state: DecisionPremisesState;
  readOnly: boolean;
}

/** Choose which restaurant number the decision concerns, or a new one. Sent with the decision. */
export const DecisionPremises: FC<DecisionPremisesProps> = ({ state, readOnly }) => {
  const { lookup, address, choice, choose, effect } = state;

  return (
    <div className="flex flex-col gap-12 pt-12" data-cy="decision-premises">
      <PremisesLookup
        premises={state.premises}
        lookup={lookup}
        selection={
          readOnly
            ? undefined
            : {
                choice,
                onChoose: choose,
                newNumberAddress: address
                  ? formatAddress({
                      streetAddress: address.street,
                      postalCode: address.postalCode,
                      postalArea: address.city,
                    })
                  : undefined,
              }
        }
      />
      {readOnly ? null : (
        <p className="text-small m-0" data-cy="decision-premises-effect">
          {effectText(effect, choice)}
        </p>
      )}
    </div>
  );
};
