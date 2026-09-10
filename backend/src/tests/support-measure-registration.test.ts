import { MetadataResponse } from '@/data-contracts/supportmanagement/data-contracts';
import {
  assertMeasureRegistration,
  assertMeasureTypeForRole,
  measureRoleDecides,
  resolveSupportMeasureRegistration,
} from '@/services/support-measure-registration';
import { logger } from '@/utils/logger';

const metadata: MetadataResponse = {
  roles: [
    { name: 'MANAGER', displayName: 'Enhetschef', sortOrder: 1 },
    { name: 'NURSE', displayName: 'HSL', sortOrder: 2 },
    { name: 'RETIRED', deprecated: true },
  ],
  measureTypes: [
    { id: 'education-id', name: 'EDUCATION', displayName: 'Utbildning', measureGroups: ['MANAGERS', 'CLINICAL'] },
    { id: 'supervision-id', name: 'SUPERVISION', measureGroups: ['MANAGERS'] },
    { id: 'old-id', name: 'OLD', measureGroups: ['MANAGERS'], deprecated: true },
  ],
};
const rules = [
  { roleName: 'MANAGER', adGroups: ['AD-MANAGER'], measureGroup: 'MANAGERS' },
  { roleName: 'NURSE', adGroups: ['AD-NURSE'], measureGroup: 'CLINICAL' },
  { roleName: 'RETIRED', adGroups: ['AD-RETIRED'], measureGroup: 'CLINICAL' },
];
const configuration = JSON.stringify(rules);

beforeEach(() => vi.spyOn(logger, 'error').mockImplementation(() => logger));
afterEach(() => vi.restoreAllMocks());

test('resolves exact metadata identities from explicit AD groups and exposes only presentation data', () => {
  const resolved = resolveSupportMeasureRegistration(metadata, ['ad-manager', 'Ad-Nurse', 'AD-RETIRED'], configuration);
  expect(resolved.creationRoles.map(role => role.name)).toEqual(['MANAGER', 'NURSE']);
  expect(resolved.creationRoles.map(role => role.displayName)).toEqual(['Enhetschef', 'HSL']);
  expect(resolved.registration).toEqual({
    status: 'ready',
    roleTypes: [
      { roleName: 'MANAGER', measureTypeIds: ['education-id', 'supervision-id'], decides: false },
      { roleName: 'NURSE', measureTypeIds: ['education-id'], decides: false },
    ],
  });
  expect(JSON.stringify(resolved)).not.toContain('AD-MANAGER');
  expect(metadata.measureTypes).toHaveLength(3);
});

test('does not turn matching labels, namespace role names or partial group names into membership', () => {
  const resolved = resolveSupportMeasureRegistration(metadata, ['MANAGER', 'Enhetschef', 'AD-MANAGER-OTHER'], configuration);
  expect(resolved.registration.status).toBe('ready');
  expect(resolved.creationRoles).toEqual([]);
});

test('distinguishes missing configuration from a valid empty policy', () => {
  expect(resolveSupportMeasureRegistration(metadata, ['AD-MANAGER'], '').registration.status).toBe('unconfigured');
  expect(resolveSupportMeasureRegistration(metadata, ['AD-MANAGER'], '[]')).toEqual({
    creationRoles: [],
    registration: { status: 'ready', roleTypes: [] },
  });
});

test.each([
  '{',
  '{}',
  '[null]',
  JSON.stringify([{ ...rules[0], roleName: '' }]),
  JSON.stringify([{ ...rules[0], adGroups: [] }]),
  JSON.stringify([{ ...rules[0], adGroups: ['AD-MANAGER', 'ad-manager'] }]),
  JSON.stringify([{ ...rules[0], measureGroup: '' }]),
  JSON.stringify([{ ...rules[0], measureGroup: null }]),
  JSON.stringify([{ ...rules[0], roleName: 'UNKNOWN' }]),
  JSON.stringify([{ ...rules[0], measureGroup: ['MANAGERS'] }]),
  JSON.stringify([{ ...rules[0], unknownSetting: true }]),
  JSON.stringify([rules[0], rules[0]]),
])('rejects invalid configuration without granting roles or interrupting history reads: %s', configured => {
  expect(resolveSupportMeasureRegistration(metadata, ['AD-MANAGER'], configured)).toEqual({
    creationRoles: [],
    registration: { status: 'invalid', roleTypes: [] },
  });
});

test('checks both group membership and type choices when saving', () => {
  const resolved = resolveSupportMeasureRegistration(metadata, ['AD-NURSE'], configuration);
  expect(() => assertMeasureRegistration(resolved, 'NURSE', 'education-id')).not.toThrow();
  expect(() => assertMeasureRegistration(resolved, 'MANAGER', 'education-id')).toThrow('saknar');
  expect(() => assertMeasureRegistration(resolved, 'NURSE', 'supervision-id')).toThrow('inte tillgänglig');
  expect(() => assertMeasureRegistration(resolved, 'NURSE', 'old-id')).toThrow('inte tillgänglig');
});

test('changing a historical type uses the saved role while leaving editor authorization to the protected resource', () => {
  const resolved = resolveSupportMeasureRegistration(metadata, [], configuration);
  expect(resolved.creationRoles).toEqual([]);
  expect(() => assertMeasureTypeForRole(resolved.registration, 'MANAGER', 'supervision-id')).not.toThrow();
  expect(() => assertMeasureTypeForRole(resolved.registration, 'NURSE', 'supervision-id')).toThrow('inte tillgänglig');
});

test('empty type choices never expand to all active metadata types', () => {
  const resolved = resolveSupportMeasureRegistration(metadata, ['AD-MANAGER'], JSON.stringify([{ ...rules[0], measureGroup: 'NO_TYPES' }]));
  expect(resolved.creationRoles.map(role => role.name)).toEqual(['MANAGER']);
  expect(resolved.registration.roleTypes[0].measureTypeIds).toEqual([]);
  expect(() => assertMeasureRegistration(resolved, 'MANAGER', 'education-id')).toThrow('inte tillgänglig');
});

test('new and reassigned metadata types change choices without changing local configuration', () => {
  const changed: MetadataResponse = {
    ...metadata,
    measureTypes: [
      { id: 'new-id', name: 'NEW_TYPE', measureGroups: ['MANAGERS', 'CLINICAL'] },
      { id: 'education-id', name: 'EDUCATION', measureGroups: ['CLINICAL'] },
      { id: 'no-group-id', name: 'UNASSIGNED' },
      { id: 'empty-id', name: 'EMPTY', measureGroups: [] },
      { id: 'similar-id', name: 'SIMILAR', measureGroups: ['MANAGERS_OTHER'] },
    ],
  };
  const resolved = resolveSupportMeasureRegistration(changed, ['AD-MANAGER', 'AD-NURSE'], configuration);
  expect(resolved.registration.roleTypes).toEqual([
    { roleName: 'MANAGER', measureTypeIds: ['new-id'], decides: false },
    { roleName: 'NURSE', measureTypeIds: ['new-id', 'education-id'], decides: false },
  ]);
  expect(() => assertMeasureRegistration(resolved, 'MANAGER', 'education-id')).toThrow('inte tillgänglig');
  expect(() => assertMeasureRegistration(resolved, 'NURSE', 'new-id')).not.toThrow();
});

test('rejects legacy type lists instead of silently maintaining two policies', () => {
  const resolved = resolveSupportMeasureRegistration(metadata, ['AD-MANAGER'], JSON.stringify([{ ...rules[0], measureTypeNames: ['EDUCATION'] }]));
  expect(resolved.registration.status).toBe('invalid');
});

test('a matching type without an ID prevents registration but preserves history access', () => {
  const resolved = resolveSupportMeasureRegistration(
    { ...metadata, measureTypes: [{ name: 'NO_ID', measureGroups: ['MANAGERS'] }] },
    ['AD-MANAGER'],
    configuration,
  );
  expect(resolved.registration.status).toBe('invalid');
  expect(resolved.creationRoles).toEqual([]);
});

test('reads the deciding flag per role, defaults it to proposal and rejects non-boolean values', () => {
  const withDecider = JSON.stringify([{ ...rules[0], decides: true }, rules[1]]);
  const resolved = resolveSupportMeasureRegistration(metadata, ['ad-manager', 'ad-nurse'], withDecider);
  expect(resolved.registration.roleTypes.map(rule => [rule.roleName, rule.decides])).toEqual([
    ['MANAGER', true],
    ['NURSE', false],
  ]);
  expect(measureRoleDecides(resolved.registration, 'MANAGER')).toBe(true);
  expect(measureRoleDecides(resolved.registration, 'NURSE')).toBe(false);
  expect(measureRoleDecides(resolved.registration, 'UNKNOWN')).toBe(false);

  const invalid = resolveSupportMeasureRegistration(metadata, ['ad-manager'], JSON.stringify([{ ...rules[0], decides: 'yes' }]));
  expect(invalid.registration.status).toBe('invalid');
});
