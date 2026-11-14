import { permitOfInspection } from '@common/services/customer-inspection-service';
import { getCustomerAssets } from '@common/services/customer-service';
import { getResolvedRelations } from '@common/services/relations-service';

import { getSupportErrandById, type SupportErrand } from './support-errand-service';
import { inspectionProtocolDate, inspectionProtocolSummaryLabel } from './support-inspection-protocol-service';
import { getSupportInvestigation } from './support-investigation-service';
import { getSupportOwnerStakeholder } from './support-stakeholder-service';

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

/**
 * The permit errand the inspection is about: the one among its relations that the permit register knows as the
 * source of one of the permit holder's permits. A relation says nothing of what it leads to, so a tips errand or
 * another inspection linked to the inspection would otherwise pass as the permit the sanction is decided on.
 */
const permitErrandOfInspection = async (
  municipalityId: string,
  inspectionErrandId: string,
  inspection: SupportErrand | undefined
) => {
  const partyId = inspection ? getSupportOwnerStakeholder(inspection)?.externalId : undefined;
  if (!partyId) return undefined;

  const [{ relations, caseStatuses }, assets] = await Promise.all([
    getResolvedRelations('source', municipalityId, inspectionErrandId, 'ASC'),
    getCustomerAssets(municipalityId, partyId),
  ]);
  const permit = permitOfInspection(
    assets,
    relations.map((relation) => relation.target.resourceId)
  );
  return caseStatuses.find((status) => !!permit?.sourceErrandId && status.caseId === permit.sourceErrandId);
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
  const [inspection, investigation] = await Promise.all([
    getSupportErrandById(inspectionErrandId, municipalityId),
    getSupportInvestigation(inspectionErrandId, municipalityId).catch(() => undefined),
  ]);
  const permit = await permitErrandOfInspection(municipalityId, inspectionErrandId, inspection.errand).catch(
    () => undefined
  );

  return {
    inspectionErrandNumber: inspection.errand?.errandNumber,
    inspectionDate: inspectionProtocolDate(investigation),
    summary: inspectionProtocolSummaryLabel(investigation),
    permitType: permit?.caseType,
    permitErrandNumber: permit?.errandNumber,
  };
};
