import { defaultPermissions, getLoginPermissions, getPermissions, getRole } from '@/services/authorization.service';

import { MOCK_ADMIN_GROUP, MOCK_DEVELOPER_GROUP, MOCK_SUPERADMIN_GROUP } from './helpers/mock-data';

describe('authorization.service', () => {
  describe('defaultPermissions', () => {
    it('grants nothing by default', () => {
      expect(defaultPermissions()).toEqual({
        canEditCasedata: false,
        canEditSupportManagement: false,
        canViewAttestations: false,
        canEditAttestations: false,
        canViewOtherNamespaces: false,
      });
    });

    it('returns a fresh object each call (no shared mutable state)', () => {
      const a = defaultPermissions();
      a.canEditSupportManagement = true;
      expect(defaultPermissions().canEditSupportManagement).toBe(false);
    });
  });

  describe('getPermissions (internal roles)', () => {
    it('maps draken_superadmin to view+edit attestations and support edit', () => {
      expect(getPermissions(['draken_superadmin'], true)).toEqual({
        canEditCasedata: false,
        canEditSupportManagement: true,
        canViewAttestations: true,
        canEditAttestations: true,
        canViewOtherNamespaces: false,
      });
    });

    it('maps draken_developer to support edit and view attestations only', () => {
      expect(getPermissions(['draken_developer'], true)).toEqual({
        canEditCasedata: false,
        canEditSupportManagement: true,
        canViewAttestations: true,
        canEditAttestations: false,
        canViewOtherNamespaces: false,
      });
    });

    it('unions permissions across multiple roles', () => {
      // casedata_developer contributes canEditCasedata; superadmin contributes the rest.
      expect(getPermissions(['draken_casedata_developer', 'draken_superadmin'], true)).toEqual({
        canEditCasedata: true,
        canEditSupportManagement: true,
        canViewAttestations: true,
        canEditAttestations: true,
        canViewOtherNamespaces: false,
      });
    });

    it('ignores unknown roles', () => {
      expect(getPermissions(['not_a_role'], true)).toEqual(defaultPermissions());
    });
  });

  describe('getPermissions (external AD groups)', () => {
    it('resolves an AD group through roleADMapping before collecting permissions', () => {
      expect(getPermissions([MOCK_DEVELOPER_GROUP])).toEqual({
        canEditCasedata: false,
        canEditSupportManagement: true,
        canViewAttestations: true,
        canEditAttestations: false,
        canViewOtherNamespaces: false,
      });
    });
  });

  describe('getLoginPermissions', () => {
    // No AD group carries canViewOtherNamespaces - it is granted at login, from the environment,
    // and only for the Kontakt Sundsvall drake (APPLICATION=KC AND the CONTACTSUNDSVALL namespace).
    // isContactSundsvall() reads the environment at call time, so each case stubs it for itself;
    // unstubAllEnvs restores the values seeded in setup.ts.
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    const asContactSundsvall = () => {
      vi.stubEnv('APPLICATION', 'KC');
      vi.stubEnv('SUPPORTMANAGEMENT_NAMESPACE', 'CONTACTSUNDSVALL');
    };

    it('grants canViewOtherNamespaces to a Kontakt Sundsvall user, alongside their role permissions', () => {
      asContactSundsvall();
      expect(getLoginPermissions([MOCK_DEVELOPER_GROUP])).toEqual({
        canEditCasedata: false,
        canEditSupportManagement: true,
        canViewAttestations: true,
        canEditAttestations: false,
        canViewOtherNamespaces: true,
      });
    });

    it('grants it to a Kontakt Sundsvall user without any role, since no AD group carries it', () => {
      expect(getPermissions([]).canViewOtherNamespaces).toBe(false);
      asContactSundsvall();
      expect(getLoginPermissions([]).canViewOtherNamespaces).toBe(true);
    });

    it('withholds it from another drake, even with the CONTACTSUNDSVALL namespace configured', () => {
      vi.stubEnv('APPLICATION', 'KA');
      vi.stubEnv('SUPPORTMANAGEMENT_NAMESPACE', 'CONTACTSUNDSVALL');
      expect(getLoginPermissions([MOCK_DEVELOPER_GROUP]).canViewOtherNamespaces).toBe(false);
    });

    it('withholds it from KC when the namespace is not CONTACTSUNDSVALL', () => {
      vi.stubEnv('APPLICATION', 'KC');
      vi.stubEnv('SUPPORTMANAGEMENT_NAMESPACE', 'SBK_MEX');
      expect(getLoginPermissions([MOCK_DEVELOPER_GROUP]).canViewOtherNamespaces).toBe(false);
    });
  });

  describe('getRole', () => {
    it('maps a single AD group directly to its internal role', () => {
      expect(getRole([MOCK_DEVELOPER_GROUP])).toBe('draken_developer');
    });

    it('resolves to the role with the lowest RoleOrderEnum index when several groups are present', () => {
      // getRole sorts matched roles by RoleOrderEnum ascending and takes the first;
      // draken_developer has index 0, so it wins over admin/superadmin here.
      expect(getRole([MOCK_ADMIN_GROUP, MOCK_SUPERADMIN_GROUP, MOCK_DEVELOPER_GROUP])).toBe('draken_developer');
    });
  });
});
