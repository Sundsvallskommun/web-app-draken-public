'use client';

import { type ApiResponse, apiService } from '@common/services/api-service';
import {
  LegalEntityEngagement,
  LegalEntityEngagementsApiResponse,
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

/** The people engaged in the company a party id belongs to. An empty list when the id is not a company. */
export const getLegalEntityEngagements = async (partyId: string): Promise<LegalEntityEngagement[]> => {
  const res = await apiService.get<LegalEntityEngagementsApiResponse>(`legalentity/${partyId}/engagements`);
  return res.data.data?.engagements ?? [];
};

export interface LegalEntityPersonEngagement {
  organizationNumber?: string | null;
  name?: string | null;
  form?: string | null;
  roles?: { description?: string | null; code?: string | null }[] | null;
}

export const personEngagementRoles = (engagement: LegalEntityPersonEngagement): string =>
  (engagement.roles ?? [])
    .map((role) => role.description)
    .filter((description): description is string => !!description)
    .join(', ');

/**
 * The companies one person is engaged in, asked for by the party id the errand carries. The personal number the
 * company data is looked up by belongs to the BFF, which asks Citizen for it; it never passes through here.
 */
export const getLegalEntityPersonEngagements = async (partyId: string): Promise<LegalEntityPersonEngagement[]> => {
  const res = await apiService.get<ApiResponse<LegalEntityPersonEngagement[]>>(
    `legalentity/person/${partyId}/engagements`
  );
  return res.data.data ?? [];
};
