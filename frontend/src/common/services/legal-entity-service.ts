'use client';

import { apiService } from '@common/services/api-service';
import {
  LegalEntityEngagement,
  LegalEntityProfile,
  LegalEntityProfileApiResponse,
} from 'src/data-contracts/backend/data-contracts';

export const getCompanyProfileByPartyId = async (partyId: string): Promise<LegalEntityProfile> => {
  const res = await apiService.get<LegalEntityProfileApiResponse>(`legalentity/${partyId}`);
  return res.data.data;
};

export const companyAccountingPeriod = (profile: LegalEntityProfile): string =>
  [profile.acountingPeriodStart, profile.acountingPeriodEnded].filter(Boolean).join(' – ');

export const companyAddressLines = (profile: LegalEntityProfile): string[] =>
  [
    profile.postAddress?.address1,
    [profile.postAddress?.postalCode, profile.postAddress?.city].filter(Boolean).join(' '),
  ].filter((line): line is string => !!line);

export const companyDescriptionParagraphs = (profile: LegalEntityProfile): string[] =>
  (profile.businessDescription ?? '')
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const engagementRoles = (engagement: LegalEntityEngagement): string =>
  (engagement.relations ?? [])
    .map((relation) => relation.description)
    .filter((description): description is string => !!description)
    .join(', ');
