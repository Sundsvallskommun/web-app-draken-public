// @vitest-environment jsdom
import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
import type { RestaurantNumberWithAssignment } from '@supportmanagement/services/licensed-business-service';
import type { PremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../tests/mock-env';
import { DecisionPremises } from './decision-premises.component';
import type { DecisionPremisesState } from './use-decision-premises';

const PREMISES: PremisesAddress = { ...mockEnv.mockPremisesAddress, source: 'FORM' };
const { street, postalCode, city } = mockEnv.mockPremisesAddress;
const FORMATTED = `${street}, ${postalCode} ${city}`;

const address: Address = {
  id: mockEnv.mockLicensedBusinessAddressId,
  streetAddress: street,
  postalCode,
  postalArea: city,
};

const activeNumber: RestaurantNumberWithAssignment = {
  number: mockEnv.mockRestaurantNumber,
  status: 'ACTIVE' as never,
  assignment: { holderName: mockEnv.mockCompanyName, validFrom: '2026-01-01', status: 'ACTIVE' },
  assignmentFailed: false,
};
const freeNumber: RestaurantNumberWithAssignment = {
  number: mockEnv.mockSecondaryRestaurantNumber,
  status: 'AVAILABLE' as never,
  assignment: null,
  assignmentFailed: false,
};

const state = (overrides: Partial<DecisionPremisesState> = {}): DecisionPremisesState => ({
  lookup: {
    loading: false,
    match: { match: 'EXACT', address },
    address,
    restaurantNumbers: [activeNumber, freeNumber],
    selectAddress: vi.fn(),
    search: vi.fn(),
  },
  address: { street, postalCode, city },
  choose: vi.fn(),
  premises: PREMISES,
  ...overrides,
});

const effect = () => document.querySelector('[data-cy="decision-premises-effect"]')?.textContent;
const useNumber = (number: string) => screen.getByLabelText(`Använd restaurangnummer ${number}`) as HTMLInputElement;
const createNew = () => screen.getByLabelText(`Skapa nytt restaurangnummer på ${FORMATTED}`) as HTMLInputElement;

afterEach(cleanup);

test('every restaurant number at the address can be chosen, and so can a new one', () => {
  const choose = vi.fn();
  render(<DecisionPremises state={state({ choose })} readOnly={false} />);

  fireEvent.click(useNumber(mockEnv.mockSecondaryRestaurantNumber));
  fireEvent.click(createNew());

  expect(choose.mock.calls).toEqual([
    [{ kind: 'EXISTING', restaurantNumber: mockEnv.mockSecondaryRestaurantNumber }],
    [{ kind: 'NEW' }],
  ]);
  expect(effect()).toBe('Välj vilket restaurangnummer beslutet gäller, eller att ett nytt ska skapas.');
});

test('the choice is marked, and what the process does with it is spelled out', () => {
  const chosen = { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber } as const;
  render(<DecisionPremises state={state({ choice: chosen, effect: 'REPLACE_ASSIGNMENT' })} readOnly={false} />);

  expect(useNumber(mockEnv.mockRestaurantNumber).checked).toBe(true);
  expect(createNew().checked).toBe(false);
  expect(effect()).toBe(
    `Den pågående tilldelningen på restaurangnummer ${mockEnv.mockRestaurantNumber} avslutas och ersätts med en ny.`
  );
});

test('a number without a running assignment gets a new one, and a new number is created with its assignment', () => {
  const chosen = { kind: 'EXISTING', restaurantNumber: mockEnv.mockSecondaryRestaurantNumber } as const;
  const { rerender } = render(
    <DecisionPremises state={state({ choice: chosen, effect: 'NEW_ASSIGNMENT' })} readOnly={false} />
  );
  expect(effect()).toBe(`En ny tilldelning skapas på restaurangnummer ${mockEnv.mockSecondaryRestaurantNumber}.`);

  rerender(<DecisionPremises state={state({ choice: { kind: 'NEW' }, effect: 'NEW_NUMBER' })} readOnly={false} />);
  expect(createNew().checked).toBe(true);
  expect(effect()).toBe('Ett nytt restaurangnummer och en ny tilldelning skapas på adressen.');
});

test('an address without restaurant numbers leaves a new number as the only choice', () => {
  const lookup = { ...state().lookup, restaurantNumbers: [] };
  render(<DecisionPremises state={state({ lookup })} readOnly={false} />);

  expect(screen.getByText('Inga serveringsställen finns registrerade på adressen.')).toBeTruthy();
  expect(screen.getAllByRole('radio')).toEqual([createNew()]);
});

test('without a settled address nothing can be chosen', () => {
  const lookup = { ...state().lookup, match: undefined, address: undefined, restaurantNumbers: [] };
  render(<DecisionPremises state={state({ lookup, address: undefined })} readOnly={false} />);

  expect(screen.queryAllByRole('radio')).toEqual([]);
});

test('read-only, the restaurant numbers are shown but not chosen among', () => {
  render(<DecisionPremises state={state()} readOnly />);

  expect(screen.getByText(mockEnv.mockRestaurantNumber)).toBeTruthy();
  expect(screen.queryAllByRole('radio')).toEqual([]);
  expect(effect()).toBeUndefined();
});
