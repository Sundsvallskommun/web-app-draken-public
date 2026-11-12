import { getLatestRjsfSchema } from '@common/components/json/utils/schema-utils';
import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import type { Asset } from '@common/interfaces/asset';
import { linkSupportErrands } from '@common/services/relations-service';
import { schemaNameForErrand } from '@supportmanagement/services/support-errand-schema-service';
import {
  getErrandParameterValue,
  getSupportErrandById,
  initiateSupportErrand,
  PREMISES_MUNICIPALITY_DISPLAY_NAME,
  PREMISES_MUNICIPALITY_KEY,
  upsertErrandParameter,
} from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { isPbi } from '@supportmanagement/services/support-pbi-service';
import type { CSupportStakeholder } from 'src/data-contracts/backend/data-contracts';

import type { CustomerPlace, PartyAssetValue } from './customer-service';

export type InspectionKind = 'INTERNAL_INSPECTION' | 'EXTERNAL_INSPECTION';

// The metadata leaves the ROOT label out, as the type form does when it saves labels.
const INSPECTION_LABEL_PATHS = (kind: InspectionKind) => ['CATEGORYROOT/INSPECTION', `CATEGORYROOT/INSPECTION/${kind}`];

const assetValue = (asset: Asset) => (asset.jsonParameters?.[0]?.value ?? {}) as unknown as PartyAssetValue;

const validFromOf = (asset: Asset) => assetValue(asset).decision?.validFrom ?? asset.issued ?? '';

/** The permits a tillsyn of the place can be about: the active ones, the one that took effect last first. */
export const activePermits = (place: CustomerPlace): Asset[] =>
  place.assets
    .filter((asset) => asset.status === 'ACTIVE')
    .sort((a, b) => validFromOf(b).localeCompare(validFromOf(a)));

/** The permit a tillsyn starts from when the place leaves nothing to choose between. */
export const latestActiveAsset = (place: CustomerPlace): Asset | undefined => activePermits(place)[0];

const allLabels = (labels: Label[] = []): Label[] => labels.flatMap((label) => [label, ...allLabels(label.labels)]);

const inspectionLabels = (metadata: SupportMetadata | undefined, kind: InspectionKind): Label[] => {
  const known = allLabels(metadata?.labels?.labelStructure);
  return INSPECTION_LABEL_PATHS(kind).map((path) => {
    const label = known.find((candidate) => candidate.resourcePath === path);
    if (!label) throw new Error(`No label ${path} in the metadata`);
    return { ...label, labels: undefined };
  });
};

/** A stakeholder as the BFF takes it on a new errand: no ids, versions or looked-up numbers. */
const stakeholderCopy = (stakeholder: CSupportStakeholder): CSupportStakeholder => ({
  externalId: stakeholder.externalId,
  externalIdType: stakeholder.externalIdType,
  role: stakeholder.role,
  organizationName: stakeholder.organizationName,
  firstName: stakeholder.firstName,
  lastName: stakeholder.lastName,
  address: stakeholder.address,
  careOf: stakeholder.careOf,
  zipCode: stakeholder.zipCode,
  city: stakeholder.city,
  country: stakeholder.country,
  contactChannels: stakeholder.contactChannels?.map(({ type, value }) => ({ type, value })),
  parameters: stakeholder.parameters?.map(({ key, displayName, group, values }) => ({
    key,
    displayName,
    group,
    values,
  })),
});

export interface CreatedInspection {
  errandNumber: string;
  /** False when the errand was created but the link to the permit errand was not, which the handler is told. */
  linked: boolean;
}

/**
 * Creates a tillsyn errand for the place of the asset: the owner and the PBI persons of the permit errand, the place
 * in the errand type's form, the municipality the permit names, and a link to the permit errand.
 */
export const createInspectionErrand = async (
  municipalityId: string,
  metadata: SupportMetadata | undefined,
  asset: Asset,
  kind: InspectionKind
): Promise<CreatedInspection> => {
  const value = assetValue(asset);
  const sourceErrandId = asset.sourceErrandId;
  if (!sourceErrandId) throw new Error('The asset names no permit errand');
  const { errand: source, error } = await getSupportErrandById(sourceErrandId, municipalityId);
  if (error || !source) throw new Error(`The permit errand could not be read: ${error}`);

  const labels = inspectionLabels(metadata, kind);
  const schemaName = schemaNameForErrand({ labels, classification: undefined }, metadata?.namespace);
  if (!schemaName) throw new Error('No errand type schema for the tillsyn labels');

  const created = await initiateSupportErrand(municipalityId, {
    labels,
    parameters: upsertErrandParameter(
      [],
      PREMISES_MUNICIPALITY_KEY,
      getErrandParameterValue(source.parameters, PREMISES_MUNICIPALITY_KEY),
      PREMISES_MUNICIPALITY_DISPLAY_NAME
    ),
    stakeholders: (source.stakeholders ?? [])
      .filter((stakeholder) => stakeholder.role === 'PRIMARY' || isPbi(stakeholder))
      .map(stakeholderCopy),
    jsonParameters: [
      {
        key: schemaName,
        schemaId: (await getLatestRjsfSchema(municipalityId, schemaName)).schemaId,
        value: value.premises ? { premises: value.premises } : { pointOfSale: value.pointOfSale },
      },
    ],
  });

  const linked = await linkSupportErrands(
    municipalityId,
    created.id,
    sourceErrandId,
    asset.sourceErrandNamespace ?? metadata?.namespace ?? ''
  )
    .then(() => true)
    .catch(() => false);

  return { errandNumber: created.errandNumber, linked };
};
