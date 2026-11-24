import type { Asset } from '@common/interfaces/asset';
import type { CaseStatusResponse } from '@common/services/casestatus-service';
import { permitOfInspection } from '@common/services/customer-inspection-service';
import { getCustomerAssets, type PartyAssetValue } from '@common/services/customer-service';
import { getResolvedRelations } from '@common/services/relations-service';
import { type InvestigationAreaName, investigationAreaOfErrand } from '@supportmanagement/investigations';

import { type DecisionPremisesAddress, premisesAddressOf } from './support-decision-premises-service';
import { getSupportErrandById, type SupportErrand } from './support-errand-service';
import { text } from './support-form-value-service';
import { inspectionProtocolDate, inspectionProtocolSummaryLabel } from './support-inspection-protocol-service';
import { getSupportInvestigation } from './support-investigation-service';
import { formatPostalCode } from './support-premises-address-service';
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
  /**
   * The premises the permit concerns, which the decision document states. Read from the permit errand's own
   * application, since an action errand has none of its own and the inspection protocol writes the address as one
   * line. Its decision assigns no restaurant number, so there is nothing for the handler to pick.
   */
  premisesName?: string;
  premisesAddress?: DecisionPremisesAddress;
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
): Promise<{ errand?: CaseStatusResponse; asset?: Asset }> => {
  const partyId = inspection ? getSupportOwnerStakeholder(inspection)?.externalId : undefined;
  if (!partyId) return {};

  const [{ relations, caseStatuses }, assets] = await Promise.all([
    getResolvedRelations('source', municipalityId, inspectionErrandId, 'ASC'),
    getCustomerAssets(municipalityId, partyId),
  ]);
  const permit = permitOfInspection(
    assets,
    relations.map((relation) => relation.target.resourceId)
  );
  return {
    errand: caseStatuses.find((status) => !!permit?.sourceErrandId && status.caseId === permit.sourceErrandId),
    asset: permit,
  };
};

/** The serving place a set of JSON parameters carries, in the shape the permit register writes it. */
const placeIn = (parameters: { value?: unknown }[] | undefined) =>
  (parameters ?? [])
    .map((parameter) => (parameter.value ?? {}) as PartyAssetValue)
    .map((value) => value.premises ?? value.pointOfSale)
    .find((place) => !!place?.name || !!place?.address);

/**
 * The premises the decision states: the serving place the inspection was carried out at, with its name and
 * address. The inspection carries its own copy, written when it was raised from the permit, so the premises are
 * there whether or not the permit can be reached; the permit's own entry in the register answers for an
 * inspection registered by hand.
 */
const premisesOfInspection = (
  inspection: SupportErrand | undefined,
  asset: Asset | undefined
): Pick<SupportActionErrandOrigin, 'premisesName' | 'premisesAddress'> => {
  const place = placeIn(inspection?.jsonParameters) ?? placeIn(asset?.jsonParameters);

  return {
    premisesName: text(place?.name),
    // The register keeps the postal code without its space; the decision states it as it is written.
    premisesAddress: premisesAddressOf({ ...place?.address, postalCode: formatPostalCode(place?.address?.postalCode) }),
  };
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
  const permit: { errand?: CaseStatusResponse; asset?: Asset } = await permitErrandOfInspection(
    municipalityId,
    inspectionErrandId,
    inspection.errand
  ).catch(() => ({}));

  return {
    inspectionErrandNumber: inspection.errand?.errandNumber,
    inspectionDate: inspectionProtocolDate(investigation),
    summary: inspectionProtocolSummaryLabel(investigation),
    permitType: permit.errand?.caseType,
    permitErrandNumber: permit.errand?.errandNumber,
    ...premisesOfInspection(inspection.errand, permit.asset),
  };
};

/**
 * The trade the action errand is about, which only the inspection it was raised from is marked with. The process
 * creates the errand with the measures label alone, so nothing on the errand itself says alcohol or tobacco.
 */
export const getSupportActionErrandArea = async (
  municipalityId: string,
  inspectionErrandId: string
): Promise<InvestigationAreaName | undefined> => {
  const inspection = await getSupportErrandById(inspectionErrandId, municipalityId);
  return investigationAreaOfErrand(inspection.errand);
};
