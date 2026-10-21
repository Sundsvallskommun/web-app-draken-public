import { expect, test, vi } from 'vitest';

vi.mock('@common/components/file-upload/file-upload.component', () => ({
  imageMimeTypes: [],
  documentMimeTypes: [],
}));

import { mockEnv } from '../../tests/mock-env';
import { ExternalIdType, getStakeholderOrganizationNumber } from './support-errand-service';

const partyId = '11111111-2222-4333-8444-555555555555';
const organizationNumber = mockEnv.mockOrganizationNumber;
const stakeholder = (overrides: Record<string, unknown>) =>
  ({ externalIdType: ExternalIdType.COMPANY, ...overrides } as never);

test('the organizationNumber parameter wins over everything else', () => {
  const s = stakeholder({
    externalId: partyId,
    organizationNumber: mockEnv.mockOrganizationNumber,
    parameters: [{ key: 'organizationNumber', values: [organizationNumber] }],
  });
  expect(getStakeholderOrganizationNumber(s)).toBe(organizationNumber);
});

test('the number the backend resolved from the party id is used when the parameter is missing', () => {
  expect(getStakeholderOrganizationNumber(stakeholder({ externalId: partyId, organizationNumber }))).toBe(
    organizationNumber
  );
});

test.each(['5560269986', '556026-9986', '165560269986'])(
  'a legacy externalId holding the org number %s is accepted',
  (externalId) => {
    expect(getStakeholderOrganizationNumber(stakeholder({ externalId }))).toBe(externalId);
  }
);

test.each([ExternalIdType.COMPANY, ExternalIdType.ENTERPRISE])(
  'a party UUID in externalId is never shown as a %s org number',
  (externalIdType) => {
    expect(getStakeholderOrganizationNumber(stakeholder({ externalIdType, externalId: partyId }))).toBeUndefined();
  }
);

test('a person never gets an org number from externalId', () => {
  expect(
    getStakeholderOrganizationNumber(stakeholder({ externalIdType: ExternalIdType.PRIVATE, externalId: '5560269986' }))
  ).toBeUndefined();
});
