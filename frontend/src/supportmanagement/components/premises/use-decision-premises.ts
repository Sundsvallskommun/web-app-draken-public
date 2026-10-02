'use client';

import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import {
  type DecisionPremises,
  type DecisionPremisesAddress,
  decisionPremisesAddress,
  type PremisesChoice,
  type PremisesChoiceEffect,
  premisesChoiceEffect,
  toDecisionPremisesParameters,
} from '@supportmanagement/services/support-decision-premises-service';
import type { PremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { useCallback, useMemo, useState } from 'react';

import { type PremisesRestaurantNumbers, usePremisesRestaurantNumbers } from './use-premises-restaurant-numbers';

export interface DecisionPremisesState {
  /** Lookup start: the saved decision's address, else the errand's. */
  premises?: PremisesAddress;
  lookup: PremisesRestaurantNumbers;
  /** Undefined until settled. */
  address?: DecisionPremisesAddress;
  choice?: PremisesChoice;
  choose: (choice: PremisesChoice) => void;
  /** Undefined until a choice is made. */
  effect?: PremisesChoiceEffect;
  /** Undefined until a choice is made. */
  parameters?: Parameter[];
}

const keyOf = (address: DecisionPremisesAddress | undefined): string =>
  address ? [address.street, address.postalCode, address.city].join('|') : '';

/** A saved decision's premises as a choice. */
const choiceOf = (saved: DecisionPremises): PremisesChoice =>
  saved.restaurantNumber ? { kind: 'EXISTING', restaurantNumber: saved.restaurantNumber } : { kind: 'NEW' };

/**
 * Restaurant numbers at the premises address plus the choice among them or a new one. A saved draft
 * restores its address and choice. No lookup without a municipality id.
 */
export const useDecisionPremises = (
  municipalityId: string | undefined,
  premises: PremisesAddress | undefined,
  saved?: DecisionPremises
): DecisionPremisesState => {
  const savedKey = saved ? `${keyOf(saved)}|${saved.restaurantNumber ?? ''}` : '';
  const startsFrom = useMemo(
    (): PremisesAddress | undefined =>
      saved
        ? { street: saved.street, postalCode: saved.postalCode, city: saved.city, source: premises?.source ?? 'FORM' }
        : premises,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedKey, premises]
  );
  const lookup = usePremisesRestaurantNumbers(municipalityId, startsFrom);
  const address = useMemo(
    () => decisionPremisesAddress({ match: lookup.match, address: lookup.address }, startsFrom),
    [lookup.match, lookup.address, startsFrom]
  );
  const addressKey = keyOf(address);
  const [chosen, setChosen] = useState<{ addressKey: string; choice: PremisesChoice }>();

  const [restoredKey, setRestoredKey] = useState('');
  if (savedKey !== restoredKey) {
    setRestoredKey(savedKey);
    setChosen(saved ? { addressKey: keyOf(saved), choice: choiceOf(saved) } : undefined);
  }

  const madeHere = !!addressKey && chosen?.addressKey === addressKey ? chosen.choice : undefined;
  const choice =
    madeHere?.kind === 'EXISTING' &&
    !lookup.restaurantNumbers.some((restaurantNumber) => restaurantNumber.number === madeHere.restaurantNumber)
      ? undefined
      : madeHere;

  const choose = useCallback((next: PremisesChoice) => setChosen({ addressKey, choice: next }), [addressKey]);

  const parameters = useMemo(
    () => (address && choice ? toDecisionPremisesParameters(address, choice) : undefined),
    [address, choice]
  );

  return {
    premises: startsFrom,
    lookup,
    address,
    choice,
    choose,
    effect: choice ? premisesChoiceEffect(choice, lookup.restaurantNumbers) : undefined,
    parameters,
  };
};
