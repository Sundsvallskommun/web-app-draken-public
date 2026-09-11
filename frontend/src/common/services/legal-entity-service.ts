'use client';

import { ApiResponse, apiService } from '@common/services/api-service';

export interface CompanyEngagement {
  name?: string | null;
  identity?: { code?: string | null; type?: string | null };
  relations?: { description?: string | null; code?: string | null; type?: string | null }[] | null;
}

export interface CompanyEngagements {
  engagements?: CompanyEngagement[] | null;
}

export interface CompanyProfile {
  name?: string | null;
  organizationNumber?: string | null;
  form?: string | null;
  acountingPeriodStart?: string | null;
  acountingPeriodEnded?: string | null;
  postAddress?: { address1?: string | null; postalCode?: string | null; city?: string | null } | null;
  employeeSize?: { name?: string | null } | null;
  businessDescription?: string | null;
}

export const getCompanyProfileByPartyId = async (partyId: string): Promise<CompanyProfile> => {
  const res = await apiService.get<ApiResponse<CompanyProfile>>(`legalentity/${partyId}`);
  return res.data.data;
};

export const companyAccountingPeriod = (profile: CompanyProfile): string =>
  [profile.acountingPeriodStart, profile.acountingPeriodEnded].filter(Boolean).join(' – ');

export const companyAddressLines = (profile: CompanyProfile): string[] =>
  [
    profile.postAddress?.address1,
    [profile.postAddress?.postalCode, profile.postAddress?.city].filter(Boolean).join(' '),
  ].filter((line): line is string => !!line);

export const companyDescriptionParagraphs = (profile: CompanyProfile): string[] =>
  (profile.businessDescription ?? '')
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const getCompanyEngagementsByPartyId = async (partyId: string): Promise<CompanyEngagement[]> => {
  const res = await apiService.get<ApiResponse<CompanyEngagements>>(`legalentity/${partyId}/engagements`);
  return res.data.data.engagements ?? [];
};

export const engagementRoles = (engagement: CompanyEngagement): string =>
  (engagement.relations ?? [])
    .map((relation) => relation.description)
    .filter((description): description is string => !!description)
    .join(', ');
