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

export const getCompanyEngagementsByPartyId = async (partyId: string): Promise<CompanyEngagement[]> => {
  const res = await apiService.get<ApiResponse<CompanyEngagements>>(`legalentity/${partyId}/engagements`);
  return res.data.data.engagements ?? [];
};

export const engagementRoles = (engagement: CompanyEngagement): string =>
  (engagement.relations ?? [])
    .map((relation) => relation.description)
    .filter((description): description is string => !!description)
    .join(', ');
