import { mapOidcClaimsToSessionUser, OidcLoginError } from '@/oidc/claims-mapping';
import { getLoginPermissions } from '@/services/authorization.service';

import { MOCK_DEVELOPER_GROUP, mockAdUsername, mockEmail, mockFirstName, mockLastName } from './helpers/mock-data';

/** ID-token claims as the IdP emits them for a fully provisioned, authorized user. */
const baseClaims = (): Record<string, unknown> => ({
  sub: 'a1b2c3',
  given_name: mockFirstName,
  family_name: mockLastName,
  email: mockEmail,
  preferred_username: mockAdUsername,
  groups: [MOCK_DEVELOPER_GROUP],
});

describe('mapOidcClaimsToSessionUser', () => {
  it('maps a full set of claims to the same session-user shape the SAML verify callback produces', () => {
    const user = mapOidcClaimsToSessionUser(baseClaims());

    expect(user).toEqual({
      name: `${mockFirstName} ${mockLastName}`,
      firstName: mockFirstName,
      lastName: mockLastName,
      username: mockAdUsername,
      email: mockEmail,
      groups: [MOCK_DEVELOPER_GROUP],
      role: 'draken_developer',
      permissions: getLoginPermissions([MOCK_DEVELOPER_GROUP]),
      authMethod: 'oidc',
    });
  });

  it('does not carry the SAML SLO fields', () => {
    const user = mapOidcClaimsToSessionUser(baseClaims());

    expect(user).not.toHaveProperty('nameID');
    expect(user).not.toHaveProperty('nameIDFormat');
    expect(user).not.toHaveProperty('sessionIndex');
  });

  it.each(['given_name', 'family_name', 'email', 'preferred_username', 'groups'])('fails with OIDC_MISSING_ATTRIBUTES when %s is missing', claim => {
    const claims = baseClaims();
    delete claims[claim];

    expect(() => mapOidcClaimsToSessionUser(claims)).toThrow(expect.objectContaining({ name: 'OIDC_MISSING_ATTRIBUTES' }));
  });

  it('fails with OIDC_MISSING_ATTRIBUTES when groups is empty', () => {
    expect(() => mapOidcClaimsToSessionUser({ ...baseClaims(), groups: [] })).toThrow(expect.objectContaining({ name: 'OIDC_MISSING_ATTRIBUTES' }));
  });

  it('fails with OIDC_MISSING_ATTRIBUTES when groups is a CSV string instead of the OIDC array shape', () => {
    const claims = { ...baseClaims(), groups: MOCK_DEVELOPER_GROUP };

    expect(() => mapOidcClaimsToSessionUser(claims)).toThrow(expect.objectContaining({ name: 'OIDC_MISSING_ATTRIBUTES' }));
  });

  it('fails with OIDC_MISSING_GROUP when no group is authorized', () => {
    const claims = { ...baseClaims(), groups: ['some_unrelated_group'] };

    expect(() => mapOidcClaimsToSessionUser(claims)).toThrow(expect.objectContaining({ name: 'OIDC_MISSING_GROUP' }));
  });

  it('authorizes mixed-case groups and lowercases them in the session user, like the SAML flow', () => {
    const user = mapOidcClaimsToSessionUser({ ...baseClaims(), groups: [MOCK_DEVELOPER_GROUP.toUpperCase()] });

    expect(user.groups).toEqual([MOCK_DEVELOPER_GROUP]);
    expect(user.role).toBe('draken_developer');
  });

  it('throws OidcLoginError instances (duck-typable via .name for the failMessage contract)', () => {
    try {
      mapOidcClaimsToSessionUser({ ...baseClaims(), groups: ['some_unrelated_group'] });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OidcLoginError);
      expect((err as Error).name).toBe('OIDC_MISSING_GROUP');
    }
  });
});
