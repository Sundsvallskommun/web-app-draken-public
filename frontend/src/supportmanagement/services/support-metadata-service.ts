import { Labels, MetadataResponse, Type } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { sortBy } from '@common/services/helper-service';

export type SupportType = Type;

/**
 * When the label tree has a categorization root, the BFF hands on only the labels below it, along with the
 * root's classification display name (see backend/src/utils/categorization-labels.ts).
 */
export type SupportMetadata = Omit<MetadataResponse, 'labels'> & {
  labels?: Labels & { classificationDisplayName?: string };
};

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
