import { Role } from '@interfaces/role';

import { Errand as ErrandDTO, Stakeholder as StakeholderDTO } from '@/data-contracts/case-data/data-contracts';
import { latestBy } from '@/utils/util';

export const getOwnerStakeholder: (e: ErrandDTO) => StakeholderDTO | undefined = e => e.stakeholders?.find(s => s.roles.includes(Role.APPLICANT));

export const getOwnerStakeholderEmail: (e: ErrandDTO) => string | undefined = e => {
  const owner = getOwnerStakeholder(e);
  return owner?.contactInformation?.find(c => c.contactType === 'EMAIL')?.value;
};

export const getLastUpdatedAdministrator = (stakeholders: StakeholderDTO[]) => {
  return latestBy(
    stakeholders?.filter(s => s.roles.includes(Role.ADMINISTRATOR)),
    'updated',
  );
};
