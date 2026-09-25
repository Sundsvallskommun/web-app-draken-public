import { MetadataResponse, Type } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { sortBy } from '@common/services/helper-service';

export type SupportType = Type;

/** `namespace` is added by the BFF; upstream does not return it. */
export type SupportMetadata = MetadataResponse & { namespace?: string };

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
        ({ metadata: undefined as unknown as SupportMetadata, error: e.response?.status ?? 'UNKNOWN ERROR' } as {
          metadata: SupportMetadata;
          error?: string;
        })
    );
};
