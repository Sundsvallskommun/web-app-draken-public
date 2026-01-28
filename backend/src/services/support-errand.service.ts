import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import { User } from '@/interfaces/users.interface';
import { apiURL } from '@/utils/util';
import ApiService from './api.service';

const SERVICE = apiServiceName('supportmanagement');
const namespace = SUPPORTMANAGEMENT_NAMESPACE;

export const validateSupportAction: (errandId: string, user: User) => Promise<boolean> = async (errandId, user) => {
  let allowed = false;
  const apiService = new ApiService();
  const url = `${MUNICIPALITY_ID}/${namespace}/errands/${errandId}`;
  const baseURL = apiURL(SERVICE);
  const res = await apiService.get<Errand>({ url, baseURL }, user);
  const existingErrand = res.data;
  if (user.username.toLocaleLowerCase() === existingErrand.assignedUserId?.toLocaleLowerCase()) {
    allowed = true;
  }
  if (existingErrand.assignedUserId?.toLocaleLowerCase() === undefined) {
    if (existingErrand.channel === 'EMAIL' || existingErrand.channel === 'ESERVICE') {
      allowed = true;
    }
  }
  return Promise.resolve(allowed);
};

export const checkIfSupportAdministrator = (user: User): boolean => {
  return user?.permissions?.canEditSupportManagement || false;
};
