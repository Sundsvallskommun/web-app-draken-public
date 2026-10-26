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

const getLegalEntityPersonEngagements = vi.fn();
vi.mock('@common/services/legal-entity-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLegalEntityPersonEngagements: (...args: unknown[]) => getLegalEntityPersonEngagements(...args),
}));

const EDWIN = 'edwin';
const EDWIN_PARTY_ID = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';

const edwin: SupportStakeholderFormModel = withPbi(
  {
    internalId: EDWIN,
    externalId: EDWIN_PARTY_ID,
    externalIdType: 'PRIVATE',
    firstName: 'Edwin',
    lastName: 'Molina',
    personNumber: mockEnv.mockPersonNumber,
    parameters: [],
  } as never,
  { source: 'COMPANY', role: 'Verkställande direktör' }
);

const DRIVET_ORGANIZATION_NUMBER = mockEnv.mockSecondaryOrganizationNumber.replace('-', '');

const ENGAGEMENTS = [
  {
    organizationNumber: DRIVET_ORGANIZATION_NUMBER,
    name: 'Drivet AB',
    roles: [{ description: 'Verkställande direktör' }],
  },
  { organizationNumber: '5567890123', name: 'Granskat AB', roles: [{ description: 'Revisor' }] },
];

const onChange = vi.fn();

const mountBlock = (person: SupportStakeholderFormModel = edwin, writable = true) =>
  render(<EngagementsBlock person={person} writable={writable} onChange={onChange} />);

const searchFieldOf = () =>
  document.querySelector(`[data-cy="pbi-engagements-select-${EDWIN}"] input`) as HTMLInputElement;

const chipFor = (organizationNumber: string) =>
  document.querySelector(`[data-cy="pbi-engagement-chosen-${EDWIN}-${organizationNumber}"]`) as HTMLButtonElement;

const boxFor = (organizationNumber: string) =>
  document.querySelector(`[data-cy="pbi-engagement-${EDWIN}-${organizationNumber}"]`) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  getLegalEntityPersonEngagements.mockResolvedValue(ENGAGEMENTS);
});

afterEach(cleanup);

test('the companies the person is engaged in are read by the party id the errand carries, auditing left out', async () => {
  mountBlock();

  await waitFor(() => expect(boxFor(DRIVET_ORGANIZATION_NUMBER)).toBeTruthy());

  expect(getLegalEntityPersonEngagements).toHaveBeenCalledWith(EDWIN_PARTY_ID);
  expect(boxFor('5567890123')).toBeNull();
  expect(
    screen.getByText(`Drivet AB - ${mockEnv.mockSecondaryOrganizationNumber} - Verkställande direktör`)
  ).toBeTruthy();
});

test('a company ticked is written onto the stakeholder, where Spara ärende picks it up', async () => {
  mountBlock();
  await waitFor(() => expect(boxFor(DRIVET_ORGANIZATION_NUMBER)).toBeTruthy());

  fireEvent.click(boxFor(DRIVET_ORGANIZATION_NUMBER));

  expect(pbiOf(onChange.mock.lastCall?.[0]).engagements).toEqual([DRIVET_ORGANIZATION_NUMBER]);
});

test('a company already chosen is ticked, and ticking it again takes it off the underlay', async () => {
  mountBlock(withEngagements(edwin, [DRIVET_ORGANIZATION_NUMBER]));
  await waitFor(() => expect(boxFor(DRIVET_ORGANIZATION_NUMBER)).toBeTruthy());

  await waitFor(() => expect(boxFor(DRIVET_ORGANIZATION_NUMBER).checked).toBe(true));

  fireEvent.click(boxFor(DRIVET_ORGANIZATION_NUMBER));

  expect(pbiOf(onChange.mock.lastCall?.[0]).engagements).toEqual([]);
});

test('a person without engagements is told so, and a failure is told apart from an empty answer', async () => {
  getLegalEntityPersonEngagements.mockResolvedValue([]);
  const { unmount } = mountBlock();

  await waitFor(() => expect(document.querySelector(`[data-cy="pbi-engagements-empty-${EDWIN}"]`)).toBeTruthy());
  unmount();

  getLegalEntityPersonEngagements.mockRejectedValue(new Error('no answer'));
  mountBlock();

  await waitFor(() => expect(document.querySelector(`[data-cy="pbi-engagements-error-${EDWIN}"]`)).toBeTruthy());
});

test('the personal number is never what the company data is asked for, since the errand does not carry one', async () => {
  mountBlock({ ...edwin, externalId: undefined } as SupportStakeholderFormModel);

  await waitFor(() => expect(document.querySelector(`[data-cy="pbi-engagements-${EDWIN}"]`)).toBeTruthy());

  expect(getLegalEntityPersonEngagements).not.toHaveBeenCalled();
});

test('the chosen companies stand under the combobox as chips, named and nothing more', async () => {
  mountBlock(withEngagements(edwin, [DRIVET_ORGANIZATION_NUMBER]));

  const chip = await waitFor(() => chipFor(DRIVET_ORGANIZATION_NUMBER));

  expect(chip.textContent).toBe('Drivet AB');

  fireEvent.click(chip);

  expect(pbiOf(onChange.mock.lastCall?.[0]).engagements).toEqual([]);
});

test('a company chosen before the company data changed is still named on its chip', async () => {
  getLegalEntityPersonEngagements.mockResolvedValue([]);
  mountBlock(withEngagements(edwin, [DRIVET_ORGANIZATION_NUMBER]));

  await waitFor(() => expect(chipFor(DRIVET_ORGANIZATION_NUMBER)).toBeTruthy());

  expect(chipFor(DRIVET_ORGANIZATION_NUMBER).textContent).toBe(mockEnv.mockSecondaryOrganizationNumber);
});

test('a passed step leaves the choice as it is', async () => {
  mountBlock(edwin, false);

  await waitFor(() => expect(boxFor(DRIVET_ORGANIZATION_NUMBER)).toBeTruthy());

  expect(searchFieldOf().disabled).toBe(true);
});
