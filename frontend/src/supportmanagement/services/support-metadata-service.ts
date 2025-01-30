import { MetadataResponse, MetadataRoles, Type } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { sortBy } from '@common/services/helper-service';

export type SupportType = Type;

export type SupportMetadata = MetadataResponse;

export type SupportRoles = MetadataRoles;

export const getSupportMetadata: (municipalityId: string) => Promise<{ metadata: SupportMetadata; error?: string }> = (
  municipalityId
) => {
  let url = `supportmetadata/${municipalityId}`;
  return apiService
    .get<SupportMetadata>(url)
    .then((res: any) => {
      const meta = res.data;
      meta.categories = sortBy(meta.categories, 'displayName');
      return { metadata: meta };
    })
    .catch(
      (e) =>
        ({ metadata: undefined, error: e.response?.status ?? 'UNKNOWN ERROR' } as {
          metadata: SupportMetadata;
          error?: string;
        })
    );
};

export const getSupportMetadataRoles: (municipalityId: string) => Promise<{ roles: SupportRoles[]; error?: string }> = (
  municipalityId
) => {
  let url = `supportmetadata/${municipalityId}/roles`;
  return apiService
    .get<SupportRoles[]>(url)
    .then((res: any) => {
      const roles = res.data;
      return { roles: roles };
    })
    .catch((e) => {
      console.error('Something went wrong when fetching roles', e);
      throw e;
    });
};
