import { apiURL } from '@/utils/util';
import ApiService from './api.service';
import { getLastUpdatedAdministrator } from './stakeholder.service';
import { UiPhase } from '@/interfaces/errand-phase.interface';
import { User } from '@/interfaces/users.interface';
import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';

const SERVICE = `case-data/9.0`;

export const validateContractAction: (municipalityId: string, errandId: string, user: User) => Promise<boolean> = async (
  municipalityId,
  errandId,
  user,
) => {
  let allowed = false;
  const apiService = new ApiService();
  const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}`;
  const baseURL = apiURL(SERVICE);
  const existingErrand = await apiService.get<ErrandDTO>({ url, baseURL }, user);
  if (existingErrand.data.extraParameters?.find(p => p.key === 'process.displayPhase')?.values[0] === UiPhase.registrerad) {
    allowed = true;
  }
  if (user.username.toLocaleLowerCase() === getLastUpdatedAdministrator(existingErrand.data.stakeholders)?.adAccount.toLocaleLowerCase()) {
    allowed = true;
  }
  return Promise.resolve(allowed);
};
