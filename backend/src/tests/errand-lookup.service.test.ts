import { User } from '@/interfaces/users.interface';
import { fetchErrandNumber, fetchErrandNumbers, normalizeService, withDefaultNamespace } from '@/services/errand-lookup.service';

import {
  mockAdUsername,
  mockCasedataErrandId,
  mockCasedataErrandNumber,
  mockDepartment,
  mockMunicipalityId,
  mockSupportErrandId,
  mockSupportErrandNumber,
  mockSupportNamespace,
} from './helpers/mock-data';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/services/api.service', () => ({
  default: class {
    get = get;
  },
  ApiResponse: class {},
}));

const user = { username: mockAdUsername } as User;
const caseDataId = String(mockCasedataErrandId);

beforeEach(() => {
  get.mockReset();
});

describe('normalizeService', () => {
  it.each([
    ['supportmanagement', 'supportmanagement'],
    ['support-management', 'supportmanagement'],
    ['SUPPORT_MANAGEMENT', 'supportmanagement'],
    ['case-data', 'case-data'],
    ['casedata', 'case-data'],
    ['CASE_DATA', 'case-data'],
  ])('reads %s as %s', (spelling, expected) => {
    expect(normalizeService(spelling)).toBe(expected);
  });

  it('knows no other services', () => {
    expect(normalizeService('partyassets')).toBeUndefined();
    expect(normalizeService(undefined)).toBeUndefined();
  });
});

describe('withDefaultNamespace', () => {
  it("fills in this drake's namespace of the service", () => {
    expect(withDefaultNamespace({ id: mockSupportErrandId, service: 'supportmanagement' }).namespace).toBe(mockSupportNamespace);
  });

  it('keeps a namespace that is given', () => {
    expect(withDefaultNamespace({ id: caseDataId, service: 'case-data', namespace: mockDepartment }).namespace).toBe(mockDepartment);
  });
});

describe('fetchErrandNumber', () => {
  it('reads a supportmanagement errand from Support Management', async () => {
    get.mockResolvedValue({ data: { errandNumber: mockSupportErrandNumber } });

    const number = await fetchErrandNumber(mockMunicipalityId, { id: mockSupportErrandId, service: 'supportmanagement' }, user);

    expect(number).toBe(mockSupportErrandNumber);
    const [{ url, baseURL }] = get.mock.calls[0];
    expect(url).toBe(`${mockMunicipalityId}/${mockSupportNamespace}/errands/${mockSupportErrandId}`);
    expect(baseURL).toContain('supportmanagement');
  });

  it('reads a case-data errand from case-data', async () => {
    get.mockResolvedValue({ data: { errandNumber: mockCasedataErrandNumber } });

    await fetchErrandNumber(mockMunicipalityId, { id: caseDataId, service: 'case-data', namespace: mockDepartment }, user);

    const [{ url, baseURL }] = get.mock.calls[0];
    expect(url).toBe(`${mockMunicipalityId}/${mockDepartment}/errands/${caseDataId}`);
    expect(baseURL).toContain('case-data');
  });

  it('gives no number when the errand cannot be read', async () => {
    get.mockRejectedValue(new Error('404'));

    expect(await fetchErrandNumber(mockMunicipalityId, { id: mockSupportErrandId, service: 'supportmanagement' }, user)).toBeUndefined();
  });
});

describe('fetchErrandNumbers', () => {
  it('reads each errand once and leaves out those it cannot read', async () => {
    get.mockImplementation(async ({ url }: { url: string }) => {
      if (url.endsWith(mockSupportErrandId)) return { data: { errandNumber: mockSupportErrandNumber } };
      throw new Error('404');
    });

    const numbers = await fetchErrandNumbers(
      mockMunicipalityId,
      [
        { id: mockSupportErrandId, service: 'supportmanagement' },
        { id: mockSupportErrandId, service: 'supportmanagement' },
        { id: caseDataId, service: 'case-data', namespace: mockDepartment },
      ],
      user,
    );

    expect(Array.from(numbers.entries())).toEqual([[mockSupportErrandId, mockSupportErrandNumber]]);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
