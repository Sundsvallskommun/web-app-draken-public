'use client';

import type {
  PremisesChoice,
  PremisesChoiceEffect,
} from '@supportmanagement/services/support-decision-premises-service';
import { formatAddress } from '@supportmanagement/services/support-premises-address-service';
import { FC } from 'react';

import { PremisesLookup } from './premises-section.component';
import type { DecisionPremisesState } from './use-decision-premises';

const effectTexts: Record<PremisesChoiceEffect, (number: string) => string> = {
  NEW_NUMBER: () => 'Ett nytt restaurangnummer och en ny tilldelning skapas på adressen.',
  REPLACE_ASSIGNMENT: (number) =>
    `Den pågående tilldelningen på restaurangnummer ${number} avslutas och ersätts med en ny.`,
  NEW_ASSIGNMENT: (number) => `En ny tilldelning skapas på restaurangnummer ${number}.`,
};

const DEFAULT_EFFECT_TEXT = 'Välj vilket restaurangnummer beslutet gäller, eller att ett nytt ska skapas.';

const effectText = (effect: PremisesChoiceEffect | undefined, choice: PremisesChoice | undefined): string => {
  if (!effect) return DEFAULT_EFFECT_TEXT;
  const number = choice?.kind === 'EXISTING' ? choice.restaurantNumber : '';
  return effectTexts[effect](number);
};

const toNewNumberAddress = (address: DecisionPremisesState['address']) =>
  address &&
  formatAddress({
    streetAddress: address.street,
    postalCode: address.postalCode,
    postalArea: address.city,
  });

interface DecisionPremisesProps {
  state: DecisionPremisesState;
  readOnly: boolean;
}

/** Choose which restaurant number the decision concerns, or a new one. Sent with the decision. */
export const DecisionPremises: FC<DecisionPremisesProps> = ({ state, readOnly }) => {
  const { premises, lookup, address, choice, choose, effect } = state;

  const selection = readOnly ? undefined : { choice, onChoose: choose, newNumberAddress: toNewNumberAddress(address) };

  return (
    <div className="flex flex-col gap-12 pt-12" data-cy="decision-premises">
      <PremisesLookup premises={premises} lookup={lookup} selection={selection} />
      {!readOnly && (
        <p className="text-small m-0" data-cy="decision-premises-effect">
          {effectText(effect, choice)}
        </p>
      )}
    </div>
  );
};
