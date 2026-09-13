import { UiPhase } from '@/casedata/interfaces/errand-phase.interface';
import { getLastUpdatedAdministrator } from '@/casedata/services/stakeholder.service';
import { apiServiceName } from '@/config/api-config';
import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { User } from '@/interfaces/users.interface';
import { apiURL } from '@/utils/util';

import ApiService from '../../services/api.service';

const SERVICE = apiServiceName('case-data');

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
  if (existingErrand.data.extraParameters?.find(p => p.key === 'process.displayPhase')?.values?.[0] === UiPhase.registrerad) {
    allowed = true;
  }
  if (user.username.toLocaleLowerCase() === getLastUpdatedAdministrator(existingErrand.data.stakeholders ?? [])?.adAccount.toLocaleLowerCase()) {
    allowed = true;
  }
  return Promise.resolve(allowed);
};
