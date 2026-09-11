import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { saveChangedErrandParameters } from '@supportmanagement/services/support-parameter-service';

export interface supportmanagementFacility {
  name: string;
  value: string;
}

export interface FacilitiesPayload {
  propertyDesignations: string[];
  districtnames: string[];
  streets: string[];
}

interface Facility {
  address?: {
    propertyDesignation?: string;
    street?: string;
  };
  extraParameters?: {
    districtname?: string;
  };
}

/** The three parameters the facility list is stored as, with the presentation they are created with. */
const FACILITY_PARAMETERS = [
  { key: 'propertyDesignation', displayName: 'Fastighetsbeteckning' },
  { key: 'districtname', displayName: 'Distriktnamn' },
  { key: 'street', displayName: 'Adress' },
] as const;

/**
 * Saves the facility list.
 *
 * Each of the three parameters is written on its own, conditioned on its own version, so saving
 * facilities no longer rewrites every other parameter on the errand - and a concurrent edit to an
 * unrelated parameter neither fails this save nor is overwritten by it. Unchanged parameters are
 * skipped entirely.
 */
export const saveFacilityInfo = (id: string, facilities: Facility[], currentParameters: Parameter[] | undefined) => {
  const municipalityId = process.env.NEXT_PUBLIC_MUNICIPALITY_ID ?? '';
  const values: Record<(typeof FACILITY_PARAMETERS)[number]['key'], string[]> = {
    propertyDesignation: facilities?.map((f) => f.address?.propertyDesignation || '') || [],
    districtname: facilities?.map((f) => f.extraParameters?.districtname || '') || [],
    street: facilities?.map((f) => f.address?.street || '') || [],
  };

  return saveChangedErrandParameters(
    municipalityId,
    id,
    currentParameters,
    FACILITY_PARAMETERS.map((parameter) => ({ ...parameter, values: values[parameter.key] }))
  );
};
