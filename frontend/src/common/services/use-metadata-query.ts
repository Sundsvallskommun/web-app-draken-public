import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';

export const useSupportMetadataQuery = (municipalityId: string) =>
  useQuery({
    queryKey: queryKeys.supportMetadata(municipalityId),
    queryFn: () => getSupportMetadata(municipalityId).then((res) => res.metadata),
    enabled: !!municipalityId,
    staleTime: 30 * 60 * 1000,
  });
