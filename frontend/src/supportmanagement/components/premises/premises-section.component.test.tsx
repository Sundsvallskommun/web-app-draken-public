// @vitest-environment jsdom
import type { RestaurantNumberWithAssignment } from '@supportmanagement/services/licensed-business-service';
import type { PremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../tests/mock-env';
import { PremisesSection } from './premises-section.component';
import { type PremisesRestaurantNumbers, usePremisesRestaurantNumbers } from './use-premises-restaurant-numbers';

vi.mock('./use-premises-restaurant-numbers', () => ({ usePremisesRestaurantNumbers: vi.fn() }));

const MUNICIPALITY_ID = '2281';
const PREMISES: PremisesAddress = { ...mockEnv.mockPremisesAddress, source: 'FORM' };

const address = {
  id: mockEnv.mockLicensedBusinessAddressId,
  streetAddress: mockEnv.mockPremisesAddress.street,
  postalCode: mockEnv.mockPremisesAddress.postalCode,
  postalArea: mockEnv.mockPremisesAddress.city,
};
const otherAddress = {
  ...address,
  id: mockEnv.mockSecondaryLicensedBusinessAddressId,
  streetAddress: mockEnv.mockCompanyAddress.street,
};

const activeNumber: RestaurantNumberWithAssignment = {
  number: mockEnv.mockRestaurantNumber,
  status: 'ACTIVE' as never,
  premisesName: mockEnv.mockPremisesName,
  assignment: {
    holderName: mockEnv.mockCompanyName,
    licenseHolder: { orgNumber: mockEnv.mockOrganizationNumber },
    validFrom: '2026-01-01',
    status: 'ACTIVE',
  },
  assignmentFailed: false,
};
const neverAssigned: RestaurantNumberWithAssignment = {
  number: mockEnv.mockSecondaryRestaurantNumber,
  status: 'AVAILABLE' as never,
  assignment: null,
  assignmentFailed: false,
};

const state = (overrides: Partial<PremisesRestaurantNumbers>): PremisesRestaurantNumbers => ({
  loading: false,
  restaurantNumbers: [],
  selectAddress: vi.fn(),
  search: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.mocked(usePremisesRestaurantNumbers).mockReset();
});
afterEach(cleanup);

test('shows the restaurant numbers at the matched address with their latest assignment', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(
    state({ match: { match: 'EXACT', address }, address, restaurantNumbers: [activeNumber, neverAssigned] })
  );

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect(screen.getByText(mockEnv.mockRestaurantNumber)).toBeTruthy();
  expect(screen.getByText(mockEnv.mockPremisesName)).toBeTruthy();
  expect(screen.getByText('Aktivt')).toBeTruthy();
  expect(screen.getByText(mockEnv.mockCompanyName, { exact: false })).toBeTruthy();
  expect(screen.getByText('2026-01-01 – tills vidare · Aktiv')).toBeTruthy();
  expect(screen.getByText('Ledigt')).toBeTruthy();
  expect(screen.getByText('Aldrig tilldelat')).toBeTruthy();
  expect(vi.mocked(usePremisesRestaurantNumbers).mock.calls[0]).toEqual([MUNICIPALITY_ID, PREMISES]);
});

test('says where the premises address came from', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({}));

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={{ ...PREMISES, source: 'OWNER' }} />);

  expect(screen.getByText(/ärendeägarens adress/).textContent).toContain(mockEnv.mockPremisesAddress.street);
});

test('search results are listed for the person to pick one', () => {
  const selectAddress = vi.fn();
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(
    state({ match: { match: 'SEARCH', query: PREMISES.street, addresses: [address, otherAddress] }, selectAddress })
  );

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);
  fireEvent.click(screen.getByText(mockEnv.mockCompanyAddress.street, { exact: false }));

  expect(selectAddress).toHaveBeenCalledWith(otherAddress);
});

test('a search without hits says so', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(
    state({ match: { match: 'SEARCH', query: PREMISES.street, addresses: [] } })
  );

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect(screen.getByText(`Inga adresser hittades för ”${PREMISES.street}”.`)).toBeTruthy();
});

test('without a premises address the person is asked to search, from an empty field', () => {
  const search = vi.fn();
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({ search }));

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={undefined} />);

  expect(screen.getByText('Ärendet saknar besöksadress. Sök efter serveringsställets adress.')).toBeTruthy();
  const input = screen.getByPlaceholderText('Sök adress') as HTMLInputElement;
  expect(input.value).toBe('');

  fireEvent.change(input, { target: { value: mockEnv.mockCompanyAddress.street } });
  fireEvent.keyDown(input, { key: 'Enter' });

  expect(search).toHaveBeenCalledWith(mockEnv.mockCompanyAddress.street);
});

test('the search field starts from the premises street', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({}));

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect((screen.getByPlaceholderText('Sök adress') as HTMLInputElement).value).toBe(PREMISES.street);
});

test('a failure is shown as an alert', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({ error: 'Serveringsställen kunde inte hämtas' }));

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect(screen.getByRole('alert').textContent).toBe('Serveringsställen kunde inte hämtas');
});
