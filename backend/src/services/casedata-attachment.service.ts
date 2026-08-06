import { CASEDATA_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { User } from '@/interfaces/users.interface';
import { apiURL } from '@/utils/util';

import ApiService from './api.service';

const SERVICE = apiServiceName('case-data');

/**
 * Fetch the content of a CaseData attachment, base64 encoded.
 * The CaseData contract no longer carries file content inline, so content
 * has to be fetched per attachment.
 */
export const getAttachmentAsBase64: (
  municipalityId: string,
  errandId: string | number,
  attachmentId: string | number,
  user: User,
) => Promise<string> = async (municipalityId, errandId, attachmentId, user) => {
  const apiService = new ApiService();
  const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/attachments/${attachmentId}`;
  const baseURL = apiURL(SERVICE);
  const res = await apiService.get<ArrayBuffer>({ url, baseURL, responseType: 'arraybuffer' }, user);
  return Buffer.from(res.data).toString('base64');
};

/**
 * Fetch the content of a CaseData decision attachment, base64 encoded.
 * Decision attachments live under their own sub-resource
 * (errands/{errandId}/decisions/{decisionId}/attachments) and cannot be fetched
 * through the errand attachment endpoint.
 */
export const getDecisionAttachmentAsBase64: (
  municipalityId: string,
  errandId: string | number,
  decisionId: string | number,
  attachmentId: string | number,
  user: User,
) => Promise<string> = async (municipalityId, errandId, decisionId, attachmentId, user) => {
  const apiService = new ApiService();
  const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/decisions/${decisionId}/attachments/${attachmentId}`;
  const baseURL = apiURL(SERVICE);
  const res = await apiService.get<ArrayBuffer>({ url, baseURL, responseType: 'arraybuffer' }, user);
  return Buffer.from(res.data).toString('base64');
};
