import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { AdUser } from '@/controllers/active-directory.controller';
import { User } from '@/interfaces/users.interface';
import { apiURL } from '@/utils/util';
import ApiService from './api.service';
import { Errand } from '@/data-contracts/supportmanagement/data-contracts';

const SERVICE = `supportmanagement/9.0`;
const namespace = SUPPORTMANAGEMENT_NAMESPACE;

export const validateSupportAction: (municipalityId: string, errandId: string, user: User) => Promise<boolean> = async (
  municipalityId,
  errandId,
  user,
) => {
  let allowed = false;
  const apiService = new ApiService();
  const url = `${municipalityId}/${namespace}/errands/${errandId}`;
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

export const checkIfSupportAdministrator: (user: User) => Promise<boolean> = async user => {
  const domain = 'personal';
  const apiService = new ApiService();
  const url = `activedirectory/1.0/groupmembers/${domain}/${process.env.ADMIN_GROUP}`;
  const res = await apiService.get<AdUser[]>({ url }, user);
  return res.data.some(u => u.name === user.username);
};
