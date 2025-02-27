import { User } from '@/interfaces/users.interface';
import { Role } from '@interfaces/role';
import { CreateStakeholderDto } from '@interfaces/stakeholder.interface';
import ApiService from './api.service';
import { latestBy } from '@/utils/util';
import { Errand as ErrandDTO, Stakeholder as StakeholderDTO } from '@/data-contracts/case-data/data-contracts';
import { CASEDATA_NAMESPACE } from '@/config';

const SERVICE = `case-data/11.0`;

export const getOwnerStakeholder: (e: ErrandDTO) => StakeholderDTO = e => e.stakeholders.find(s => s.roles.includes(Role.APPLICANT));

export const getOwnerStakeholderEmail: (e: ErrandDTO) => string = e => {
  const owner = getOwnerStakeholder(e);
  return owner.contactInformation.find(c => c.contactType === 'EMAIL')?.value;
};

export const getStakeholderById: (municipalityId: string, errandId: number, stakeholderId: string, user: User) => Promise<StakeholderDTO> = async (
  municipalityId,
  errandId,
  stakeholderId,
  user,
) => {
  const apiService = new ApiService();
  const url = `${SERVICE}/${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/stakeholders/${stakeholderId}`;
  const res = await apiService.get<StakeholderDTO>({ url }, user);
  return res.data;
};

export const getLastUpdatedAdministrator = (stakeholders: StakeholderDTO[]) => {
  return latestBy(
    stakeholders?.filter(s => s.roles.includes(Role.ADMINISTRATOR)),
    'updated',
  );
};
