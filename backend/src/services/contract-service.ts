import { apiServiceName } from '@/config/api-config';
import { Errand as ErrandDTO } from '@/data-contracts/case-data/data-contracts';
import { Contract } from '@/data-contracts/contract/data-contracts';
import { UiPhase } from '@/interfaces/errand-phase.interface';
import { User } from '@/interfaces/users.interface';
import { apiURL } from '@/utils/util';

import ApiService from './api.service';
import { getLastUpdatedAdministrator } from './stakeholder.service';

const CASEDATA_SERVICE = apiServiceName('case-data');
const CONTRACT_SERVICE = apiServiceName('contract');

export const validateContractAction: (municipalityId: string, errandId: string, user: User) => Promise<boolean> = async (
  municipalityId,
  errandId,
  user,
) => {
  let allowed = false;
  const apiService = new ApiService();
  const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}`;
  const baseURL = apiURL(CASEDATA_SERVICE);
  const existingErrand = await apiService.get<ErrandDTO>({ url, baseURL }, user);
  if (existingErrand.data.extraParameters?.find(p => p.key === 'process.displayPhase')?.values?.[0] === UiPhase.registrerad) {
    allowed = true;
  }
  if (user.username.toLocaleLowerCase() === getLastUpdatedAdministrator(existingErrand.data.stakeholders ?? [])?.adAccount.toLocaleLowerCase()) {
    allowed = true;
  }
  return Promise.resolve(allowed);
};

/**
 * Fetch the content of a contract attachment, base64 encoded.
 * The Contract API streams the raw bytes, so the content is fetched as an
 * arraybuffer here and handed to the browser as base64, the way every other
 * attachment resource in this app does it.
 */
export const getContractAttachmentAsBase64: (
  municipalityId: string,
  contractId: string,
  attachmentId: string | number,
  user: User,
) => Promise<string> = async (municipalityId, contractId, attachmentId, user) => {
  const apiService = new ApiService();
  const url = `${municipalityId}/contracts/${contractId}/attachments/${attachmentId}`;
  const baseURL = apiURL(CONTRACT_SERVICE);
  const res = await apiService.get<ArrayBuffer>({ url, baseURL, responseType: 'arraybuffer' }, user);
  return Buffer.from(res.data).toString('base64');
};

/**
 * Resolve which errand an existing contract belongs to. The errand id is carried as an
 * `errandId` extra parameter group, written whenever the contract is created or updated.
 *
 * Deliberately not `externalReferenceId`: that field is bound to the "Avtals-ID" input and holds
 * the number of a previous contract this one replaces, not an errand id.
 */
export const getContractErrandId: (municipalityId: string, contractId: string, user: User) => Promise<string | undefined> = async (
  municipalityId,
  contractId,
  user,
) => {
  const apiService = new ApiService();
  const url = `${municipalityId}/contracts/${contractId}`;
  const baseURL = apiURL(CONTRACT_SERVICE);
  const res = await apiService.get<Contract>({ url, baseURL }, user);
  return res.data.extraParameters?.find(p => p.name === 'errandId')?.parameters?.['errandId'];
};
