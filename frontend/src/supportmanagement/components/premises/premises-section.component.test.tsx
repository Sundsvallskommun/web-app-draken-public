// @vitest-environment jsdom
import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
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

const address: Address = {
  id: mockEnv.mockLicensedBusinessAddressId,
  streetAddress: mockEnv.mockPremisesAddress.street,
  postalCode: mockEnv.mockPremisesAddress.postalCode,
  postalArea: mockEnv.mockPremisesAddress.city,
};
const otherAddress: Address = {
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
  expect(screen.getByText('2026-01-01 – tills vidare · Pågående')).toBeTruthy();
  expect(screen.getByText('Ledigt')).toBeTruthy();
  expect(screen.getByText('Aldrig tilldelat')).toBeTruthy();
  expect(vi.mocked(usePremisesRestaurantNumbers).mock.calls[0]).toEqual([MUNICIPALITY_ID, PREMISES]);
});

test('assignment statuses are shown in Swedish, and an unknown one as sent', () => {
  const withAssignmentStatus = (status: string, validTo?: string): RestaurantNumberWithAssignment => ({
    ...activeNumber,
    assignment: { ...activeNumber.assignment, validTo, status },
  });
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(
    state({
      match: { match: 'EXACT', address },
      address,
      restaurantNumbers: [withAssignmentStatus('ENDED', '2026-06-30'), withAssignmentStatus('SUSPENDED')],
    })
  );

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect(screen.getByText('2026-01-01 – 2026-06-30 · Avslutad')).toBeTruthy();
  expect(screen.getByText('2026-01-01 – tills vidare · SUSPENDED')).toBeTruthy();
});

test('explains that the section only shows what is registered, and that creating happens at the decision', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({}));

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect(screen.getByText(/Visar bara vad som redan finns registrerat på adressen/).textContent).toContain(
    'skapas i beslutssteget'
  );
});

test('says where the premises address came from', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({}));

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={{ ...PREMISES, source: 'OWNER' }} />);

  expect(screen.getByText(/^Ärendeägarens adress:/).textContent).toContain(mockEnv.mockPremisesAddress.street);
});

test('shows the premises address as information, with the postal code written with its space', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({}));
  const postalCode = mockEnv.mockPremisesAddress.postalCode;

  render(
    <PremisesSection
      municipalityId={MUNICIPALITY_ID}
      premises={{ ...PREMISES, postalCode: postalCode.replace(/\s/g, '') }}
    />
  );

  expect(screen.getByText(/^Adress i ansökan:/).textContent).toBe(
    `Adress i ansökan: ${PREMISES.street}, ${postalCode} ${PREMISES.city}`
  );
});

/** The premises street with another house number, e.g. Testgatan 11. */
const onStreet = (houseNumber: number, postalCode: string = address.postalCode): Address => ({
  ...address,
  id: `${address.id}-${houseNumber}-${postalCode}`,
  streetAddress: mockEnv.mockPremisesAddress.street.replace(/\d+$/, String(houseNumber)),
  postalCode,
});

const searchMatch = (addresses: Address[], totalRecords = addresses.length) => ({
  match: 'SEARCH' as const,
  query: PREMISES.street,
  addresses,
  totalRecords,
});

const resultRows = () =>
  Array.from(document.querySelectorAll('[data-cy="premises-address-results"] tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('td'))
      .slice(0, 2)
      .map((cell) => cell.textContent)
      .join(' | ')
  );

const showButton = (result: Address) =>
  screen.getByRole('button', {
    name: `Visa serveringsställen på ${result.streetAddress}, ${result.postalCode} ${result.postalArea}`,
  });

test('search results are listed in a table for the person to pick one', () => {
  const selectAddress = vi.fn();
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(
    state({ match: searchMatch([address, otherAddress]), selectAddress })
  );

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);
  fireEvent.click(showButton(otherAddress));

  expect(selectAddress).toHaveBeenCalledWith(otherAddress);
  expect(screen.getByText(/2 adresser för/)).toBeTruthy();
});

test('search results are sorted by street, house numbers as numbers, then postal code', () => {
  // The company postal code sorts before the premises one (000 01 < 000 02).
  const lower = mockEnv.mockCompanyAddress.postalCode;
  const higher = address.postalCode;
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(
    state({ match: searchMatch([onStreet(12, higher), onStreet(11), onStreet(2), onStreet(12, lower)]) })
  );

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  const street = (n: number) => onStreet(n).streetAddress;
  expect(resultRows()).toEqual([
    `${street(2)} | ${higher}`,
    `${street(11)} | ${higher}`,
    `${street(12)} | ${lower}`,
    `${street(12)} | ${higher}`,
  ]);
});

test('a result page smaller than the number of matches asks for a narrower search', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({ match: searchMatch([address, otherAddress], 14) }));

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect(screen.getByText(/Visar 2 av 14 adresser/)).toBeTruthy();
});

test('the picked address stays marked in the results, with its restaurant numbers below', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(
    state({ match: searchMatch([address, otherAddress]), address: otherAddress, restaurantNumbers: [activeNumber] })
  );

  render(<PremisesSection municipalityId={MUNICIPALITY_ID} premises={PREMISES} />);

  expect(screen.getByText('Vald')).toBeTruthy();
  expect(showButton(address)).toBeTruthy();
  expect(screen.getByText(mockEnv.mockRestaurantNumber)).toBeTruthy();
});

test('a search without hits says so', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(state({ match: searchMatch([]) }));

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
