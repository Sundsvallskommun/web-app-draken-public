import { Errand as ErrandDTO, Stakeholder as StakeholderDTO } from '@/data-contracts/case-data/data-contracts';
import { Role } from '@/interfaces/role';
import { getLastUpdatedAdministrator, getOwnerStakeholder, getOwnerStakeholderEmail } from '@/services/stakeholder.service';

const stakeholder = (overrides: Partial<StakeholderDTO> = {}): StakeholderDTO =>
  ({ roles: [], contactInformation: [], ...overrides }) as StakeholderDTO;

const errandWith = (stakeholders: StakeholderDTO[]): ErrandDTO => ({ stakeholders }) as ErrandDTO;

describe('stakeholder.service', () => {
  describe('getOwnerStakeholder', () => {
    it('returns the stakeholder holding the APPLICANT role', () => {
      const applicant = stakeholder({ roles: [Role.APPLICANT], firstName: 'Owner' } as Partial<StakeholderDTO>);
      const other = stakeholder({ roles: [Role.CONTACT_PERSON] });
      expect(getOwnerStakeholder(errandWith([other, applicant]))).toBe(applicant);
    });

    it('returns undefined when no applicant is present', () => {
      expect(getOwnerStakeholder(errandWith([stakeholder({ roles: [Role.ADMINISTRATOR] })]))).toBeUndefined();
    });

    it('returns undefined when the errand has no stakeholders', () => {
      expect(getOwnerStakeholder({} as ErrandDTO)).toBeUndefined();
    });
  });

  describe('getOwnerStakeholderEmail', () => {
    it('reads the EMAIL contact of the applicant', () => {
      const applicant = stakeholder({
        roles: [Role.APPLICANT],
        contactInformation: [
          { contactType: 'PHONE', value: '070-0000000' },
          { contactType: 'EMAIL', value: 'owner@example.se' },
        ],
      } as Partial<StakeholderDTO>);
      expect(getOwnerStakeholderEmail(errandWith([applicant]))).toBe('owner@example.se');
    });

    it('returns undefined when the applicant has no email', () => {
      const applicant = stakeholder({
        roles: [Role.APPLICANT],
        contactInformation: [{ contactType: 'PHONE', value: '070-0000000' }],
      } as Partial<StakeholderDTO>);
      expect(getOwnerStakeholderEmail(errandWith([applicant]))).toBeUndefined();
    });
  });

  describe('getLastUpdatedAdministrator', () => {
    it('returns the most recently updated administrator', () => {
      const older = stakeholder({ roles: [Role.ADMINISTRATOR], adAccount: 'old', updated: '2026-01-01T00:00:00Z' } as Partial<StakeholderDTO>);
      const newer = stakeholder({ roles: [Role.ADMINISTRATOR], adAccount: 'new', updated: '2026-06-01T00:00:00Z' } as Partial<StakeholderDTO>);
      const nonAdmin = stakeholder({ roles: [Role.APPLICANT], updated: '2026-12-01T00:00:00Z' } as Partial<StakeholderDTO>);

      const result = getLastUpdatedAdministrator([older, newer, nonAdmin]);
      expect(result).toBeDefined();
      expect((result as StakeholderDTO & { adAccount: string }).adAccount).toBe('new');
    });

    it('returns undefined when there are no administrators', () => {
      expect(getLastUpdatedAdministrator([stakeholder({ roles: [Role.APPLICANT] })])).toBeUndefined();
    });
  });
});
