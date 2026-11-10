// @vitest-environment jsdom
import { searchPerson } from '@common/services/adress-service';
import { getLegalEntityEngagements } from '@common/services/legal-entity-service';
import { useSupportStore, useUserStore } from '@stores/index';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { hyphenatedIdentity, isPbi, pbiOf, withPbi } from '@supportmanagement/services/support-pbi-service';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { useSupportPbi } from './use-support-pbi';

vi.mock('@common/components/file-upload/file-upload.component', () => ({ imageMimeTypes: [], documentMimeTypes: [] }));
vi.mock('@common/services/adress-service', () => ({ searchPerson: vi.fn() }));
vi.mock('@common/services/legal-entity-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLegalEntityEngagements: vi.fn(),
}));
vi.mock('@sk-web-gui/react', () => ({ useSnackbar: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

/** The form as the hook sees it: what it reads with watch, and what it wrote with setValue. */
const form: { customer: SupportStakeholderFormModel[]; contacts: SupportStakeholderFormModel[] } = {
  customer: [],
  contacts: [],
};
const setValue = vi.fn((name: 'customer' | 'contacts', value: SupportStakeholderFormModel[]) => {
  form[name] = value;
});
vi.mock('react-hook-form', () => ({
  useFormContext: () => ({ watch: (name: 'customer' | 'contacts') => form[name], setValue }),
}));

const COMPANY = 'd5727c45-8c19-42a0-a04a-5ef11d108618';
const EDWIN_PARTY_ID = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';
const robotNumber = mockEnv.mockPersonNumber;
const androidNumber = mockEnv.mockSecondaryPersonNumber;
const otherNumber = mockEnv.mockTertiaryPersonNumber;

const edwin = {
  name: 'Edwin Molina',
  identity: { type: 'PERSONNUMMER', code: robotNumber },
  relations: [{ description: 'VD' }],
};
const ownerCompany = { name: 'Ägarbolaget AB', identity: { type: 'ORGANISATIONSNUMMER', code: '5560269986' } };

const contact = (overrides: Partial<SupportStakeholderFormModel>): SupportStakeholderFormModel =>
  ({
    internalId: 'c1',
    externalId: 'x',
    externalIdType: 'PRIVATE',
    role: 'CONTACT',
    emails: [],
    phoneNumbers: [],
    parameters: [],
    ...overrides,
  } as never);

beforeEach(() => {
  vi.clearAllMocks();
  form.customer = [];
  form.contacts = [];
  vi.mocked(getLegalEntityEngagements).mockResolvedValue([edwin, ownerCompany]);
  vi.mocked(searchPerson).mockResolvedValue({
    personId: EDWIN_PARTY_ID,
    firstName: 'Edwin',
    lastName: 'Molina',
  } as never);
  useSupportStore.setState({
    supportErrand: { id: 'e1', status: 'ONGOING' } as never,
    stakeholderContacts: [],
    stakeholderCustomers: [],
  });
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
});
afterEach(cleanup);

const mount = () => renderHook(() => useSupportPbi(COMPANY));
const loaded = (result: { current: { candidates: unknown[] } }) =>
  waitFor(() => expect(result.current.candidates).toHaveLength(2));

describe('useSupportPbi', () => {
  test('lays the company engagements beside the stakeholders, marked where one carries the PBI parameter', async () => {
    form.contacts = [withPbi(contact({ personNumber: hyphenatedIdentity(robotNumber) }), { source: 'COMPANY' })];
    const { result } = mount();
    await loaded(result);

    expect(result.current.candidates.map((c) => [c.engagement.name, c.marked])).toEqual([
      ['Edwin Molina', true],
      ['Ägarbolaget AB', false],
    ]);
    expect(result.current.people).toHaveLength(1);
  });

  test('marking someone from the company data looks them up in Citizen and adds them to the contacts in the form', async () => {
    const { result } = mount();
    await loaded(result);

    await act(async () => {
      expect(await result.current.mark(result.current.candidates[0])).toBe(true);
    });

    expect(searchPerson).toHaveBeenCalledWith(robotNumber);
    expect(setValue).toHaveBeenCalledWith('contacts', expect.anything(), { shouldDirty: true, shouldValidate: true });
    const added = form.contacts[0];
    expect(added).toMatchObject({ externalId: EDWIN_PARTY_ID, firstName: 'Edwin', personNumber: robotNumber });
    expect(pbiOf(added)).toMatchObject({ source: 'COMPANY', role: 'VD' });
    expect(useSupportStore.getState().stakeholderContacts).toEqual(form.contacts);
  });

  test('marking someone who is already a stakeholder only sets the parameters, so they stay when unmarked', async () => {
    form.customer = [contact({ internalId: 'applicant', role: 'PRIMARY', personNumber: robotNumber })];
    const { result } = mount();
    await loaded(result);

    await act(async () => {
      await result.current.mark(result.current.candidates[0]);
    });
    expect(searchPerson).not.toHaveBeenCalled();
    expect(isPbi(form.customer[0])).toBe(true);
    expect(pbiOf(form.customer[0]).source).toBeUndefined();

    act(() => result.current.unmark(form.customer[0]));
    expect(form.customer).toHaveLength(1);
    expect(isPbi(form.customer[0])).toBe(false);
  });

  test('unmarking someone who was added for the marking takes them off the errand', async () => {
    form.contacts = [withPbi(contact({ personNumber: robotNumber }), { source: 'COMPANY' })];
    const { result } = mount();
    await loaded(result);

    act(() => result.current.unmark(form.contacts[0]));
    expect(form.contacts).toEqual([]);
    expect(useSupportStore.getState().stakeholderContacts).toEqual([]);
  });

  test('a person Citizen does not know is not added', async () => {
    vi.mocked(searchPerson).mockResolvedValue(undefined);
    const { result } = mount();
    await loaded(result);

    await act(async () => {
      expect(await result.current.mark(result.current.candidates[0])).toBe(false);
    });
    expect(form.contacts).toEqual([]);
  });

  test('adding by hand appends a contact with the typed role, or marks an existing stakeholder with the same identity', async () => {
    form.contacts = [contact({ internalId: 'known', personNumber: otherNumber })];
    const { result, rerender } = mount();
    await loaded(result);

    await act(async () => {
      await result.current.addByHand({
        partyId: 'p2',
        firstName: 'Sara',
        lastName: 'Lind',
        personNumber: androidNumber,
        role: 'Finansiär',
      });
    });
    // The form is mocked, so the re-render that watch() would cause after a write is done by hand.
    rerender();
    await act(async () => {
      await result.current.addByHand({
        partyId: 'p3',
        firstName: 'K',
        lastName: 'K',
        personNumber: hyphenatedIdentity(otherNumber),
      });
    });

    expect(form.contacts).toHaveLength(2);
    expect(pbiOf(form.contacts[1])).toMatchObject({ source: 'MANUAL', role: 'Finansiär' });
    expect(isPbi(form.contacts[0])).toBe(true);
    expect(pbiOf(form.contacts[0]).source).toBeUndefined();
  });

  test('without a company there is no table, but people can still be added', async () => {
    const { result } = renderHook(() => useSupportPbi(undefined));
    await act(async () => {
      await result.current.addByHand({
        partyId: 'p2',
        firstName: 'Sara',
        lastName: 'Lind',
        personNumber: androidNumber,
      });
    });
    expect(getLegalEntityEngagements).not.toHaveBeenCalled();
    expect(result.current.candidates).toEqual([]);
    expect(form.contacts).toHaveLength(1);
  });

  test('a locked errand cannot be marked on', async () => {
    useSupportStore.setState({ supportErrand: { id: 'e1', status: 'SOLVED' } as never });
    const { result } = mount();
    await loaded(result);
    expect(result.current.canEdit).toBe(false);
  });
});
