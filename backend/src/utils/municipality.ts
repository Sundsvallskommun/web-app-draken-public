import { MUNICIPALITY_ID } from '@/config';

export const resolveMunicipalityId = (candidate?: string): string => {
  const trimmed = candidate?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : MUNICIPALITY_ID;
};
