import { getResolvedRelations } from '@common/services/relations-service';

import { getSupportErrandById, type SupportErrand } from './support-errand-service';
import { inspectionProtocolDate, inspectionProtocolSummaryLabel } from './support-inspection-protocol-service';
import { getSupportInvestigation } from './support-investigation-service';

const INSPECTION_ERRAND_TAG = 'inspectionErrandId';

/** The inspection an action errand was raised from, as pw-alkt tags it when the process creates the errand. */
export const inspectionErrandIdOf = (errand: Pick<SupportErrand, 'externalTags'> | undefined): string | undefined =>
  errand?.externalTags?.find((tag) => tag.key === INSPECTION_ERRAND_TAG)?.value;

/** Where an action errand comes from, as the inspection has it now. None of it is stored on the action errand. */
export interface SupportActionErrandOrigin {
  inspectionErrandNumber?: string;
  inspectionDate?: string;
  summary?: string;
  permitType?: string;
  permitErrandNumber?: string;
}

export const originIsEmpty = (origin: SupportActionErrandOrigin): boolean => !Object.values(origin).some(Boolean);

/** The permit errand the inspection is about, read off the inspection's own relations. */
const permitOfInspection = async (municipalityId: string, inspectionErrandId: string) => {
  const { relations, caseStatuses } = await getResolvedRelations('source', municipalityId, inspectionErrandId, 'ASC');
  const linkedErrandIds = relations.map((relation) => relation.target.resourceId);
  return caseStatuses.find((status) => !!status.caseId && linkedErrandIds.includes(status.caseId));
};

/**
 * The permit is two hops away: the action errand tags the inspection, and the inspection carries the relation to
 * the permit errand. What cannot be read is left out, so an inspection without a relation, or one that is gone,
 * costs a row rather than an error. The inspection is read on every load, never copied.
 */
export const getSupportActionErrandOrigin = async (
  municipalityId: string,
  inspectionErrandId: string
): Promise<SupportActionErrandOrigin> => {
  const [inspection, investigation, permit] = await Promise.all([
    getSupportErrandById(inspectionErrandId, municipalityId),
    getSupportInvestigation(inspectionErrandId, municipalityId).catch(() => undefined),
    permitOfInspection(municipalityId, inspectionErrandId).catch(() => undefined),
  ]);

  return {
    inspectionErrandNumber: inspection.errand?.errandNumber,
    inspectionDate: inspectionProtocolDate(investigation),
    summary: inspectionProtocolSummaryLabel(investigation),
    permitType: permit?.caseType,
    permitErrandNumber: permit?.errandNumber,
  };
};
