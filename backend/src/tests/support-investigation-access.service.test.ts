import { createSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { User } from '@/interfaces/users.interface';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';

import { mockUser } from './helpers/http';

const profile = createSupportInvestigationProfile({
  application: 'FUTURE',
  documents: [
    { key: 'manager-document', schemaName: 'shared-schema', tabLabel: 'Manager', ownerLabel: 'Manager' },
    { key: 'review-document', schemaName: 'shared-schema', tabLabel: 'Review', ownerLabel: 'Reviewer' },
  ],
});

const configuration = JSON.stringify({
  'manager-document': { readGroups: ['manager', 'auditor'], writeGroups: ['manager'] },
  'review-document': { readGroups: ['*'], writeGroups: ['reviewer'] },
});
const user = (...groups: string[]): User => mockUser({ groups });

describe('SupportInvestigationAccessService', () => {
  it('derives read and write independently from normalized AD groups', () => {
    const service = new SupportInvestigationAccessService(profile, configuration);

    expect(service.permissionsFor(user('MANAGER'), 'manager-document')).toEqual({ canRead: true, canWrite: true });
    expect(service.permissionsFor(user('auditor'), 'manager-document')).toEqual({ canRead: true, canWrite: false });
    expect(service.permissionsFor(user('other'), 'manager-document')).toEqual({ canRead: false, canWrite: false });
    expect(service.permissionsFor(user('reviewer'), 'review-document')).toEqual({ canRead: true, canWrite: true });
    expect(service.permissionsFor(user('other'), 'review-document')).toEqual({ canRead: true, canWrite: false });
  });

  it('fails closed when deployment access configuration is missing', () => {
    const service = new SupportInvestigationAccessService(profile, undefined);
    expect(service.configured).toBe(false);
    expect(service.permissionsFor(user('manager'), 'manager-document')).toEqual({ canRead: false, canWrite: false });
    expect(() => service.assertCanRead(user('manager'), 'manager-document')).toThrow('Investigation document access configuration is unavailable');
  });

  it('rejects missing, unknown and privilege-escalating rules during construction', () => {
    expect(
      () =>
        new SupportInvestigationAccessService(profile, JSON.stringify({ 'manager-document': { readGroups: ['manager'], writeGroups: ['manager'] } })),
    ).toThrow('is missing review-document');
    expect(
      () =>
        new SupportInvestigationAccessService(
          profile,
          JSON.stringify({
            ...JSON.parse(configuration),
            typo: { readGroups: ['*'], writeGroups: ['*'] },
          }),
        ),
    ).toThrow('contains unknown keys: typo');
    expect(
      () =>
        new SupportInvestigationAccessService(
          profile,
          JSON.stringify({
            'manager-document': { readGroups: ['auditor'], writeGroups: ['manager'] },
            'review-document': { readGroups: ['*'], writeGroups: ['reviewer'] },
          }),
        ),
    ).toThrow('writeGroups must be a subset');
  });

  it('removes only protected documents the user cannot read', () => {
    const service = new SupportInvestigationAccessService(profile, configuration);
    const errand = {
      id: 'errand',
      jsonParameters: [
        { key: 'manager-document', value: { secret: 1 } },
        { key: 'review-document', value: { public: 2 } },
        { key: 'legacy-document', value: { legacy: 3 } },
      ],
    };

    expect(service.filterProtectedJsonParameters(errand, user('other')).jsonParameters?.map(({ key }) => key)).toEqual([
      'review-document',
      'legacy-document',
    ]);
    expect(errand.jsonParameters).toHaveLength(3);
  });

  it('removes the complete JSON-parameter revision section unless every protected document is readable', () => {
    const service = new SupportInvestigationAccessService(profile, configuration);
    const difference = {
      operations: [
        { path: '/jsonParameters/0/value/secret', value: 'classified' },
        { path: '/jsonParameters', value: '[{"key":"manager-document","value":{"secret":1}}]' },
        { path: '/', value: '{"jsonParameters":[{"key":"manager-document","value":{"secret":2}}]}' },
        { value: 'malformed root operation' },
        { path: '/jsonParametersLegacy', value: 'not the protected JSON pointer' },
        { path: '/title', value: 'Visible title' },
      ],
    };

    expect(service.filterProtectedRevisionDifference(difference, user('other')).operations).toEqual([
      { path: '/jsonParametersLegacy', value: 'not the protected JSON pointer' },
      { path: '/title', value: 'Visible title' },
    ]);
    expect(service.filterProtectedRevisionDifference(difference, user('manager'))).toBe(difference);
    expect(difference.operations).toHaveLength(6);
  });

  it('checks only profile-owned documents present in a transfer payload', () => {
    const service = new SupportInvestigationAccessService(profile, configuration);
    const protectedErrand = {
      jsonParameters: [{ key: 'manager-document' }, { key: 'manager-document' }, { key: 'legacy-document' }],
    };

    expect(service.protectedJsonParameterKeys(protectedErrand)).toEqual(['manager-document']);
    expect(() => service.assertCanReadProtectedJsonParameters(protectedErrand, user('manager'))).not.toThrow();
    expect(() => service.assertCanReadProtectedJsonParameters(protectedErrand, user('other'))).toThrow('Missing investigation document read access');
    expect(() => service.assertCanReadProtectedJsonParameters({ jsonParameters: [{ key: 'legacy-document' }] }, user('other'))).not.toThrow();
  });

  it('fails closed when a protected transfer document has no deployment access policy', () => {
    const service = new SupportInvestigationAccessService(profile, undefined);

    expect(() => service.assertCanReadProtectedJsonParameters({ jsonParameters: [{ key: 'manager-document' }] }, user('manager'))).toThrow(
      'Investigation document access configuration is unavailable',
    );
  });
});
