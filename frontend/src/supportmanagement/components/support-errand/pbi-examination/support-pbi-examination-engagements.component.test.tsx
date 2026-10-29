// @vitest-environment jsdom
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { pbiOf, withEngagements, withPbi } from '@supportmanagement/services/support-pbi-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { EngagementsBlock } from './support-pbi-examination-engagements.component';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { person?: string }) => (options?.person ? `${key}=${options.person}` : key),
  }),
}));

const searchPerson = vi.fn();
vi.mock('@common/services/adress-service', () => ({ searchPerson: (...args: unknown[]) => searchPerson(...args) }));

const getLegalEntityPersonEngagements = vi.fn();
vi.mock('@common/services/legal-entity-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLegalEntityPersonEngagements: (...args: unknown[]) => getLegalEntityPersonEngagements(...args),
}));

const EDWIN = 'edwin';
const FOUND_PARTY_ID = 'd1eda732-5aec-45e2-a673-4debd42b2f04';
const EDWIN_PARTY_ID = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';
// The company data writes organization numbers without a hyphen; the mock keeps the one users type.
const DRIVEN = mockEnv.mockSecondaryOrganizationNumber.replace('-', '');
const AUDITED = mockEnv.mockOrganizationNumber.replace('-', '');

const edwin: SupportStakeholderFormModel = withPbi(
  {
    internalId: EDWIN,
    externalId: EDWIN_PARTY_ID,
    externalIdType: 'PRIVATE',
    firstName: mockEnv.mockFirstName,
    lastName: mockEnv.mockLastName,
    personNumber: mockEnv.mockPersonNumber,
    parameters: [],
  } as never,
  { source: 'COMPANY', role: 'Verkställande direktör' }
);

const ENGAGEMENTS = [
  { organizationNumber: DRIVEN, name: 'Drivet AB', roles: [{ description: 'Verkställande direktör' }] },
  { organizationNumber: AUDITED, name: 'Granskat AB', roles: [{ description: 'Revisor' }] },
];

const onChange = vi.fn();

const mountBlock = (person: SupportStakeholderFormModel = edwin, writable = true) =>
  render(<EngagementsBlock person={person} writable={writable} onChange={onChange} />);

const searchFieldOf = () =>
  document.querySelector(`[data-cy="pbi-engagements-${EDWIN}-select"] input`) as HTMLInputElement;

const chipFor = (organizationNumber: string) =>
  document.querySelector(`[data-cy="pbi-engagements-${EDWIN}-chip-${organizationNumber}"]`) as HTMLButtonElement;

const boxFor = (organizationNumber: string) =>
  document.querySelector(`[data-cy="pbi-engagements-${EDWIN}-option-${organizationNumber}"]`) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  getLegalEntityPersonEngagements.mockResolvedValue(ENGAGEMENTS);
  searchPerson.mockResolvedValue({ personId: FOUND_PARTY_ID });
});

afterEach(cleanup);

test('the companies the person is engaged in are read by the party id the errand carries, auditing left out', async () => {
  mountBlock();

  await waitFor(() => expect(boxFor(DRIVEN)).toBeTruthy());

  expect(getLegalEntityPersonEngagements).toHaveBeenCalledWith(EDWIN_PARTY_ID);
  expect(boxFor(AUDITED)).toBeNull();
  expect(
    screen.getByText(`Drivet AB - ${mockEnv.mockSecondaryOrganizationNumber} - Verkställande direktör`)
  ).toBeTruthy();
});

test('showing the companies writes nothing, so the errand is not left with unsaved changes', async () => {
  mountBlock();
  await waitFor(() => expect(boxFor(DRIVEN)).toBeTruthy());

  expect(onChange).not.toHaveBeenCalled();
});

test('a company ticked is written onto the stakeholder, where Spara ärende picks it up', async () => {
  mountBlock();
  await waitFor(() => expect(boxFor(DRIVEN)).toBeTruthy());

  fireEvent.click(boxFor(DRIVEN));

  expect(pbiOf(onChange.mock.lastCall?.[0]).engagements).toEqual([DRIVEN]);
});

test('a company already chosen is ticked, and ticking it again takes it off the underlay', async () => {
  mountBlock(withEngagements(edwin, [DRIVEN]));
  await waitFor(() => expect(boxFor(DRIVEN)).toBeTruthy());

  await waitFor(() => expect(boxFor(DRIVEN).checked).toBe(true));

  fireEvent.click(boxFor(DRIVEN));

  expect(pbiOf(onChange.mock.lastCall?.[0]).engagements).toEqual([]);
});

test('a person without engagements is told so, and a failure is told apart from an empty answer', async () => {
  getLegalEntityPersonEngagements.mockResolvedValue([]);
  const { unmount } = mountBlock();

  await waitFor(() => expect(document.querySelector(`[data-cy="pbi-engagements-${EDWIN}-empty"]`)).toBeTruthy());
  unmount();

  getLegalEntityPersonEngagements.mockRejectedValue(new Error('no answer'));
  mountBlock();

  await waitFor(() => expect(document.querySelector(`[data-cy="pbi-engagements-${EDWIN}-error"]`)).toBeTruthy());
});

test('the personal number is never what the company data is asked for, only what the party id is found by', async () => {
  mountBlock({ ...edwin, externalId: undefined } as SupportStakeholderFormModel);

  await waitFor(() => expect(getLegalEntityPersonEngagements).toHaveBeenCalled());

  expect(getLegalEntityPersonEngagements).toHaveBeenCalledWith(FOUND_PARTY_ID);
  expect(getLegalEntityPersonEngagements).not.toHaveBeenCalledWith(mockEnv.mockPersonNumber);
});

test('the chosen companies stand under the combobox as chips, named and nothing more', async () => {
  mountBlock(withEngagements(edwin, [DRIVEN]));

  const chip = await waitFor(() => chipFor(DRIVEN));

  expect(chip.textContent).toBe('Drivet AB');

  fireEvent.click(chip);

  expect(pbiOf(onChange.mock.lastCall?.[0]).engagements).toEqual([]);
});

test('a company chosen before the company data changed is still named on its chip', async () => {
  getLegalEntityPersonEngagements.mockResolvedValue([]);
  mountBlock(withEngagements(edwin, [DRIVEN]));

  await waitFor(() => expect(chipFor(DRIVEN)).toBeTruthy());

  expect(chipFor(DRIVEN).textContent).toBe(mockEnv.mockSecondaryOrganizationNumber);
});

test('a passed step leaves the choice as it is', async () => {
  mountBlock(edwin, false);

  await waitFor(() => expect(boxFor(DRIVEN)).toBeTruthy());

  expect(searchFieldOf().disabled).toBe(true);
});

test('a person marked before the errand knew them is looked up by their personal number', async () => {
  const withoutPartyId = { ...edwin, externalId: undefined, personNumber: mockEnv.mockSecondaryPersonNumberDashed };

  mountBlock(withoutPartyId as SupportStakeholderFormModel);

  await waitFor(() => expect(searchPerson).toHaveBeenCalledWith(mockEnv.mockSecondaryPersonNumberDashed));
  await waitFor(() => expect(getLegalEntityPersonEngagements).toHaveBeenCalledWith(FOUND_PARTY_ID));
  await waitFor(() => expect(boxFor(DRIVEN)).toBeTruthy());
});

test('a person nobody can look up is told so, rather than shown an empty list', async () => {
  vi.mocked(searchPerson).mockResolvedValue(undefined);
  const withoutPartyId = { ...edwin, externalId: undefined, personNumber: mockEnv.mockSecondaryPersonNumberDashed };

  mountBlock(withoutPartyId as SupportStakeholderFormModel);

  await waitFor(() => expect(document.querySelector(`[data-cy="pbi-engagements-${EDWIN}-unknown"]`)).toBeTruthy());
  expect(getLegalEntityPersonEngagements).not.toHaveBeenCalled();
});
